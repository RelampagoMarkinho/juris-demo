// Montagem dos documentos criados no editor de modelos.
//
// O MESMO HTML é usado na pré-visualização (navegador) e na geração do PDF (Chromium no servidor),
// paginado pelo Paged.js — por isso o PDF sai igual ao que se vê na tela, com timbrado em todas as páginas.

import type { Modelo } from "./mock";

export type ImagemModelo = {
  url: string;
  caminho: string;
  largura?: number;   // mm (padrão: largura total da folha, 210)
  x?: number;         // mm a partir da borda esquerda
  y?: number;         // mm a partir da borda superior (topo) ou inferior (rodapé)
  proporcao?: number; // altura / largura da imagem original
};

export const A4 = { largura: 210, altura: 297 };

/** Posição e tamanho efetivos (com padrões) de uma imagem de cabeçalho/rodapé. */
export const caixaImagem = (i: ImagemModelo) => {
  const largura = i.largura ?? A4.largura;
  return { largura, x: i.x ?? 0, y: i.y ?? 0, altura: i.proporcao ? largura * i.proporcao : undefined };
};

export type PaginaModelo = {
  margens: { topo: number; direita: number; base: number; esquerda: number }; // em mm
  fonte: string;        // chave de FONTES
  tamanho: number;      // pt
  espacamento: number;  // altura de linha
  fundo?: ImagemModelo | null;   // imagem de fundo da página inteira (marca d'água / papel timbrado)
  topo?: ImagemModelo | null;    // imagem no topo de todas as páginas
  rodape?: ImagemModelo | null;  // imagem no rodapé de todas as páginas
  textoTopo?: string;            // texto do cabeçalho (HTML), repetido em todas as páginas
  textoRodape?: string;          // texto do rodapé (HTML), repetido em todas as páginas
  distTextoTopo?: number;        // mm da borda superior até o texto do cabeçalho
  distTextoRodape?: number;      // mm da borda inferior até o texto do rodapé
};

/** Distância padrão do Word para cabeçalho/rodapé (1,25 cm). */
export const DIST_CABECALHO = 12.5;

/** Campos de numeração, preenchidos página a página na hora de paginar. */
export const CAMPOS_PAGINA = ["pagina", "total_paginas"];

/** Fontes oferecidas. Tinos/Arimo/Cousine têm exatamente as mesmas medidas de Times New Roman/Arial/Courier New
 *  e são carregadas da web, então o texto quebra igual em qualquer aparelho e no PDF. */
export const FONTES: Record<string, string> = {
  "Times New Roman": "Tinos, 'Times New Roman', serif",
  Arial: "Arimo, Arial, sans-serif",
  "Courier New": "Cousine, 'Courier New', monospace",
};

export const TAMANHOS = [9, 10, 11, 12, 13, 14, 16, 18, 20, 24];
export const ESPACAMENTOS = [
  { valor: "1", rotulo: "Simples (1,0)" },
  { valor: "1.15", rotulo: "1,15" },
  { valor: "1.5", rotulo: "1,5" },
  { valor: "2", rotulo: "Duplo (2,0)" },
];

export const PAGINA_PADRAO: PaginaModelo = {
  margens: { topo: 30, direita: 20, base: 25, esquerda: 30 },
  fonte: "Times New Roman",
  tamanho: 12,
  espacamento: 1.5,
  fundo: null,
  topo: null,
  rodape: null,
  textoTopo: "",
  textoRodape: "",
  distTextoTopo: DIST_CABECALHO,
  distTextoRodape: DIST_CABECALHO,
};

/** Texto do editor vazio ("<p></p>") conta como sem texto. */
export const temTexto = (html?: string) => !!html && html.replace(/<p[^>]*>\s*<\/p>/g, "").trim() !== "";

export const LINK_FONTES =
  "https://fonts.googleapis.com/css2?family=Tinos:ital,wght@0,400;0,700;1,400;1,700&family=Arimo:ital,wght@0,400;0,700;1,400;1,700&family=Cousine:ital,wght@0,400;0,700;1,400;1,700&display=block";
