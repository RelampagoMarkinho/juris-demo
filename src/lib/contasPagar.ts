// Contas a pagar (despesas recorrentes do escritório): aluguel, internet, sistemas, empréstimos...
// Cada conta é um modelo em `contasPagar` — FIXA (todo mês, até ser encerrada) ou PARCELADA (N meses).
// O pagamento do mês vira um lançamento de Despesa paga no Financeiro (com contaPagarId + competencia),
// então entra no saldo, nas despesas do mês e no gráfico. Um mês novo mostra de novo o que vence nele.

import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import { hojeISO } from "./db";
import type { Lancamento } from "./mock";

export type ContaPagar = {
  id: string;
  descricao: string;
  tipo: "Fixa" | "Parcelada";
  valor: number;          // valor previsto por mês (fixa) ou de cada parcela (parcelada)
  dia: number;            // dia do vencimento (1–31; nos meses mais curtos vira o último dia)
  inicio: string;         // AAAA-MM: primeiro mês da conta
  parcelas?: number;      // parcelada: quantidade de parcelas
  ativa: boolean;         // fixa encerrada deixa de aparecer nos meses seguintes
  encerradaEm?: string;   // AAAA-MM: último mês em que ainda aparece
  criadoPor?: string;
};

/** "2026-11" ± n meses. */
export function somarMesesComp(comp: string, n: number) {
  const [a, m] = comp.split("-").map(Number);
  const d = new Date(a, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
export const mesAtual = () => hojeISO().slice(0, 7);
const diffMeses = (de: string, ate: string) => {
  const [a1, m1] = de.split("-").map(Number), [a2, m2] = ate.split("-").map(Number);
  return (a2 - a1) * 12 + (m2 - m1);
};

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
export const nomeMes = (comp: string) => { const [a, m] = comp.split("-").map(Number); return `${MESES[m - 1]} de ${a}`; };

/** Data de vencimento da conta no mês (dia 31 em fevereiro vira 28/29). */
export function vencimentoNoMes(c: Pick<ContaPagar, "dia">, comp: string) {
  const [a, m] = comp.split("-").map(Number);
  const ultimo = new Date(a, m, 0).getDate();
  return `${comp}-${String(Math.min(c.dia, ultimo)).padStart(2, "0")}`;
}

/** A conta vence neste mês? Para parcelada, devolve também qual parcela é. */
export function venceNoMes(c: ContaPagar, comp: string): { parcela?: number } | null {
  const i = diffMeses(c.inicio, comp);
  if (i < 0) return null;
  if (c.tipo === "Parcelada") return i < (c.parcelas ?? 0) ? { parcela: i + 1 } : null;
  if (!c.ativa && c.encerradaEm && comp > c.encerradaEm) return null;
  return {};
}

export type ItemMes = {
  conta: ContaPagar;
  parcela?: number;
  vencimento: string;
  valorPrevisto: number;
  pagamento?: Lancamento;           // lançamento de despesa que quitou este mês
  situacao: "Pago" | "Pendente" | "Atrasado";
};

/** Contas do mês: pendentes/atrasadas primeiro (por vencimento) e as já pagas no final. */
export function contasDoMes(contas: ContaPagar[], lancamentos: Lancamento[], comp: string): ItemMes[] {
  const hoje = hojeISO();
  return contas.flatMap((c) => {
    const v = venceNoMes(c, comp);
    if (!v) return [];
    const vencimento = vencimentoNoMes(c, comp);
    const pagamento = lancamentos.find((l) => l.contaPagarId === c.id && l.competencia === comp);
    const situacao: ItemMes["situacao"] = pagamento ? "Pago" : vencimento < hoje ? "Atrasado" : "Pendente";
    return [{ conta: c, parcela: v.parcela, vencimento, valorPrevisto: c.valor, pagamento, situacao }];
  }).sort((a, b) => Number(a.situacao === "Pago") - Number(b.situacao === "Pago") || a.vencimento.localeCompare(b.vencimento));
}

/** Registra o pagamento do mês como uma despesa paga no Financeiro. */
export async function pagarConta(item: ItemMes, comp: string, valor: number, pagoEm: string, criadoPor: string) {
  const c = item.conta;
  const l: Omit<Lancamento, "id"> = {
    tipo: "Despesa", categoria: c.tipo === "Fixa" ? "Conta fixa" : "Conta parcelada", cliente: "—", clienteId: "",
    descricao: c.tipo === "Parcelada" ? `${c.descricao} — Parcela ${item.parcela}/${c.parcelas}` : c.descricao,
    valor, data: item.vencimento, status: "Pago", pagoEm: pagoEm || hojeISO(),
    contaPagarId: c.id, competencia: comp, criadoPor,
  };
  await addDoc(collection(db, "lancamentos"), { ...l, criadoEm: serverTimestamp() });
}
