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
};

