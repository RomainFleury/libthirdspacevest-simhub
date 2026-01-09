export type ScreenHealthGameEvent = {
  id: string;
  type: "hit_recorded" | "health_percent" | "health_value";
  ts: number;
  roi?: string | null;
  direction?: string | null;
  score?: number;
  detector?: string | null;
  health_percent?: number;
  health_value?: number;
};

export const MAX_SCREEN_HEALTH_EVENTS = 50;

