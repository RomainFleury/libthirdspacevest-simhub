export type VestStatus = {
  connected: boolean;
  device_vendor_id?: number | null;
  device_product_id?: number | null;
  last_error?: string | null;
};

export type VestEffect = {
  label: string;
  cell: number;
  speed: number;
};

export type LogEntry = {
  id: string;
  message: string;
  ts: number;
  level?: "info" | "error";
};

