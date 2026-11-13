// Formulários oficiais em PDF (bancos etc.): o sistema preenche os campos do PRÓPRIO PDF original,
// então o documento sai idêntico ao do banco. Os arquivos ficam em public/formularios/.
// Os nomes dos campos (campo) são os nomes internos do PDF — conferidos um a um na posição da página.

import { PDFDocument, PDFCheckBox, PDFTextField } from "pdf-lib";
import type { Cliente, Processo } from "./mock";

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

/** Dados disponíveis para pré-preencher (o usuário confere e completa na tela antes de gerar). */
export type Contexto = { c: Cliente; p: Processo | null; d: Record<string, string>; hoje: Date };

export type CampoPdf = {
  campo: string;                 // nome do campo dentro do PDF
  rotulo: string;
  grupo: string;
  tipo?: "texto" | "marcar";     // padrão: texto
  largo?: boolean;               // ocupa a linha inteira no formulário da tela
  valor?: boolean | ((x: Contexto) => string | boolean); // valor fixo (marcado ou não) ou tirado do cadastro
};

export type FormularioPdf = {
  id: string;
  nome: string;
  categoria: string;
  descricao: string;
  arquivo: string;
  campos: CampoPdf[];
};

const temRogo = (x: Contexto) => x.c.tipo === "PF" && !!x.c.rogado?.nome;
const rogo = (f: (x: Contexto) => string) => (x: Contexto) => (temRogo(x) ? f(x) : "");
const numVara = (x: Contexto) => (x.p?.vara ?? "").match(/\d+/)?.[0] ?? "";
const nome = (x: Contexto) => x.d.nome_maiusculo;
const cpf = (x: Contexto) => x.d.documento;
const cidade = (x: Contexto) => x.c.cidade ?? "";
const dia = (x: Contexto) => String(x.hoje.getDate()).padStart(2, "0");
const mes = (x: Contexto) => MESES[x.hoje.getMonth()];
const ano = (x: Contexto) => String(x.hoje.getFullYear());
const telefone = (x: Contexto) => (x.c.telefone ?? "").replace(/\D/g, "");

/** Testemunhas e assinatura a rogo (beneficiário analfabeto) — igual nos dois formulários do BB. */
const blocoRogo = (n: {
  t1: string; t2: string; c1: string; c2: string; eu: string; rg: string; exp: string; em: string; cpfRog: string;
  benef: string; rgBenef: string; expBenef: string; emBenef: string; alvara: string; assNome: string; assCpf: string;
  t3: string; t4: string; c3: string; c4: string;
}): CampoPdf[] => {
  const g = "Beneficiário analfabeto (assinatura a rogo)";
  return [
    { campo: n.eu, rotulo: "Quem assina a rogo — nome", grupo: g, largo: true, valor: rogo((x) => x.c.rogado?.nome?.toUpperCase() ?? "") },
    { campo: n.rg, rotulo: "RG de quem assina a rogo", grupo: g, valor: rogo((x) => x.c.rogado?.rg ?? "") },
    { campo: n.exp, rotulo: "Expedida pelo", grupo: g },
    { campo: n.em, rotulo: "Em (data de expedição)", grupo: g },
    { campo: n.cpfRog, rotulo: "CPF de quem assina a rogo", grupo: g, valor: rogo((x) => x.c.rogado?.cpf ?? "") },
    { campo: n.benef, rotulo: "Beneficiário (analfabeto)", grupo: g, largo: true, valor: rogo(nome) },
    { campo: n.rgBenef, rotulo: "RG do beneficiário", grupo: g, valor: rogo((x) => x.c.rg ?? "") },
    { campo: n.expBenef, rotulo: "Expedida por", grupo: g, valor: rogo((x) => x.c.orgaoEmissor ?? "") },
    { campo: n.emBenef, rotulo: "Em (data de expedição)", grupo: g, valor: rogo((x) => x.d.data_emissao_rg) },
    { campo: n.alvara, rotulo: "Alvará Judicial nº", grupo: g },
    { campo: n.assNome, rotulo: "Assinatura — nome", grupo: g, valor: rogo((x) => x.c.rogado?.nome?.toUpperCase() ?? "") },
    { campo: n.assCpf, rotulo: "Assinatura — CPF", grupo: g, valor: rogo((x) => x.c.rogado?.cpf ?? "") },
    { campo: n.t1, rotulo: "Testemunha 1 — nome (1ª lista)", grupo: "Testemunhas" },
    { campo: n.c1, rotulo: "Testemunha 1 — CPF (1ª lista)", grupo: "Testemunhas" },
    { campo: n.t2, rotulo: "Testemunha 2 — nome (1ª lista)", grupo: "Testemunhas" },
    { campo: n.c2, rotulo: "Testemunha 2 — CPF (1ª lista)", grupo: "Testemunhas" },
    { campo: n.t3, rotulo: "Testemunha 1 — nome (assinatura a rogo)", grupo: "Testemunhas" },
    { campo: n.c3, rotulo: "Testemunha 1 — CPF (assinatura a rogo)", grupo: "Testemunhas" },
    { campo: n.t4, rotulo: "Testemunha 2 — nome (assinatura a rogo)", grupo: "Testemunhas" },
    { campo: n.c4, rotulo: "Testemunha 2 — CPF (assinatura a rogo)", grupo: "Testemunhas" },
  ];
};

