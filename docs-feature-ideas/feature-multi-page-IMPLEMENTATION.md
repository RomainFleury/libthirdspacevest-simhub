# Multi-Page Navigation - Implementation Plan

## Overview

Reorganize the Electron UI from a single cluttered page into a multi-page navigation system with:
- **Always-visible sidebar**: Live logs + vest device selection
- **Navigation panel**: Tab/sidebar navigation between pages
- **Main content area**: Displays selected page (Games, Debug, Mini-games)

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  App Layout                                                  │
│  ┌──────────┬──────────────────────────────────────────┐   │
│  │          │  Navigation Tabs                         │   │
│  │  Sidebar │  [Games] [Debug] [Mini-games]            │   │
│  │          ├──────────────────────────────────────────┤   │
│  │  Always  │                                          │   │
│  │  Visible │  Main Content Area                       │   │
│  │          │  (Page-specific content)                 │   │
│  │  - Logs  │                                          │   │
│  │  - Device│                                          │   │
│  │  Select  │                                          │   │
│  └──────────┴──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Implementation Phases

### Phase 1: Foundation - Routing & Layout Structure

**Goal**: Set up React Router and create the basic layout structure.

**Tasks**:
1. Install React Router DOM
2. Create main layout component with sidebar + main content
3. Set up route structure
4. Create placeholder pages for each section

**Files to Create**:
- `web/src/components/layout/AppLayout.tsx` - Main layout wrapper
- `web/src/components/layout/Sidebar.tsx` - Always-visible sidebar (logs + device)
- `web/src/components/layout/Navigation.tsx` - Navigation tabs/buttons
- `web/src/pages/GamesPage.tsx` - Integrated games list page
- `web/src/pages/DebugPage.tsx` - Debug/testing tools page
- `web/src/pages/MiniGamesPage.tsx` - Mini-games page (placeholder for now)

**Files to Modify**:
- `web/src/App.tsx` - Refactor to use routing and layout
- `web/package.json` - Add `react-router-dom` dependency

**Key Changes**:
- Move `LogPanel` and `DeviceSelector` to sidebar
- Extract game integration panels to `GamesPage`
- Extract debug controls to `DebugPage`
- Set up React Router with routes

---

### Phase 2: Games Page - Integrated Games List

**Goal**: Organize all game integration panels into a dedicated page.

**Tasks**:
1. Move all game integration panels to `GamesPage`
2. Create a grid/list layout for game panels
3. Add page header and description
4. Ensure panels work correctly in new location

**Files to Modify**:
- `web/src/pages/GamesPage.tsx` - Import and display all game panels
- `web/src/App.tsx` - Remove game panels from main App

**Components to Move**:
- `CS2IntegrationPanel`
- `AlyxIntegrationPanel`
- `SuperHotIntegrationPanel`
- `PistolWhipIntegrationPanel`
- `BF2SettingsPanel` (EA Battlefront 2 settings)

**Layout**:
- Grid layout (2-3 columns on large screens)
- Each game panel in a card
- Consistent spacing and styling

---

### Phase 3: Debug Page - Manual Testing Tools

**Goal**: Consolidate all manual testing/debugging tools into one page.

**Tasks**:
1. Move debug controls to `DebugPage`
2. Organize tools into logical sections
3. Add page header and description
4. Ensure all functionality works

**Files to Modify**:
- `web/src/pages/DebugPage.tsx` - Import and organize debug components
- `web/src/App.tsx` - Remove debug components from main App

**Components to Move**:
- `StatusPanel` - Device status and connection info
- `EffectControls` - Manual actuator triggers
- `CustomEffectPanel` - Custom command input
- `EffectsLibraryPanel` - Predefined effect patterns

**Layout**:
- Status section at top
- Effect controls in main area
- Effects library below
- Clear section headers

---

### Phase 4: Sidebar - Always-Visible Elements

**Goal**: Create a persistent sidebar with logs and device selection.

**Tasks**:
1. Create `Sidebar` component
2. Move `LogPanel` to sidebar
3. Move `DeviceSelector` to sidebar
4. Style sidebar for fixed/always-visible layout
5. Ensure sidebar doesn't interfere with main content

**Files to Create**:
- `web/src/components/layout/Sidebar.tsx`

