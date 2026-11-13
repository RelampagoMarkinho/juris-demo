"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type Tema = "light" | "dark";
type Ctx = { tema: Tema; setTema: (t: Tema) => void; alternar: () => void };

const ThemeCtx = createContext<Ctx>({ tema: "light", setTema: () => {}, alternar: () => {} });

// Executado antes da hidratação para evitar "piscar" no tema errado.
export const themeScript = `(function(){try{var t=localStorage.getItem('juris_tema');if(t!=='light'&&t!=='dark'){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme='light'}})()`;

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [tema, setTemaState] = useState<Tema>("light");

  useEffect(() => {
    const atual = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
    setTemaState(atual);
  }, []);

  const setTema = useCallback((t: Tema) => {
    setTemaState(t);
    document.documentElement.dataset.theme = t;
    try {
      localStorage.setItem("juris_tema", t);
    } catch {}
  }, []);

  const alternar = useCallback(() => setTema(tema === "dark" ? "light" : "dark"), [tema, setTema]);

  return <ThemeCtx.Provider value={{ tema, setTema, alternar }}>{children}</ThemeCtx.Provider>;
}

export const useTema = () => useContext(ThemeCtx);
