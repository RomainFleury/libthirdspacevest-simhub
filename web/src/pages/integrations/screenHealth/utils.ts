export function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

export function clampInt(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

export function parseRgbTriplet(value: string): [number, number, number] | null {
  const parts = value
    .split(/[,\s]+/g)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length !== 3) return null;
  const nums = parts.map((p) => Number(p));
  if (nums.some((n) => Number.isNaN(n))) return null;
  return [clampInt(nums[0], 0, 255), clampInt(nums[1], 0, 255), clampInt(nums[2], 0, 255)];
}

