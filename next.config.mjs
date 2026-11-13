/** @type {import('next').NextConfig} */
// Versão de demonstração: site 100% estático (sem servidor), publicado no GitHub Pages.
const base = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig = {
  reactStrictMode: true,
  output: "export",
  basePath: base,
  images: { unoptimized: true },
};

export default nextConfig;
