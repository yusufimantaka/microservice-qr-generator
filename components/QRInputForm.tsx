"use client";

interface QRInputFormProps {
  text: string;
  onChange: (text: string) => void;
}

export default function QRInputForm({ text, onChange }: QRInputFormProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Text or URL
      </label>
      <textarea
        value={text}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Enter text or URL to encode..."
        rows={4}
        className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-black focus:ring-1 focus:ring-black outline-none resize-none"
      />
    </div>
  );
}
