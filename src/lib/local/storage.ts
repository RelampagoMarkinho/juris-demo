"use client";

/** Imitação local do Firebase Storage: os arquivos ficam no IndexedDB deste navegador. */
import { apagarIdb, erroCodigo, gravarIdb, lerIdb } from "./banco";

export type StorageRef = { caminho: string };
type Meta = { contentType?: string };

export function getStorage(_app?: unknown) { return { tipo: "local" as const }; }
export function ref(_s: unknown, caminho: string): StorageRef { return { caminho }; }

const chave = (r: StorageRef) => `arquivo:${r.caminho}`;

export async function uploadBytes(r: StorageRef, dados: Blob, meta?: Meta) {
  const blob = meta?.contentType && dados.type !== meta.contentType ? new Blob([dados], { type: meta.contentType }) : dados;
  await gravarIdb(chave(r), blob);
  return { ref: r };
}

/** Mesmo formato do Firebase (tarefa.on("state_changed", progresso, erro, fim)). */
export function uploadBytesResumable(r: StorageRef, dados: Blob, meta?: Meta) {
  const envio = uploadBytes(r, dados, meta);
  return {
    on(_ev: string, progresso?: (s: { bytesTransferred: number; totalBytes: number }) => void, erro?: (e: unknown) => void, fim?: () => void) {
      progresso?.({ bytesTransferred: 0, totalBytes: dados.size || 1 });
      envio.then(() => { progresso?.({ bytesTransferred: dados.size || 1, totalBytes: dados.size || 1 }); fim?.(); }, erro);
    },
  };
}

const paraDataUrl = (b: Blob) => new Promise<string>((ok, falha) => {
  const f = new FileReader();
  f.onload = () => ok(f.result as string);
  f.onerror = () => falha(f.error);
  f.readAsDataURL(b);
});

/**
 * Logo e imagens do timbrado ficam gravadas como link dentro dos dados, então precisam de um
 * endereço que sobreviva ao recarregar a página (data URL). Os demais arquivos abrem por blob URL.
 */
export async function getDownloadURL(r: StorageRef) {
  const blob = await lerIdb<Blob>(chave(r));
  if (!blob) throw erroCodigo("storage/object-not-found");
  if (/^(empresa|modelos)\//.test(r.caminho)) return paraDataUrl(blob);
  return URL.createObjectURL(blob);
}

export async function deleteObject(r: StorageRef) {
  if (!(await lerIdb(chave(r)))) throw erroCodigo("storage/object-not-found");
  await apagarIdb(chave(r));
}
