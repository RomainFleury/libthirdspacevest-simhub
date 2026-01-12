import { useCallback, useMemo, useState } from "react";
import { useScreenHealthCalibration } from "../draft/CalibrationContext";
import { useScreenHealthHealthBarDraft, useScreenHealthHealthBarDraftControls } from "../draft/HealthBarDraftContext";
import { useScreenHealthHealthNumberDraft, useScreenHealthHealthNumberDraftControls } from "../draft/HealthNumberDraftContext";
import { useScreenHealthProfileDraft } from "../draft/ProfileDraftContext";
import { useScreenHealthRednessDraft, useScreenHealthRednessDraftControls } from "../draft/RednessDraftContext";
import { clamp01, clampInt } from "../utils";

export function CalibrationCanvasSection(props: { lastCapturedImage: { dataUrl: string } | null }) {
  const { lastCapturedImage } = props;
  const { imgContainerRef, offscreenCanvasRef, imageLoadedRef } = useScreenHealthCalibration();
  const profile = useScreenHealthProfileDraft();
  const redness = useScreenHealthRednessDraft();
  const { setRois } = useScreenHealthRednessDraftControls();
  const hb = useScreenHealthHealthBarDraft();
  const { setRoi: setHealthBarRoi, setFilledRgb, setEmptyRgb, setColorPickMode } = useScreenHealthHealthBarDraftControls();
  const hn = useScreenHealthHealthNumberDraft();
  const { setRoi: setHealthNumberRoi } = useScreenHealthHealthNumberDraftControls();

  const detectorType = profile.detectorType;

  const [drawing, setDrawing] = useState<{ startX: number; startY: number; curX: number; curY: number } | null>(null);

  const pickColorAtMouse = useCallback(
    (e: React.MouseEvent) => {
      if (!hb.colorPickMode || !imgContainerRef.current) return false;
      const canvas = offscreenCanvasRef.current;
      if (!canvas || !imageLoadedRef.current) return false;
      const ctx = canvas.getContext("2d");
      if (!ctx) return false;

      const rect = imgContainerRef.current.getBoundingClientRect();
      const nx = clamp01((e.clientX - rect.left) / rect.width);
      const ny = clamp01((e.clientY - rect.top) / rect.height);
      const px = clampInt(Math.floor(nx * canvas.width), 0, canvas.width - 1);
      const py = clampInt(Math.floor(ny * canvas.height), 0, canvas.height - 1);
      const data = ctx.getImageData(px, py, 1, 1).data; // RGBA
      const rgb: [number, number, number] = [data[0], data[1], data[2]];
      if (hb.colorPickMode === "filled") setFilledRgb(rgb);
      else setEmptyRgb(rgb);
      setColorPickMode(null);
      return true;
    },
    [hb.colorPickMode, imgContainerRef, offscreenCanvasRef, imageLoadedRef, setEmptyRgb, setFilledRgb, setColorPickMode]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (pickColorAtMouse(e)) return;
      if (!imgContainerRef.current) return;
      const rect = imgContainerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setDrawing({ startX: x, startY: y, curX: x, curY: y });
    },
    [pickColorAtMouse, imgContainerRef]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!drawing || !imgContainerRef.current) return;
      const rect = imgContainerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setDrawing({ ...drawing, curX: x, curY: y });
    },
    [drawing, imgContainerRef]
  );

  const handleMouseUp = useCallback(() => {
    if (!drawing || !imgContainerRef.current) return;
    const rect = imgContainerRef.current.getBoundingClientRect();
    const x1 = Math.min(drawing.startX, drawing.curX);
    const y1 = Math.min(drawing.startY, drawing.curY);
    const x2 = Math.max(drawing.startX, drawing.curX);
    const y2 = Math.max(drawing.startY, drawing.curY);
    const w = x2 - x1;
    const h = y2 - y1;
    setDrawing(null);
    if (w < 5 || h < 5) return;

    const newRect = { x: clamp01(x1 / rect.width), y: clamp01(y1 / rect.height), w: clamp01(w / rect.width), h: clamp01(h / rect.height) };
    if (detectorType === "health_bar") setHealthBarRoi(newRect);
    else if (detectorType === "health_number") setHealthNumberRoi(newRect);
    else setRois((prev) => [...prev, { name: `roi_${prev.length + 1}`, direction: "", rect: newRect }]);
  }, [drawing, detectorType, imgContainerRef, setHealthBarRoi, setHealthNumberRoi, setRois]);

  const cursor = hb.colorPickMode ? "copy" : "crosshair";
  const overlays = useMemo(() => {
    if (detectorType === "redness_rois") return { rois: redness.rois, hbRoi: null, hnRoi: null };
    if (detectorType === "health_bar") return { rois: [], hbRoi: hb.roi, hnRoi: null };
    return { rois: [], hbRoi: null, hnRoi: hn.roi };
  }, [detectorType, redness.rois, hb.roi, hn.roi]);

  if (!lastCapturedImage) return null;

  return (
    <div className="space-y-3">
      <div className="text-sm text-slate-400">
        {detectorType === "health_bar"
          ? "Drag on the image to set the Health Bar ROI. (Saved config will be sent to the daemon when you click Start.)"
          : detectorType === "health_number"
            ? "Drag on the image to set the Health Number ROI. (Saved config will be sent to the daemon when you click Start.)"
            : "Drag on the image to add ROIs. (Saved ROIs will be sent to the daemon when you click Start.)"}
      </div>
      <div
        ref={imgContainerRef}
        className="relative w-full overflow-hidden rounded-xl ring-1 ring-white/10 bg-slate-900/30"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        style={{ cursor }}
      >
        <img src={lastCapturedImage.dataUrl} className="block w-full select-none" draggable={false} />
        <canvas ref={offscreenCanvasRef} className="hidden" />

        {detectorType === "redness_rois" &&
          overlays.rois.map((r, idx) => (
            <div
              key={`${r.name}-${idx}`}
              className="absolute border-2 border-emerald-400/80 bg-emerald-400/10"
              style={{
                left: `${r.rect.x * 100}%`,
                top: `${r.rect.y * 100}%`,
                width: `${r.rect.w * 100}%`,
                height: `${r.rect.h * 100}%`,
              }}
              title={r.name}
            />
          ))}

        {detectorType === "health_bar" && overlays.hbRoi && (
          <div
            className="absolute border-2 border-emerald-400/80 bg-emerald-400/10"
            style={{
              left: `${overlays.hbRoi.x * 100}%`,
              top: `${overlays.hbRoi.y * 100}%`,
              width: `${overlays.hbRoi.w * 100}%`,
              height: `${overlays.hbRoi.h * 100}%`,
            }}
            title="health_bar"
          />
        )}

        {detectorType === "health_number" && overlays.hnRoi && (
          <div
            className="absolute border-2 border-emerald-400/80 bg-emerald-400/10"
            style={{
              left: `${overlays.hnRoi.x * 100}%`,
              top: `${overlays.hnRoi.y * 100}%`,
              width: `${overlays.hnRoi.w * 100}%`,
              height: `${overlays.hnRoi.h * 100}%`,
            }}
            title="health_number"
          />
        )}

        {drawing && (
          <div
            className="absolute border-2 border-blue-400/80 bg-blue-400/10"
            style={{
              left: `${(Math.min(drawing.startX, drawing.curX) / (imgContainerRef.current?.getBoundingClientRect().width || 1)) * 100}%`,
              top: `${(Math.min(drawing.startY, drawing.curY) / (imgContainerRef.current?.getBoundingClientRect().height || 1)) * 100}%`,
              width: `${(Math.abs(drawing.curX - drawing.startX) / (imgContainerRef.current?.getBoundingClientRect().width || 1)) * 100}%`,
              height: `${(Math.abs(drawing.curY - drawing.startY) / (imgContainerRef.current?.getBoundingClientRect().height || 1)) * 100}%`,
            }}
          />
        )}
      </div>
    </div>
  );
}

