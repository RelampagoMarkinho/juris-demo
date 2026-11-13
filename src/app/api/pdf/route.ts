// Gera o PDF de um documento montado no editor de modelos.
//
// O HTML paginado (Paged.js) é impresso pelo Chromium do serviço Gotenberg (Cloud Run) — o mesmo
// motor que desenha a pré-visualização no navegador, por isso o PDF sai idêntico ao que se vê na tela.
//
// Segurança:
//  - só aceita chamadas de usuários logados no sistema (token do Firebase Auth);
//  - o serviço de conversão é privado: o servidor do site se identifica com a conta de serviço
//    do App Hosting (token obtido do metadata server do Google Cloud).

import { exigirLogin, texto } from "@/lib/servidor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const LIMITE = 5 * 1024 * 1024;

/** Token de identidade da conta de serviço (disponível quando roda no Google Cloud). */
async function tokenDoServico(audiencia: string): Promise<string | null> {
  try {
    const r = await fetch(
      `http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/identity?audience=${encodeURIComponent(audiencia)}`,
      { headers: { "Metadata-Flavor": "Google" }, signal: AbortSignal.timeout(2000) },
    );
    return r.ok ? await r.text() : null;
  } catch {
    return null; // fora do Google Cloud (ex.: desenvolvimento local)
  }
}

export async function POST(req: Request) {
  const base = process.env.GOTENBERG_URL?.replace(/\/+$/, "");
  if (!base) return texto("Conversor de PDF não configurado.", 503);

  const negado = await exigirLogin(req);
  if (negado) return negado;

  let html: string;
  try {
    html = String(((await req.json()) as { html?: string }).html ?? "");
  } catch {
    return texto("Pedido inválido.", 400);
  }
  if (!html) return texto("Documento vazio.", 400);
  if (html.length > LIMITE) return texto("Documento grande demais.", 413);

  const form = new FormData();
  form.append("files", new Blob([html], { type: "text/html" }), "index.html");
  form.append("preferCssPageSize", "true");
  form.append("printBackground", "true");
  form.append("paperWidth", "8.27");
  form.append("paperHeight", "11.69");
  for (const m of ["marginTop", "marginBottom", "marginLeft", "marginRight"]) form.append(m, "0");
  form.append("skipNetworkIdleEvent", "false");
  form.append("waitForExpression", "window.pronto === true");

  const headers: Record<string, string> = {};
  const token = await tokenDoServico(base);
  if (token) headers.Authorization = `Bearer ${token}`;

  let r: Response;
  try {
    r = await fetch(`${base}/forms/chromium/convert/html`, { method: "POST", body: form, headers, signal: AbortSignal.timeout(110000) });
  } catch {
    return texto("O serviço de conversão não respondeu. Tente novamente em alguns segundos.", 504);
  }
  if (r.status === 401 || r.status === 403) return texto("O site não tem permissão para usar o conversor de PDF.", 502);
  if (r.status === 404) return texto("O conversor de PDF ainda não foi criado no Google Cloud.", 502);
  if (!r.ok) return texto(`Falha na geração do PDF (${r.status}).`, 502);

  return new Response(await r.arrayBuffer(), {
    headers: { "Content-Type": "application/pdf", "Cache-Control": "no-store" },
  });
}
