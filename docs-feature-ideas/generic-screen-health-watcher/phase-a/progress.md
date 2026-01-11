## Generic Screen Health Watcher — implementation progress tracker

This is a living checklist intended to be updated during implementation. It exists separately so we keep a trace of progress without rewriting older docs.

### Status
- **Current phase**: Phase A (MVP: hit recorded from redness ROI)
- **Owner**: (fill in)
- **Started**: 2026-01-08
- **Target**: (fill in)

---

## Phase A milestones

### Daemon
- [x] Register integration spec
- [x] Implement manager start/stop/status
- [ ] ROI-only capture working on Windows
- [x] Redness scoring produces stable values
- [x] Cooldown/debounce prevents hit spam
- [x] Hit triggers random-cell haptic
- [x] Daemon commands wired
- [x] Broadcast hit events for UI logs
- [x] Tests updated/passing

### Electron main
- [x] Profile storage + active profile
- [x] IPC: profile CRUD + import/export
- [x] IPC: screenshot capture (full frame for calibration)
- [x] IPC: list/delete/clear screenshots
- [x] Retention policy implemented
- [x] IPC: enable/disable watcher + status

### UI
- [x] Generic Screen Health integration page
- [x] Screenshot capture + ROI drawing
- [x] Threshold/cooldown controls
- [x] Captured screenshots panel (gallery)
- [x] Enable/disable + status indicator
- [x] Event log display (hit events)

---

## Notes / links
- Design docs:
  - `docs-feature-ideas/generic-screen-health-watcher/conception/phased-plan.md`
  - `docs-feature-ideas/generic-screen-health-watcher/phase-a/checklist.md`
  - `docs-feature-ideas/generic-screen-health-watcher/phase-a/details-by-domain.md`
