# Pull Request Review Checklist

Load this prompt when reviewing or creating a PR: `@.cursor/prompts/pr-review-checklist.md`

---

@.cursorrules @modern-third-space/TESTING.md

## 🔍 PR Review Checklist

Before approving or merging any PR, verify the following:

---

## 1. Game Integration Changes

**If the PR touches any files in:**
- `modern-third-space/src/modern_third_space/server/*_manager.py`
- `modern-third-space/src/modern_third_space/integrations/`

**MANDATORY CHECKS:**

### 1.1 Run the Integration Test Suite

```bash
cd modern-third-space
python3 -m pytest tests/test_game_integrations.py -v
```

**All 27 tests must pass.** If any fail:
- ❌ DO NOT approve the PR
- 📝 Request changes with specific test failure details

### 1.2 For NEW Game Integrations

Verify the PR includes:

| Required | File | Check |
|----------|------|-------|
| ✅ | `integrations/registry.py` | New `GameIntegrationSpec` added |
| ✅ | `server/{game}_manager.py` | Manager class with required methods |
| ✅ | `tests/test_game_integrations.py` | Entry in `EXPECTED_INTEGRATIONS` snapshot |

If any are missing, request changes:
```
❌ Missing test snapshot update

Please add the new integration to EXPECTED_INTEGRATIONS in tests/test_game_integrations.py:

"{game_id}": {
    "game_name": "{Game Name}",
    "integration_type": "{type}",
    "status": "stable",
    "has_manager": True,
    "event_count_min": N,
},
```

### 1.3 For MODIFIED Existing Integrations

- Check that snapshot tests still pass (no accidental changes to other integrations)
- Verify event_count_min hasn't decreased (would indicate removed events)

---

## 2. Quick Test Commands

Run these to verify the PR:

```bash
# Game integration tests (REQUIRED for integration changes)
cd modern-third-space
python3 -m pytest tests/test_game_integrations.py -v

# All unit tests
python3 -m pytest tests/test_game_player_mapping.py tests/test_player_manager.py tests/test_vest_registry.py -v

# Full test suite (if time permits)
python3 -m pytest tests/ -v --ignore=tests/test_daemon*.py --ignore=tests/test_device*.py
```

---

## 3. Review Response Templates

### ✅ Approved (tests pass)

```
✅ **Approved**

Game integration tests verified:
- All 27 tests pass
- Registry properly updated
- Snapshot test updated for new integration
```

### ❌ Changes Requested (tests fail)

```
❌ **Changes Requested**

Game integration tests failed:

\`\`\`
[paste test output here]
\`\`\`

Please fix the following:
1. [specific issue]
2. [specific issue]
```

### ❌ Changes Requested (missing tests)

```
❌ **Changes Requested**

Missing required test updates:

- [ ] Add `GameIntegrationSpec` to `integrations/registry.py`
- [ ] Add entry to `EXPECTED_INTEGRATIONS` in `tests/test_game_integrations.py`

See `.cursor/prompts/new-game-integration.md` for the complete checklist.
```

---

## 4. Non-Regression Verification

The snapshot tests in `test_game_integrations.py` automatically detect:

| Check | What It Catches |
|-------|-----------------|
| `test_expected_integrations_exist` | Accidentally removed integrations |
| `test_integration_names_unchanged` | Renamed games without updating snapshot |
| `test_integration_types_unchanged` | Changed integration method unexpectedly |
| `test_integration_has_minimum_events` | Removed event types |
| `test_no_integrations_removed` | Any integration deleted |

If any of these fail, **the change is breaking existing functionality**.

---

## 5. Final Checklist

Before approving:

- [ ] `python3 -m pytest tests/test_game_integrations.py -v` passes
- [ ] New integrations have registry entry + snapshot update
- [ ] No existing integrations accidentally modified
- [ ] Documentation updated if public API changed
