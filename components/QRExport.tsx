"use client";

import { useState } from "react";

interface QRExportProps {
  text: string;
  foreground: string;
  background: string;
  userId?: string;
}

export default function QRExport({ text, foreground, background, userId }: QRExportProps) {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    if (!text.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/qr/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: text.trim(),
          fill_color: foreground,
          back_color: background,
          user_id: userId ?? "anonymous",
        }),
      });

      if (!res.ok) throw new Error("Backend service failed to generate QR");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "qrcode.png";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleDownload}
      disabled={loading || !text.trim()}
      className="w-full rounded-lg bg-black px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed"
    >
      {loading ? "Generating…" : "Download PNG"}
    </button>
  );
}
