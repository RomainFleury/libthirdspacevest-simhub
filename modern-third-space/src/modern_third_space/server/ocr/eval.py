"""Score OCR backends against HUD crops named with the expected integer."""

from __future__ import annotations

import json
import os
import re
import time
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Iterable, List, Optional, Sequence, Union
from statistics import median

from .pipeline import read_ammo_number
from .registry import all_backends, get_backend, normalize_text_ocr_engine

IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".bmp", ".webp"}
_STEM_RE = re.compile(r"^(\d+)(?:[_-].*)?$")


def default_fixture_dir() -> Path:
    env = os.environ.get("TSV_OCR_FIXTURES")
    if env:
        return Path(env)
    for parent in Path(__file__).resolve().parents:
        candidate = parent / "tests" / "fixtures" / "ammo_ocr"
        if candidate.is_dir():
            return candidate
    return Path.cwd() / "tests" / "fixtures" / "ammo_ocr"


def expected_ammo_from_stem(stem: str) -> Optional[int]:
    match = _STEM_RE.match(stem.strip())
    if not match:
        return None
    return int(match.group(1))


def list_eval_images(folder: Path) -> List[tuple[Path, int]]:
    if not folder.is_dir():
        return []
    cases: List[tuple[Path, int]] = []
    for path in sorted(folder.iterdir()):
        if not path.is_file() or path.suffix.lower() not in IMAGE_EXTS:
            continue
        expected = expected_ammo_from_stem(path.stem)
        if expected is not None:
            cases.append((path, expected))
    return cases


def load_image_as_bgra(path: Path) -> tuple[bytes, int, int]:
    from PIL import Image
    import numpy as np

    img = Image.open(path).convert("RGBA")
    arr = np.array(img)
    height, width = int(arr.shape[0]), int(arr.shape[1])
    bgra = arr[:, :, [2, 1, 0, 3]].tobytes()
    return bgra, width, height


@dataclass
class SampleResult:
    filename: str
    expected: int
    predicted: Optional[int]
    ok: bool
    error: Optional[str] = None
    ms: float = 0.0  # OCR pipeline only (excludes image decode)
    load_ms: float = 0.0


@dataclass
class EngineReport:
    engine: str
    available: bool
    skip_reason: Optional[str] = None
    correct: int = 0
    total: int = 0
    avg_ms: float = 0.0
    median_ms: float = 0.0
    min_ms: float = 0.0
    max_ms: float = 0.0
    first_ms: float = 0.0
    samples: List[SampleResult] = field(default_factory=list)

    @property
    def accuracy(self) -> float:
        if self.total == 0:
            return 0.0
        return self.correct / self.total

    def apply_timings(self) -> None:
        times = [s.ms for s in self.samples]
        if not times:
            return
        self.avg_ms = sum(times) / len(times)
        self.median_ms = float(median(times))
        self.min_ms = min(times)
        self.max_ms = max(times)
        self.first_ms = times[0]


@dataclass
class UnstableSample:
    filename: str
    expected: int
    predictions: List[Optional[int]]


@dataclass
class RepeatSummary:
    engine: str
    available: bool
    skip_reason: Optional[str] = None
    repeats: int = 1
    images: int = 0
    acc_mean: float = 0.0
    acc_min: float = 0.0
    acc_max: float = 0.0
    avg_ms: float = 0.0
    median_ms: float = 0.0
    min_ms: float = 0.0
    max_ms: float = 0.0
    first_ms: float = 0.0
    stable_images: int = 0
    unstable_images: int = 0
    stable_pct: float = 0.0
    unstable: List[UnstableSample] = field(default_factory=list)
    run_correct: List[int] = field(default_factory=list)


PreloadedCase = tuple[Path, int, bytes, int, int]
EvalCase = Union[tuple[Path, int], PreloadedCase]


