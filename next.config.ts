import type { NextConfig } from "next";
const config: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/api/documents/:path*", headers: [{ key: "Cache-Control", value: "private, no-store" }] }, { source: "/api/search", headers: [{ key: "Cache-Control", value: "private, no-store" }] }, { source: "/:path*", headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "same-origin" },
      { key: "X-Frame-Options", value: "DENY" },
    ] }];
  },
};
export default config;
