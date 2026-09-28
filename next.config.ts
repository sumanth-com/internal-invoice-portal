import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
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
