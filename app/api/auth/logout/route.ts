import { NextRequest } from "next/server";

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || "http://localhost:5001";

export async function POST(request: NextRequest) {
  const res = await fetch(`${AUTH_SERVICE_URL}/api/v1/auth/logout`, {
    method: "POST",
    headers: {
      Authorization: request.headers.get("Authorization") ?? "",
    },
  });

  const data = await res.json();
  return Response.json(data, { status: res.status });
}
