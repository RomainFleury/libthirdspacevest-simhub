import { createContext, useContext, useEffect, useMemo, useRef } from "react";

type Ctx = {
  imgContainerRef: React.MutableRefObject<HTMLDivElement | null>;
  offscreenCanvasRef: React.MutableRefObject<HTMLCanvasElement | null>;
  imageLoadedRef: React.MutableRefObject<boolean>;
  getCanvasOrThrow: () => HTMLCanvasElement;
};

const C = createContext<Ctx | null>(null);

export function ScreenHealthCalibrationProvider(props: { dataUrl: string | null; children: React.ReactNode }) {
  const imgContainerRef = useRef<HTMLDivElement | null>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageLoadedRef = useRef(false);

  useEffect(() => {
    imageLoadedRef.current = false;
    if (!props.dataUrl) return;
    const canvas = offscreenCanvasRef.current;
    if (!canvas) return;
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      imageLoadedRef.current = true;
    };
    img.src = props.dataUrl;
  }, [props.dataUrl]);

  const value = useMemo<Ctx>(() => {
    return {
      imgContainerRef,
      offscreenCanvasRef,
      imageLoadedRef,
      getCanvasOrThrow: () => {
        const c = offscreenCanvasRef.current;
        if (!c) throw new Error("No calibration canvas");
        if (!imageLoadedRef.current) throw new Error("No screenshot loaded");
        return c;
      },
    };
  }, []);

  return <C.Provider value={value}>{props.children}</C.Provider>;
}

export function useScreenHealthCalibration() {
  const ctx = useContext(C);
  if (!ctx) throw new Error("useScreenHealthCalibration must be used within ScreenHealthCalibrationProvider");
  return ctx;
}

