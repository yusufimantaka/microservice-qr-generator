"use client";

import { useState } from "react";

interface QRExportProps {
  text: string;
  foreground: string;
  background: string;
}

export default function QRExport({ text, foreground, background }: QRExportProps) {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    if (!text.trim()) return;
    setLoading(true);
    try {
      // FIX 1: Base URL disamakan hanya sampai port host saja
      const apiBaseUrl = process.env.NEXT_PUBLIC_QR_API_URL || "http://localhost:5000";
      
      // Menggabungkan base URL dengan endpoint terbaru milik Yusuf
      const res = await fetch(`${apiBaseUrl}/api/v1/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: text.trim(),
          fill_color: foreground, // FIX 2: Key disesuaikan dengan data.get('fill_color') di Python Yusuf
          back_color: background,  // FIX 2: Key disesuaikan dengan data.get('back_color') di Python Yusuf
          user_id: "anonymous",    // Tambahan data opsional untuk pipeline Kafka history milik Yusuf
        }),
      });

      if (!res.ok) throw new Error("Backend service failed to generate QR asset");

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
      {loading ? "Generating..." : "Download PNG"}
    </button>
  );
}