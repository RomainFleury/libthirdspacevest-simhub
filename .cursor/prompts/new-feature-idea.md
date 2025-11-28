# New Feature Idea Workflow

Load this prompt when working on a new feature idea: `@.cursor/prompts/new-feature-idea.md`

---

@.cursorrules @CHANGELOG.md @docs-external-integrations-ideas/DAEMON_ARCHITECTURE.md

## 💡 Feature Idea Assistant

I'll help you take a feature idea and create a comprehensive implementation plan for the Third Space Vest project.

---

## Step 1: Understand the Feature Idea

**Please provide the feature idea** (or reference a file in `docs-feature-ideas/`), and I will:

1. **Analyze the feature** - Understand what it does and why it's useful
2. **Identify scope** - Determine what parts of the system it affects
3. **Check dependencies** - See if it depends on existing features or requires new infrastructure
4. **Assess complexity** - Estimate implementation difficulty

### 1.1 Review Existing Codebase

I'll check:
- **Similar features** - Are there existing features we can learn from?
- **Architecture patterns** - How do similar features fit into the system?
- **Integration points** - Where does this feature connect (daemon, UI, hardware)?

### 1.2 Identify Affected Components

Based on the feature, determine what needs to be modified or created:

| Component | When Needed |
|-----------|-------------|
| **Python Daemon** | Backend logic, event processing, hardware control |
| **Electron UI** | User interface, settings, controls |
| **React Components** | UI panels, visualizations, interactions |
| **Protocol** | New commands/events for daemon communication |
| **Hardware Layer** | New vest commands or cell patterns |
| **Documentation** | User guides, API docs, changelog |

---

## Step 2: Create Implementation Plan

### 2.1 Architecture Design

Design how the feature fits into the existing architecture:

```
┌─────────────────────────────────────────────────────────┐
│  Feature Component                                       │
│  • What it does                                         │
│  • How it connects to existing systems                  │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│  Integration Points                                     │
│  • Daemon (if backend logic)                            │
│  • UI (if user-facing)                                  │
│  • Protocol (if new commands needed)                     │
└─────────────────────────────────────────────────────────┘
```

### 2.2 Break Down into Phases

Organize implementation into logical phases:

**Phase 1: Foundation**
- Core functionality
- Basic integration
- Minimal viable feature

**Phase 2: Enhancement**
- Additional features
- UI polish
- Error handling

**Phase 3: Advanced**
- Advanced features
- Optimization
- Edge cases

### 2.3 File Structure

Determine what files need to be created or modified:

```
Files to Create/Modify:
├── Python Backend (if needed)
│   ├── modern-third-space/src/modern_third_space/
│   │   ├── server/{feature}_manager.py
│   │   └── {other modules}
│
├── Electron UI (if needed)
│   ├── web/electron/
│   │   ├── ipc/{feature}Handlers.cjs
│   │   └── {feature}Storage.cjs (if settings needed)
│
├── React Components (if needed)
│   ├── web/src/components/
│   │   └── {Feature}Panel.tsx
│   └── web/src/hooks/
│       └── use{Feature}.ts
│
└── Documentation
    ├── docs-feature-ideas/{feature}.md (idea doc)
    └── CHANGELOG.md (update on completion)
```

---

## Step 3: Implementation Details

### 3.1 Protocol Updates (if needed)

If the feature requires new daemon commands or events:

**Add to `server/protocol.py`:**
```python
# Commands
CommandType.{FEATURE}_START
CommandType.{FEATURE}_STOP
CommandType.{FEATURE}_STATUS
CommandType.{FEATURE}_ACTION  # If specific actions needed

# Events
EventType.{FEATURE}_STARTED
EventType.{FEATURE}_STOPPED
EventType.{FEATURE}_EVENT
```

**Add to `server/daemon.py`:**
```python
# Command handlers
async def _cmd_{feature}_start(self, command: Command, client_id: str) -> Response:
    """Handle {feature} start command."""
    # Implementation
    return response_ok(command.req_id)
```

