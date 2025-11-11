import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  output: "standalone",
  rewrites() {
    return [
      { source: "/auth/login", destination: "/login" },
      { source: "/auth/register", destination: "/register" },
    ];
  },
};

export default nextConfig;