**Files to Modify**:
- `web/src/components/layout/AppLayout.tsx` - Integrate sidebar
- `web/src/App.tsx` - Remove `LogPanel` and `DeviceSelector` from main layout

**Design Considerations**:
- Sidebar width: ~300-350px
- Collapsible option (future enhancement)
- Scrollable logs section
- Device selector at top or bottom of sidebar

---

### Phase 5: Navigation - Tab/Sidebar Navigation

**Goal**: Add navigation between pages.

**Tasks**:
1. Create `Navigation` component with tabs/buttons
2. Integrate with React Router
3. Add active state styling
4. Add icons for each page (optional)

**Files to Create**:
- `web/src/components/layout/Navigation.tsx`

**Files to Modify**:
- `web/src/components/layout/AppLayout.tsx` - Add navigation to layout

**Navigation Items**:
- **Games** - `/games` - All integrated game panels
- **Debug** - `/debug` - Manual testing tools
- **Mini-games** - `/mini-games` - In-UI games (from feature-in-ui-games)

**Design**:
- Horizontal tabs above main content, or
- Vertical sidebar navigation (if sidebar is on left)
- Active tab highlighted
- Smooth transitions

---

### Phase 6: Mini-Games Page - Placeholder for Future

**Goal**: Create placeholder page for mini-games feature.

**Tasks**:
1. Create `MiniGamesPage` component
2. Add placeholder content
3. Prepare structure for future mini-games integration

**Files to Create**:
- `web/src/pages/MiniGamesPage.tsx`

**Content**:
- Placeholder message: "Mini-games coming soon!"
- Reference to `feature-in-ui-games.md`
- Structure ready for future games

---

### Phase 7: Polish & Responsive Design

**Goal**: Ensure layout works on different screen sizes and polish UI.

**Tasks**:
1. Add responsive breakpoints
2. Test layout on different window sizes
3. Improve spacing and visual hierarchy
4. Add smooth transitions
5. Ensure sidebar doesn't break on small screens

**Considerations**:
- Mobile/tablet: Sidebar might need to collapse or stack
- Small windows: Navigation might need to be vertical
- Large screens: Optimize for wide layouts

---

## File Structure

```
web/src/
├── App.tsx                          # Main app entry (simplified)
├── components/
│   ├── layout/
│   │   ├── AppLayout.tsx            # Main layout wrapper
│   │   ├── Sidebar.tsx              # Always-visible sidebar
│   │   └── Navigation.tsx           # Navigation tabs/buttons
│   ├── [existing components...]     # Keep all existing components
│   └── ...
├── pages/
│   ├── GamesPage.tsx                # Integrated games list
│   ├── DebugPage.tsx                # Debug/testing tools
│   └── MiniGamesPage.tsx            # Mini-games (placeholder)
├── hooks/
│   └── [existing hooks...]          # Keep all existing hooks
└── ...
```

## Code Examples

### App.tsx (Simplified)

```typescript
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { GamesPage } from "./pages/GamesPage";
import { DebugPage } from "./pages/DebugPage";
import { MiniGamesPage } from "./pages/MiniGamesPage";

function App() {
  return (
    <BrowserRouter>
      <AppLayout>
        <Routes>
          <Route path="/" element={<GamesPage />} />
          <Route path="/games" element={<GamesPage />} />
          <Route path="/debug" element={<DebugPage />} />
          <Route path="/mini-games" element={<MiniGamesPage />} />
        </Routes>
      </AppLayout>
    </BrowserRouter>
  );
}

export default App;
```

### AppLayout.tsx

```typescript
import { Sidebar } from "./Sidebar";
import { Navigation } from "./Navigation";
import { Outlet } from "react-router-dom";
import { useVestDebugger } from "../../hooks/useVestDebugger";

export function AppLayout() {
  const { logs } = useVestDebugger();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <div className="flex h-screen">
        {/* Sidebar - Always visible */}
        <Sidebar logs={logs} />

        {/* Main content area */}
        <div className="flex-1 flex flex-col">
          {/* Navigation */}
          <Navigation />

          {/* Page content */}
          <main className="flex-1 overflow-y-auto p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
```

### Sidebar.tsx

