# Multi-Page Navigation Feature

## Description

Reorganize the Electron UI from a single cluttered page into a multi-page navigation system with:
- **Always-visible sidebar**: Live logs + vest device selection
- **Navigation panel**: Tab/sidebar navigation between pages
- **Main content area**: Displays selected page

## Motivation

- **Reduce clutter** - Current UI has too much information on one page
- **Better organization** - Group related functionality into dedicated pages
- **Improved UX** - Easier to find and access specific features
- **Scalability** - Easier to add new sections without cluttering the main page

## User Story

As a **user**, I want to **navigate between organized sections** so that I can **easily find and use specific features without being overwhelmed by information**.

## Proposed Structure

### Always-Visible Sidebar
- **Live Logs** - Real-time command history
- **Device Selector** - Vest device selection and connection status

### Navigation Pages

1. **Games** (`/games`)
   - All integrated game panels
   - CS2, Alyx, SUPERHOT VR, Pistol Whip, etc.
   - EA Battlefront 2 settings

2. **Debug** (`/debug`)
   - Manual testing tools
   - Effect controls (actuator triggers)
   - Custom effect panel
   - Effects library
   - Status panel

3. **Mini-Games** (`/mini-games`)
   - In-UI games (from `feature-in-ui-games.md`)
   - Interactive games with haptic feedback
   - Placeholder for now, ready for future implementation

## Technical Considerations

- **React Router** - Need to add routing for multi-page navigation
- **Layout Component** - New `AppLayout` component to manage sidebar + main content
- **No backend changes** - Pure UI reorganization
- **Component reuse** - All existing components remain unchanged, just reorganized

## Implementation Plan

See `feature-multi-page-IMPLEMENTATION.md` for detailed implementation plan with:
- Architecture design
- Phase breakdown (7 phases)
- Code examples
- File structure
- Testing strategy
- Migration notes

## Benefits

- **Cleaner UI** - Less visual clutter
- **Better organization** - Related features grouped together
- **Easier navigation** - Clear separation between sections
- **Future-proof** - Easy to add new pages/sections

