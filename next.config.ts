import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Temporarily disable standalone to debug Railway deployment
  // output: "standalone",
  rewrites() {
    return [
      { source: "/auth/login", destination: "/login" },
      { source: "/auth/register", destination: "/register" },
    ];
  },
};

export default nextConfig;
