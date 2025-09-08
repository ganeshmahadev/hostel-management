import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['@prisma/client'],
  images: {
    domains: ['localhost'],
  },
  // Enable static exports if needed
  // output: 'export',
  // trailingSlash: true,
};

export default nextConfig;
