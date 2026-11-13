"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "./firebase";

/** Dados do escritório (Configurações → Empresa). Guardados em /config/empresa. */
export type Empresa = {
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  telefone: string;
  email: string;
  site: string;
  // Advogado(a) responsável — usado nos documentos e no acompanhamento de publicações
  responsavel: string;
  oab: string;      // número da OAB (ex.: 12.345)
  oabUf: string;    // UF da inscrição na OAB
  // Endereço
  cep: string;
  rua: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  logo?: { url: string; caminho: string } | null;
};

export const EMPRESA_PADRAO: Empresa = {
  razaoSocial: "", nomeFantasia: "Seu Escritório de Advocacia", cnpj: "", telefone: "", email: "", site: "",
  responsavel: "", oab: "", oabUf: "",
  cep: "", rua: "", numero: "", complemento: "", bairro: "", cidade: "", uf: "",
  logo: null,
};

/** Dados da empresa em tempo real (todos os usuários ativos podem ler). */
export function useEmpresa() {
  const [empresa, setEmpresa] = useState<Empresa>(EMPRESA_PADRAO);
  const [carregando, setCarregando] = useState(true);
  useEffect(() => onSnapshot(
    doc(db, "config", "empresa"),
    (s) => { setEmpresa({ ...EMPRESA_PADRAO, ...((s.data() as Partial<Empresa>) ?? {}) }); setCarregando(false); },
    () => setCarregando(false),
  ), []);
  return { empresa, carregando };
}

export async function salvarEmpresa(e: Empresa) {
  await setDoc(doc(db, "config", "empresa"), { ...e, atualizadoEm: serverTimestamp() }, { merge: true });
}

/** Endereço do escritório em uma linha. */
export function enderecoEmpresa(e: Empresa) {
  return [
    [e.rua, e.numero && `nº ${e.numero}`].filter(Boolean).join(", "),
    e.complemento, e.bairro,
    [e.cidade, e.uf].filter(Boolean).join("/"),
    e.cep && `CEP ${e.cep}`,
  ].filter(Boolean).join(", ");
}

/** "OAB/MA 12.345" */
export const oabFormatada = (e: Pick<Empresa, "oab" | "oabUf">) => (e.oab ? `OAB/${e.oabUf || "—"} ${e.oab}` : "");
