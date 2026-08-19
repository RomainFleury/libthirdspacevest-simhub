import { screenHealthEncodeCalibrationScreenshot } from "../../../lib/bridgeApi";
import { attachCalibrationScreenshot, type CalibrationScreenshot } from "./calibrationScreenshot";

export type ScreenshotPersistDecision = "keep" | "update";

export type ResolveCalibrationScreenshotResult =
  | { status: "ready"; shot: CalibrationScreenshot | null; boundPath: string | null }
  | { status: "needs-prompt" };

async function encodeCurrentImage(image: { path: string; dataUrl?: string }): Promise<CalibrationScreenshot> {
  const result = await screenHealthEncodeCalibrationScreenshot({
    path: image.path,
    dataUrl: image.dataUrl,
  });
  if (!result.success || !result.screenshot) {
    throw new Error(result.error || "Failed to encode calibration screenshot");
  }
  return result.screenshot;
}

/**
 * Decide which screenshot belongs in saved/exported JSON.
 *
 * - No canvas image: keep the previously loaded/embedded shot (or omit).
 * - Canvas image, nothing stored yet: encode the current image (no prompt).
 * - Canvas path still matches the bound path: reuse the stored shot (no re-encode).
 * - Canvas image changed and a stored shot exists: prompt unless the user already chose.
 */
export async function resolveCalibrationScreenshotForPersist(args: {
  currentImage: { path: string; dataUrl?: string } | null;
  loadedShot: CalibrationScreenshot | null;
  boundPath: string | null;
  decision?: ScreenshotPersistDecision;
}): Promise<ResolveCalibrationScreenshotResult> {
  const { currentImage, loadedShot, boundPath, decision } = args;
  if (!currentImage) {
    return { status: "ready", shot: loadedShot, boundPath };
  }
  if (!loadedShot) {
    const encoded = await encodeCurrentImage(currentImage);
    return { status: "ready", shot: encoded, boundPath: currentImage.path };
  }
  if (currentImage.path === boundPath) {
    return { status: "ready", shot: loadedShot, boundPath };
  }
  if (!decision) return { status: "needs-prompt" };
  if (decision === "keep") {
    return { status: "ready", shot: loadedShot, boundPath: currentImage.path };
  }
  const encoded = await encodeCurrentImage(currentImage);
  return { status: "ready", shot: encoded, boundPath: currentImage.path };
}

export function profileWithCalibrationScreenshot(
  profile: Record<string, any>,
  shot: CalibrationScreenshot | null
): Record<string, any> {
  return attachCalibrationScreenshot(profile, shot);
}
