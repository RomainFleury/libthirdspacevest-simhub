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
  player_id?: string;  // Player that triggered the event
  player_num?: number; // Player number for game-specific events
  game_id?: string;    // Game that triggered the event
};

