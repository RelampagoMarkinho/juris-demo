import type { MetadataRoute } from "next";

// Manifesto do PWA: permite instalar o sistema como aplicativo (celular e computador).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Juris — Gestão para Advocacia",
    short_name: "Juris",
    description: "Sistema de gestão para escritórios de advocacia: clientes, processos, documentos e financeiro",
    lang: "pt-BR",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#0e0d0c",
    theme_color: "#0e0d0c",
    categories: ["business", "productivity"],
    icons: [
      { src: "/icones/icone-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icones/icone-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icones/icone-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Clientes", url: "/clientes", icons: [{ src: "/icones/icone-192.png", sizes: "192x192" }] },
      { name: "Processos", url: "/processos", icons: [{ src: "/icones/icone-192.png", sizes: "192x192" }] },
      { name: "Documentos", url: "/documentos", icons: [{ src: "/icones/icone-192.png", sizes: "192x192" }] },
    ],
  };
}
