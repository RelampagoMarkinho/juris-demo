/** @type {import('next').NextConfig} */
// Versão de demonstração (sem servidor nem banco).
// - No GitHub Actions (GitHub Pages): site 100% estático, em subpasta (/<repositorio>).
// - Em outros lugares (Firebase App Hosting, Vercel, local): build normal do Next.
const pages = !!process.env.GITHUB_ACTIONS;
const base = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig = {
  reactStrictMode: true,
  ...(pages ? { output: "export" } : {}),
  basePath: base,
  images: { unoptimized: true },
};

export default nextConfig;
