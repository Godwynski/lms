import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  // Disable service worker generation in development to avoid
  // Turbopack incompatibility with @serwist/next.
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  // Turbopack is the default in Next.js 16 for `next dev`.
  // An empty config here explicitly tells Next.js we're aware of this.
  // Turbopack handles WASM and browser module resolution natively,
  // so no extra rules are needed here (unlike the webpack config below).
  turbopack: {},

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'covers.openlibrary.org',
      },
      {
        protocol: 'https',
        hostname: 'books.google.com',
      },
      {
        protocol: 'https',
        hostname: 'pydmwmklouqvlghllvth.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'images-na.ssl-images-amazon.com',
      }
    ]
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // PowerSync Web uses WASM workers that need to be accessible as static files.
      // This copies the wa-sqlite WASM file and PowerSync worker bundles into the
      // Next.js public directory so the browser can load them.
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    // Treat WASM files as assets (used by next build --webpack)
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'asset/resource',
    });
    return config;
  },
};

export default withSerwist(nextConfig);
