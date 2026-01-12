import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  // recomendado quando roda em file:// / assets:
  trailingSlash: true,
  images: { unoptimized: true },
};

module.exports = nextConfig;


export default eslintConfig;
