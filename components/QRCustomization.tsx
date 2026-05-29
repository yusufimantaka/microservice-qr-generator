"use client";

interface QRCustomizationProps {
  foreground: string;
  background: string;
  onForegroundChange: (color: string) => void;
  onBackgroundChange: (color: string) => void;
}

export default function QRCustomization({
  foreground,
  background,
  onForegroundChange,
  onBackgroundChange,
}: QRCustomizationProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-gray-700">Customization</h3>
      <div className="flex gap-6">
        <label className="flex items-center gap-3">
          <span className="text-sm text-gray-600">Foreground</span>
          <input
            type="color"
            value={foreground}
            onChange={(e) => onForegroundChange(e.target.value)}
            className="h-9 w-14 rounded border border-gray-300 cursor-pointer"
          />
        </label>
        <label className="flex items-center gap-3">
          <span className="text-sm text-gray-600">Background</span>
          <input
            type="color"
            value={background}
            onChange={(e) => onBackgroundChange(e.target.value)}
            className="h-9 w-14 rounded border border-gray-300 cursor-pointer"
          />
        </label>
      </div>
    </div>
  );
}
