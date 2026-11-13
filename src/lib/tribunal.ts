"use client";

import { auth } from "./firebase";
import type { DadosTribunal } from "./cnj";

/** Busca os dados públicos do processo no CNJ (DataJud), pelo número CNJ. */
export async function consultarTribunal(numero: string): Promise<DadosTribunal> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error("Faça login novamente.");
  const r = await fetch("/api/datajud", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ numero }),
  });
  if (!r.ok) {
    const msg = (await r.text().catch(() => "")).trim();
    // Resposta em HTML = o próprio servidor cortou a espera (o CNJ demorou demais).
    if (!msg || msg.startsWith("<")) {
      throw new Error(r.status === 504 || r.status === 503
        ? "O CNJ demorou demais para responder e a consulta foi interrompida. Tente novamente em alguns minutos."
        : `Erro ${r.status} na consulta ao tribunal.`);
    }
    throw new Error(msg);
  }
  return (await r.json()) as DadosTribunal;
}

/** Junta as movimentações do tribunal aos andamentos já registrados (sem duplicar). */
export function mesclarAndamentos(
  atuais: { data: string; descricao: string; origem?: string }[],
  movimentos: DadosTribunal["movimentos"],
) {
  const chave = (a: { data: string; descricao: string }) => `${a.data}|${a.descricao}`;
  const existentes = new Set(atuais.map(chave));
  const novos = movimentos
    .map((m) => ({ data: m.data, descricao: m.hora ? `${m.descricao} (${m.hora}${m.grau ? ` · ${m.grau}` : ""})` : m.descricao, origem: "tribunal" }))
    .filter((m) => !existentes.has(chave(m)));
  const todos = [...atuais, ...novos].sort((a, b) => (b.data ?? "").localeCompare(a.data ?? ""));
  return { andamentos: todos, novos: novos.length };
}

/** Resumo para gravar no processo (sem a lista de movimentos, que vira andamentos). */
export function resumoTribunal(d: DadosTribunal) {
  const { movimentos: _m, ...resto } = d;
  return { ...resto, sincronizadoEm: new Date().toISOString() };
}
