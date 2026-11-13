import type { Cliente, Processo, Usuario } from "./mock";
import { brl } from "./mock";
import { enderecoEmpresa, oabFormatada, type Empresa } from "./empresa";

/** Campos disponíveis nos modelos (botão "Inserir campo" do editor). */
export const CHAVES: { grupo: string; itens: { chave: string; desc: string }[] }[] = [
  {
    grupo: "Cliente",
    itens: [
      { chave: "nome", desc: "Nome / razão social" },
      { chave: "nome_maiusculo", desc: "Nome em MAIÚSCULAS" },
      { chave: "cpf", desc: "CPF (pessoa física)" },
      { chave: "cnpj", desc: "CNPJ (pessoa jurídica)" },
      { chave: "documento", desc: "CPF ou CNPJ" },
      { chave: "rg", desc: "RG" },
      { chave: "orgao_emissor", desc: "Órgão emissor do RG" },
      { chave: "data_emissao_rg", desc: "Data de emissão do RG" },
      { chave: "estado_civil", desc: "Estado civil (flexionado pelo sexo)" },
      { chave: "nacionalidade", desc: "Nacionalidade" },
      { chave: "profissao", desc: "Profissão" },
      { chave: "email", desc: "E-mail" },
      { chave: "telefone", desc: "Telefone" },
      { chave: "qualificacao", desc: "Qualificação completa (inclui o representante legal, quando houver)" },
    ],
  },
  {
    grupo: "Representante e assinatura",
    itens: [
      { chave: "capacidade", desc: "Capacidade civil (ex.: absolutamente incapaz)" },
      { chave: "representante_tipo", desc: "Tipo do representante (genitora, curador...)" },
      { chave: "representante_nome", desc: "Nome do representante legal" },
      { chave: "representante_qualificacao", desc: "Qualificação completa do representante" },
      { chave: "representante_cpf", desc: "CPF do representante" },
      { chave: "assinante_nome", desc: "Quem assina (representante, se houver; senão o cliente)" },
      { chave: "assinante_cpf", desc: "CPF de quem assina" },
      { chave: "rogado_nome", desc: "Rogado — quem assina a rogo" },
      { chave: "rogado_qualificacao", desc: "Qualificação do rogado" },
      { chave: "rogado_rg", desc: "RG do rogado" },
      { chave: "rogado_cpf", desc: "CPF do rogado" },
      { chave: "rogado_endereco", desc: "Endereço do rogado" },
    ],
  },
  {
    grupo: "Endereço",
    itens: [
      { chave: "rua", desc: "Rua / logradouro" },
      { chave: "numero", desc: "Número" },
      { chave: "complemento", desc: "Complemento" },
      { chave: "bairro", desc: "Bairro" },
      { chave: "cidade", desc: "Cidade" },
      { chave: "uf", desc: "UF" },
      { chave: "cep", desc: "CEP" },
      { chave: "endereco_completo", desc: "Endereço completo em uma linha" },
    ],
  },
  {
    grupo: "Processo (opcional)",
    itens: [
      { chave: "processo_numero", desc: "Número CNJ" },
      { chave: "processo_vara", desc: "Vara / tribunal" },
      { chave: "processo_area", desc: "Área" },
      { chave: "parte_contraria", desc: "Parte contrária" },
      { chave: "valor_causa", desc: "Valor da causa (R$)" },
    ],
  },
  {
    grupo: "Escritório e datas",
    itens: [
      { chave: "escritorio_nome", desc: "Nome do escritório" },
      { chave: "escritorio_razao_social", desc: "Razão social do escritório" },
      { chave: "escritorio_cnpj", desc: "CNPJ do escritório" },
      { chave: "escritorio_endereco", desc: "Endereço do escritório" },
      { chave: "escritorio_telefone", desc: "Telefone do escritório" },
      { chave: "escritorio_email", desc: "E-mail do escritório" },
      { chave: "escritorio_cidade", desc: "Cidade/UF do escritório (local e foro)" },
      { chave: "advogado_responsavel", desc: "Advogado(a) responsável (Configurações)" },
      { chave: "oab_responsavel", desc: "OAB do responsável (ex.: OAB/MA 12.345)" },
      { chave: "advogado", desc: "Nome do usuário que gerou" },
      { chave: "oab", desc: "OAB do usuário que gerou" },
      { chave: "data_hoje", desc: "Data de hoje (30/09/2026)" },
      { chave: "data_extenso", desc: "Data por extenso (30 de setembro de 2026)" },
    ],
  },
];

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const br = (iso?: string) => (iso && /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso.split("-").reverse().join("/") : iso ?? "");

