"use client";

import { criarConta } from "./local/auth";
import { doc, getDoc, serverTimestamp, writeBatch } from "./local/firestore";
import { db } from "./firebase";
import { carregarExemplos } from "./seed";
import { PERMISSOES_PADRAO } from "./permissoes";
import { EMPRESA_PADRAO } from "./empresa";

/** Acesso da demonstração (dados fictícios, guardados só no navegador de quem abre o site). */
export const DEMO_EMAIL = "demo@juris.com.br";
export const DEMO_SENHA = "demo123";

let preparando: Promise<void> | null = null;

/** Na primeira visita deste navegador: cria o administrador da demonstração e carrega os dados de exemplo. */
export function prepararDemo() {
  return (preparando ??= (async () => {
    if ((await getDoc(doc(db, "config", "setup"))).exists()) return;
    let uid: string;
    try {
      uid = (await criarConta(DEMO_EMAIL, DEMO_SENHA, false)).user.uid;
    } catch {
      return; // conta já existe (visita anterior interrompida) — segue para o login normal
    }
    const lote = writeBatch(db);
    lote.set(doc(db, "usuarios", uid), {
      nome: "Administrador Demo", email: DEMO_EMAIL, perfil: "Administrador", ativo: true, ultimoAcesso: "—", criadoEm: serverTimestamp(),
    });
    lote.set(doc(db, "config", "permissoes"), PERMISSOES_PADRAO);
    lote.set(doc(db, "config", "empresa"), {
      ...EMPRESA_PADRAO, razaoSocial: "Escritório Exemplo Advocacia", responsavel: "Dra. Ana Exemplo", oab: "123456", oabUf: "SP",
      telefone: "(11) 3000-0000", email: "contato@escritorioexemplo.adv.br", cep: "01310-100", rua: "Avenida Paulista", numero: "1000",
      complemento: "Sala 101", bairro: "Bela Vista", cidade: "São Paulo", uf: "SP",
    });
    lote.set(doc(db, "config", "setup"), { adminUid: uid, criadoEm: serverTimestamp() });
    await lote.commit();
    await carregarExemplos();
  })());
}
