"use client";

import { collection, doc, serverTimestamp, writeBatch } from "firebase/firestore";
import { db } from "./firebase";
import { clientes, corretores, lancamentos, processos, receitaMensal } from "./mock";

// Os dados de exemplo foram escritos em torno de 19/09/2024; deslocamos tudo para "hoje".
const BASE = new Date(2024, 8, 19).getTime();
const DESLOC = Math.round((new Date().setHours(0, 0, 0, 0) - BASE) / 86400000);

const mover = (iso: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const [a, m, d] = iso.split("-").map(Number);
  const n = new Date(a, m - 1, d + DESLOC);
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
};

/** Grava corretores, clientes, processos e lançamentos de exemplo no Firestore (documentos exigem arquivo real). */
export async function carregarExemplos() {
  const batch = writeBatch(db);
  const add = (col: string, dados: object) => batch.set(doc(collection(db, col)), { ...dados, criadoEm: serverTimestamp() });
  const strip = <T extends { id: string }>(o: T) => { const { id: _id, ...r } = o; return r; };
  const nascimento = (dias: number, ano: number) => {
    const d = new Date(); d.setDate(d.getDate() + dias);
    return `${ano}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  // Corretores primeiro, para vincular os clientes indicados por eles.
  const idCorretor: Record<string, string> = {};
  corretores.forEach((k) => {
    const ref = doc(collection(db, "corretores"));
    idCorretor[k.id] = ref.id;
    batch.set(ref, { ...strip(k), desde: mover(k.desde), criadoEm: serverTimestamp(),
      ...(k.id === "k1" ? { dataNascimento: nascimento(1, 1975) } : {}) });
  });
  // Aniversários de demonstração: hoje e nos próximos dias.
  const aniversarios: Record<string, string> = { c1: nascimento(0, 1986), c3: nascimento(2, 1991), c7: nascimento(3, 1979) };
  clientes.forEach((c) => {
    const { corretorId, ...resto } = strip(c);
    add("clientes", {
      ...resto, desde: mover(c.desde), ...(corretorId ? { corretorId: idCorretor[corretorId] } : {}),
      ...(aniversarios[c.id] ? { dataNascimento: aniversarios[c.id] } : {}),
    });
  });
  processos.forEach((p) =>
    add("processos", {
      ...strip(p),
      proximoPrazo: mover(p.proximoPrazo),
      andamentos: p.andamentos.map((a) => ({ ...a, data: mover(a.data) })),
    }),
  );
  lancamentos.forEach((l) => add("lancamentos", { ...strip(l), data: mover(l.data) }));

  // Histórico dos 6 meses anteriores para o gráfico de receitas x despesas.
  const hoje = new Date();
  receitaMensal.forEach((m, i) => {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - (6 - i), 10);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-10`;
    add("lancamentos", { data: iso, descricao: `Honorários consolidados — ${m.mes}`, cliente: "—", categoria: "Honorários", tipo: "Receita", valor: m.receita, status: "Pago" });
    add("lancamentos", { data: iso, descricao: `Despesas operacionais — ${m.mes}`, cliente: "—", categoria: "Estrutura", tipo: "Despesa", valor: m.despesa, status: "Pago" });
  });

  await batch.commit();
}
