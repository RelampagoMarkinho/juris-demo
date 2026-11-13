"use client";

/** Imitação local do Firebase Auth (contas guardadas só neste navegador — apenas para demonstração). */
import { erroCodigo, gravarIdb, lerIdb, novoId } from "./banco";

export type User = { uid: string; email: string; getIdToken: () => Promise<string> };
export type Auth = { currentUser: User | null; signOut: () => Promise<void> };
type Contas = Record<string, { uid: string; senha: string }>;

const CHAVE_SESSAO = "juris-demo-sessao";
const auth: Auth = { currentUser: null, signOut: async () => definirAtual(null) };
const ouvintes = new Set<(u: User | null) => void>();
let persistencia: "local" | "sessao" = "local";
let iniciado: Promise<void> | null = null;

const criarUser = (uid: string, email: string): User => ({ uid, email, getIdToken: async () => "demo" });
const contas = async () => (await lerIdb<Contas>("contas")) ?? {};

function lerSessao(): { uid: string; email: string } | null {
  try {
    const s = localStorage.getItem(CHAVE_SESSAO) ?? sessionStorage.getItem(CHAVE_SESSAO);
    return s ? JSON.parse(s) : null;
  } catch { return null; }
}
function gravarSessao(u: User | null) {
  try {
    localStorage.removeItem(CHAVE_SESSAO); sessionStorage.removeItem(CHAVE_SESSAO);
    if (u) (persistencia === "local" ? localStorage : sessionStorage).setItem(CHAVE_SESSAO, JSON.stringify({ uid: u.uid, email: u.email }));
  } catch { /* navegação privada */ }
}

function definirAtual(u: User | null) {
  auth.currentUser = u;
  gravarSessao(u);
  ouvintes.forEach((f) => f(u));
}

const iniciar = () => (iniciado ??= (async () => {
  const s = lerSessao();
  if (!s) return;
  const c = await contas();
  const conta = c[s.email.toLowerCase()];
  auth.currentUser = conta && conta.uid === s.uid ? criarUser(s.uid, s.email) : null;
})());

export function getAuth(_app?: unknown) { return auth; }

export function onAuthStateChanged(_a: Auth, f: (u: User | null) => void) {
  let ativo = true;
  iniciar().then(() => { if (ativo) { ouvintes.add(f); f(auth.currentUser); } });
  return () => { ativo = false; ouvintes.delete(f); };
}

export const browserLocalPersistence = "local" as const;
export const browserSessionPersistence = "sessao" as const;
export async function setPersistence(_a: Auth, p: "local" | "sessao") { persistencia = p; }

/** Cria a conta. `entrar=false` não troca o usuário logado (usado pelo admin ao cadastrar alguém). */
export async function criarConta(email: string, senha: string, entrar = true) {
  const e = email.trim().toLowerCase();
  if (!e.includes("@")) throw erroCodigo("auth/invalid-email");
  if (senha.length < 6) throw erroCodigo("auth/weak-password");
  const c = await contas();
  if (c[e]) throw erroCodigo("auth/email-already-in-use");
  const uid = novoId();
  c[e] = { uid, senha };
  await gravarIdb("contas", c);
  const user = criarUser(uid, e);
  if (entrar) definirAtual(user);
  return { user };
}

export async function createUserWithEmailAndPassword(_a: Auth, email: string, senha: string) {
  await iniciar();
  return criarConta(email, senha, true);
}

export async function signInWithEmailAndPassword(_a: Auth, email: string, senha: string) {
  await iniciar();
  const e = email.trim().toLowerCase();
  const conta = (await contas())[e];
  if (!conta || conta.senha !== senha) throw erroCodigo("auth/invalid-credential");
  const user = criarUser(conta.uid, e);
  definirAtual(user);
  return { user };
}

export async function signOut(_a?: Auth) { definirAtual(null); }

export async function sendPasswordResetEmail(_a: Auth, _email: string) {
  throw erroCodigo("demo", "Na versão de demonstração não há envio de e-mail.");
}

export const EmailAuthProvider = { credential: (email: string, senha: string) => ({ email, senha }) };

export async function reauthenticateWithCredential(_u: User, cred: { email: string; senha: string }) {
  const conta = (await contas())[cred.email.toLowerCase()];
  if (!conta || conta.senha !== cred.senha) throw erroCodigo("auth/invalid-credential");
}

export async function updatePassword(u: User, nova: string) {
  if (nova.length < 6) throw erroCodigo("auth/weak-password");
  const c = await contas();
  const e = u.email.toLowerCase();
  if (!c[e]) throw erroCodigo("auth/user-not-found");
  c[e].senha = nova;
  await gravarIdb("contas", c);
}
