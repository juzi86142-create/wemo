import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    const mockOrigin = process.env.WEMO_API_ORIGIN;
    if (process.env.NEXT_PUBLIC_WEMO_CONTRACT_MOCK !== "true" || !mockOrigin) {
      return [];
    }

    return [{
      source: "/api/v1/:path*",
      destination: `${mockOrigin}/api/v1/:path*`,
    }];
  },
};

export default nextConfig;