const PAGEDJS = "https://cdn.jsdelivr.net/npm/pagedjs@0.4.3/dist/paged.polyfill.min.js";

const familia = (fonte: string) => FONTES[fonte] ?? FONTES["Times New Roman"];

/** Estilo do texto do documento — usado igual no editor e no documento final. */
export function cssConteudo(sel: string, p: PaginaModelo) {
  return `
${sel} { font-family: ${familia(p.fonte)}; font-size: ${p.tamanho}pt; line-height: ${p.espacamento}; color: #000; }
${sel} p { margin: 0; min-height: 1em; }
${sel} h1, ${sel} h2, ${sel} h3 { margin: 0 0 .4em; line-height: 1.25; font-weight: 700; }
${sel} h1 { font-size: 1.5em; } ${sel} h2 { font-size: 1.25em; } ${sel} h3 { font-size: 1.1em; }
${sel} ul, ${sel} ol { margin: 0; padding-left: 1.6em; }
${sel} li p { margin: 0; }
${sel} strong { font-weight: 700; }
${sel} table { border-collapse: collapse; width: 100%; margin: .4em 0; table-layout: fixed; }
${sel} td, ${sel} th { border: 1px solid #000; padding: 4px 6px; vertical-align: top; }
${sel} th { font-weight: 700; background: rgba(0,0,0,.04); }
${sel} hr.quebra-pagina { border: 0; break-after: page; margin: 0; height: 0; }
${sel} span[data-campo] { white-space: pre-wrap; }
`;
}

/** Camadas do timbrado (topo, rodapé e fundo) como fundo de cada página A4. */
export function estiloTimbrado(p: PaginaModelo) {
  const topo = p.topo && caixaImagem(p.topo);
  const rodape = p.rodape && caixaImagem(p.rodape);
  const camadas = [
    p.topo && topo && { img: p.topo.url, pos: `left ${topo.x}mm top ${topo.y}mm`, tam: `${topo.largura}mm auto` },
    p.rodape && rodape && { img: p.rodape.url, pos: `left ${rodape.x}mm bottom ${rodape.y}mm`, tam: `${rodape.largura}mm auto` },
    p.fundo && { img: p.fundo.url, pos: "center", tam: "210mm 297mm" },
  ].filter(Boolean) as { img: string; pos: string; tam: string }[];
  if (!camadas.length) return null;
  return {
    backgroundImage: camadas.map((c) => `url("${c.img}")`).join(", "),
    backgroundRepeat: "no-repeat",
    backgroundPosition: camadas.map((c) => c.pos).join(", "),
    backgroundSize: camadas.map((c) => c.tam).join(", "),
  };
}

export function cssTimbrado(p: PaginaModelo) {
  const e = estiloTimbrado(p);
  if (!e) return "";
  return `background-image: ${e.backgroundImage}; background-repeat: ${e.backgroundRepeat};
    background-position: ${e.backgroundPosition}; background-size: ${e.backgroundSize};`;
}

const escapar = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Troca os campos {nome}, {cpf}... pelos dados do cliente. Retorna o HTML e os campos que ficaram vazios. */
export function preencherCampos(html: string, dados: Record<string, string> | null) {
  const doc = new DOMParser().parseFromString(`<div id="raiz">${html}</div>`, "text/html");
  const vazios = new Set<string>();
  doc.querySelectorAll<HTMLElement>("span[data-campo]").forEach((el) => {
    const chave = el.dataset.campo ?? "";
    if (!dados || CAMPOS_PAGINA.includes(chave)) return; // pré-visualização / numeração: mantém o campo
    const valor = dados[chave] ?? "";
    if (!valor) vazios.add(chave);
    // Campo sem dado vira linha em branco, para preencher à mão no papel.
    el.replaceWith(doc.createTextNode(valor || "____________________"));
  });
  return { html: doc.getElementById("raiz")!.innerHTML, vazios: Array.from(vazios) };
}

