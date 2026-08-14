from pathlib import Path

from modern_third_space.server.ocr.eval import (
    EngineReport,
    SampleResult,
    evaluate_folder,
    expected_ammo_from_stem,
    format_eval_table,
    format_repeat_table,
    list_eval_images,
    summarize_repeats,
)


def test_summarize_repeats_flags_inconsistent_predictions():
    def _run(preds: list[int | None]) -> EngineReport:
        report = EngineReport(engine="fake", available=True, correct=1, total=2)
        report.samples = [
            SampleResult("a.png", 1, preds[0], preds[0] == 1, ms=10.0),
            SampleResult("b.png", 2, preds[1], preds[1] == 2, ms=12.0),
        ]
        report.correct = sum(1 for s in report.samples if s.ok)
        report.apply_timings()
        return report

    summary = summarize_repeats([_run([1, 2]), _run([1, 9]), _run([1, 2])])
    assert summary.repeats == 3
    assert summary.stable_images == 1
    assert summary.unstable_images == 1
    assert summary.unstable[0].filename == "b.png"
    assert summary.unstable[0].predictions == [2, 9, 2]
    table = format_repeat_table([summary], folder=Path("."))
    assert "stable" in table
    assert "inconsistent" in table


def test_engine_report_timings():
    report = EngineReport(engine="fake", available=True, correct=2, total=3)
    report.samples = [
        SampleResult("a.png", 1, 1, True, ms=10.0),
        SampleResult("b.png", 2, 2, True, ms=20.0),
        SampleResult("c.png", 3, None, False, ms=30.0),
    ]
    report.apply_timings()
    assert report.avg_ms == 20.0
    assert report.median_ms == 20.0
    assert report.min_ms == 10.0
    assert report.max_ms == 30.0
    assert report.first_ms == 10.0
    table = format_eval_table([report], folder=Path("."))
    assert "avg_ms" in table
    assert "20.0" in table

FIXTURE_DIR = Path(__file__).resolve().parent / "fixtures" / "ammo_ocr"


def test_expected_ammo_from_stem():
    assert expected_ammo_from_stem("12") == 12
    assert expected_ammo_from_stem("07") == 7
    assert expected_ammo_from_stem("30_ut2004") == 30
    assert expected_ammo_from_stem("ammo") is None


def test_ocr_eval_runs_on_fixture_folder():
    folder = FIXTURE_DIR
    cases = list_eval_images(folder)
    if not cases:
        import pytest

        pytest.skip(f"Drop HUD crops into {folder} named like 12.png")

    reports = evaluate_folder(folder)
    print("\n" + format_eval_table(reports, folder))
    assert reports
    for report in reports:
        if report.available:
            assert report.total == len(cases)
            assert report.avg_ms > 0
            assert report.median_ms > 0
            assert all(s.ms >= 0 for s in report.samples)
