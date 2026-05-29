"use client";

import { useEffect, useRef } from "react";
import QRCode from "qrcode";

interface QRPreviewProps {
  text: string;
  foreground: string;
  background: string;
}

export default function QRPreview({ text, foreground, background }: QRPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !text.trim()) return;
    QRCode.toCanvas(
      canvasRef.current,
      text.trim(),
      {
        width: 280,
        margin: 2,
        color: { dark: foreground, light: background },
      },
      (err) => {
        if (err) console.error(err);
      }
    );
  }, [text, foreground, background]);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <canvas ref={canvasRef} width={280} height={280} className="rounded-lg" />
      </div>
      {!text.trim() && (
        <p className="text-sm text-gray-400">Enter text to generate preview</p>
      )}
    </div>
  );
}