/** "Casado(a)" → "casada" / "casado" conforme o sexo. */
function flexionar(estado: string | undefined, sexo: string | undefined) {
  if (!estado) return "";
  const e = estado.toLowerCase();
  if (sexo === "Feminino") return e.replace("(a)", "").replace(/o$/, "a").replace("viúvo", "viúva");
  if (sexo === "Masculino") return e.replace("(a)", "");
  return e;
}

/** Preposição certa antes do endereço: "na Rua...", "no Povoado...", "em ..." */
export function noEndereco(endereco: string) {
  const e = endereco.trim().toLowerCase();
  const fem = /^(rua|r\.|avenida|av\.?|travessa|tv\.|estrada|rodovia|rod\.|praça|alameda|vila|quadra|vicinal|chácara|fazenda|colônia|comunidade)(\s|$)/;
  const masc = /^(povoado|sítio|sitio|conjunto|residencial|loteamento|bairro|condomínio|condominio|assentamento|beco|largo|km|parque|setor|núcleo|nucleo|distrito)(\s|$)/;
  if (fem.test(e)) return `na ${endereco}`;
  if (masc.test(e)) return `no ${endereco}`;
  return `em ${endereco}`;
}

export function enderecoCompleto(c: Partial<Cliente>) {
  const partes = [
    [c.rua, c.numero && `nº ${c.numero}`].filter(Boolean).join(", "),
    c.complemento,
    c.bairro,
    [c.cidade, c.uf].filter(Boolean).join("/"),
    c.cep && `CEP ${c.cep}`,
  ].filter(Boolean);
  return partes.join(", ");
}

