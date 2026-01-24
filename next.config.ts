import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for OpenNext/Cloudflare deployment
  output: "standalone",
};

export default nextConfig;
