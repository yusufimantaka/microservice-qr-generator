import { NextRequest } from "next/server";

const QR_SERVICE_URL = process.env.QR_SERVICE_URL || "http://localhost:5000";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const res = await fetch(`${QR_SERVICE_URL}/api/v1/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const blob = await res.blob();
  return new Response(blob, {
    status: res.status,
    headers: {
      "Content-Type": res.headers.get("Content-Type") || "image/png",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
