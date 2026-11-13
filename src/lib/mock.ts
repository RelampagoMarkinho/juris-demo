// Dados fictícios de demonstração — serão substituídos pelo Firestore no futuro.

export type Cliente = {
  id: string;
  nome: string;
  tipo: "PF" | "PJ";
  documento: string;
  email: string;
  telefone: string;
  // Dados pessoais (PF)
  dataNascimento?: string; // AAAA-MM-DD
  sexo?: "Masculino" | "Feminino";
  rg?: string;
  orgaoEmissor?: string;
  dataEmissaoRg?: string;
  estadoCivil?: string;
  nacionalidade?: string;
  profissao?: string;
  // Endereço
  cep?: string;
  rua?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade: string;
  uf?: string;
  processos?: number;
  corretorId?: string; // corretor que indicou o cliente
  tipoProcesso?: string; // área do processo do cliente (ver AREAS_PROCESSO)
  observacoes?: string;  // anotações livres do escritório sobre o cliente
  // Capacidade civil e quem assina pelo cliente
  capacidade?: string;                 // ver CAPACIDADES
  representante?: Representante | null; // genitor(a), tutor(a), curador(a)...
  rogado?: Rogado | null;              // quem assina a rogo (cliente que não sabe assinar)
  status: StatusCliente;
  desde: string;
};

/** Corretor: pessoa que indica clientes para o escritório. */
export type Corretor = {
  id: string;
  nome: string;
  cpf: string;
  telefone: string;
  email: string;
  tipoPix: string;
  chavePix: string;
  dataNascimento?: string; // AAAA-MM-DD
  cep?: string;
  rua?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  observacoes?: string;
  ativo: boolean;
  desde: string;
};

export const TIPOS_PIX = ["CPF", "CNPJ", "Telefone", "E-mail", "Chave aleatória"];

export const corretores: Corretor[] = [
  { id: "k1", nome: "Roberto Santana", cpf: "258.369.147-00", telefone: "(11) 97777-1234", email: "roberto.santana@email.com", tipoPix: "CPF", chavePix: "258.369.147-00", cep: "09510-000", rua: "Rua Amazonas", numero: "450", bairro: "Centro", cidade: "São Caetano do Sul", uf: "SP", ativo: true, desde: "2023-02-10" },
  { id: "k2", nome: "Patrícia Moura", cpf: "369.147.258-11", telefone: "(11) 96666-9876", email: "patricia.moura@email.com", tipoPix: "E-mail", chavePix: "patricia.moura@email.com", cep: "09010-000", rua: "Avenida Industrial", numero: "1200", complemento: "Sala 12", bairro: "Jardim", cidade: "Santo André", uf: "SP", ativo: true, desde: "2024-05-03" },
];

/** Responsável legal pelo cliente (menor de idade, incapaz, interditado...). */
export type Representante = {
  tipo: string;          // ver TIPOS_REPRESENTANTE
  nome: string;
  sexo?: "Masculino" | "Feminino";
  nacionalidade?: string;
  estadoCivil?: string;
  profissao?: string;
  rg?: string;
  orgaoEmissor?: string;
  cpf?: string;
  telefone?: string;
  mesmoEndereco?: boolean; // mora no mesmo endereço do cliente
  endereco?: string;       // endereço completo, se for diferente
};

/** Pessoa que assina a rogo (a pedido de quem não sabe assinar). */
export type Rogado = { nome: string; nacionalidade?: string; estadoCivil?: string; rg?: string; cpf?: string; endereco?: string };

export const CAPACIDADES = [
  "Capaz",
  "Absolutamente incapaz (menor de 16 anos)",
  "Relativamente incapaz (entre 16 e 18 anos)",
  "Interditado(a) / sob curatela",
];

export const TIPOS_REPRESENTANTE = ["genitora", "genitor", "tutora", "tutor", "curadora", "curador", "representante legal"];

/** Tipos (áreas) de processo. */
export const AREAS_PROCESSO = ["Cível", "Trabalhista", "Tributário", "Consumidor", "Família", "Criminal", "Imobiliário", "Previdenciário"];

/** Situação do cliente no escritório. */
export const STATUS_CLIENTE = ["Ativo", "Prospecto", "Inativo"] as const;
// (valores antigos aceitos para cadastros feitos antes de a situação passar para o processo)
export type StatusCliente = (typeof STATUS_CLIENTE)[number] | "Judicializar" | "Protocolar no Administrativo";

