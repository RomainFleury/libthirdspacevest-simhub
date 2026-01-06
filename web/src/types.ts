export type VestStatus = {
  connected: boolean;
  device_vendor_id?: number | null;
  device_product_id?: number | null;
  device_bus?: number | null;
  device_address?: number | null;
  device_serial_number?: string | null;
  last_error?: string | null;
};

export type VestEffect = {
  label: string;
  cell: number;
  speed: number;
  preset?: string; // For combined effects: "front", "back", "all"
  device_id?: string;  // Optional: target specific device
  player_id?: string;  // Optional: target specific player
  game_id?: string;    // Optional: for game-specific targeting
  player_num?: number; // Optional: player number for game-specific targeting
};

export type VestDevice = {
  vendor_id: string;
  product_id: string;
  bus: number;
  address: number;
  serial_number: string | null;
};

export type LogEntry = {
  id: string;
  message: string;
  ts: number;
  level?: "info" | "error";
  device_id?: string;  // Device that triggered the event
  player_num?: number; // Player number for game-specific events
  game_id?: string;    // Game that triggered the event
};

// Bundled Game Mods Types
export type BundledMod = {
  id: string;
  name: string;
  description: string;
  bundled: boolean;        // Whether mod files are bundled with the app
  files: string[];         // List of mod files
  targetFolder: string;    // Where to install in game directory
  externalUrl: string | null; // External download URL (if not bundled)
};

export type ModsListResult = {
  success: boolean;
  mods?: BundledMod[];
  error?: string;
};

export type ModCheckResult = {
  success: boolean;
  bundled?: boolean;
  files?: Record<string, boolean>;
  modPath?: string;
  reason?: string;
  error?: string;
};

export type ModSaveResult = {
  success: boolean;
  copiedFiles?: string[];
  destination?: string;
  savedTo?: string;
  canceled?: boolean;
  errors?: string[];
  error?: string;
};

