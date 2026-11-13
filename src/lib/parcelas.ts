// Parcelamento de valores do cliente (honorários etc.): cada parcela é um lançamento de Receita
// no Financeiro, ligado aos demais pelo mesmo `parcelamentoId`. Assim as parcelas entram no
// "A receber", na inadimplência e no gráfico, e o acordo é acompanhado até a quitação.

import { collection, doc, serverTimestamp, writeBatch } from "firebase/firestore";
import { db } from "./firebase";
import { hojeISO } from "./db";
import type { Lancamento } from "./mock";

export type ParcelaPrevista = { numero: number; valor: number; vencimento: string; entrada?: boolean };

const centavos = (v: number) => Math.round(v * 100);

/** Mesmo dia nos meses seguintes (dia 31 vira o último dia do mês quando ele não existe). */
export function somarMeses(iso: string, meses: number) {
  const [a, m, d] = iso.split("-").map(Number);
  const ultimo = new Date(a, m - 1 + meses + 1, 0).getDate();
  const r = new Date(a, m - 1 + meses, Math.min(d, ultimo));
  return `${r.getFullYear()}-${String(r.getMonth() + 1).padStart(2, "0")}-${String(r.getDate()).padStart(2, "0")}`;
}

/**
 * Divide o total em entrada (opcional) + N parcelas mensais. Os centavos que sobram da divisão
 * vão para a última parcela, para a soma bater exatamente com o total.
 */
export function preverParcelas(total: number, n: number, primeiroVencimento: string, entrada = 0, dataEntrada = hojeISO()): ParcelaPrevista[] {
  const lista: ParcelaPrevista[] = [];
  const tot = centavos(total), ent = Math.min(centavos(entrada), tot);
  if (ent > 0) lista.push({ numero: 0, valor: ent / 100, vencimento: dataEntrada, entrada: true });
  const resto = tot - ent;
  if (n < 1 || resto <= 0) return lista;
  const base = Math.floor(resto / n);
  for (let i = 0; i < n; i++) {
    const v = i === n - 1 ? resto - base * (n - 1) : base;
    lista.push({ numero: i + 1, valor: v / 100, vencimento: somarMeses(primeiroVencimento, i) });
  }
  return lista;
}

/** Situação real do lançamento: pendente com vencimento já passado conta como atrasado. */
export const statusEfetivo = (l: Lancamento): Lancamento["status"] =>
  l.status === "Pago" ? "Pago" : l.status === "Atrasado" || l.data < hojeISO() ? "Atrasado" : "Pendente";

/** Data em que o dinheiro entrou (parcela paga depois do vencimento conta no mês do pagamento). */
export const dataCaixa = (l: Lancamento) => (l.status === "Pago" && l.pagoEm ? l.pagoEm : l.data);

export type Parcelamento = {
  id: string;
  descricao: string;
  cliente: string;
  clienteId?: string;
  categoria: string;
  total: number;
  parcelas: Lancamento[];   // em ordem (entrada primeiro)
  pago: number;
  saldo: number;
  pagas: number;
  atrasadas: number;
  proxima?: Lancamento;
  quitado: boolean;
};

/** Agrupa os lançamentos parcelados por acordo. */
export function agruparParcelamentos(lancamentos: Lancamento[]): Parcelamento[] {
  const grupos = new Map<string, Lancamento[]>();
  lancamentos.forEach((l) => { if (l.parcelamentoId) grupos.set(l.parcelamentoId, [...(grupos.get(l.parcelamentoId) ?? []), l]); });
  return Array.from(grupos.entries()).map(([id, ps]) => {
    const parcelas = ps.slice().sort((a, b) => (a.parcela ?? 0) - (b.parcela ?? 0) || a.data.localeCompare(b.data));
    const soma = (f: (l: Lancamento) => boolean) => parcelas.filter(f).reduce((s, l) => s + centavos(l.valor), 0) / 100;
    const abertas = parcelas.filter((l) => l.status !== "Pago");
    const p0 = parcelas[0];
    return {
      id,
      descricao: p0.descricaoParcelamento ?? p0.descricao,
      cliente: p0.cliente,
      clienteId: p0.clienteId,
      categoria: p0.categoria,
      total: soma(() => true),
      parcelas,
      pago: soma((l) => l.status === "Pago"),
      saldo: soma((l) => l.status !== "Pago"),
      pagas: parcelas.filter((l) => l.status === "Pago").length,
      atrasadas: parcelas.filter((l) => statusEfetivo(l) === "Atrasado").length,
      proxima: abertas[0],
      quitado: abertas.length === 0,
    };
  }).sort((a, b) => Number(a.quitado) - Number(b.quitado) || (a.proxima?.data ?? "9").localeCompare(b.proxima?.data ?? "9"));
}

/** Rótulo da parcela: "Entrada", "Parcela 3/10". */
export const rotuloParcela = (l: Lancamento) =>
  l.parcela === 0 ? "Entrada" : `Parcela ${l.parcela}/${l.totalParcelas}`;

/** Grava todas as parcelas de uma vez (ou tudo, ou nada). */
export async function criarParcelamento(dados: {
  descricao: string; cliente: string; clienteId?: string; categoria: string; parcelas: ParcelaPrevista[]; criadoPor: string;
  entradaPaga?: boolean;
}) {
  const lote = writeBatch(db);
  const parcelamentoId = doc(collection(db, "lancamentos")).id;
  const n = dados.parcelas.filter((p) => !p.entrada).length;
  for (const p of dados.parcelas) {
    const pago = !!p.entrada && !!dados.entradaPaga;
    const l: Omit<Lancamento, "id"> = {
      tipo: "Receita", categoria: dados.categoria, cliente: dados.cliente, clienteId: dados.clienteId ?? "",
      descricao: `${dados.descricao} — ${p.entrada ? "Entrada" : `Parcela ${p.numero}/${n}`}`,
      descricaoParcelamento: dados.descricao, valor: p.valor, data: p.vencimento,
      status: pago ? "Pago" : "Pendente", ...(pago ? { pagoEm: p.vencimento } : {}),
      parcelamentoId, parcela: p.numero, totalParcelas: n, criadoPor: dados.criadoPor,
    };
    lote.set(doc(collection(db, "lancamentos")), { ...l, criadoEm: serverTimestamp() });
  }
  await lote.commit();
  return parcelamentoId;
}

/** Marca as parcelas como pagas (data de pagamento = hoje, ou a informada). */
export async function baixarParcelas(ids: string[], pagoEm = hojeISO()) {
  const lote = writeBatch(db);
  ids.forEach((id) => lote.update(doc(db, "lancamentos", id), { status: "Pago", pagoEm, atualizadoEm: serverTimestamp() }));
  await lote.commit();
}

/** Desfaz a baixa de uma parcela marcada por engano. */
export async function estornarParcela(id: string) {
  const lote = writeBatch(db);
  lote.update(doc(db, "lancamentos", id), { status: "Pendente", pagoEm: "", atualizadoEm: serverTimestamp() });
  await lote.commit();
}

/** Exclui o acordo inteiro (todas as parcelas). */
export async function excluirParcelamento(p: Parcelamento) {
  const lote = writeBatch(db);
  p.parcelas.forEach((l) => lote.delete(doc(db, "lancamentos", l.id)));
  await lote.commit();
}
