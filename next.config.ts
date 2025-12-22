import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    // Allow build to succeed even with type errors (warnings only)
    ignoreBuildErrors: false,
  },
  eslint: {
    // Allow build to succeed even with ESLint warnings
    ignoreDuringBuilds: false,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.public.blob.vercel-storage.com',
        pathname: '/**',
      },
      // {
      //   protocol: 'https',
      //   hostname: 't03h0x5v48mc1tqh.public.blob.vercel-storage.com',
      //   pathname: '/**',
      // },
    ],
    // Increase timeout for slow connections
    minimumCacheTTL: 60,
    // Disable image optimization in development if having issues
    unoptimized: process.env.NODE_ENV === 'development',
  },
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/,
      use: ["@svgr/webpack"],
    });
    return config;
  },
};

export default nextConfig;
