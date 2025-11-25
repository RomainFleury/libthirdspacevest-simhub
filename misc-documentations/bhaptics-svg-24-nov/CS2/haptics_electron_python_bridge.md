# AI Integration Guide: Triggering Haptics via Electron-Python Bridge

## Purpose
This document is intended for AI or automation contributors and describes the step-by-step integration required to link telemetry/game events (e.g., from Counter-Strike 2) to haptic feedback through the Electron-Python bridge in this project.

---

## 1. Project Structure & Relevant Files
- **Electron App (Node.js/JS):** `web/electron/`
    - `main.cjs`, `preload.cjs`: Electron lifecycle and app entry points
    - `pythonBridge.cjs`: Handles IPC or socket communication with Python backend
- **Frontend:** `web/src/`
    - Where user or UI triggers might originate

- **Backend Python:**
    - Handles actual haptic control (legacy or modernized code in `/modern-third-space` or Electron-linked Python scripts)

## 2. Integration Goals
- **Capture**: Receive telemetry/game events, ideally via the established CounterStrike2GSI data flow or a similar mechanism.
- **Bridge**: Translate these events into specific haptic trigger commands.
- **Trigger**: Send these commands through the Electron-Python bridge for execution on the vest hardware.

## 3. Actionable Steps / Checklist

1. **Event Source**: Ensure Node/Electron is receiving the source data (from GSI, HTTP, sockets, etc.)
    - Inspect or extend how game events arrive in the Electron backend
2. **Parsing Logic**: Add logic (in Electron/JS) to extract relevant triggers (e.g., damage, round change, bomb plant)
3. **Trigger Mapping**: Define mapping of game events to haptic patterns/effects
4. **Electron → Python Bridge**:
    - *If using IPC*: Implement an IPC channel between Electron and the Python process for sending trigger messages.
    - *If using sockets*: Ensure message format is agreed upon (JSON, plain text, etc.)
    - See: `pythonBridge.cjs`
5. **Python Handler** (backend):
    - Receive the message/command from Electron
    - Call or wrap the bHaptics/vest control function
    - Confirm correct triggering (can start with a simple log output)
6. **Testing**: Simulate end-to-end by sending test event data through the full stack
7. **Error Handling & Logging**: Add robust error checking, logging, and (optionally) feedback from Python to Electron

## 4. Useful Reference
- [CounterStrike2GSI](https://github.com/antonpup/CounterStrike2GSI) for event flow model
- Project's `/web/electron/pythonBridge.cjs` as the bridge point
- Any custom haptic control functions in Python backend

## 5. Automation/AI Tips
- When generating code, ensure changes are minimal, backward compatible, and include comments for maintainability
- AI agents should propose integration strategies, fallback mechanisms, and update this document with lessons learned or new patterns

---

Document owner: AI/Automation team. Please propose improvements to keep this as actionable and up-to-date as possible.
