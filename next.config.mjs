/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      allowedOrigins: ["agentic-811ccc27.vercel.app"]
    }
  }
};

export default nextConfig;
