export type ScreenHealthGameEvent = {
  id: string;
  type: "hit_recorded" | "health_percent" | "health_value" | "ammo_value" | "recoil_fired" | "debug";
  ts: number;
  roi?: string | null;
  direction?: string | null;
  score?: number;
  detector?: string | null;
  health_percent?: number;
  health_value?: number;
  ammo_value?: number;
  drop?: number;
  prev_value?: number;
  duration_ms?: number;
  debug_kind?: string;
  debug?: Record<string, unknown>;
};

export const MAX_SCREEN_HEALTH_EVENTS = 50;