export function dadosParaModelo(c: Cliente, p?: Processo | null, u?: Usuario | null, e?: Empresa | null): Record<string, string> {
  const hoje = new Date();
  const fem = c.sexo === "Feminino";
  const estado = flexionar(c.estadoCivil, c.sexo);
  const end = enderecoCompleto(c);

  // Capacidade civil e representante legal (menor de idade, incapaz, interditado...)
  const capacidade = (() => {
    const cap = c.capacidade ?? "";
    if (cap.startsWith("Absolutamente")) return "absolutamente incapaz";
    if (cap.startsWith("Relativamente")) return "relativamente incapaz";
    if (cap.startsWith("Interditado")) return fem ? "interditada" : "interditado";
    return "";
  })();
  const rep = c.tipo === "PF" ? c.representante : null;
  const femRep = rep?.sexo === "Feminino";
  const qualRep = rep && rep.nome ? [
    `${femRep ? "a Sra." : "o Sr."} ${rep.nome.toUpperCase()}`,
    rep.nacionalidade,
    flexionar(rep.estadoCivil, rep.sexo),
    rep.profissao,
    rep.rg && `${femRep ? "portadora" : "portador"} do RG nº ${rep.rg}${rep.orgaoEmissor ? ` ${rep.orgaoEmissor}` : ""}`,
    rep.cpf && `${femRep ? "inscrita" : "inscrito"} no CPF sob o nº ${rep.cpf}`,
    rep.mesmoEndereco === false && rep.endereco && `${femRep ? "residente e domiciliada" : "residente e domiciliado"} ${noEndereco(rep.endereco)}`,
  ].filter(Boolean).join(", ") : "";

  // Quem assina a rogo (pessoa que não sabe assinar): sem cadastro, sai um traço para preencher à mão.
  const rog = c.tipo === "PF" ? c.rogado : null;
  const traco = (v?: string, n = 20) => (v && v.trim() ? v : "_".repeat(n));
  const qualRogado = rog && rog.nome ? [
    rog.nome.toUpperCase(), rog.nacionalidade, rog.estadoCivil?.toLowerCase(),
    rog.rg && `RG nº ${rog.rg}`, rog.cpf && `CPF nº ${rog.cpf}`, rog.endereco && `residente em ${rog.endereco}`,
  ].filter(Boolean).join(", ") : "";

  let qualificacao: string;
  if (c.tipo === "PJ") {
    qualificacao = [
      c.nome.toUpperCase(),
      "pessoa jurídica de direito privado",
      c.documento && `inscrita no CNPJ sob o nº ${c.documento}`,
      end && `com sede ${noEndereco(end)}`,
    ].filter(Boolean).join(", ");
  } else {
    const menor = (c.capacidade ?? "").includes("menor de 16") || (c.capacidade ?? "").includes("entre 16 e 18");
    const pessoa = [
      c.nome.toUpperCase(),
      capacidade,
      c.nacionalidade,
      menor ? "" : estado,       // menor de idade: sem estado civil/profissão
      menor ? "" : c.profissao,
      c.rg && `${fem ? "portadora" : "portador"} da cédula de identidade RG nº ${c.rg}${c.orgaoEmissor ? ` ${c.orgaoEmissor}` : ""}${c.dataEmissaoRg ? `, expedida em ${br(c.dataEmissaoRg)}` : ""}`,
      c.documento && `${fem ? "inscrita" : "inscrito"} no CPF sob o nº ${c.documento}`,
    ].filter(Boolean).join(", ");

    if (rep && rep.nome) {
      const mesmoEnd = rep.mesmoEndereco !== false;
      qualificacao = [
        pessoa,
        !mesmoEnd && end && `${fem ? "residente e domiciliada" : "residente e domiciliado"} ${noEndereco(end)}`,
        `${fem ? "representada" : "representado"} por ${femRep ? "sua" : "seu"} ${rep.tipo}, ${qualRep}`,
        mesmoEnd && end && `residentes e domiciliados ${noEndereco(end)}`,
      ].filter(Boolean).join(", ");
    } else {
      qualificacao = [pessoa, end && `${fem ? "residente e domiciliada" : "residente e domiciliado"} ${noEndereco(end)}`].filter(Boolean).join(", ");
    }
  }

  return {
    nome: c.nome ?? "",
    nome_maiusculo: (c.nome ?? "").toUpperCase(),
    cpf: c.tipo === "PF" ? c.documento ?? "" : "",
    cnpj: c.tipo === "PJ" ? c.documento ?? "" : "",
    documento: c.documento ?? "",
    rg: c.rg ?? "",
    orgao_emissor: c.orgaoEmissor ?? "",
    data_emissao_rg: br(c.dataEmissaoRg),
    estado_civil: estado,
    nacionalidade: c.nacionalidade ?? "",
    profissao: c.profissao ?? "",
    email: c.email ?? "",
    telefone: c.telefone ?? "",
    qualificacao,
    capacidade,
    representante_tipo: rep?.nome ? rep.tipo : "",
    representante_nome: rep?.nome ? rep.nome.toUpperCase() : "",
    representante_qualificacao: qualRep,
    representante_cpf: rep?.nome ? rep.cpf ?? "" : "",
    assinante_nome: rep?.nome ? rep.nome.toUpperCase() : (c.nome ?? "").toUpperCase(),
    assinante_cpf: rep?.nome ? rep.cpf ?? "" : (c.tipo === "PF" ? c.documento ?? "" : ""),
    rogado_nome: traco(rog?.nome?.toUpperCase(), 40),
    rogado_qualificacao: qualRogado || "_".repeat(60),
    rogado_rg: traco(rog?.rg),
    rogado_cpf: traco(rog?.cpf),
    rogado_endereco: traco(rog?.endereco, 40),
    rua: c.rua ?? "",
    numero: c.numero ?? "",
    complemento: c.complemento ?? "",
    bairro: c.bairro ?? "",
    cidade: c.cidade ?? "",
    uf: c.uf ?? "",
    cep: c.cep ?? "",
    endereco_completo: end,
    processo_numero: p?.numero ?? "",
    processo_vara: p?.vara ?? "",
    processo_area: p?.area ?? "",
    parte_contraria: p?.parteContraria ?? "",
    valor_causa: p?.valorCausa ? brl(p.valorCausa) : "",
    escritorio_nome: e?.nomeFantasia ?? "",
    escritorio_razao_social: e?.razaoSocial ?? "",
    escritorio_cnpj: e?.cnpj ?? "",
    escritorio_endereco: e ? enderecoEmpresa(e) : "",
    escritorio_telefone: e?.telefone ?? "",
    escritorio_email: e?.email ?? "",
    escritorio_cidade: e ? [e.cidade, e.uf].filter(Boolean).join("/") : "",
    advogado_responsavel: e?.responsavel ?? "",
    oab_responsavel: e ? oabFormatada(e) : "",
    advogado: u?.nome ?? "",
    oab: u?.oab ?? "",
    data_hoje: hoje.toLocaleDateString("pt-BR"),
    data_extenso: `${hoje.getDate()} de ${MESES[hoje.getMonth()]} de ${hoje.getFullYear()}`,
  };
}
