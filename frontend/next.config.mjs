/** @type {import('next').NextConfig} */
const nextConfig = {
  // Note: Do NOT use output: "standalone" with Cloudflare Pages
  // @cloudflare/next-on-pages handles the build output
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