def evaluate_engine(
    engine_id: str,
    cases: Iterable[EvalCase],
    *,
    max_value: int = 99_999_999,
) -> EngineReport:
    backend = get_backend(engine_id)
    reason = backend.unavailable_reason()
    report = EngineReport(engine=backend.id, available=reason is None, skip_reason=reason)
    if reason:
        return report

    for item in cases:
        path: Path
        expected: int
        raw: Optional[bytes] = None
        width = 0
        height = 0
        if len(item) >= 5:
            path, expected, raw, width, height = item[0], item[1], item[2], item[3], item[4]
        else:
            path, expected = item[0], item[1]

        predicted: Optional[int] = None
        err: Optional[str] = None
        load_ms = 0.0
        ocr_ms = 0.0
        t_ocr: Optional[float] = None
        try:
            if raw is None:
                t_load = time.perf_counter()
                raw, width, height = load_image_as_bgra(path)
                load_ms = (time.perf_counter() - t_load) * 1000.0
            t_ocr = time.perf_counter()
            predicted = read_ammo_number(
                raw,
                width,
                height,
                engine=backend.id,
                min_value=0,
                max_value=max(max_value, expected),
            )
            ocr_ms = (time.perf_counter() - t_ocr) * 1000.0
        except Exception as exc:
            err = str(exc)
            if t_ocr is not None:
                ocr_ms = (time.perf_counter() - t_ocr) * 1000.0
        ok = predicted == expected and err is None
        report.total += 1
        if ok:
            report.correct += 1
        report.samples.append(
            SampleResult(
                filename=path.name,
                expected=expected,
                predicted=predicted,
                ok=ok,
                error=err,
                ms=ocr_ms,
                load_ms=load_ms,
            )
        )
    report.apply_timings()
    return report


def evaluate_folder(
    folder: Optional[Path] = None,
    *,
    engines: Optional[List[str]] = None,
) -> List[EngineReport]:
    folder = folder or default_fixture_dir()
    cases = list_eval_images(folder)
    ids = engines or [b.id for b in all_backends()]
    preloaded: List[PreloadedCase] = []
    for path, expected in cases:
        raw, width, height = load_image_as_bgra(path)
        preloaded.append((path, expected, raw, width, height))
    return [evaluate_engine(normalize_text_ocr_engine(eid), preloaded) for eid in ids]


def summarize_repeats(runs: Sequence[EngineReport]) -> RepeatSummary:
    first = runs[0]
    summary = RepeatSummary(
        engine=first.engine,
        available=first.available,
        skip_reason=first.skip_reason,
        repeats=len(runs),
        images=first.total,
    )
    if not first.available:
        return summary

    accs = [r.accuracy for r in runs]
    summary.acc_mean = sum(accs) / len(accs)
    summary.acc_min = min(accs)
    summary.acc_max = max(accs)
    summary.run_correct = [r.correct for r in runs]

    times = [s.ms for r in runs for s in r.samples]
    if times:
        summary.avg_ms = sum(times) / len(times)
        summary.median_ms = float(median(times))
        summary.min_ms = min(times)
        summary.max_ms = max(times)
        summary.first_ms = runs[0].first_ms if runs[0].samples else 0.0

    by_file: dict[str, List[Optional[int]]] = {}
    expected: dict[str, int] = {}
    for r in runs:
        for s in r.samples:
            by_file.setdefault(s.filename, []).append(s.predicted)
            expected[s.filename] = s.expected
    for name, preds in by_file.items():
        if len(set(preds)) == 1:
            summary.stable_images += 1
        else:
            summary.unstable_images += 1
            summary.unstable.append(
                UnstableSample(filename=name, expected=expected[name], predictions=list(preds))
            )
    n = summary.stable_images + summary.unstable_images
    summary.stable_pct = (summary.stable_images / n) if n else 0.0
    return summary


def evaluate_repeats(
    folder: Optional[Path] = None,
    *,
    engines: Optional[List[str]] = None,
    repeats: int = 5,
) -> List[RepeatSummary]:
    folder = folder or default_fixture_dir()
    cases = list_eval_images(folder)
    ids = engines or [b.id for b in all_backends()]
    preloaded: List[PreloadedCase] = []
    for path, expected in cases:
        raw, width, height = load_image_as_bgra(path)
        preloaded.append((path, expected, raw, width, height))

    by_engine: dict[str, List[EngineReport]] = {normalize_text_ocr_engine(eid): [] for eid in ids}
    for _ in range(max(1, int(repeats))):
        for eid in by_engine:
            by_engine[eid].append(evaluate_engine(eid, preloaded))
    return [summarize_repeats(runs) for runs in by_engine.values()]


