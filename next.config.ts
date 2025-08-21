import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Optimize for Vercel deployment
  experimental: {
    // Reduce memory usage during build
    optimizePackageImports: ['lucide-react'],
  },
  // Optimize images
  images: {
    unoptimized: true,
  },
  // Reduce memory usage
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
};

export default nextConfig;
