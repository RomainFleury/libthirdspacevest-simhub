# Third Space Vest - Session Starter

Load this at the start of any chat: `@.cursor/prompts/onboard.md`

---

@.cursorrules @CHANGELOG.md

## Quick Context

I'm ready to help with the **Third Space Vest** project. I understand:

- 🚫 **Never modify** `legacy-do-not-change/`
- 🔌 **Daemon-centric**: All vest commands → TCP 5050 → Python Daemon
- 📦 **Isolation**: `vest/` package stays separate from integrations
- 🎮 **Game integrations**: CS2 GSI and Half-Life: Alyx already implemented

## Key Commands

```bash
python3 -m modern_third_space.cli daemon start   # Start daemon (required!)
cd web && yarn dev                                # Start Electron UI
```

## Specialized Prompts

| Prompt | When to Use |
|--------|-------------|
| `@.cursor/prompts/new-game-integration.md` | Adding haptic support for a new game |

## What would you like to work on?

