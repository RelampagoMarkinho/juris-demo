"use client";

import { auth } from "./firebase";

/** Envia o documento (HTML paginado) ao servidor e recebe o PDF, igual à pré-visualização. */
export async function gerarPdf(html: string): Promise<Blob> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error("Faça login novamente.");
  const r = await fetch("/api/pdf", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ html }),
  });
  if (!r.ok) throw new Error((await r.text().catch(() => "")) || `Erro ${r.status} ao gerar o PDF.`);
  return await r.blob();
}