### 3.2 UI Integration (if needed)

**Electron IPC Handlers:**
```javascript
// web/electron/ipc/{feature}Handlers.cjs
ipcMain.handle("{feature}:start", async () => {
    // Implementation
});

ipcMain.handle("{feature}:stop", async () => {
    // Implementation
});
```

**React Hook:**
```typescript
// web/src/hooks/use{Feature}.ts
export function use{Feature}() {
    const [status, setStatus] = useState<{Feature}Status>({...});
    // Implementation
}
```

**React Component:**
```typescript
// web/src/components/{Feature}Panel.tsx
export function {Feature}Panel() {
    const { status, enable, disable } = use{Feature}();
    // Implementation
}
```

### 3.3 Backend Logic (if needed)

**Manager Class:**
```python
# modern-third-space/src/modern_third_space/server/{feature}_manager.py
class {Feature}Manager:
    """Manages {feature} functionality."""
    
    def __init__(self, on_game_event, on_trigger):
        # Implementation
```

---

## Step 4: Testing Strategy

### 4.1 Unit Tests

What needs to be tested:
- Core functionality
- Edge cases
- Error handling

### 4.2 Integration Tests

How to test:
- End-to-end workflows
- UI interactions
- Daemon communication

### 4.3 User Testing

What to verify:
- Feature works as expected
- UI is intuitive
- No regressions

---

## Step 5: Documentation

### 5.1 Update Documentation

- **CHANGELOG.md** - Document the new feature
- **README.md** - Update if feature affects setup/usage
- **Feature doc** - Complete implementation details in `docs-feature-ideas/{feature}.md`

### 5.2 User-Facing Docs

If needed:
- Usage instructions
- Configuration options
- Troubleshooting

---

## Reference Patterns

### Existing Features to Learn From

| Feature | Location | Pattern |
|---------|----------|---------|
| **Game Integration** | `server/{game}_manager.py` | Event processing, haptic mapping |
| **Settings Storage** | `electron/{feature}Storage.cjs` | Persistent settings (CS2, BF2) |
| **UI Panel** | `components/{Game}IntegrationPanel.tsx` | React component with controls |
| **React Hook** | `hooks/use{Game}Integration.ts` | State management, IPC calls |

### Common Patterns

**Settings Storage:**
- Use Electron's `app.getPath("userData")` for storage location
- JSON format for settings
- Load/save functions

**IPC Handlers:**
- Register in `ipc/index.cjs`
- Expose in `preload.cjs`
- Call from React hooks

**Daemon Integration:**
- Manager class in `server/`
- Register in `daemon.py`
- Add protocol commands/events

---

## Implementation Checklist

### Planning Phase
- [ ] Feature idea documented in `docs-feature-ideas/`
- [ ] Architecture designed
- [ ] Files to create/modify identified
- [ ] Dependencies identified

### Implementation Phase
- [ ] Backend logic implemented (if needed)
- [ ] Protocol updated (if needed)
- [ ] UI components created (if needed)
- [ ] IPC handlers added (if needed)
- [ ] Settings storage added (if needed)

### Integration Phase
- [ ] Daemon integration complete
- [ ] UI integration complete
- [ ] All components connected

### Testing Phase
- [ ] Feature tested manually
- [ ] Edge cases handled
- [ ] Error handling verified
- [ ] No regressions

### Documentation Phase
- [ ] CHANGELOG.md updated
- [ ] Feature doc completed
- [ ] User-facing docs updated (if needed)

---

## Ready?

**Tell me about your feature idea** (or reference a file in `docs-feature-ideas/`) and I'll:

1. Analyze the feature and its requirements
2. Design the architecture and integration points
3. Create a detailed implementation plan
4. Break it down into manageable phases
5. Identify all files that need to be created or modified
6. Help implement it step by step

