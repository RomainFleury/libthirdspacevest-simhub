# Third Space Vest - Session Starter

Load this at the start of any chat: `@.cursor/prompts/onboard.md`

---

@.cursorrules @CHANGELOG.md

## Quick Context

I'm ready to help with the **Third Space Vest** project. I understand:

- 🚫 **Never modify** `legacy-do-not-change/`
- 🔌 **Daemon-centric**: All vest commands → TCP 5050 → Python Daemon
- 📦 **Isolation**: `vest/` package stays separate from integrations
- 🎮 **Game integrations**: Active integrations (CS2, Alyx, L4D2, SimHub). Some untested integrations archived in `misc-documentations/archived-untested-mods/`
- 🧪 **Testing**: Game integration tests MUST pass before PRs

## Key Commands

```bash
python3 -m modern_third_space.cli daemon start   # Start daemon (required!)
cd web && yarn dev                                # Start Electron UI

# MANDATORY for integration changes:
cd modern-third-space && python3 -m pytest tests/test_game_integrations.py -v
```

## Specialized Prompts

| Prompt | When to Use |
|--------|-------------|
| `@.cursor/prompts/new-game-integration.md` | Adding haptic support for a new game |
| `@.cursor/prompts/pr-review-checklist.md` | Reviewing/creating PRs with integration changes |

## What would you like to work on?