```typescript
import { DeviceSelector } from "../DeviceSelector";
import { LogPanel } from "../LogPanel";
import { LogEntry } from "../../types";

type Props = {
  logs: LogEntry[];
};

export function Sidebar({ logs }: Props) {
  return (
    <aside className="w-80 bg-slate-900/50 border-r border-slate-800 flex flex-col">
      {/* Device Selector */}
      <div className="p-4 border-b border-slate-800">
        <DeviceSelector />
      </div>

      {/* Logs */}
      <div className="flex-1 overflow-hidden">
        <LogPanel logs={logs} />
      </div>
    </aside>
  );
}
```

### Navigation.tsx

```typescript
import { NavLink } from "react-router-dom";

export function Navigation() {
  return (
    <nav className="bg-slate-800/80 border-b border-slate-700 px-6">
      <div className="flex gap-1">
        <NavLink
          to="/games"
          className={({ isActive }) =>
            `px-4 py-3 text-sm font-medium transition-colors ${
              isActive
                ? "text-blue-400 border-b-2 border-blue-400"
                : "text-slate-400 hover:text-slate-200"
            }`
          }
        >
          Games
        </NavLink>
        <NavLink
          to="/debug"
          className={({ isActive }) =>
            `px-4 py-3 text-sm font-medium transition-colors ${
              isActive
                ? "text-blue-400 border-b-2 border-blue-400"
                : "text-slate-400 hover:text-slate-200"
            }`
          }
        >
          Debug
        </NavLink>
        <NavLink
          to="/mini-games"
          className={({ isActive }) =>
            `px-4 py-3 text-sm font-medium transition-colors ${
              isActive
                ? "text-blue-400 border-b-2 border-blue-400"
                : "text-slate-400 hover:text-slate-200"
            }`
          }
        >
          Mini-Games
        </NavLink>
      </div>
    </nav>
  );
}
```

### GamesPage.tsx

```typescript
import { CS2IntegrationPanel } from "../components/CS2IntegrationPanel";
import { AlyxIntegrationPanel } from "../components/AlyxIntegrationPanel";
import { SuperHotIntegrationPanel } from "../components/SuperHotIntegrationPanel";
import { PistolWhipIntegrationPanel } from "../components/PistolWhipIntegrationPanel";
import { BF2SettingsPanel } from "../components/BF2SettingsPanel";

export function GamesPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-white">Integrated Games</h1>
        <p className="mt-2 text-slate-400">
          Manage haptic feedback integrations for supported games.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <CS2IntegrationPanel />
        <AlyxIntegrationPanel />
        <SuperHotIntegrationPanel />
        <PistolWhipIntegrationPanel />
      </div>

      <BF2SettingsPanel />
    </div>
  );
}
```

### DebugPage.tsx

```typescript
import { useVestDebugger } from "../hooks/useVestDebugger";
import { StatusPanel } from "../components/StatusPanel";
import { EffectControls } from "../components/EffectControls";
import { CustomEffectPanel } from "../components/CustomEffectPanel";
import { EffectsLibraryPanel } from "../components/EffectsLibraryPanel";

export function DebugPage() {
  const {
    status,
    actuators,
    combined,
    activeCells,
    loading,
    refreshStatus,
    sendEffect,
    sendCustomCommand,
    haltAll,
  } = useVestDebugger();

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-white">Debug Console</h1>
        <p className="mt-2 text-slate-400">
          Manual testing tools for the Third Space Vest.
        </p>
      </header>

      {/* Status Section */}
      <StatusPanel
        status={status}
        onRefresh={refreshStatus}
        disabled={loading}
      />

      {/* Effect Controls */}
      <div className="grid gap-6 md:grid-cols-2">
        <EffectControls
          actuators={actuators}
          combined={combined}
          activeCells={activeCells}
          onSend={sendEffect}
          onStopAll={haltAll}
          disabled={loading}
        />
        <CustomEffectPanel
          onSend={sendCustomCommand}
          disabled={loading}
        />
      </div>

      {/* Effects Library */}
      <EffectsLibraryPanel />
    </div>
  );
}
```

### MiniGamesPage.tsx

