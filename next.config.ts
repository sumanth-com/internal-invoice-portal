import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  experimental: {
    // Dynamic pages expire immediately by default, so every section click
    // discards the prefetch and waits on Supabase behind the page skeleton.
    staleTimes: {
      dynamic: 30,
      static: 300,
    },
  },
  serverExternalPackages: ["@react-pdf/renderer"],
  outputFileTracingIncludes: {
    "/invoices/[id]/pdf": ["./lib/pdf/fonts/**"],
  },
  async redirects() {
    return [
      {
        source: "/invoices/new",
        destination: "/invoices?new=1",
        permanent: false,
      },
      {
        source: "/beneficiaries/new",
        destination: "/beneficiaries?new=1",
        permanent: false,
      },
      {
        source: "/beneficiaries/:id/edit",
        destination: "/beneficiaries/:id?edit=1",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
