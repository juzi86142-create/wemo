import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@wemo/contracts", "@wemo/ui"],
};

export default nextConfig;
