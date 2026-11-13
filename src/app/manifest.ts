import type { MetadataRoute } from "next";
import { caminho } from "@/lib/base";

export const dynamic = "force-static";

// Manifesto do PWA: permite instalar o sistema como aplicativo (celular e computador).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Juris — Gestão para Advocacia",
    short_name: "Juris",
    description: "Sistema de gestão para escritórios de advocacia: clientes, processos, documentos e financeiro",
    lang: "pt-BR",
    start_url: caminho("/dashboard"),
    scope: caminho("/"),
    display: "standalone",
    orientation: "any",
    background_color: "#0e0d0c",
    theme_color: "#0e0d0c",
    categories: ["business", "productivity"],
    icons: [
      { src: caminho("/icones/icone-192.png"), sizes: "192x192", type: "image/png", purpose: "any" },
      { src: caminho("/icones/icone-512.png"), sizes: "512x512", type: "image/png", purpose: "any" },
      { src: caminho("/icones/icone-maskable-512.png"), sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Clientes", url: caminho("/clientes"), icons: [{ src: caminho("/icones/icone-192.png"), sizes: "192x192" }] },
      { name: "Processos", url: caminho("/processos"), icons: [{ src: caminho("/icones/icone-192.png"), sizes: "192x192" }] },
      { name: "Documentos", url: caminho("/documentos"), icons: [{ src: caminho("/icones/icone-192.png"), sizes: "192x192" }] },
    ],
  };
}
