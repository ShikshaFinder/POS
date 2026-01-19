import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: false, // Enable PWA in development for testing
  register: true,
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  workboxOptions: {
    disableDevLogs: true,
    skipWaiting: true,
  },
});

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "prisma",
    "mongodb",
    "@prisma/client",
  ],
  transpilePackages: [".prisma"],

  // Performance optimizations
  reactStrictMode: true,

  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'flavierp.blob.core.windows.net',
        port: '',
        pathname: '/**',
      },
    ],
  },

  // Compression
  compress: true,

  // Experimental features for performance
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },

  // Headers for security and performance
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          },
        ],
      },
    ]
  },
};

// Enable PWA in production, or if explicitly enabled in dev
// We disable it by default in dev to support Turbopack (which is much faster)
// as next-pwa currently conflicts with Turbopack.
const enablePWA = process.env.NODE_ENV === 'production' || process.env.ENABLE_PWA_DEV === 'true';

export default enablePWA ? withPWA(nextConfig) : nextConfig;

