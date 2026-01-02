import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,

  // Se você usa next/image, isso evita erro no export estático
  images: { unoptimized: true },

  // Ajuda muito quando a app roda assets localmente (file://) via WebView
  assetPrefix: "./",
};

export default nextConfig;
