# In-UI Games Feature

## Description

Create a framework for web-based mini-games within the Electron UI that can trigger haptic feedback on the vest. Games are accessible from a dedicated page/section and each game has its own page.

## Motivation

- **Fun way to test the vest** - Interactive games make testing haptic feedback engaging
- **Showcase haptic capabilities** - Demonstrate different haptic patterns and effects
- **Extensible framework** - Easy to add new games over time
- **No external dependencies** - Games run entirely within the UI

## User Story

As a **user**, I want to **play interactive games that trigger haptic feedback** so that I can **test and experience the vest in a fun way**.

## Example Game: Roulette

- Player clicks a box/button
- Game picks a random number between 1 and 10
- **10** = Front hit (cells 2, 5, 3, 4) - strong feedback
- **1** = Back hit (cells 1, 6, 0, 7) - strong feedback
- **2-9** = Light front feedback (cells 2, 5, 3, 4) - gentle feedback

## Technical Considerations

- **Routing needed** - Currently single-page app, need React Router for navigation
- **Game framework** - Reusable hook/API for haptic triggers from games
- **No backend changes** - Games use existing haptic API (`triggerEffect`)
- **No protocol changes** - Uses existing `vest:trigger` IPC handler

## Proposed Solution

1. **Add React Router** - Enable navigation between main page and games section
2. **Create game framework** - `useGameHaptics` hook for easy haptic triggers
3. **Games list page** - Browse available games
4. **Individual game pages** - Each game has its own route/component
5. **Game registry** - Easy to add new games

## Implementation Plan

See `feature-in-ui-games-IMPLEMENTATION.md` for detailed implementation plan with:
- Architecture design
- Phase breakdown
- Code examples
- File structure
- Testing strategy

## Future Games Ideas

Once framework is in place:
- **Whack-a-Mole** - Click moles, haptic on hit
- **Reaction Test** - Click when light appears
- **Simon Says** - Follow pattern with haptics
- **Target Practice** - Directional haptics
- **Rhythm Game** - Tap in rhythm