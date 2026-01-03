import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "prisma",
    "mongodb",
    "@prisma/client",
  ],
  transpilePackages: [".prisma"],
};

export default nextConfig;
