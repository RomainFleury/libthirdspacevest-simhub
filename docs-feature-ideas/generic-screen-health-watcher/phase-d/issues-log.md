## Phase D — issues / decisions log

### Template
#### YYYY-MM-DD — <short title>
- **Context**:
- **Observed**:
- **Hypothesis**:
- **Investigation**:
- **Decision**:
- **Follow-ups**:

---

## Entries

### 2026-01-08 — Decisions: digits-only OCR, bundled deps, per-tick capable
- **Context**: Phase D planning constraints.
- **Decision**:
  - OCR should start **digits-only**.
  - OCR should assume **fixed font / stable glyphs** (strict) for speed and determinism.
  - OCR dependencies should be **bundled** in the Windows distribution.
  - The solution should be capable of running **per tick** (capture cadence), so profile needs stability controls.
- **Follow-ups**:
  - Confirm exact OCR implementation strategy (template matching vs lightweight classifier vs embedded OCR lib) that can realistically run per tick.

