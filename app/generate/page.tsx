"use client";

import { useState } from "react";
import QRInputForm from "@/components/QRInputForm";
import QRPreview from "@/components/QRPreview";
import QRCustomization from "@/components/QRCustomization";
import QRExport from "@/components/QRExport";

export default function GeneratePage() {
  const [text, setText] = useState("");
  const [foreground, setForeground] = useState("#000000");
  const [background, setBackground] = useState("#ffffff");

  return (
    <main className="flex-1 flex items-start justify-center p-6 pt-12">
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-10">
        <div className="space-y-6">
          <h1 className="text-2xl font-bold">Generate QR Code</h1>
          <QRInputForm text={text} onChange={setText} />
          <QRCustomization
            foreground={foreground}
            background={background}
            onForegroundChange={setForeground}
            onBackgroundChange={setBackground}
          />
          <QRExport
            text={text}
            foreground={foreground}
            background={background}
          />
        </div>
        <div className="flex flex-col items-center justify-start pt-12 gap-4">
          <QRPreview
            text={text || "https://example.com"}
            foreground={foreground}
            background={background}
          />
          <p className="text-xs text-gray-400">Live preview updates instantly</p>
        </div>
      </div>
    </main>
  );
}