```typescript
export function MiniGamesPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-white">Mini-Games</h1>
        <p className="mt-2 text-slate-400">
          Interactive games with haptic feedback.
        </p>
      </header>

      <div className="rounded-2xl bg-slate-800/80 p-8 text-center">
        <p className="text-slate-400">
          Mini-games coming soon! This feature will be implemented as part of
          the "In UI Games" feature.
        </p>
        <p className="mt-2 text-sm text-slate-500">
          See <code className="text-blue-400">docs-feature-ideas/feature-in-ui-games.md</code> for details.
        </p>
      </div>
    </div>
  );
}
```

## Dependencies

### New Package Required

```json
{
  "dependencies": {
    "react-router-dom": "^6.x.x"
  }
}
```

Install with:
```bash
cd web && yarn add react-router-dom
```

## Testing Strategy

### Manual Testing

1. **Navigation**:
   - Click each tab and verify page changes
   - Verify active tab is highlighted
   - Test browser back/forward buttons

2. **Sidebar**:
   - Verify logs update in real-time
   - Test device selector functionality
   - Verify sidebar stays visible when navigating

3. **Games Page**:
   - Verify all game panels display correctly
   - Test each game integration (start/stop)
   - Verify no functionality is broken

4. **Debug Page**:
   - Test all debug controls
   - Verify effect triggers work
   - Test custom commands
   - Verify effects library

5. **Layout**:
   - Test on different window sizes
   - Verify sidebar doesn't break layout
   - Test scrolling in main content area

### Edge Cases

- Very long log lists (should scroll)
- Many game integrations (should handle grid layout)
- Small window sizes (responsive behavior)
- No device connected (device selector should handle gracefully)

## Migration Notes

### Breaking Changes

- **URL Structure**: App now uses routes (`/games`, `/debug`, `/mini-games`)
- **Component Locations**: Some components moved to new pages
- **Layout Structure**: Main layout is now in `AppLayout` component

### Backward Compatibility

- All existing components remain unchanged
- All hooks remain unchanged
- All IPC handlers remain unchanged
- Only UI organization changes

## Future Enhancements

1. **Collapsible Sidebar**: Add button to collapse/expand sidebar
2. **Breadcrumbs**: Add breadcrumb navigation for nested pages
3. **Search**: Add search functionality for games/settings
4. **Favorites**: Allow users to favorite games
5. **Customizable Layout**: Let users rearrange sidebar position
6. **Keyboard Shortcuts**: Add keyboard navigation (e.g., `Ctrl+1` for Games)

## Success Criteria

- [ ] App loads with routing enabled
- [ ] Sidebar always visible with logs and device selector
- [ ] Navigation tabs work correctly
- [ ] Games page displays all game integrations
- [ ] Debug page has all manual testing tools
- [ ] Mini-games page is placeholder ready for future
- [ ] No functionality is broken
- [ ] Layout is responsive
- [ ] UI is less cluttered and more organized
- [ ] User can easily navigate between sections

## Implementation Checklist

### Phase 1: Foundation
- [ ] Install `react-router-dom`
- [ ] Create `AppLayout` component
- [ ] Create `Sidebar` component
- [ ] Create `Navigation` component
- [ ] Create placeholder pages
- [ ] Update `App.tsx` to use routing

### Phase 2: Games Page
- [ ] Move game integration panels to `GamesPage`
- [ ] Test all game integrations work
- [ ] Verify layout and styling

### Phase 3: Debug Page
- [ ] Move debug components to `DebugPage`
- [ ] Test all debug tools work
- [ ] Verify layout and styling

### Phase 4: Sidebar
- [ ] Move `LogPanel` to sidebar
- [ ] Move `DeviceSelector` to sidebar
- [ ] Style sidebar appropriately
- [ ] Test sidebar functionality

### Phase 5: Navigation
- [ ] Add navigation tabs
- [ ] Style active states
- [ ] Test navigation between pages

### Phase 6: Mini-Games Page
- [ ] Create placeholder page
- [ ] Add reference to feature doc

### Phase 7: Polish
- [ ] Test responsive design
- [ ] Polish styling
- [ ] Verify no regressions
- [ ] Update documentation

## Documentation Updates

- [ ] Update `CHANGELOG.md` with multi-page navigation feature
- [ ] Update `README.md` if navigation affects user workflow
- [ ] Update `docs-feature-ideas/feature-multi-page.md` with implementation status

