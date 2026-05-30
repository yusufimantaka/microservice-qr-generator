import { NextRequest } from "next/server";

const BATCH_SERVICE_URL =
  process.env.BATCH_SERVICE_URL || "http://localhost:5003";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const res = await fetch(`${BATCH_SERVICE_URL}/api/v1/batch/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  return Response.json(data, { status: res.status });
}
