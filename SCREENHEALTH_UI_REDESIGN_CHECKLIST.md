# Screen Health UI Redesign - Implementation Checklist

This document tracks the implementation progress for the Screen Health UI redesign.

## Phase 1: Add IPC Handlers for Local Profile Management

### Storage Cleanup
- [ ] Remove `activeProfileId` from `screenHealthStorage.cjs`
- [ ] Remove `getActiveProfile()` function from storage
- [ ] Remove `setActiveProfile()` function from storage
- [ ] Update `loadState()` to not include `activeProfileId`
- [ ] Update `saveState()` to not save `activeProfileId`
- [ ] Update `upsertProfile()` to not set `activeProfileId` automatically

### IPC Handlers
- [ ] Add `screenHealth:listProfiles` handler in `screenHealthHandlers.cjs`
- [ ] Add `screenHealth:saveProfile` handler (always creates new, never updates)
- [ ] Add `screenHealth:deleteProfile` handler
- [ ] Add `screenHealth:getProfile` handler

### Preload & Bridge API
- [ ] Add IPC methods to `preload.cjs`
- [ ] Add TypeScript types to `bridgeApi.ts`
- [ ] Add function exports to `bridgeApi.ts`

## Phase 2: Create Profile Management Hook

- [ ] Create `useScreenHealthProfiles.ts` hook
- [ ] Implement profile list combining presets + local storage
- [ ] Implement unified profile type with `type: 'preset' | 'local'`
- [ ] Add `listProfiles()` function
- [ ] Add `saveProfile()` function (always creates new)
- [ ] Add `deleteProfile()` function
- [ ] Add `getProfile()` function
- [ ] Add loading state management
- [ ] Add error state management

## Phase 3: Update Integration Page

- [ ] Add profile selector dropdown/select box
- [ ] Implement profile list display with tags (Global/Local)
- [ ] Add profile selection state management
- [ ] Update `onStart` to use selected profile
- [ ] Update profile data extraction (preset vs local)
- [ ] Add cog/gear button linking to settings page
- [ ] Disable cog button when daemon is running
- [ ] Show active/running profile in status
- [ ] Remove old configuration panel
- [ ] Update setup guide text

## Phase 4: Create Settings Page

- [ ] Create `ScreenHealthSettingsPage.tsx`
- [ ] Add route registration in router
- [ ] Implement profile list display (presets + local)
- [ ] Add View/Preview button → preview page
- [ ] Add Edit button (local only) → builder with `?from=:id`
- [ ] Add Delete button (local only, disabled if running)
- [ ] Add "Add New Profile" button → builder
- [ ] Add refresh functionality
- [ ] Add disabled state when daemon is running
- [ ] Add placeholder section for future general settings

## Phase 5: Update Builder Page

### File Rename/Refactor
- [ ] Rename `ScreenHealthCalibrationPage.tsx` → `ScreenHealthBuilderPage.tsx`
- [ ] Update route from `/calibration` to `/builder`
- [ ] Update route registration
- [ ] Update imports/references

### Builder Page Updates
- [ ] Add disabled state when daemon is running
- [ ] Remove Start button from builder
- [ ] Update page title/description to "Profile Builder"
- [ ] Implement minimal template loading on page entry
- [ ] Implement URL parameter `?from=:id` handling
- [ ] Update `PresetProfilesSection` or replace with profile loader
- [ ] Add "Load from Preset" dropdown
- [ ] Add "Load from Local" dropdown
- [ ] Add "Save to Local" button
- [ ] Add duplicate name validation (warning only)
- [ ] Remove Start button from `ProfileActionsController`
- [ ] Update profile source tracking

## Phase 6: Create Preview Page

- [ ] Create `ScreenHealthPreviewPage.tsx`
- [ ] Add route registration `/preview/:id`
- [ ] Implement profile fetching by ID (preset or local)
- [ ] Display profile details in read-only mode
- [ ] Add Test button
- [ ] Add Edit button (local only) → builder with `?from=:id`
- [ ] Add Delete button (local only, disabled if running)
- [ ] Add back navigation links
- [ ] Add disabled state when daemon is running

## Phase 7: Testing & Refinement

- [ ] Test profile selection on integration page
- [ ] Test profile starting with preset
- [ ] Test profile starting with local profile
- [ ] Test settings page profile list
- [ ] Test profile deletion
- [ ] Test builder page default template loading
- [ ] Test builder page `?from=:id` parameter
- [ ] Test profile saving (creates new)
- [ ] Test duplicate name warning
- [ ] Test preview page for presets
- [ ] Test preview page for local profiles
- [ ] Test disabled states when daemon is running
- [ ] Test navigation between pages
- [ ] Verify no daemon-side changes needed

## Notes

- Git commits can be made at any logical checkpoint
- Each phase can be committed separately or combined as appropriate
- Test as you go to catch issues early
