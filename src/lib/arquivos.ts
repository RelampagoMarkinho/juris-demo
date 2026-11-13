"use client";

import { deleteObject, getDownloadURL, ref, uploadBytes, uploadBytesResumable } from "@/lib/local/storage";
import { storage } from "./firebase";
import { excluir, hojeISO, salvar } from "./db";
import type { Cliente, Documento } from "./mock";

export const LIMITE_ARQUIVO_MB = 20;

export const tipoDe = (nome: string): Documento["tipo"] => {
  const ext = nome.split(".").pop()?.toLowerCase() ?? "";
  if (["xls", "xlsx", "csv"].includes(ext)) return "xlsx";
  if (["doc", "docx", "odt", "txt", "rtf"].includes(ext)) return "docx";
  if (["png", "jpg", "jpeg", "gif", "webp", "heic"].includes(ext)) return "img";
  return "pdf";
};

export const tamanhoLegivel = (b: number) =>
  b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1).replace(".", ",")} MB` : `${Math.max(1, Math.round(b / 1024))} KB`;

const limparNome = (n: string) => n.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w.\-]+/g, "_");

/** Envia o arquivo para o Storage (clientes/{id}/...) e registra no Firestore. */
export async function enviarDocumentoCliente(
  cliente: Pick<Cliente, "id" | "nome">, arquivo: File, categoria: string, enviadoPor: string,
  onProgresso?: (pct: number) => void,
  extras?: { nome?: string; assinadoDe?: string },
) {
  if (arquivo.size > LIMITE_ARQUIVO_MB * 1024 * 1024) {
    throw Object.assign(new Error(), { code: "tamanho", message: `O arquivo passa de ${LIMITE_ARQUIVO_MB} MB.` });
  }
  const caminho = `clientes/${cliente.id}/${Date.now()}_${limparNome(arquivo.name)}`;
  const tarefa = uploadBytesResumable(ref(storage, caminho), arquivo, { contentType: arquivo.type || undefined });
  await new Promise<void>((ok, falha) =>
    tarefa.on("state_changed", (s) => onProgresso?.(Math.round((s.bytesTransferred / s.totalBytes) * 100)), falha, () => ok()),
  );
  await salvar<Omit<Documento, "id">>("documentos", {
    origem: "enviado", nome: extras?.nome || arquivo.name, categoria, ...(extras?.assinadoDe ? { assinadoDe: extras.assinadoDe } : {}), tipo: tipoDe(arquivo.name), tamanho: tamanhoLegivel(arquivo.size), bytes: arquivo.size,
    clienteId: cliente.id, cliente: cliente.nome, caminho, enviadoPor, data: hojeISO(),
  });
}

/** Abre o arquivo em nova aba (PDF e imagens são exibidos pelo navegador; de lá dá para baixar/imprimir). */
export async function abrirDocumento(d: Documento) {
  // A aba é aberta antes do "await" para não ser bloqueada pelo navegador.
  const aba = window.open("", "_blank");
  try {
    if (!d.caminho) throw Object.assign(new Error(), { code: "storage/object-not-found" });
    const url = await getDownloadURL(ref(storage, d.caminho));
    if (aba) aba.location.href = url;
    else window.location.href = url;
  } catch (e) {
    aba?.close();
    throw e;
  }
}

export async function excluirDocumento(d: Documento) {
  if (d.caminho) {
    await deleteObject(ref(storage, d.caminho)).catch((e) => {
      if ((e as { code?: string }).code !== "storage/object-not-found") throw e;
    });
  }
  await excluir("documentos", d.id);
}

/* ----------------------- Imagens do timbrado ----------------------- */

/** Altura/largura da imagem (para posicionar e ajustar margens como no Word). */
function proporcaoDaImagem(arquivo: File): Promise<number> {
  return new Promise((ok) => {
    const url = URL.createObjectURL(arquivo);
    const img = new Image();
    img.onload = () => { ok(img.naturalWidth ? img.naturalHeight / img.naturalWidth : 0.15); URL.revokeObjectURL(url); };
    img.onerror = () => { ok(0.15); URL.revokeObjectURL(url); };
    img.src = url;
  });
}

export const LIMITE_IMAGEM_MB = 5;

/** Envia uma imagem do timbrado (fundo, topo ou rodapé) e devolve o link permanente. */
export async function enviarImagemModelo(arquivo: File): Promise<{ url: string; caminho: string; proporcao: number }> {
  if (!arquivo.type.startsWith("image/")) {
    throw Object.assign(new Error(), { code: "tamanho", message: "Escolha um arquivo de imagem (PNG ou JPG)." });
  }
  if (arquivo.size > LIMITE_IMAGEM_MB * 1024 * 1024) {
    throw Object.assign(new Error(), { code: "tamanho", message: `A imagem passa de ${LIMITE_IMAGEM_MB} MB.` });
  }
  const caminho = `modelos/img_${Date.now()}_${limparNome(arquivo.name)}`;
  const r = ref(storage, caminho);
  const proporcao = await proporcaoDaImagem(arquivo);
  await uploadBytes(r, arquivo, { contentType: arquivo.type });
  return { url: await getDownloadURL(r), caminho, proporcao };
}

export async function excluirArquivo(caminho?: string | null) {
  if (!caminho) return;
  await deleteObject(ref(storage, caminho)).catch((e) => {
    if ((e as { code?: string }).code !== "storage/object-not-found") throw e;
  });
}

/** Logo da empresa (Configurações → Empresa). */
export async function enviarLogoEmpresa(arquivo: File): Promise<{ url: string; caminho: string }> {
  if (!arquivo.type.startsWith("image/")) {
    throw Object.assign(new Error(), { code: "tamanho", message: "Escolha um arquivo de imagem (PNG ou JPG)." });
  }
  if (arquivo.size > LIMITE_IMAGEM_MB * 1024 * 1024) {
    throw Object.assign(new Error(), { code: "tamanho", message: `A imagem passa de ${LIMITE_IMAGEM_MB} MB.` });
  }
  const caminho = `empresa/logo_${Date.now()}_${limparNome(arquivo.name)}`;
  const r = ref(storage, caminho);
  await uploadBytes(r, arquivo, { contentType: arquivo.type });
  return { url: await getDownloadURL(r), caminho };
}

/* ----------------------- Documentos gerados ----------------------- */

/** Salva o PDF gerado no perfil do cliente, na seção "Documentos gerados". */
export async function salvarDocumentoGerado(
  cliente: Pick<Cliente, "id" | "nome">, pdf: Blob, nome: string, categoria: string, modeloId: string, geradoPor: string,
  extras?: Pick<Documento, "conteudo" | "paginaDoc" | "editado">,
): Promise<{ id: string; caminho: string }> {
  const arquivo = `${nome}.pdf`;
  const caminho = `clientes/${cliente.id}/gerado_${Date.now()}_${limparNome(arquivo)}`;
  await uploadBytes(ref(storage, caminho), pdf, { contentType: pdf.type || "application/pdf" });
  const id = await salvar<Omit<Documento, "id">>("documentos", {
    origem: "gerado", modeloId, nome: arquivo, categoria, tipo: "pdf", tamanho: tamanhoLegivel(pdf.size), bytes: pdf.size,
    clienteId: cliente.id, cliente: cliente.nome, caminho, enviadoPor: geradoPor, data: hojeISO(), ...(extras ?? {}),
  });
  return { id, caminho };
}
