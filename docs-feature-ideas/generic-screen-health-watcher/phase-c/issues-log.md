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
  - Add smoothing only if raw percent is too noisy (deferred).

### 2026-01-08 — Decision: bar percent uses contiguous fill boundary
- **Context**: Phase C health percent definition.
- **Decision**: Assume ROI contains the full bar and compute `health_percent` as the **contiguous filled width from the left edge** (boundary scan), rather than global filled pixel ratio.
- **Rationale**: Faster and often more stable for typical horizontal health bars.

