"use client";

import { useEffect, useState } from "react";

type EventoInstalar = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

let pendente: EventoInstalar | null = null;
const ouvintes = new Set<() => void>();
const avisar = () => ouvintes.forEach((f) => f());

/** Registra o service worker e guarda o convite de instalação do navegador. */
export function iniciarPwa() {
  if (typeof window === "undefined") return;
  if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    pendente = e as EventoInstalar;
    avisar();
  });
  window.addEventListener("appinstalled", () => { pendente = null; avisar(); });
}

/** Permite mostrar um botão "Instalar aplicativo" quando o navegador oferece a instalação. */
export function useInstalarApp() {
  const [disponivel, setDisponivel] = useState(!!pendente);
  useEffect(() => {
    const f = () => setDisponivel(!!pendente);
    ouvintes.add(f);
    f();
    return () => { ouvintes.delete(f); };
  }, []);
  const instalar = async () => {
    if (!pendente) return;
    await pendente.prompt();
    await pendente.userChoice.catch(() => null);
    pendente = null;
    avisar();
  };
  return { disponivel, instalar };
}
