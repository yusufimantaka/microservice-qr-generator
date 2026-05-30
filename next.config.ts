import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    QR_SERVICE_URL: process.env.QR_SERVICE_URL ?? "http://localhost:5000",
    AUTH_SERVICE_URL: process.env.AUTH_SERVICE_URL ?? "http://localhost:5001",
    HISTORY_SERVICE_URL:
      process.env.HISTORY_SERVICE_URL ?? "http://localhost:5002",
    BATCH_SERVICE_URL: process.env.BATCH_SERVICE_URL ?? "http://localhost:5003",
  },
};

export default nextConfig;
