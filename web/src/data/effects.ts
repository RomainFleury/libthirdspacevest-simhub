import { VestEffect } from "../types";

// Individual actuators (cells 0-3)
export const actuatorEffects: VestEffect[] = [
  { label: "Front Left", cell: 0, speed: 6 },
  { label: "Front Right", cell: 1, speed: 6 },
  { label: "Rear Left", cell: 2, speed: 6 },
  { label: "Rear Right", cell: 3, speed: 6 },
];

// Combined effects
export const combinedEffects: VestEffect[] = [
  { label: "Pulse All", cell: 4, speed: 8 },
  { label: "Full Blast", cell: 5, speed: 10 },
  { label: "Double Blast", cell: 6, speed: 9 },
];

// Legacy: keep for backwards compatibility
export const defaultEffects: VestEffect[] = [
  ...actuatorEffects,
  ...combinedEffects,
];