export const ESTADOS_CIVIS = ["Solteiro(a)", "Casado(a)", "União estável", "Divorciado(a)", "Separado(a)", "Viúvo(a)"];

/** Modelo de documento montado no editor do sistema (página A4 com timbrado e campos). */
export type Modelo = {
  id: string;
  nome: string;
  categoria: string;
  data: string;
  html?: string;                               // conteúdo do editor
  pagina?: import("./documento").PaginaModelo; // margens, fonte e timbrado
  // Modelos antigos em Word (descontinuados — apenas para identificar e excluir)
  arquivoNome?: string;
  tamanho?: string;
  caminho?: string;
  arquivo?: string;
};

/** Situação de cada processo do cliente. */
export const STATUS_PROCESSO = ["Judicializar", "Protocolar no Administrativo", "Em andamento", "Aguardando", "Concluído", "Arquivado"] as const;
export type StatusProcesso = (typeof STATUS_PROCESSO)[number];
/** Processo ainda em curso (não concluído nem arquivado). */
export const processoAtivo = (p: { status: string }) => p.status !== "Concluído" && p.status !== "Arquivado";

export type Processo = {
  id: string;
  numero: string;
  cliente: string;
  clienteId?: string;
  parteContraria: string;
  area: string;
  vara: string;
  responsavel: string;
  valorCausa: number;
  proximoPrazo: string;
  status: StatusProcesso;
  andamentos: { data: string; descricao: string; origem?: string }[];
  tribunal?: ResumoTribunal; // dados públicos do CNJ (DataJud), quando consultado
};

/** Dados do processo vindos do CNJ (DataJud). */
export type ResumoTribunal = {
  sigla: string;
  numero: string;
  classe: string;
  assuntos: string[];
  orgao: string;
  graus: string[];
  sistema: string;
  formato: string;
  dataAjuizamento: string;
  ultimaAtualizacao: string;
  sincronizadoEm: string;
};

export type Lancamento = {
  id: string;
  data: string;
  descricao: string;
  cliente: string;
  categoria: string;
  tipo: "Receita" | "Despesa";
  valor: number;
  status: "Pago" | "Pendente" | "Atrasado";
  clienteId?: string;
  pagoEm?: string;               // data em que foi pago (AAAA-MM-DD)
  // Parcelamento (acordo do cliente): todas as parcelas têm o mesmo parcelamentoId
  parcelamentoId?: string;
  parcela?: number;              // 0 = entrada; 1..N
  totalParcelas?: number;
  descricaoParcelamento?: string;
  criadoPor?: string;
  // Pagamento de uma conta a pagar (despesa fixa/parcelada) no mês `competencia` (AAAA-MM)
  contaPagarId?: string;
  competencia?: string;
};

export type Perfil = "Administrador" | "Advogado" | "Estagiário" | "Secretária";

export type Usuario = {
  id: string;
  nome: string;
  email: string;
  oab?: string;
  dataNascimento?: string; // AAAA-MM-DD
  perfil: Perfil;
  ativo: boolean;
  ultimoAcesso: string;
};

/** Documento do perfil de um cliente (arquivo no Firebase Storage): enviado ou gerado por modelo. */
export type Documento = {
  id: string;
  origem?: "enviado" | "gerado";
  modeloId?: string;
  assinadoDe?: string; // documento gerado do qual este arquivo é a via assinada
  // Documento gerado: texto já preenchido (permite editar só este documento, sem mexer no modelo)
  conteudo?: string;
  paginaDoc?: import("./documento").PaginaModelo;
  editado?: boolean;
  nome: string;
  categoria: string;
  tipo: "pdf" | "docx" | "xlsx" | "img";
  tamanho: string;
  bytes?: number;
  clienteId: string;
  cliente: string;
  caminho?: string;   // caminho no Storage
  enviadoPor?: string;
  data: string;
};

export const CATEGORIAS_DOC = [
  "RG / CNH", "CPF", "Comprovante de residência", "Documento assinado", "Procuração assinada", "Contrato assinado",
  "Declaração assinada", "Certidão (nascimento/casamento)", "Documento do processo", "Outros",
];

export const CATEGORIAS_MODELO = ["Procuração", "Contrato", "Declaração", "Petição", "Recibo", "Outros"];

