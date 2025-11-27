import { VestEffect } from "../types";

/**
 * Third Space Vest Actuator Layout (8 cells total):
 * 
 * Physical cell mapping (hardware IDs):
 *     FRONT                    BACK
 *   ┌─────────┐            ┌─────────┐
 *   │ 2     5 │            │ 1     6 │
 *   │  Upper  │            │  Upper  │
 *   ├─────────┤            ├─────────┤
 *   │ 3     4 │            │ 0     7 │
 *   │  Lower  │            │  Lower  │
 *   └─────────┘            └─────────┘
 *     Left  Right           Left  Right
 */

// All 8 individual actuators (mapped to correct hardware cells)
export const actuatorEffects: VestEffect[] = [
  // Front actuators
  { label: "Front Upper Left", cell: 2, speed: 6 },
  { label: "Front Upper Right", cell: 5, speed: 6 },
  { label: "Front Lower Left", cell: 3, speed: 6 },
  { label: "Front Lower Right", cell: 4, speed: 6 },
  // Back actuators
  { label: "Back Upper Left", cell: 1, speed: 6 },
  { label: "Back Upper Right", cell: 6, speed: 6 },
  { label: "Back Lower Left", cell: 0, speed: 6 },
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

