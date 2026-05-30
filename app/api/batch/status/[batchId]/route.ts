import { NextRequest } from "next/server";

const BATCH_SERVICE_URL =
  process.env.BATCH_SERVICE_URL || "http://localhost:5003";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ batchId: string }> }
) {
  const { batchId } = await params;
  const res = await fetch(
    `${BATCH_SERVICE_URL}/api/v1/batch/status/${batchId}`,
    { cache: "no-store" }
  );
  const data = await res.json();
  return Response.json(data, { status: res.status });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ batchId: string }> }
) {
  const { batchId } = await params;
  const res = await fetch(
    `${BATCH_SERVICE_URL}/api/v1/batch/cancel/${batchId}`,
    { method: "DELETE" }
  );
  const data = await res.json();
  return Response.json(data, { status: res.status });
}
