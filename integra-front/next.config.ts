import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  // recomendado quando roda em file:// / assets:
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
