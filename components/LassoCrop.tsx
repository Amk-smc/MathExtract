/**
 * components/LassoCrop.tsx
 *
 * Reusable canvas crop tool: displays the image, user drags a rectangle to select a region.
 * On "Confirm Crop", crops that region to an offscreen canvas and passes the result as a
 * base64 data URL to onCrop. onCancel closes the tool without saving.
 */

"use client";

import { useEffect, useRef, useState } from "react";

export type LassoCropProps = {
  imageDataUrl: string;
  figureRef: string;
  onCrop: (base64DataUrl: string) => void;
  onCancel: () => void;
};

export function LassoCrop({
  imageDataUrl,
  figureRef,
  onCrop,
  onCancel,
}: LassoCropProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [start, setStart] = useState<{ x: number; y: number } | null>(null);
  const [rect, setRect] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.drawImage(img, 0, 0);
    };
    img.src = imageDataUrl;
  }, [imageDataUrl]);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const bounds = canvas.getBoundingClientRect();
    const scaleX = canvas.width / bounds.width;
    const scaleY = canvas.height / bounds.height;
    const clientX =
      "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY =
      "touches" in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    return {
      x: (clientX - bounds.left) * scaleX,
      y: (clientY - bounds.top) * scaleY,
    };
  };

  const redraw = (
    r: { x: number; y: number; w: number; h: number } | null
  ) => {
    const canvas = canvasRef.current;
    if (!canvas || !imgRef.current) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(imgRef.current, 0, 0);
    if (r) {
      ctx.strokeStyle = "#111827";
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 4]);
      ctx.strokeRect(r.x, r.y, r.w, r.h);
      ctx.fillStyle = "rgba(0,0,0,0.05)";
      ctx.fillRect(r.x, r.y, r.w, r.h);
    }
  };

  const onMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    const pos = getPos(e);
    setStart(pos);
    setDrawing(true);
    setRect(null);
  };

  const onMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing || !start) return;
    const pos = getPos(e);
    const r = {
      x: Math.min(start.x, pos.x),
      y: Math.min(start.y, pos.y),
      w: Math.abs(pos.x - start.x),
      h: Math.abs(pos.y - start.y),
    };
    setRect(r);
    redraw(r);
  };

  const onMouseUp = () => setDrawing(false);

  const handleConfirm = () => {
    if (!rect || rect.w < 5 || rect.h < 5 || !imgRef.current) return;
    const offscreen = document.createElement("canvas");
    offscreen.width = rect.w;
    offscreen.height = rect.h;
    const ctx = offscreen.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(
      imgRef.current,
      rect.x,
      rect.y,
      rect.w,
      rect.h,
      0,
      0,
      rect.w,
      rect.h
    );
    const dataUrl = offscreen.toDataURL("image/png");
    onCrop(dataUrl);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          Crop{" "}
          <span className="font-semibold text-gray-900">{figureRef}</span> —
          click and drag to select
        </p>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-gray-500 underline hover:text-gray-900"
        >
          Cancel
        </button>
      </div>
      <div className="max-h-[70vh] overflow-auto rounded-lg border border-gray-200">
        <canvas
          ref={canvasRef}
          className="block w-full cursor-crosshair"
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onTouchStart={onMouseDown}
          onTouchMove={(e) => {
            e.preventDefault();
            onMouseMove(e);
          }}
          onTouchEnd={onMouseUp}
        />
      </div>
      <button
        type="button"
        onClick={handleConfirm}
        disabled={!rect}
        className={`w-full rounded-lg py-2 text-sm font-semibold transition-all ${
          rect
            ? "bg-black text-white hover:bg-gray-800"
            : "cursor-not-allowed bg-gray-200 text-gray-400"
        }`}
      >
        Confirm Crop
      </button>
    </div>
  );
}
