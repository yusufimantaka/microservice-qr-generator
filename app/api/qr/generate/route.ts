import { NextRequest } from "next/server";

const QR_SERVICE_URL = process.env.QR_SERVICE_URL || "http://localhost:5000";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const res = await fetch(`${QR_SERVICE_URL}/api/v1/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Forwarded-For": request.headers.get("x-forwarded-for") ?? "",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    return Response.json(
      { error: "qr-generator service error", detail: text },
      { status: res.status }
    );
  }

  const blob = await res.blob();
  return new Response(blob, {
    status: 200,
    headers: {
      "Content-Type": res.headers.get("Content-Type") ?? "image/png",
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Cache": res.headers.get("X-Cache") ?? "MISS",
    },
  });
}