/** HTML completo e paginado (A4) pronto para pré-visualizar ou converter em PDF. */
export function montarDocumento(conteudo: string, p: PaginaModelo, titulo: string) {
  const m = p.margens;
  const imagens = [p.topo, p.rodape, p.fundo].filter(Boolean).map((i) => i!.url);
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><title>${escapar(titulo)}</title>
<link rel="stylesheet" href="${LINK_FONTES}">
<style>
@page { size: A4; margin: ${m.topo}mm ${m.direita}mm ${m.base}mm ${m.esquerda}mm; }
html, body { margin: 0; padding: 0; }
.pagedjs_page { background-color: #fff; ${cssTimbrado(p)} }
${cssConteudo(".documento", p)}
${cssConteudo(".cab-texto", { ...p, espacamento: 1.15 })}
.cab-texto table { margin: 0; } .cab-texto td, .cab-texto th { border: 0; padding: 0; }
.cab-texto { position: absolute; left: ${m.esquerda}mm; right: ${m.direita}mm; }
span[data-campo] { background: #f6ecd2; border-radius: 3px; padding: 0 2px; }
</style>
<script>
window.PagedConfig = {
  auto: true,
  before: async function () {
    var fontes = ["400 12pt Tinos", "700 12pt Tinos", "italic 400 12pt Tinos", "400 12pt Arimo", "700 12pt Arimo", "400 12pt Cousine", "700 12pt Cousine"];
    await Promise.all(fontes.map(function (f) { return document.fonts.load(f).catch(function () {}); }));
    await document.fonts.ready;
    await Promise.all(${JSON.stringify(imagens)}.map(function (src) {
      return new Promise(function (ok) { var i = new Image(); i.onload = i.onerror = ok; i.src = src; });
    }));
  },
  after: function () {
    var paginas = document.querySelectorAll(".pagedjs_page");
    function colocar(id, classe, lado, dist) {
      var tpl = document.getElementById(id);
      if (!tpl) return;
      paginas.forEach(function (pg, i) {
        var div = document.createElement("div");
        div.className = "cab-texto " + classe;
        div.style[lado] = dist + "mm";
        div.innerHTML = tpl.innerHTML;
        div.querySelectorAll('span[data-campo="pagina"]').forEach(function (s) { s.replaceWith(String(i + 1)); });
        div.querySelectorAll('span[data-campo="total_paginas"]').forEach(function (s) { s.replaceWith(String(paginas.length)); });
        pg.style.position = "relative";
        pg.appendChild(div);
      });
    }
    colocar("tpl-topo", "topo", "top", ${p.distTextoTopo ?? DIST_CABECALHO});
    colocar("tpl-rodape", "rodape", "bottom", ${p.distTextoRodape ?? DIST_CABECALHO});
    // Aparência da pré-visualização na tela (aplicada depois da paginação; não entra no PDF).
    var tela = document.createElement("style");
    tela.media = "screen";
    tela.textContent = "html,body{background:#e9e6df}.pagedjs_pages{padding:20px 0}" +
      ".pagedjs_page{margin:0 auto 20px!important;box-shadow:0 2px 14px rgba(0,0,0,.18)}";
    document.head.appendChild(tela);
    window.pronto = true;
  }
};
</script>
<script src="${PAGEDJS}"></script>
${temTexto(p.textoTopo) ? `<template id="tpl-topo">${p.textoTopo}</template>` : ""}
${temTexto(p.textoRodape) ? `<template id="tpl-rodape">${p.textoRodape}</template>` : ""}
</head>
<body><div class="documento">${conteudo}</div></body></html>`;
}

/** Modelo criado no editor (os antigos, em Word, não têm "html"). */
export const ehModeloEditor = (m: Modelo) => typeof m.html === "string";

export const paginaDo = (m: Modelo): PaginaModelo => ({
  ...PAGINA_PADRAO,
  ...(m.pagina ?? {}),
  margens: { ...PAGINA_PADRAO.margens, ...(m.pagina?.margens ?? {}) },
});
