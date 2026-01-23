import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Enable standalone output for Docker deployment
  output: 'standalone',
  typescript: {
    // Allow build to succeed even with type errors (warnings only)
    ignoreBuildErrors: false,
  },
  // Note: eslint config moved to eslint.config.mjs in Next.js 16
  // Turbopack configuration for Next.js 16
  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.public.blob.vercel-storage.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'cdn.genfity.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'dev-cdn.genfity.com',
        pathname: '/**',
      },
    ],
    // Increase timeout for slow connections
    minimumCacheTTL: 60,
    // Disable image optimization in development if having issues
    unoptimized: true,
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