def format_eval_table(reports: List[EngineReport], folder: Path) -> str:
    n_images = max((r.total for r in reports), default=0) or len(list_eval_images(folder))
    lines = [f"OCR eval: {folder} ({n_images} images)"]
    lines.append(
        f"{'engine':<22} {'status':<10} {'correct':>8} {'total':>6} {'acc':>7} "
        f"{'avg_ms':>8} {'med_ms':>8} {'min_ms':>8} {'max_ms':>8} {'first_ms':>9}"
    )
    lines.append("-" * 104)
    for r in reports:
        if not r.available:
            lines.append(
                f"{r.engine:<22} {'skipped':<10} {'-':>8} {'-':>6} {'-':>7} "
                f"{'-':>8} {'-':>8} {'-':>8} {'-':>8} {'-':>9}"
            )
            continue
        acc = f"{100.0 * r.accuracy:5.1f}%"
        lines.append(
            f"{r.engine:<22} {'ok':<10} {r.correct:>8} {r.total:>6} {acc:>7} "
            f"{r.avg_ms:>8.1f} {r.median_ms:>8.1f} {r.min_ms:>8.1f} {r.max_ms:>8.1f} {r.first_ms:>9.1f}"
        )
    lines.append("")
    for r in reports:
        if not r.available or r.total == 0:
            if r.skip_reason:
                lines.append(f"[{r.engine}] {r.skip_reason.splitlines()[0]}")
            continue
        misses = [s for s in r.samples if not s.ok]
        if not misses:
            continue
        lines.append(f"[{r.engine}] misses:")
        for s in misses:
            got = s.error or s.predicted
            lines.append(f"  {s.filename}: expected {s.expected}, got {got} ({s.ms:.1f} ms)")
    return "\n".join(lines)


def reports_to_json(reports: List[EngineReport]) -> str:
    return json.dumps([asdict(r) for r in reports], indent=2)


def format_repeat_table(summaries: List[RepeatSummary], folder: Path) -> str:
    n_images = max((s.images for s in summaries), default=0) or len(list_eval_images(folder))
    repeats = max((s.repeats for s in summaries), default=1)
    lines = [f"OCR eval: {folder} ({n_images} images x {repeats} repeats)"]
    lines.append(
        f"{'engine':<22} {'status':<10} {'acc_mean':>9} {'acc_range':>13} {'stable':>10} "
        f"{'med_ms':>8} {'avg_ms':>8} {'min_ms':>8} {'max_ms':>8}"
    )
    lines.append("-" * 110)
    for s in summaries:
        if not s.available:
            lines.append(
                f"{s.engine:<22} {'skipped':<10} {'-':>9} {'-':>13} {'-':>10} "
                f"{'-':>8} {'-':>8} {'-':>8} {'-':>8}"
            )
            continue
        acc = f"{100.0 * s.acc_mean:5.1f}%"
        lo = f"{100.0 * s.acc_min:.1f}"
        hi = f"{100.0 * s.acc_max:.1f}"
        acc_range = f"{lo}-{hi}%"
        stable = f"{s.stable_images}/{s.images}"
        lines.append(
            f"{s.engine:<22} {'ok':<10} {acc:>9} {acc_range:>13} {stable:>10} "
            f"{s.median_ms:>8.1f} {s.avg_ms:>8.1f} {s.min_ms:>8.1f} {s.max_ms:>8.1f}"
        )
        if s.run_correct:
            lines.append(f"{'':22} per-run correct: {s.run_correct}")
    lines.append("")
    for s in summaries:
        if not s.available:
            if s.skip_reason:
                lines.append(f"[{s.engine}] {s.skip_reason.splitlines()[0]}")
            continue
        if not s.unstable:
            continue
        lines.append(f"[{s.engine}] inconsistent across repeats:")
        for u in s.unstable:
            lines.append(f"  {u.filename}: expected {u.expected}, got {u.predictions}")
    return "\n".join(lines)


def summaries_to_json(summaries: List[RepeatSummary]) -> str:
    return json.dumps([asdict(s) for s in summaries], indent=2)
