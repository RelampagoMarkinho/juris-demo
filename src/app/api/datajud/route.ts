// Consulta um processo na API Pública do CNJ (DataJud) pelo número CNJ.
// Retorna classe, assuntos, órgão julgador, datas e as movimentações (andamentos).
// Observação: a base pública NÃO traz documentos (petições, decisões em PDF) nem o nome das partes.

import { exigirLogin, texto } from "@/lib/servidor";
import { somenteDigitos, tribunalDoCnj, type DadosTribunal } from "@/lib/cnj";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120; // a base pública do CNJ às vezes leva de 30 s a mais de 1 min para responder

// Chave pública divulgada pelo CNJ (https://datajud-wiki.cnj.jus.br/api-publica/acesso).
// Se o CNJ trocar a chave, basta definir DATAJUD_API_KEY no apphosting.yaml.
const CHAVE_PUBLICA = "cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==";

type Hit = {
  _source: {
    grau?: string; classe?: { nome?: string }; assuntos?: { nome?: string }[]; orgaoJulgador?: { nome?: string };
    sistema?: { nome?: string }; formato?: { nome?: string }; dataAjuizamento?: string; dataHoraUltimaAtualizacao?: string;
    movimentos?: { nome?: string; dataHora?: string; complementosTabelados?: { nome?: string; descricao?: string }[] }[];
  };
};

/** "20240315103000" ou ISO → AAAA-MM-DD */
function dataIso(v?: string) {
  if (!v) return "";
  if (/^\d{8,14}$/.test(v)) return `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}`;
  const d = new Date(v);
  return isNaN(d.getTime()) ? "" : d.toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
}
function horaBr(v?: string) {
  if (!v) return "";
  const d = new Date(v);
  return isNaN(d.getTime()) ? "" : d.toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });
}
const limpar = (s?: string) => (s ?? "").replace(/�/g, "").replace(/\s+/g, " ").trim();

export async function POST(req: Request) {
  const negado = await exigirLogin(req);
  if (negado) return negado;

  let numero = "";
  try {
    numero = somenteDigitos(String(((await req.json()) as { numero?: string }).numero ?? ""));
  } catch {
    return texto("Pedido inválido.", 400);
  }
  const tribunal = tribunalDoCnj(numero);
  if (!tribunal) return texto("Número CNJ inválido ou tribunal não atendido pela consulta pública.", 400);

  // O CNJ responde 429 quando a fila de pesquisas dele está cheia (vale para todos que usam a API pública,
  // não só para este sistema). Tenta de novo algumas vezes, com pausas crescentes, dentro de ~110 s no total.
  const limite = Date.now() + 110000;
  const esperar = (ms: number) => new Promise((ok) => setTimeout(ok, ms));
  let r: Response | null = null;
  for (let tentativa = 0; tentativa < 4; tentativa++) {
    const resta = limite - Date.now();
    if (resta < 5000) break;
    try {
      r = await fetch(`https://api-publica.datajud.cnj.jus.br/api_publica_${tribunal.alias}/_search`, {
        method: "POST",
        headers: { Authorization: `APIKey ${process.env.DATAJUD_API_KEY || CHAVE_PUBLICA}`, "Content-Type": "application/json" },
        body: JSON.stringify({ size: 10, query: { match: { numeroProcesso: numero } } }),
        signal: AbortSignal.timeout(resta),
        cache: "no-store",
      });
    } catch {
      return texto("O sistema do CNJ está lento e não respondeu a tempo. Tente novamente em alguns minutos.", 504);
    }
    if (r.status !== 429) break;
    await esperar([4000, 8000, 15000][tentativa] ?? 15000);
  }
  if (!r) return texto("O sistema do CNJ está lento e não respondeu a tempo. Tente novamente em alguns minutos.", 504);
  if (r.status === 429) return texto("A base pública do CNJ está sobrecarregada (recusando pesquisas de todos os sistemas no momento). Tente novamente mais tarde.", 503);
  if (r.status === 401 || r.status === 403) return texto("A chave de acesso da API do CNJ foi recusada (o CNJ pode ter trocado a chave pública).", 502);
  if (!r.ok) return texto(`Falha na consulta ao CNJ (${r.status}).`, 502);

  const resposta = (await r.json()) as { hits?: { hits?: Hit[] }; _shards?: { failed?: number } };
  const hits = resposta.hits?.hits ?? [];
  // Sobrecarregado, o CNJ às vezes pesquisa só parte da base: "não achou" aí não quer dizer que não existe.
  if (!hits.length && (resposta._shards?.failed ?? 0) > 0) {
    return texto("A base do CNJ está sobrecarregada agora e respondeu só parte da pesquisa. Tente novamente em alguns minutos.", 503);
  }
  if (!hits.length) {
    return texto(`Processo não encontrado na base pública do CNJ (${tribunal.sigla}). Ele pode estar em segredo de justiça, ser muito recente ou ainda não ter sido enviado pelo tribunal.`, 404);
  }

  // Um processo pode aparecer uma vez por instância (G1, G2...). Usa o registro mais recente como principal.
  const ordenados = [...hits].sort((a, b) => (b._source.dataHoraUltimaAtualizacao ?? "").localeCompare(a._source.dataHoraUltimaAtualizacao ?? ""));
  const principal = ordenados[0]._source;
  const primeiraInstancia = hits.find((h) => h._source.grau === "G1")?._source ?? principal;

  const vistos = new Set<string>();
  const movimentos = hits
    .flatMap((h) => (h._source.movimentos ?? []).map((m) => {
      const compl = (m.complementosTabelados ?? []).map((c) => limpar(c.nome)).filter(Boolean).join(", ");
      return {
        data: dataIso(m.dataHora), hora: horaBr(m.dataHora), grau: h._source.grau ?? "",
        descricao: limpar(m.nome) + (compl ? ` — ${compl}` : ""),
        ordem: m.dataHora ?? "",
      };
    }))
    .filter((m) => {
      const k = `${m.ordem}|${m.descricao}`;
      if (!m.descricao || vistos.has(k)) return false;
      vistos.add(k);
      return true;
    })
    .sort((a, b) => b.ordem.localeCompare(a.ordem))
    .map(({ ordem: _o, ...m }) => m);

  const dados: DadosTribunal = {
    sigla: tribunal.sigla,
    numero,
    classe: limpar(principal.classe?.nome),
    assuntos: Array.from(new Set(hits.flatMap((h) => (h._source.assuntos ?? []).map((a) => limpar(a.nome))).filter(Boolean))),
    orgao: limpar(primeiraInstancia.orgaoJulgador?.nome),
    graus: Array.from(new Set(hits.map((h) => h._source.grau ?? "").filter(Boolean))).sort(),
    sistema: limpar(principal.sistema?.nome),
    formato: limpar(principal.formato?.nome),
    dataAjuizamento: dataIso(primeiraInstancia.dataAjuizamento),
    ultimaAtualizacao: principal.dataHoraUltimaAtualizacao ?? "",
    movimentos,
  };
  return Response.json(dados, { headers: { "Cache-Control": "no-store" } });
}
