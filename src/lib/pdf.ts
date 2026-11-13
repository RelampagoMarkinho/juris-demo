"use client";

/**
 * Versão de demonstração (sem servidor): em vez do PDF gerado pelo servidor, guarda o próprio
 * documento formatado. Ao abrir, ele aparece igual à pré-visualização e pode ser impresso ou
 * salvo como PDF pelo navegador (Ctrl+P → Salvar como PDF).
 */
export async function gerarPdf(html: string): Promise<Blob> {
  return new Blob([html], { type: "text/html" });
}
