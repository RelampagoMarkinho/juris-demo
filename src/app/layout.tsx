import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { ThemeProvider, themeScript } from "@/components/ThemeProvider";
import { AuthProvider } from "@/components/AuthProvider";
import RegistrarPwa from "@/components/RegistrarPwa";
import { caminho } from "@/lib/base";
import "./globals.css";

// Fontes (licença OFL) guardadas no projeto: o build não depende do Google Fonts.
const fonte = localFont({ src: "./fontes/plus-jakarta-sans.woff2", weight: "400 700", display: "swap" });
const serifa = localFont({ src: "./fontes/cinzel.woff2", weight: "500 700", display: "swap", variable: "--font-serif" });

export const metadata: Metadata = {
  title: "Juris — Gestão para Advocacia",
  description: "Sistema de gestão para escritórios de advocacia: clientes, processos, documentos e financeiro",
  applicationName: "Juris",
  icons: { icon: caminho("/icon.png"), apple: caminho("/icones/apple-touch-icon.png") },
  appleWebApp: { capable: true, title: "Juris", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3f0e9" },
    { media: "(prefers-color-scheme: dark)", color: "#070706" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${fonte.className} ${serifa.variable}`}>
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
          <RegistrarPwa />
        </ThemeProvider>
      </body>
    </html>
  );
}
