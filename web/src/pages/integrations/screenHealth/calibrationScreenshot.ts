export type CalibrationScreenshot = {
  mime: string;
  data: string;
  width: number;
  height: number;
  sha256: string;
};

const META_KEY = "calibration_screenshot";

export function getCalibrationScreenshot(profile: Record<string, any> | null | undefined): CalibrationScreenshot | null {
  const raw = profile?.meta?.[META_KEY];
  if (!raw || typeof raw !== "object") return null;
  const mime = typeof raw.mime === "string" ? raw.mime : "";
  const data = typeof raw.data === "string" ? raw.data : "";
  const sha256 = typeof raw.sha256 === "string" ? raw.sha256 : "";
  const width = Number(raw.width || 0);
  const height = Number(raw.height || 0);
  if (!mime || !data) return null;
  return { mime, data, width, height, sha256 };
}

export function attachCalibrationScreenshot(
  profile: Record<string, any>,
  shot: CalibrationScreenshot | null
): Record<string, any> {
  const meta = { ...(profile.meta && typeof profile.meta === "object" ? profile.meta : {}) };
  if (shot) meta[META_KEY] = shot;
  else delete meta[META_KEY];
  return { ...profile, meta };
}

/** Drop the embedded screenshot so daemon TCP payloads stay small. */
export function stripCalibrationScreenshot(profile: Record<string, any>): Record<string, any> {
  if (!profile || typeof profile !== "object") return profile;
  const meta = profile.meta;
  if (!meta || typeof meta !== "object" || !(META_KEY in meta)) return profile;
  const nextMeta = { ...meta };
  delete nextMeta[META_KEY];
  return { ...profile, meta: nextMeta };
}

export function screenshotFingerprint(shot: CalibrationScreenshot | null | undefined): string | null {
  if (!shot?.sha256 && !shot?.data) return null;
  return shot.sha256 || `${shot.data.length}:${shot.data.slice(0, 48)}`;
}

export type RestoreCalibrationScreenshotLoader = (payload: {
  path?: string;
  dataUrl?: string;
  shot?: CalibrationScreenshot;
  url?: string;
}) => Promise<{ image: { path: string }; screenshot: CalibrationScreenshot | null }>;

/** Load an embedded JSON screenshot or a bundled preset image onto the canvas. */
export async function restoreCalibrationScreenshot(args: {
  profile: Record<string, any>;
  exampleScreenshotUrl?: string;
  load: RestoreCalibrationScreenshotLoader;
}): Promise<{ shot: CalibrationScreenshot | null; path: string | null }> {
  const embedded = getCalibrationScreenshot(args.profile);
  if (!embedded && !args.exampleScreenshotUrl) {
    return { shot: null, path: null };
  }
  const result = await args.load({
    shot: embedded || undefined,
    url: embedded ? undefined : args.exampleScreenshotUrl,
  });
  return { shot: embedded || result.screenshot, path: result.image.path };
}
