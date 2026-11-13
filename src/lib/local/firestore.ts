"use client";

/**
 * Imitação local (no navegador) da parte do Firestore que o sistema usa.
 * Mesma "cara" das funções do Firebase, para o resto do código não mudar.
 */
import { erroCodigo, gravarIdb, lerIdb, novoId } from "./banco";

type Dados = Record<string, unknown>;
type Base = Record<string, Record<string, Dados>>;

export type Firestore = { tipo: "local" };
export type CollectionReference = { tipo: "col"; col: string };
export type DocumentReference = { tipo: "doc"; col: string; id: string };
export type Query = CollectionReference & { ordem?: { campo: string; dir: "asc" | "desc" } };

let base: Base = {};
let pronta: Promise<void> | null = null;
const ouvintes = new Set<() => void>();

const carregar = () => (pronta ??= lerIdb<Base>("firestore").then((b) => { base = b ?? {}; }).catch(() => { base = {}; }));
export const baseCarregada = () => carregar();

async function persistir() {
  await gravarIdb("firestore", base);
  ouvintes.forEach((f) => f());
}

/** Cópia profunda que descarta campos undefined (como o ignoreUndefinedProperties do Firestore). */
const limpo = <T>(v: T): T => JSON.parse(JSON.stringify(v ?? {}));

export function initializeFirestore(_app?: unknown, _opts?: unknown): Firestore { return { tipo: "local" }; }
export function getFirestore(_app?: unknown): Firestore { return { tipo: "local" }; }

export function collection(_db: Firestore, col: string): CollectionReference { return { tipo: "col", col }; }

export function doc(ref: Firestore | CollectionReference, col?: string, id?: string): DocumentReference {
  if ((ref as CollectionReference).tipo === "col") return { tipo: "doc", col: (ref as CollectionReference).col, id: novoId() };
  return { tipo: "doc", col: col!, id: id ?? novoId() };
}

export const orderBy = (campo: string, dir: "asc" | "desc" = "asc") => ({ campo, dir });
export const query = (ref: CollectionReference, ordem?: { campo: string; dir: "asc" | "desc" }): Query => ({ ...ref, ordem });
export const serverTimestamp = () => new Date().toISOString();

function snapDoc(ref: DocumentReference) {
  const d = base[ref.col]?.[ref.id];
  return { id: ref.id, ref, exists: () => d !== undefined, data: () => (d ? limpo(d) : undefined) };
}

function comparar(a: unknown, b: unknown) {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a ?? "").localeCompare(String(b ?? ""), "pt-BR", { numeric: true });
}

function snapColecao(q: Query) {
  const docs = Object.entries(base[q.col] ?? {}).map(([id, d]) => ({ id, ref: { tipo: "doc", col: q.col, id } as DocumentReference, data: () => limpo(d) }));
  if (q.ordem) {
    const { campo, dir } = q.ordem;
    docs.sort((x, y) => comparar(x.data()[campo], y.data()[campo]) * (dir === "desc" ? -1 : 1));
  }
  return { docs, empty: docs.length === 0, size: docs.length };
}

type SnapDoc = ReturnType<typeof snapDoc>;
type SnapCol = ReturnType<typeof snapColecao>;

export function onSnapshot(ref: DocumentReference, next: (s: SnapDoc) => void, erro?: (e: Error) => void): () => void;
export function onSnapshot(ref: Query, next: (s: SnapCol) => void, erro?: (e: Error) => void): () => void;
export function onSnapshot(ref: DocumentReference | Query, next: (s: never) => void, erro?: (e: Error) => void) {
  let ativo = true;
  const emitir = () => {
    if (!ativo) return;
    try { next((ref.tipo === "doc" ? snapDoc(ref) : snapColecao(ref)) as never); } catch (e) { erro?.(e as Error); }
  };
  carregar().then(() => { if (ativo) { ouvintes.add(emitir); emitir(); } });
  return () => { ativo = false; ouvintes.delete(emitir); };
}

export async function getDoc(ref: DocumentReference) { await carregar(); return snapDoc(ref); }

function aplicarSet(ref: DocumentReference, dados: Dados, merge = false) {
  const col = (base[ref.col] ??= {});
  col[ref.id] = merge && col[ref.id] ? { ...col[ref.id], ...limpo(dados) } : limpo(dados);
}
function aplicarUpdate(ref: DocumentReference, dados: Dados) {
  if (!base[ref.col]?.[ref.id]) throw erroCodigo("not-found", "Registro não encontrado.");
  base[ref.col][ref.id] = { ...base[ref.col][ref.id], ...limpo(dados) };
}
function aplicarDelete(ref: DocumentReference) { delete base[ref.col]?.[ref.id]; }

export async function setDoc(ref: DocumentReference, dados: Dados, opts?: { merge?: boolean }) {
  await carregar(); aplicarSet(ref, dados, opts?.merge); await persistir();
}
export async function updateDoc(ref: DocumentReference, dados: Dados) {
  await carregar(); aplicarUpdate(ref, dados); await persistir();
}
export async function deleteDoc(ref: DocumentReference) {
  await carregar(); aplicarDelete(ref); await persistir();
}
export async function addDoc(ref: CollectionReference, dados: Dados) {
  const d = doc(ref); await setDoc(d, dados); return d;
}

export function writeBatch(_db: Firestore) {
  const ops: (() => void)[] = [];
  const lote = {
    set: (r: DocumentReference, d: Dados, o?: { merge?: boolean }) => { ops.push(() => aplicarSet(r, d, o?.merge)); return lote; },
    update: (r: DocumentReference, d: Dados) => { ops.push(() => aplicarUpdate(r, d)); return lote; },
    delete: (r: DocumentReference) => { ops.push(() => aplicarDelete(r)); return lote; },
    commit: async () => { await carregar(); ops.forEach((f) => f()); await persistir(); },
  };
  return lote;
}