const SEL = "Caixa de sele#C3#A7#C3#A3o 1"; // nome interno de algumas caixas de marcar

export const FORMULARIOS_PDF: FormularioPdf[] = [
  {
    id: "bb-isencao-irpf",
    nome: "Declaração de Isenção IRPF — Banco do Brasil",
    categoria: "Declaração",
    descricao: "Declaração de isenção (depósito judicial — precatório/RPV) do Banco do Brasil, no PDF original.",
    arquivo: "/formularios/bb-isencao-irpf.pdf",
    campos: [
      { campo: "TextBox1", rotulo: "Nome do beneficiário", grupo: "Beneficiário", largo: true, valor: nome },
      { campo: "TextBox11", rotulo: "Residente ou domiciliado(a) em", grupo: "Beneficiário", largo: true, valor: (x) => x.d.endereco_completo },
      { campo: "TextBox12", rotulo: "CPF/CNPJ", grupo: "Beneficiário", valor: cpf },
      { campo: "TextBox13", rotulo: "Processo nº", grupo: "Processo", valor: (x) => x.d.processo_numero },
      { campo: "TextBox14", rotulo: "Vara (nº)", grupo: "Processo", valor: numVara },
      { campo: "TextBox15", rotulo: "Seção/Subseção Judiciária de", grupo: "Processo" },
      { campo: SEL, rotulo: "a) O montante constitui rendimento isento ou não tributável", grupo: "Declaração", tipo: "marcar", valor: true },
      { campo: "TextBox16", rotulo: "Montante (R$)", grupo: "Declaração" },
      { campo: "Widget", rotulo: "b) Está inscrita no Simples", grupo: "Declaração", tipo: "marcar", valor: false },
      { campo: "TextBox16_2", rotulo: "Local (cidade)", grupo: "Local e data", valor: cidade },
      { campo: "TextBox16_3", rotulo: "UF", grupo: "Local e data", valor: (x) => x.c.uf ?? "" },
      { campo: "TextBox16_4", rotulo: "Dia", grupo: "Local e data", valor: dia },
      { campo: "TextBox16_5", rotulo: "Mês", grupo: "Local e data", valor: mes },
      { campo: "TextBox16_6", rotulo: "Ano", grupo: "Local e data", valor: ano },
      { campo: "unnamed0", rotulo: "Beneficiário analfabeto: SIM", grupo: "Beneficiário analfabeto (assinatura a rogo)", tipo: "marcar", valor: temRogo },
      { campo: SEL + "_2", rotulo: "Beneficiário analfabeto: NÃO", grupo: "Beneficiário analfabeto (assinatura a rogo)", tipo: "marcar", valor: (x) => !temRogo(x) },
      ...blocoRogo({
        t1: "Caixa de texto 2_2", t2: "Caixa de texto 2_3", c1: "Caixa de texto 2_4", c2: "Caixa de texto 2_5",
        eu: "Caixa de texto 2_6", rg: "Caixa de texto 2_7", exp: "Caixa de texto 2_8", em: "Caixa de texto 2_9", cpfRog: "Caixa de texto 2_10",
        benef: "Caixa de texto 2_11", rgBenef: "Caixa de texto 2_12", expBenef: "Caixa de texto 2_13", emBenef: "Caixa de texto 2_14",
        alvara: "Caixa de texto 2_15", assNome: "Caixa de texto 2_16", assCpf: "Caixa de texto 2_17",
        t3: "Caixa de texto 2_18", t4: "Caixa de texto 1", c3: "Caixa de texto 3", c4: "Caixa de texto 2",
      }),
    ],
  },

  {
    id: "bb-resgate-rpv",
    nome: "Formulário de Resgate de Depósito Judicial/RPV — Banco do Brasil",
    categoria: "Outros",
    descricao: "Solicitação de resgate de depósito judicial / precatório / RPV do Banco do Brasil, no PDF original.",
    arquivo: "/formularios/bb-resgate-rpv.pdf",
    campos: [
      { campo: "Caixa de texto 2", rotulo: "Beneficiário — nome", grupo: "Beneficiário", largo: true, valor: nome },
      { campo: "Caixa de texto 1", rotulo: "Beneficiário — CPF/CNPJ", grupo: "Beneficiário", valor: cpf },
      { campo: "Caixa de texto 2_2", rotulo: "Representante legal ou procurador — nome", grupo: "Beneficiário", largo: true, valor: (x) => x.d.representante_nome },
      { campo: "Caixa de texto 1_2", rotulo: "Representante — CPF/CNPJ", grupo: "Beneficiário", valor: (x) => x.d.representante_cpf },

      { campo: "Dep#C3#B3sito Estaual", rotulo: "Depósito Estadual", grupo: "Tipo de depósito", tipo: "marcar" },
      { campo: "Dep#C3#B3sito Trabalhista", rotulo: "Depósito Trabalhista", grupo: "Tipo de depósito", tipo: "marcar" },
      { campo: "Precat#C3#B3rio ou RPV Federal", rotulo: "Precatório ou RPV Federal", grupo: "Tipo de depósito", tipo: "marcar", valor: true },
      { campo: "Caixa de texto 2_3", rotulo: "Conta judicial 1", grupo: "Tipo de depósito" },
      { campo: "Caixa de texto 2_4", rotulo: "Conta judicial 2", grupo: "Tipo de depósito" },
      { campo: "Caixa de texto 2_5", rotulo: "Conta judicial 3", grupo: "Tipo de depósito" },

      { campo: "Autoriza#C3#A7#C3#A3o permanente para cr#C3#A9dito em conta do benefici#C3#A1rio no Banco do Brasil", rotulo: "Autorização permanente para crédito em conta do beneficiário no BB", grupo: "Forma de recebimento", tipo: "marcar" },
      { campo: "Conv#C3#AAnio de Resgate Centralizado - DJC", rotulo: "Convênio de Resgate Centralizado — DJC", grupo: "Forma de recebimento", tipo: "marcar" },
      { campo: "unnamed1", rotulo: "Pagamento em espécie em agência da UF do Tribunal", grupo: "Forma de recebimento", tipo: "marcar" },
      { campo: "Caixa de texto 2_24", rotulo: "Prefixo da agência/PSO (saque em outra UF)", grupo: "Forma de recebimento" },

      { campo: "CR#C3#89DITO em Conta BB ou TED para o BENEFICI#C3#81RIO", rotulo: "Crédito em conta BB ou TED para o BENEFICIÁRIO", grupo: "Conta do beneficiário", tipo: "marcar" },
      { campo: "Caixa de texto 2_6", rotulo: "Banco nº", grupo: "Conta do beneficiário" },
      { campo: "Caixa de texto 2_7", rotulo: "Banco (nome)", grupo: "Conta do beneficiário" },
      { campo: "Caixa de texto 2_8", rotulo: "Agência", grupo: "Conta do beneficiário" },
      { campo: "Caixa de texto 2_9", rotulo: "Conta", grupo: "Conta do beneficiário" },
      { campo: "Caixa de texto 2_10", rotulo: "Nome (titular)", grupo: "Conta do beneficiário", largo: true, valor: nome },
      { campo: "Caixa de texto 2_11", rotulo: "CPF/CNPJ (titular)", grupo: "Conta do beneficiário", valor: cpf },
      { campo: "fixo_2", rotulo: "Conta Corrente", grupo: "Conta do beneficiário", tipo: "marcar" },
      { campo: "fixo_3", rotulo: "Conta Poupança", grupo: "Conta do beneficiário", tipo: "marcar" },
      { campo: "Caixa de texto 2_12", rotulo: "Variação (poupança)", grupo: "Conta do beneficiário" },
      { campo: "fixo_4", rotulo: "Valor: Saldo Total", grupo: "Conta do beneficiário", tipo: "marcar" },
      { campo: "fixo_5", rotulo: "Valor: Saldo Remanescente", grupo: "Conta do beneficiário", tipo: "marcar" },
      { campo: "fixo", rotulo: "Valor: Fixo", grupo: "Conta do beneficiário", tipo: "marcar" },
      { campo: "Caixa de texto 2_13", rotulo: "Fixo R$", grupo: "Conta do beneficiário" },
      { campo: SEL, rotulo: "Valor: Parcial", grupo: "Conta do beneficiário", tipo: "marcar" },
      { campo: "Caixa de texto 2_14", rotulo: "Parcial R$", grupo: "Conta do beneficiário" },
      { campo: "Parcial", rotulo: "Valor: Percentual", grupo: "Conta do beneficiário", tipo: "marcar" },
      { campo: "Caixa de texto 3", rotulo: "Percentual (%)", grupo: "Conta do beneficiário" },

      { campo: "CR#C3#89DITO Conta BB ou TED para o REPRESENTANTE LEGAL", rotulo: "Crédito em conta BB ou TED para o REPRESENTANTE LEGAL", grupo: "Conta do representante legal", tipo: "marcar" },
      { campo: "Caixa de texto 2_25", rotulo: "Banco nº", grupo: "Conta do representante legal" },
      { campo: "Caixa de texto 2_26", rotulo: "Banco (nome)", grupo: "Conta do representante legal" },
      { campo: "Caixa de texto 2_27", rotulo: "Agência", grupo: "Conta do representante legal" },
      { campo: "Caixa de texto 2_28", rotulo: "Conta", grupo: "Conta do representante legal" },
      { campo: "Caixa de texto 2_31", rotulo: "Nome (titular)", grupo: "Conta do representante legal", largo: true },
      { campo: "Caixa de texto 2_32", rotulo: "CPF/CNPJ (titular)", grupo: "Conta do representante legal" },
      { campo: "fixo_7", rotulo: "Conta Corrente", grupo: "Conta do representante legal", tipo: "marcar" },
      { campo: "fixo_8", rotulo: "Conta Poupança", grupo: "Conta do representante legal", tipo: "marcar" },
      { campo: "Caixa de texto 2_33", rotulo: "Variação (poupança)", grupo: "Conta do representante legal" },
      { campo: "fixo_9", rotulo: "Valor: Saldo Total", grupo: "Conta do representante legal", tipo: "marcar" },
      { campo: "fixo_10", rotulo: "Valor: Saldo Remanescente", grupo: "Conta do representante legal", tipo: "marcar" },
      { campo: "fixo_6", rotulo: "Valor: Fixo", grupo: "Conta do representante legal", tipo: "marcar" },
      { campo: "Caixa de texto 2_29", rotulo: "Fixo R$", grupo: "Conta do representante legal" },
      { campo: SEL + "_2", rotulo: "Valor: Parcial", grupo: "Conta do representante legal", tipo: "marcar" },
      { campo: "Caixa de texto 2_30", rotulo: "Parcial R$", grupo: "Conta do representante legal" },
      { campo: "Parcial_2", rotulo: "Valor: Percentual", grupo: "Conta do representante legal", tipo: "marcar" },
      { campo: "Caixa de texto 3_2", rotulo: "Percentual (%)", grupo: "Conta do representante legal" },

      { campo: "unnamed0", rotulo: "Imposto de renda — se declara isento: SIM", grupo: "Imposto de renda", tipo: "marcar", valor: true },
      { campo: "unnamed0_2", rotulo: "Imposto de renda — se declara isento: NÃO", grupo: "Imposto de renda", tipo: "marcar", valor: false },

      { campo: "Caixa de texto 2_15", rotulo: "Telefone — DDD", grupo: "Contato" },
      { campo: "Caixa de texto 2_16", rotulo: "Telefone", grupo: "Contato" },
      { campo: "Caixa de texto 2_17", rotulo: "Celular — DDD", grupo: "Contato", valor: (x) => telefone(x).slice(0, 2) },
      { campo: "Caixa de texto 2_18", rotulo: "Celular", grupo: "Contato", valor: (x) => telefone(x).slice(2).replace(/(\d+)(\d{4})$/, "$1-$2") },
      { campo: "Caixa de texto 2_19", rotulo: "E-mail", grupo: "Contato", largo: true, valor: (x) => x.c.email ?? "" },
      { campo: "Caixa de texto 2_20", rotulo: "Local", grupo: "Local e data", valor: (x) => [x.c.cidade, x.c.uf].filter(Boolean).join("/") },
      { campo: "Caixa de texto 2_21", rotulo: "Dia", grupo: "Local e data", valor: dia },
      { campo: "Caixa de texto 2_22", rotulo: "Mês", grupo: "Local e data", valor: mes },
      { campo: "Caixa de texto 2_23", rotulo: "Ano", grupo: "Local e data", valor: ano },

      { campo: "unnamed0_3", rotulo: "Beneficiário analfabeto: SIM", grupo: "Beneficiário analfabeto (assinatura a rogo)", tipo: "marcar", valor: temRogo },
      { campo: "unnamed0_4", rotulo: "Beneficiário analfabeto: NÃO", grupo: "Beneficiário analfabeto (assinatura a rogo)", tipo: "marcar", valor: (x) => !temRogo(x) },
      ...blocoRogo({
        t1: "Caixa de texto 2_34", t2: "Caixa de texto 2_35", c1: "Caixa de texto 2_45", c2: "Caixa de texto 2_46",
        eu: "Caixa de texto 2_36", rg: "Caixa de texto 2_37", exp: "Caixa de texto 2_38", em: "Caixa de texto 2_39", cpfRog: "Caixa de texto 2_47",
        benef: "Caixa de texto 2_40", rgBenef: "Caixa de texto 2_41", expBenef: "Caixa de texto 2_42", emBenef: "Caixa de texto 2_43",
        alvara: "Caixa de texto 2_44", assNome: "Caixa de texto 2_48", assCpf: "Caixa de texto 2_49",
        t3: "Caixa de texto 2_52", t4: "Caixa de texto 2_53", c3: "Caixa de texto 2_50", c4: "Caixa de texto 2_51",
      }),
    ],
  },
];

