import type { Lancamento } from "./mock";
import { dataCaixa } from "./parcelas";

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

/** Soma receitas/despesas pagas dos últimos 6 meses (incluindo o atual). */
export function serieMensal(lista: Lancamento[]) {
  const hoje = new Date();
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - 5 + i, 1);
    const chave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const doMes = lista.filter((l) => l.status === "Pago" && dataCaixa(l)?.startsWith(chave));
    return {
      mes: MESES[d.getMonth()],
      receita: doMes.filter((l) => l.tipo === "Receita").reduce((s, l) => s + l.valor, 0),
      despesa: doMes.filter((l) => l.tipo === "Despesa").reduce((s, l) => s + l.valor, 0),
    };
  });
}

/** Próximo "degrau" redondo para o eixo Y do gráfico. */
export const escala = (v: number) => {
  if (v <= 0) return 10000;
  const mag = 10 ** Math.floor(Math.log10(v));
  return Math.ceil(v / mag) * mag;
};
