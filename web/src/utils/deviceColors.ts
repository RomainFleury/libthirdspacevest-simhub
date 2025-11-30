/**
 * Device color mapping utility.
 * Provides consistent color mapping for devices across the UI.
 */

// Color palette for devices
export const DEVICE_COLORS = [
  "bg-blue-500/20 text-blue-300 border-blue-500/50",
  "bg-green-500/20 text-green-300 border-green-500/50",
  "bg-purple-500/20 text-purple-300 border-purple-500/50",
  "bg-yellow-500/20 text-yellow-300 border-yellow-500/50",
  "bg-pink-500/20 text-pink-300 border-pink-500/50",
  "bg-cyan-500/20 text-cyan-300 border-cyan-500/50",
  "bg-orange-500/20 text-orange-300 border-orange-500/50",
  "bg-indigo-500/20 text-indigo-300 border-indigo-500/50",
];

// Solid color variants for badges and indicators
export const DEVICE_COLORS_SOLID = [
  "bg-blue-500 text-white",
  "bg-green-500 text-white",
  "bg-purple-500 text-white",
  "bg-yellow-500 text-white",
  "bg-pink-500 text-white",
  "bg-cyan-500 text-white",
  "bg-orange-500 text-white",
  "bg-indigo-500 text-white",
];

// Border color variants
export const DEVICE_COLORS_BORDER = [
  "border-blue-500",
  "border-green-500",
  "border-purple-500",
  "border-yellow-500",
  "border-pink-500",
  "border-cyan-500",
  "border-orange-500",
  "border-indigo-500",
];

/**
 * Get a consistent color class for a device ID.
 * Uses a simple hash function to ensure the same device always gets the same color.
 */
export function getDeviceColor(deviceId: string | undefined): string {
  if (!deviceId) return "";
  // Simple hash function to get consistent color for same ID
  let hash = 0;
  for (let i = 0; i < deviceId.length; i++) {
    hash = deviceId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return DEVICE_COLORS[Math.abs(hash) % DEVICE_COLORS.length];
}

/**
 * Get a solid color class for a device ID (for badges, indicators, etc.).
 */
export function getDeviceColorSolid(deviceId: string | undefined): string {
  if (!deviceId) return "";
  let hash = 0;
  for (let i = 0; i < deviceId.length; i++) {
    hash = deviceId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return DEVICE_COLORS_SOLID[Math.abs(hash) % DEVICE_COLORS_SOLID.length];
}

/**
 * Get a border color class for a device ID.
 */
export function getDeviceColorBorder(deviceId: string | undefined): string {
  if (!deviceId) return "border-gray-200 dark:border-gray-700";
  let hash = 0;
  for (let i = 0; i < deviceId.length; i++) {
    hash = deviceId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return DEVICE_COLORS_BORDER[Math.abs(hash) % DEVICE_COLORS_BORDER.length];
}

/**
 * Extract just the border color from the full device color class string.
 */
export function getDeviceBorderFromColor(deviceId: string | undefined): string {
  if (!deviceId) return "border-gray-200 dark:border-gray-700";
  const fullColor = getDeviceColor(deviceId);
  // Extract border color (third part of the class string)
  const parts = fullColor.split(' ');
  const borderPart = parts.find(p => p.startsWith('border-'));
  return borderPart || getDeviceColorBorder(deviceId);
}

/**
 * Get a small colored dot/badge component class for a device.
 */
export function getDeviceDotColor(deviceId: string | undefined): string {
  if (!deviceId) return "bg-gray-400";
  let hash = 0;
  for (let i = 0; i < deviceId.length; i++) {
    hash = deviceId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    "bg-blue-500",
    "bg-green-500",
    "bg-purple-500",
    "bg-yellow-500",
    "bg-pink-500",
    "bg-cyan-500",
    "bg-orange-500",
    "bg-indigo-500",
  ];
  return colors[Math.abs(hash) % colors.length];
}

