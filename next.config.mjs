/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  images: {
    // Disable image optimization for Cloudflare Edge
    unoptimized: true,
  },
};

export default nextConfig;
