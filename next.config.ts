import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

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

export default withNextIntl(nextConfig);
