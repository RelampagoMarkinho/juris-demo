"use client";

import { useEffect } from "react";
import { iniciarPwa } from "@/lib/pwa";

/** Ativa o PWA (service worker + convite de instalação) uma única vez. */
export default function RegistrarPwa() {
  useEffect(() => { iniciarPwa(); }, []);
  return null;
}
