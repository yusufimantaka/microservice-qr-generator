import { NextRequest } from "next/server";

const HISTORY_SERVICE_URL =
  process.env.HISTORY_SERVICE_URL || "http://localhost:5002";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  if (!searchParams.get("user_id")) {
    return Response.json({ error: "user_id is required" }, { status: 400 });
  }

  const res = await fetch(
    `${HISTORY_SERVICE_URL}/api/v1/history?${searchParams.toString()}`,
    { cache: "no-store" }
  );
  const data = await res.json();
  return Response.json(data, { status: res.status });
}
