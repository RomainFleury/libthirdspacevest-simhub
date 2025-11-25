import { VestEffect } from "../types";

/**
 * Third Space Vest Actuator Layout (8 cells total):
 *
 *     FRONT                    BACK
 *   ┌─────────┐            ┌─────────┐
 *   │ 0     1 │            │ 4     5 │
 *   │  Upper  │            │  Upper  │
 *   ├─────────┤            ├─────────┤
 *   │ 2     3 │            │ 6     7 │
 *   │  Lower  │            │  Lower  │
 *   └─────────┘            └─────────┘
 *     Left  Right           Left  Right
 */

// All 8 individual actuators
export const actuatorEffects: VestEffect[] = [
  // Front actuators (cells 0-3)
  { label: "Front Upper Left", cell: 0, speed: 6 },
  { label: "Front Upper Right", cell: 1, speed: 6 },
  { label: "Front Lower Left", cell: 2, speed: 6 },
  { label: "Front Lower Right", cell: 3, speed: 6 },
  // Back actuators (cells 4-7)
  { label: "Back Upper Left", cell: 4, speed: 6 },
  { label: "Back Upper Right", cell: 5, speed: 6 },
  { label: "Back Lower Left", cell: 6, speed: 6 },
  { label: "Back Lower Right", cell: 7, speed: 6 },
];

// Combined/preset effects (these trigger multiple cells)
export const combinedEffects: VestEffect[] = [
  { label: "All Front", cell: -1, speed: 6, preset: "front" },
  { label: "All Back", cell: -2, speed: 6, preset: "back" },
  { label: "Full Blast", cell: -3, speed: 10, preset: "all" },
];

// Legacy: keep for backwards compatibility
export const defaultEffects: VestEffect[] = [
  ...actuatorEffects,
  ...combinedEffects,
];

