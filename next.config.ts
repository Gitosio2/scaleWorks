import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  experimental: {
    // Photo uploads: the browser sends a resized full image plus a thumbnail
    // (up to ~1.8 MB together). The default is 1 MB; Vercel's own cap is 4.5 MB.
    serverActions: { bodySizeLimit: "3mb" },
  },
};

export default withNextIntl(nextConfig);
