import type { EventDisplayInfo } from "../../../types/integratedGames";

export const EVENT_DISPLAY_MAP: Record<string, EventDisplayInfo> = {
  hit_recorded: { label: "Hit", icon: "💥", color: "text-red-400" },
  health_percent: { label: "Health %", icon: "❤️", color: "text-emerald-400" },
  health_value: { label: "Health", icon: "Health", color: "text-emerald-400" },
  ammo_value: { label: "Ammo", icon: "Ammo", color: "text-amber-300" },
  recoil_fired: { label: "Recoil", icon: "Recoil", color: "text-amber-400" },
  debug: { label: "Debug", icon: "🔎", color: "text-slate-300" },
};

export const DIRECTION_KEYS = [
  "",
  "front",
  "back",
  "left",
  "right",
  "front_left",
  "front_right",
  "back_left",
  "back_right",
] as const;

