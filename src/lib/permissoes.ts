// Permissões por perfil, ação por ação. O administrador marca na tela Usuários → Permissões o que
// cada perfil pode fazer; fica salvo em Firestore config/permissoes e vale também nas regras do Firebase.
// O perfil Administrador sempre pode tudo (para ninguém perder o acesso ao sistema).
// As chaves usam "_" (não ".") para poderem ser lidas direto nas regras do Firestore.

import type { Perfil } from "./mock";

export const PERFIS: Perfil[] = ["Administrador", "Advogado", "Estagiário", "Secretária"];
export const PERFIS_CONFIGURAVEIS = PERFIS.filter((p) => p !== "Administrador");

export const MODULOS_PERMISSAO = [
  {
    modulo: "Dashboard",
    acoes: [
      { chave: "dashboard_ver", rotulo: "Acessar o Dashboard" },
      { chave: "dashboard_financeiro", rotulo: "Ver o resumo financeiro no Dashboard", detalhe: "Também depende de acessar o Financeiro" },
    ],
  },
  {
    modulo: "Clientes",
    acoes: [
      { chave: "clientes_ver", rotulo: "Acessar a lista e o perfil dos clientes" },
      { chave: "clientes_criar", rotulo: "Cadastrar cliente" },
      { chave: "clientes_editar", rotulo: "Editar dados do cliente" },
      { chave: "clientes_excluir", rotulo: "Excluir cliente" },
      { chave: "clientes_anexar", rotulo: "Anexar documentos (RG, CPF, comprovantes...)" },
      { chave: "clientes_excluir_anexo", rotulo: "Excluir documentos anexados" },
      { chave: "clientes_gerar", rotulo: "Gerar documentos (modelos e formulários)" },
      { chave: "clientes_editar_gerado", rotulo: "Editar o texto de um documento gerado" },
      { chave: "clientes_anexar_assinado", rotulo: "Anexar a via assinada de um documento gerado" },
      { chave: "clientes_excluir_gerado", rotulo: "Excluir documentos gerados" },
    ],
  },
  {
    modulo: "Processos",
    acoes: [
      { chave: "processos_ver", rotulo: "Acessar e consultar processos" },
      { chave: "processos_criar", rotulo: "Cadastrar processo (pelo cliente)" },
      { chave: "processos_editar", rotulo: "Alterar situação, prazo e registrar andamentos" },
      { chave: "processos_tribunal", rotulo: "Atualizar dados do tribunal (DataJud)" },
      { chave: "processos_excluir", rotulo: "Excluir processo" },
    ],
  },
  {
    modulo: "Corretores",
    acoes: [
      { chave: "corretores_ver", rotulo: "Acessar corretores (inclui chave PIX)" },
      { chave: "corretores_criar", rotulo: "Cadastrar corretor" },
      { chave: "corretores_editar", rotulo: "Editar corretor" },
      { chave: "corretores_excluir", rotulo: "Excluir corretor" },
    ],
  },
  {
    modulo: "Financeiro",
    acoes: [
      { chave: "financeiro_ver", rotulo: "Acessar o Financeiro" },
      { chave: "financeiro_ver_receber", rotulo: "Ver o card “A receber”" },
      { chave: "financeiro_criar", rotulo: "Lançar receitas e despesas" },
      { chave: "financeiro_editar", rotulo: "Editar lançamentos (descrição, valor, data, cliente...)" },
      { chave: "financeiro_baixar", rotulo: "Dar baixa (marcar como pago)" },
      { chave: "financeiro_excluir", rotulo: "Excluir lançamentos" },
      { chave: "financeiro_exportar", rotulo: "Exportar planilha (CSV)" },
    ],
  },
  {
    modulo: "Documentos",
    acoes: [
      { chave: "documentos_ver", rotulo: "Acessar o módulo Documentos" },
      { chave: "documentos_modelos", rotulo: "Criar e editar modelos no editor" },
      { chave: "documentos_excluir_modelo", rotulo: "Excluir modelos" },
    ],
  },
  {
    modulo: "Usuários",
    acoes: [
      { chave: "usuarios_ver", rotulo: "Acessar a lista de usuários" },
      { chave: "usuarios_criar", rotulo: "Cadastrar usuários", detalhe: "Nunca como Administrador" },
      { chave: "usuarios_editar", rotulo: "Editar usuários (nome, perfil, OAB)", detalhe: "Não altera administradores" },
      { chave: "usuarios_ativar", rotulo: "Ativar e desativar usuários", detalhe: "Não altera administradores" },
    ],
  },
  {
    modulo: "Configurações",
    acoes: [
      { chave: "config_empresa", rotulo: "Editar os dados da empresa (CNPJ, OAB, endereço, logo)" },
    ],
  },
] as const;

export type ChavePermissao = (typeof MODULOS_PERMISSAO)[number]["acoes"][number]["chave"];
export type TabelaPermissoes = Partial<Record<Perfil, Partial<Record<ChavePermissao, boolean>>>>;

export const TODAS_CHAVES: ChavePermissao[] = MODULOS_PERMISSAO.flatMap((m) => m.acoes.map((a) => a.chave));

const tudo = (chaves: ChavePermissao[]) => Object.fromEntries(TODAS_CHAVES.map((k) => [k, chaves.includes(k)]));
const CLI_BASE: ChavePermissao[] = ["clientes_ver", "clientes_criar", "clientes_editar", "clientes_anexar", "clientes_excluir_anexo",
  "clientes_gerar", "clientes_editar_gerado", "clientes_anexar_assinado", "clientes_excluir_gerado", "clientes_excluir"];

/** Ponto de partida (o que o sistema já fazia antes da tela de permissões). */
export const PERMISSOES_PADRAO: TabelaPermissoes = {
  Advogado: tudo(["dashboard_ver", ...CLI_BASE,
    "processos_ver", "processos_criar", "processos_editar", "processos_tribunal", "processos_excluir",
    "corretores_ver", "corretores_criar", "corretores_editar", "corretores_excluir",
    "documentos_ver", "documentos_modelos", "documentos_excluir_modelo"]),
  Estagiário: tudo(["dashboard_ver", "clientes_ver", "clientes_criar", "clientes_editar", "clientes_anexar", "clientes_gerar",
    "clientes_anexar_assinado", "processos_ver", "processos_criar", "processos_editar", "processos_tribunal", "documentos_ver"]),
  Secretária: tudo(["dashboard_ver", "dashboard_financeiro", ...CLI_BASE,
    "corretores_ver", "corretores_criar", "corretores_editar", "corretores_excluir",
    "financeiro_ver", "financeiro_ver_receber", "financeiro_criar", "financeiro_editar", "financeiro_baixar", "financeiro_excluir", "financeiro_exportar", "documentos_ver"]),
};

/** Se o perfil pode fazer a ação (Administrador: sempre). */
export function permitido(tabela: TabelaPermissoes | null, perfil: Perfil | undefined, chave: ChavePermissao) {
  if (!perfil) return false;
  if (perfil === "Administrador") return true;
  const t = tabela ?? PERMISSOES_PADRAO;
  return t[perfil]?.[chave] ?? PERMISSOES_PADRAO[perfil]?.[chave] ?? false;
}
