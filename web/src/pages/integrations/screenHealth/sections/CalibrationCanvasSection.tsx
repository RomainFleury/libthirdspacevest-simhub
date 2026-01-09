import type { RefObject } from "react";

export function CalibrationCanvasSection(props: {
  lastCapturedImage: { dataUrl: string } | null;
  detectorType: "redness_rois" | "health_bar" | "health_number";
  colorPickMode: null | "filled" | "empty";
  imgContainerRef: RefObject<HTMLDivElement>;
  offscreenCanvasRef: RefObject<HTMLCanvasElement>;
  drawing: { startX: number; startY: number; curX: number; curY: number } | null;
  onMouseDown: (e: any) => void;
  onMouseMove: (e: any) => void;
  onMouseUp: () => void;
  rois: Array<{ name: string; rect: { x: number; y: number; w: number; h: number } }>;
  healthBarRoi: { x: number; y: number; w: number; h: number } | null;
  healthNumberRoi: { x: number; y: number; w: number; h: number } | null;
}) {
  const {
    lastCapturedImage,
    detectorType,
    colorPickMode,
    imgContainerRef,
    offscreenCanvasRef,
    drawing,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    rois,
    healthBarRoi,
    healthNumberRoi,
  } = props;

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
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        style={{ cursor: colorPickMode ? "copy" : "crosshair" }}
      >
        <img src={lastCapturedImage.dataUrl} className="block w-full select-none" draggable={false} />
        <canvas ref={offscreenCanvasRef} className="hidden" />

        {detectorType === "redness_rois" &&
          rois.map((r, idx) => (
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

        {detectorType === "health_bar" && healthBarRoi && (
          <div
            className="absolute border-2 border-emerald-400/80 bg-emerald-400/10"
            style={{
              left: `${healthBarRoi.x * 100}%`,
              top: `${healthBarRoi.y * 100}%`,
              width: `${healthBarRoi.w * 100}%`,
              height: `${healthBarRoi.h * 100}%`,
            }}
            title="health_bar"
          />
        )}

        {detectorType === "health_number" && healthNumberRoi && (
          <div
            className="absolute border-2 border-emerald-400/80 bg-emerald-400/10"
            style={{
              left: `${healthNumberRoi.x * 100}%`,
              top: `${healthNumberRoi.y * 100}%`,
              width: `${healthNumberRoi.w * 100}%`,
              height: `${healthNumberRoi.h * 100}%`,
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

