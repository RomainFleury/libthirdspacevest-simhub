## Generic Screen Health Watcher — implementation progress tracker

This is a living checklist intended to be updated during implementation. It exists separately so we keep a trace of progress without rewriting older docs.

### Status
- **Current phase**: Phase A (MVP: hit recorded from redness ROI)
- **Owner**: (fill in)
- **Started**: (fill in date)
- **Target**: (fill in)

---

## Phase A milestones

### Daemon
- [ ] Register integration spec
- [ ] Implement manager start/stop/status
- [ ] ROI-only capture working on Windows
- [ ] Redness scoring produces stable values
- [ ] Cooldown/debounce prevents hit spam
- [ ] Hit triggers random-cell haptic
- [ ] Daemon commands wired
- [ ] Broadcast hit events for UI logs
- [ ] Tests updated/passing

### Electron main
- [ ] Profile storage + active profile
- [ ] IPC: profile CRUD + import/export
- [ ] IPC: screenshot capture (full frame for calibration)
- [ ] IPC: list/delete/clear screenshots
- [ ] Retention policy implemented
- [ ] IPC: enable/disable watcher + status

### UI
- [ ] Generic Screen Health integration page
- [ ] Screenshot capture + ROI drawing
- [ ] Threshold/cooldown controls
- [ ] Captured screenshots panel (gallery)
- [ ] Enable/disable + status indicator
- [ ] Event log display (hit events)

---

## Notes / links
- Design docs:
  - `docs-feature-ideas/generic-screen-health-watcher/conception/phased-plan.md`
  - `docs-feature-ideas/generic-screen-health-watcher/phase-a/checklist.md`
  - `docs-feature-ideas/generic-screen-health-watcher/phase-a/details-by-domain.md`
