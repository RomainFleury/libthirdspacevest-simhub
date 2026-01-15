## Generic Screen Health Watcher — issues / decisions log

This file is a running log of implementation issues, investigations, and decisions made along the way.

---

## Template

### YYYY-MM-DD — <short title>
- **Context**:
- **Observed**:
- **Hypothesis**:
- **Investigation**:
- **Decision**:
- **Follow-ups**:

---

## Entries

### 2026-01-08 — pytest-asyncio strict mode requires explicit markers
- **Context**: Running the full `modern-third-space` pytest suite as part of Phase A “tests updated/passing”.
- **Observed**: Several `async def test_*` tests failed with “async def functions are not natively supported”.
- **Hypothesis**: `pytest-asyncio` was installed but tests were not marked for asyncio execution.
- **Investigation**: `pytest --trace-config` showed `pytest_asyncio.plugin` loaded; failures persisted because strict mode requires explicit `pytest.mark.asyncio`.
- **Decision**: Add `pytestmark = pytest.mark.asyncio` to the affected async test modules.
- **Follow-ups**: Ensure any new async tests include `pytest.mark.asyncio` (or module-level `pytestmark`).

### 2026-01-08 — Protocol response fields mismatch (multi-vest)
- **Context**: After enabling the async tests, protocol/daemon tests started asserting response payloads.
- **Observed**:
  - `Response.__init__()` raised on unexpected `device_id` kwarg.
  - `set_main_device` tests expected `response.device` to include `device_id`, but it was `None`.
- **Hypothesis**: Protocol helpers were using fields not present in the `Response` dataclass, and the helper omitted the expected `device` payload.
- **Investigation**: `response_set_main_device()` passed `device_id` into `Response` but `Response` lacked that field; daemon returned no device dict.
- **Decision**:
  - Add `device_id` to `Response`.
  - Update `response_set_main_device()` to accept/return a `device` dict (ensuring `device_id` is included).
  - Update daemon `_cmd_set_main_device()` to pass `device_info` into the response.
- **Follow-ups**: Consider auditing other response helpers for similar mismatches.

### 2026-01-08 — Screen capture dependency kept optional-import (mss)
- **Context**: Screen health watcher needs a capture backend, but CI/dev environments may not have capture deps installed.
- **Observed**: Manager needs to be importable for registry/structure tests even without screen-capture libs.
- **Decision**: Implement `_MSSCaptureBackend` with **lazy/optional import** of `mss` so tests remain importable.
- **Follow-ups**:
  - Validate ROI-only capture on Windows.
  - Decide whether to add `mss` as a required dependency for the daemon build (and ensure it’s bundled in Windows packaging).

### 2026-01-08 — Stored profile wrapper vs daemon profile JSON
- **Context**: Electron needs profile metadata (id, timestamps) while daemon expects a pure “profile JSON” with `schema_version/capture/detectors`.
- **Observed**: Storing the daemon profile directly made it awkward to track an active profile id + metadata.
- **Decision**: Persist profiles as `{ id, name, profile: <daemon-profile-json>, createdAt, updatedAt }`.
- **Follow-ups**: If schema evolves, migrate persisted state file `screen-health.json` carefully (add a version field if needed).

### 2026-01-08 — Add `mss` dependency for daemon runtime
- **Context**: Phase A capture loop relies on an `mss` backend at runtime.
- **Observed**: Without declaring `mss` as a dependency, Windows daemon builds/users may fail at runtime unless they manually install it.
- **Decision**: Add `mss>=9.0.1` to `modern-third-space/pyproject.toml` dependencies.
- **Follow-ups**: Validate capture on Windows (borderless/windowed) and ensure daemon packaging includes `mss` correctly.

### 2026-01-08 — Decision: ship “game presets” inside the Generic integration (Option A)
- **Context**: Need users to see “supported games” that are implemented via screen capture, with default JSON configs.
- **Observed**: Listing each capture-based game as its own integration page would create UI/page sprawl, even though they all share the same underlying integration.
- **Decision**: Use **Option A**:
  - Keep a single UI entry for **Generic Screen Health**.
  - Ship **bundled preset profiles** (default JSON configs) for specific games/layouts.
  - Provide an in-page “Preset profiles” selector and an **Install preset** action that copies the preset into user storage as an editable profile and sets it active.
- **Follow-ups**:
  - Decide preset source format (recommended: TS objects in `web/src/data/…` for easy bundling).
  - Add a “first run” default preset install (optional) so users always have at least one profile.