export type ValoresPdf = Record<string, string | boolean>;

/** Valores iniciais de cada campo, a partir do cadastro do cliente e do processo. */
export function valoresIniciais(f: FormularioPdf, x: Contexto): ValoresPdf {
  const v: ValoresPdf = {};
  for (const c of f.campos) {
    const r = typeof c.valor === "function" ? c.valor(x) : c.valor;
    v[c.campo] = c.tipo === "marcar" ? r === true : typeof r === "string" ? r : "";
  }
  return v;
}

async function abrirOriginal(f: FormularioPdf) {
  const bytes = await fetch(f.arquivo).then((r) => {
    if (!r.ok) throw new Error("Não foi possível abrir o PDF original do formulário.");
    return r.arrayBuffer();
  });
  return PDFDocument.load(bytes);
}

/** Limite de caracteres que o próprio PDF impõe a alguns campos (ex.: percentual). */
export async function limitesFormulario(f: FormularioPdf): Promise<Record<string, number>> {
  const lim: Record<string, number> = {};
  (await abrirOriginal(f)).getForm().getFields().forEach((c) => {
    const n = c instanceof PDFTextField ? c.getMaxLength() : undefined;
    if (n) lim[c.getName()] = n;
  });
  return lim;
}

/** Preenche o PDF original do formulário e devolve o arquivo pronto. */
export async function preencherFormulario(f: FormularioPdf, valores: ValoresPdf): Promise<Blob> {
  const pdf = await abrirOriginal(f);
  const form = pdf.getForm();
  for (const campo of form.getFields()) {
    const nomeCampo = campo.getName();
    if (!(nomeCampo in valores)) continue;
    const v = valores[nomeCampo];
    if (campo instanceof PDFTextField) {
      const texto = typeof v === "string" ? v : "";
      const max = campo.getMaxLength();
      campo.setText(max ? texto.slice(0, max) : texto);
    }
    else if (campo instanceof PDFCheckBox) (v === true ? campo.check() : campo.uncheck());
  }
  const saida = await pdf.save(); // gera a aparência dos campos preenchidos
  return new Blob([saida as BlobPart], { type: "application/pdf" });
}
