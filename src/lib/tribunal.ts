"use client";

import { tribunalDoCnj, type DadosTribunal } from "./cnj";

/**
 * Versão de demonstração: não há servidor para consultar o CNJ (DataJud), então a consulta é
 * SIMULADA — devolve andamentos fictícios, sempre os mesmos para o mesmo número.
 */
export async function consultarTribunal(numero: string): Promise<DadosTribunal> {
  await new Promise((ok) => setTimeout(ok, 1500));
  const t = tribunalDoCnj(numero);
  const digitos = numero.replace(/\D/g, "");
  const semente = Number(digitos.slice(0, 7)) || 1;
  const hoje = new Date();
  const dia = (atras: number) => {
    const d = new Date(hoje); d.setDate(d.getDate() - atras);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  const passos = [
    "Distribuído por sorteio", "Conclusos para despacho", "Despacho — cite-se a parte ré", "Expedição de mandado de citação",
    "Juntada de mandado cumprido", "Juntada de contestação", "Ato ordinatório — intimação para réplica", "Juntada de petição (réplica)",
    "Conclusos para decisão", "Decisão — saneamento e organização do processo", "Audiência de instrução designada",
  ];
  const qtd = 5 + (semente % 6);
  const movimentos = passos.slice(0, qtd).map((descricao, i) => ({
    data: dia((qtd - i) * 23 + (semente % 9)), hora: `${String(9 + ((semente + i) % 8)).padStart(2, "0")}:${String((semente * (i + 3)) % 60).padStart(2, "0")}`,
    descricao, grau: "G1",
  })).reverse();
  return {
    sigla: t?.sigla ?? "TJ",
    numero: digitos,
    classe: "Procedimento Comum Cível",
    assuntos: ["Indenização por Dano Moral", "Obrigação de Fazer / Não Fazer"].slice(0, 1 + (semente % 2)),
    orgao: `${1 + (semente % 12)}ª Vara Cível`,
    graus: ["G1"],
    sistema: "PJe",
    formato: "Eletrônico",
    dataAjuizamento: movimentos[movimentos.length - 1].data,
    ultimaAtualizacao: new Date().toISOString(),
    movimentos,
  };
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