export const clientes: Cliente[] = [
  { id: "c1", corretorId: "k1", sexo: "Feminino", rg: "12.345.678-9", orgaoEmissor: "SSP/SP", dataEmissaoRg: "2015-06-10", estadoCivil: "Casado(a)", nacionalidade: "brasileira", profissao: "arquiteta", cep: "01310-100", rua: "Avenida Paulista", numero: "1578", complemento: "Apto 42", bairro: "Bela Vista", nome: "Mariana Albuquerque", tipo: "PF", documento: "123.456.789-00", email: "mariana.alb@email.com", telefone: "(11) 98765-4321", cidade: "São Paulo", uf: "SP", processos: 3, status: "Ativo", desde: "2022-03-14" },
  { id: "c2", nome: "Construtora Horizonte Ltda", tipo: "PJ", documento: "12.345.678/0001-90", email: "juridico@horizonte.com.br", telefone: "(11) 3456-7890", cidade: "Santo André", uf: "SP", processos: 7, status: "Ativo", desde: "2021-08-02" },
  { id: "c3", corretorId: "k1", sexo: "Masculino", rg: "20.345.987-1", orgaoEmissor: "DETRAN/RJ", dataEmissaoRg: "2012-03-22", estadoCivil: "Solteiro(a)", nacionalidade: "brasileiro", profissao: "engenheiro civil", cep: "22041-001", rua: "Avenida Nossa Senhora de Copacabana", numero: "920", complemento: "Sala 301", bairro: "Copacabana", nome: "Ricardo Menezes", tipo: "PF", documento: "987.654.321-00", email: "ricardo.m@email.com", telefone: "(21) 99876-5432", cidade: "Rio de Janeiro", uf: "RJ", processos: 1, status: "Ativo", desde: "2024-01-20" },
  { id: "c4", corretorId: "k1", nome: "Transportes Veloz S.A.", tipo: "PJ", documento: "98.765.432/0001-10", email: "contato@veloz.com.br", telefone: "(19) 3222-1100", cidade: "Campinas", uf: "SP", processos: 4, status: "Ativo", desde: "2020-11-11" },
  { id: "c5", sexo: "Feminino", rg: "MG-14.567.890", orgaoEmissor: "SSP/MG", dataEmissaoRg: "2010-09-01", estadoCivil: "Divorciado(a)", nacionalidade: "brasileira", profissao: "professora", cep: "30130-010", rua: "Rua da Bahia", numero: "1148", complemento: "", bairro: "Centro", nome: "Fernanda Queiroz", tipo: "PF", documento: "321.654.987-11", email: "fe.queiroz@email.com", telefone: "(31) 98111-2233", cidade: "Belo Horizonte", uf: "MG", processos: 2, status: "Inativo", desde: "2019-06-30" },
  { id: "c6", nome: "Padaria Pão Dourado ME", tipo: "PJ", documento: "45.678.912/0001-33", email: "paodourado@email.com", telefone: "(11) 4002-8922", cidade: "São Caetano", uf: "SP", processos: 1, status: "Prospecto", desde: "2024-09-02" },
  { id: "c7", corretorId: "k2", sexo: "Masculino", rg: "8.765.432-1", orgaoEmissor: "SESP/PR", dataEmissaoRg: "2018-11-05", estadoCivil: "União estável", nacionalidade: "brasileiro", profissao: "analista de sistemas", cep: "80020-310", rua: "Rua XV de Novembro", numero: "700", complemento: "Casa 2", bairro: "Centro", nome: "Gustavo Pereira Lima", tipo: "PF", documento: "741.852.963-22", email: "gustavo.lima@email.com", telefone: "(41) 99654-7788", cidade: "Curitiba", uf: "PR", processos: 2, status: "Ativo", desde: "2023-05-18" },
  { id: "c8", corretorId: "k2", nome: "Clínica Vida Plena", tipo: "PJ", documento: "11.222.333/0001-44", email: "adm@vidaplena.med.br", telefone: "(11) 3030-4040", cidade: "São Paulo", uf: "SP", processos: 5, status: "Ativo", desde: "2021-02-09" },
];

