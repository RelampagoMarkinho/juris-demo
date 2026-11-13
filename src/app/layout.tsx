import type { Metadata, Viewport } from "next";
import { Cinzel, Plus_Jakarta_Sans } from "next/font/google";
import { ThemeProvider, themeScript } from "@/components/ThemeProvider";
import { AuthProvider } from "@/components/AuthProvider";
import RegistrarPwa from "@/components/RegistrarPwa";
import "./globals.css";

const fonte = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], display: "swap" });
const serifa = Cinzel({ subsets: ["latin"], weight: ["500", "600", "700"], display: "swap", variable: "--font-serif" });

export const metadata: Metadata = {
  title: "Juris — Gestão para Advocacia",
  description: "Sistema de gestão para escritórios de advocacia: clientes, processos, documentos e financeiro",
  applicationName: "NJ Advocacia",
  icons: { icon: "/icon.png", apple: "/icones/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "NJ Advocacia", statusBarStyle: "black-translucent" },
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
