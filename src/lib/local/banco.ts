"use client";

/**
 * Versão de demonstração: "banco de dados" que fica no próprio navegador (IndexedDB).
 * Substitui o Firebase — nada é enviado para servidor nenhum; cada navegador tem os seus dados.
 */

const NOME_IDB = "juris-demo";
const LOJA = "dados";

function abrirIdb(): Promise<IDBDatabase> {
  return new Promise((ok, falha) => {
    const r = indexedDB.open(NOME_IDB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(LOJA);
    r.onsuccess = () => ok(r.result);
    r.onerror = () => falha(r.error);
  });
}

let idb: Promise<IDBDatabase> | null = null;
const conexao = () => (idb ??= abrirIdb());

export async function lerIdb<T>(chave: string): Promise<T | undefined> {
  const db = await conexao();
  return new Promise((ok, falha) => {
    const r = db.transaction(LOJA, "readonly").objectStore(LOJA).get(chave);
    r.onsuccess = () => ok(r.result as T | undefined);
    r.onerror = () => falha(r.error);
  });
}

export async function gravarIdb(chave: string, valor: unknown): Promise<void> {
  const db = await conexao();
  return new Promise((ok, falha) => {
    const t = db.transaction(LOJA, "readwrite");
    t.objectStore(LOJA).put(valor, chave);
    t.oncomplete = () => ok();
    t.onerror = () => falha(t.error);
  });
}

export async function apagarIdb(chave: string): Promise<void> {
  const db = await conexao();
  return new Promise((ok, falha) => {
    const t = db.transaction(LOJA, "readwrite");
    t.objectStore(LOJA).delete(chave);
    t.oncomplete = () => ok();
    t.onerror = () => falha(t.error);
  });
}

/** Apaga tudo (botão "Reiniciar demonstração"). */
export async function zerarTudo() {
  const db = await conexao();
  await new Promise<void>((ok, falha) => {
    const t = db.transaction(LOJA, "readwrite");
    t.objectStore(LOJA).clear();
    t.oncomplete = () => ok();
    t.onerror = () => falha(t.error);
  });
  try { localStorage.removeItem("juris-demo-sessao"); sessionStorage.removeItem("juris-demo-sessao"); } catch { /* */ }
}

export const novoId = () => {
  const c = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let s = "";
  for (let i = 0; i < 20; i++) s += c[Math.floor(Math.random() * c.length)];
  return s;
};

export const erroCodigo = (code: string, message = code) => Object.assign(new Error(message), { code });