export const processos: Processo[] = [
  {
    id: "p1", numero: "1002345-67.2024.8.26.0100", cliente: "Mariana Albuquerque", parteContraria: "Banco Meridional S.A.", area: "Consumidor",
    vara: "3ª Vara Cível - Foro Central/SP", responsavel: "Dr. Carlos Andrade", valorCausa: 48500, proximoPrazo: "2024-09-19", status: "Em andamento",
    andamentos: [
      { data: "2024-09-10", descricao: "Juntada de contestação pela parte ré" },
      { data: "2024-08-22", descricao: "Citação da parte ré realizada" },
      { data: "2024-08-01", descricao: "Distribuição da petição inicial" },
    ],
  },
  {
    id: "p2", numero: "0801122-33.2023.5.02.0045", cliente: "Construtora Horizonte Ltda", parteContraria: "João Batista Souza", area: "Trabalhista",
    vara: "45ª Vara do Trabalho de São Paulo", responsavel: "Dra. Beatriz Lemos", valorCausa: 132000, proximoPrazo: "2024-09-20", status: "Aguardando",
    andamentos: [
      { data: "2024-09-05", descricao: "Audiência de instrução designada para 20/09" },
      { data: "2024-07-15", descricao: "Apresentada defesa e documentos" },
    ],
  },
  {
    id: "p3", numero: "5009876-12.2022.4.03.6100", cliente: "Transportes Veloz S.A.", parteContraria: "União Federal", area: "Tributário",
    vara: "12ª Vara Federal Cível/SP", responsavel: "Dr. Carlos Andrade", valorCausa: 870000, proximoPrazo: "2024-09-24", status: "Em andamento",
    andamentos: [
      { data: "2024-09-12", descricao: "Conclusos para sentença" },
      { data: "2024-06-03", descricao: "Laudo pericial juntado" },
    ],
  },
  {
    id: "p4", numero: "1034567-89.2021.8.26.0554", cliente: "Clínica Vida Plena", parteContraria: "Paulo Henrique Dias", area: "Cível",
    vara: "2ª Vara Cível de Santo André", responsavel: "Dra. Beatriz Lemos", valorCausa: 25000, proximoPrazo: "—", status: "Concluído",
    andamentos: [
      { data: "2024-05-20", descricao: "Trânsito em julgado — sentença favorável" },
      { data: "2024-02-11", descricao: "Sentença de improcedência do pedido do autor" },
    ],
  },
  {
    id: "p5", numero: "0012233-44.2024.8.19.0001", cliente: "Ricardo Menezes", parteContraria: "Seguradora Atlântico", area: "Consumidor",
    vara: "7º Juizado Especial Cível/RJ", responsavel: "Dr. Felipe Rocha", valorCausa: 18900, proximoPrazo: "2024-09-27", status: "Em andamento",
    andamentos: [{ data: "2024-09-01", descricao: "Audiência de conciliação sem acordo" }],
  },
  {
    id: "p6", numero: "1011223-55.2020.8.13.0024", cliente: "Fernanda Queiroz", parteContraria: "Imobiliária Central", area: "Imobiliário",
    vara: "5ª Vara Cível de Belo Horizonte", responsavel: "Dr. Felipe Rocha", valorCausa: 62000, proximoPrazo: "—", status: "Arquivado",
    andamentos: [{ data: "2023-11-30", descricao: "Arquivamento definitivo após acordo homologado" }],
  },
  {
    id: "p7", numero: "0023344-66.2024.8.16.0001", cliente: "Gustavo Pereira Lima", parteContraria: "Maria Clara Lima", area: "Família",
    vara: "1ª Vara de Família de Curitiba", responsavel: "Dra. Beatriz Lemos", valorCausa: 0, proximoPrazo: "2024-10-02", status: "Aguardando",
    andamentos: [{ data: "2024-09-08", descricao: "Aguardando parecer do Ministério Público" }],
  },
  {
    id: "p8", numero: "1045566-77.2024.8.26.0100", cliente: "Construtora Horizonte Ltda", parteContraria: "Condomínio Solar das Flores", area: "Cível",
    vara: "18ª Vara Cível - Foro Central/SP", responsavel: "Dr. Carlos Andrade", valorCausa: 215000, proximoPrazo: "2024-10-05", status: "Em andamento",
    andamentos: [{ data: "2024-09-14", descricao: "Réplica protocolada" }],
  },
];

