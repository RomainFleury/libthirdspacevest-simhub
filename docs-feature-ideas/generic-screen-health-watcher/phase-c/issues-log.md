## Phase C — issues / decisions log

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

### 2026-01-08 — Decisions: health bar v1 is horizontal + single-color first
- **Context**: Phase C planning tradeoffs.
- **Decision**:
  - Start with **single-color filled bars**.
  - Phase C supports **horizontal bars only**.
  - Prefer **color sampling UX** (“health on/off” colors) with threshold fallback.
- **Performance note**:
  - Prefer the fastest implementation: per-pixel integer distance checks (L1 / abs-diff), avoid heavy image processing.
- **Follow-ups**:
  - Decide where segmented/gradient bars land (likely Phase C.1 or later).