export const lancamentos: Lancamento[] = [
  { id: "l1", data: "2024-09-02", descricao: "Honorários contratuais — parcela 3/10", cliente: "Construtora Horizonte Ltda", categoria: "Honorários", tipo: "Receita", valor: 6500, status: "Pago" },
  { id: "l2", data: "2024-09-03", descricao: "Custas processuais — preparo de recurso", cliente: "Transportes Veloz S.A.", categoria: "Custas", tipo: "Despesa", valor: 1240.5, status: "Pago" },
  { id: "l3", data: "2024-09-05", descricao: "Honorários de êxito", cliente: "Clínica Vida Plena", categoria: "Honorários", tipo: "Receita", valor: 5000, status: "Pago" },
  { id: "l4", data: "2024-09-08", descricao: "Aluguel do escritório", cliente: "—", categoria: "Estrutura", tipo: "Despesa", valor: 4800, status: "Pago" },
  { id: "l5", data: "2024-09-10", descricao: "Consulta jurídica", cliente: "Padaria Pão Dourado ME", categoria: "Consultoria", tipo: "Receita", valor: 450, status: "Pendente" },
  { id: "l6", data: "2024-09-12", descricao: "Honorários contratuais — parcela 1/5", cliente: "Ricardo Menezes", categoria: "Honorários", tipo: "Receita", valor: 1200, status: "Atrasado" },
  { id: "l7", data: "2024-09-15", descricao: "Assinatura sistema de publicações", cliente: "—", categoria: "Software", tipo: "Despesa", valor: 289.9, status: "Pendente" },
  { id: "l8", data: "2024-09-18", descricao: "Honorários mensais — assessoria", cliente: "Transportes Veloz S.A.", categoria: "Honorários", tipo: "Receita", valor: 8000, status: "Pendente" },
  { id: "l9", data: "2024-09-20", descricao: "Diligência — cópia de autos", cliente: "Mariana Albuquerque", categoria: "Custas", tipo: "Despesa", valor: 180, status: "Pendente" },
];

export const receitaMensal = [
  { mes: "Jan", receita: 6800, despesa: 4100 },
  { mes: "Fev", receita: 5600, despesa: 3900 },
  { mes: "Mar", receita: 8900, despesa: 4600 },
  { mes: "Abr", receita: 5200, despesa: 4300 },
  { mes: "Mai", receita: 8600, despesa: 5100 },
  { mes: "Jun", receita: 3900, despesa: 3600 },
];

export const usuarios: Usuario[] = [
  { id: "u1", nome: "Carlos Andrade", email: "carlos@andradelemos.adv.br", oab: "OAB/SP 123.456", perfil: "Administrador", ativo: true, ultimoAcesso: "Hoje, 08:42" },
  { id: "u2", nome: "Beatriz Lemos", email: "beatriz@andradelemos.adv.br", oab: "OAB/SP 234.567", perfil: "Advogado", ativo: true, ultimoAcesso: "Hoje, 09:15" },
  { id: "u3", nome: "Felipe Rocha", email: "felipe@andradelemos.adv.br", oab: "OAB/RJ 98.765", perfil: "Advogado", ativo: true, ultimoAcesso: "Ontem, 18:03" },
  { id: "u4", nome: "Juliana Martins", email: "juliana@andradelemos.adv.br", perfil: "Secretária", ativo: true, ultimoAcesso: "Hoje, 07:58" },
  { id: "u5", nome: "Lucas Oliveira", email: "lucas@andradelemos.adv.br", perfil: "Estagiário", ativo: false, ultimoAcesso: "12/08/2024" },
];


export const agenda = [
  { dia: "2024-09-19", hora: "09:30", titulo: "Audiência de conciliação", processo: "1002345-67.2024", local: "Foro Central/SP" },
  { dia: "2024-09-19", hora: "14:00", titulo: "Reunião com cliente — Horizonte", processo: "0801122-33.2023", local: "Escritório" },
  { dia: "2024-09-20", hora: "10:00", titulo: "Audiência de instrução", processo: "0801122-33.2023", local: "45ª VT/SP" },
  { dia: "2024-09-18", hora: "16:00", titulo: "Prazo: manifestação sobre laudo", processo: "5009876-12.2022", local: "PJe" },
  { dia: "2024-09-21", hora: "11:00", titulo: "Despacho com juiz", processo: "1045566-77.2024", local: "18ª Vara Cível" },
];

export const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const dataBR = (iso: string) => (iso.includes("-") ? iso.split("-").reverse().join("/") : iso);
export const iniciais = (nome: string) =>
  nome.replace(/^(Dr\.|Dra\.)\s*/, "").split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
