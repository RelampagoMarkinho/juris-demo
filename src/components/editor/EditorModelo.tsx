"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import { FontFamily, FontSize, TextStyle } from "@tiptap/extension-text-style";
import { TableKit } from "@tiptap/extension-table";
import {
  AlignCenter, AlignJustify, AlignLeft, AlignRight, ArrowLeft, Bold, Braces, Check, Eye, FileText, ImagePlus, IndentIncrease,
  Hash, Italic, List, ListOrdered, Maximize2, MousePointer2, Redo2, Save, SeparatorHorizontal, Strikethrough, Table, Trash2,
  Underline, Undo2, X,
} from "lucide-react";
import { Modal } from "@/components/Shell";
import { Campo, Paragrafo, QuebraPagina } from "./extensoes";
import { CHAVES } from "@/lib/modelos";
import {
  A4, caixaImagem, cssConteudo, DIST_CABECALHO, ESPACAMENTOS, estiloTimbrado, FONTES, LINK_FONTES, montarDocumento,
  PAGINA_PADRAO, paginaDo, preencherCampos, TAMANHOS, temTexto, type ImagemModelo, type PaginaModelo,
} from "@/lib/documento";
import { enviarImagemModelo, excluirArquivo } from "@/lib/arquivos";
import { hojeISO, salvar } from "@/lib/db";
import { mensagemErro } from "@/lib/firebase";
import { CATEGORIAS_MODELO, type Modelo } from "@/lib/mock";
import { MODELOS_PRONTOS, paginaDoPronto } from "@/lib/modelosProntos";

const MM = 96 / 25.4; // px por mm (tela)
const LARGURA_A4 = A4.largura * MM;
const ALTURA_A4 = A4.altura * MM;
const arred = (v: number) => Math.round(v * 2) / 2; // passos de 0,5 mm

const PREDEF_MARGENS: { nome: string; m: PaginaModelo["margens"] }[] = [
  { nome: "ABNT (3 / 2 / 2 / 3 cm)", m: { topo: 30, direita: 20, base: 20, esquerda: 30 } },
  { nome: "Normal (2,5 / 3 cm)", m: { topo: 25, direita: 30, base: 25, esquerda: 30 } },
  { nome: "Moderada (2,54 / 1,91 cm)", m: { topo: 25.4, direita: 19.1, base: 25.4, esquerda: 19.1 } },
  { nome: "Estreita (1,27 cm)", m: { topo: 12.7, direita: 12.7, base: 12.7, esquerda: 12.7 } },
];

type Aba = "inicio" | "inserir" | "layout" | "cabecalho";
type QualImagem = "topo" | "rodape" | "fundo";

export default function EditorModelo({ modelo }: { modelo: Modelo | null }) {
  const router = useRouter();
  const [nome, setNome] = useState(modelo?.nome ?? "");
  const [categoria, setCategoria] = useState(modelo?.categoria ?? CATEGORIAS_MODELO[0]);
  const [pagina, setPagina] = useState<PaginaModelo>(modelo ? paginaDo(modelo) : PAGINA_PADRAO);
  const [paraExcluir, setParaExcluir] = useState<string[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const [erro, setErro] = useState("");
  const [previa, setPrevia] = useState("");
  const [alterado, setAlterado] = useState(false);
  const [aba, setAba] = useState<Aba>("inicio");
  const [zoom, setZoom] = useState<"ajustar" | number>("ajustar");

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ horizontalRule: false, link: false, heading: { levels: [1, 2, 3] } }),
      TextStyle, FontFamily, FontSize,
      TextAlign.configure({ types: ["heading", "paragraph"], alignments: ["left", "center", "right", "justify"] }),
      TableKit.configure({ table: { resizable: false } }),
      Campo, QuebraPagina, Paragrafo,
    ],
    content: modelo?.html ?? "<p></p>",
    immediatelyRender: false,
    onUpdate: () => setAlterado(true),
  });

  // Texto do cabeçalho e do rodapé (repetido em todas as páginas), cada um com seu próprio editor.
  const extensoesCabecalho = () => [
    StarterKit.configure({ horizontalRule: false, link: false, heading: false, blockquote: false, codeBlock: false }),
    TextStyle, FontFamily, FontSize,
    TextAlign.configure({ types: ["paragraph"], alignments: ["left", "center", "right", "justify"] }),
    TableKit.configure({ table: { resizable: false } }), // ex.: texto à esquerda e nº da página à direita
    Campo,
  ];
  const textoLimpo = (html: string) => (temTexto(html) ? html : "");
  const cabEditor = useEditor({
    extensions: extensoesCabecalho(),
    content: (modelo && paginaDo(modelo).textoTopo) || "<p></p>",
    immediatelyRender: false,
    onUpdate: ({ editor: e }) => mudarPagina({ textoTopo: textoLimpo(e.getHTML()) }),
  });
  const rodEditor = useEditor({
    extensions: extensoesCabecalho(),
    content: (modelo && paginaDo(modelo).textoRodape) || "<p></p>",
    immediatelyRender: false,
    onUpdate: ({ editor: e }) => mudarPagina({ textoRodape: textoLimpo(e.getHTML()) }),
  });

  // Avisa antes de sair com alterações não salvas.
  useEffect(() => {
    if (!alterado) return;
    const aviso = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", aviso);
    return () => window.removeEventListener("beforeunload", aviso);
  }, [alterado]);

  const mudarPagina = (p: Partial<PaginaModelo>) => { setPagina((x) => ({ ...x, ...p })); setAlterado(true); };

  const usarPronto = (id: string) => {
    const pronto = MODELOS_PRONTOS.find((m) => m.id === id);
    if (!pronto || !editor) return;
    editor.commands.setContent(pronto.html);
    cabEditor?.commands.setContent(pronto.pagina.textoTopo || "<p></p>");
    rodEditor?.commands.setContent(pronto.pagina.textoRodape || "<p></p>");
    setPagina({ ...PAGINA_PADRAO, ...paginaDoPronto(pronto, window.location.origin) } as PaginaModelo);
    setNome((n) => n || pronto.nome);
    setCategoria(pronto.categoria);
    setAlterado(true);
  };

  // /documentos/modelo/novo?pronto=<id> abre o editor já com o modelo pronto carregado.
  const prontoAplicado = useRef(false);
  useEffect(() => {
    if (modelo || !editor || !cabEditor || !rodEditor || prontoAplicado.current) return;
    const id = new URLSearchParams(window.location.search).get("pronto");
    if (id) { prontoAplicado.current = true; usarPronto(id); }
  }, [editor, cabEditor, rodEditor]); // eslint-disable-line react-hooks/exhaustive-deps
  const mudarImagem = (qual: QualImagem, img: ImagemModelo | null) => mudarPagina({ [qual]: img } as Partial<PaginaModelo>);
  const marcarExclusao = (caminho: string) => setParaExcluir((l) => [...l, caminho]);

  const salvarModelo = async () => {
    if (!editor) return;
    if (!nome.trim()) return setErro("Dê um nome ao modelo.");
    setErro(""); setSalvando(true);
    try {
      const dados = { nome: nome.trim(), categoria, html: editor.getHTML(), pagina, data: hojeISO() };
      const id = modelo ? (await salvar("modelos", { ...dados, id: modelo.id })) : await salvar("modelos", dados);
      await Promise.all(paraExcluir.map((c) => excluirArquivo(c).catch(() => {})));
      setParaExcluir([]);
      setAlterado(false);
      setSalvo(true);
      setTimeout(() => setSalvo(false), 2000);
      if (!modelo) router.replace(`/documentos/modelo?id=${id}`);
    } catch (e) {
      setErro(mensagemErro(e));
    } finally {
      setSalvando(false);
    }
  };

  const abrirPrevia = () => {
    if (!editor) return;
    setPrevia(montarDocumento(preencherCampos(editor.getHTML(), null).html, pagina, nome || "Modelo"));
  };

  return (
    <div className="editor-modelo">
      <link rel="stylesheet" href={LINK_FONTES} />
      <style>{cssConteudo(".folha .ProseMirror", pagina) + cssConteudo(".folha .cab-texto-ed", { ...pagina, espacamento: 1.15 }) +
        ".folha .cab-texto-ed table { margin: 0; } .folha .cab-texto-ed td { border: 1px dashed #ccc; padding: 0; }"}</style>

      <div className="editor-topo">
        <Link href="/documentos" className="voltar" style={{ margin: 0 }}><ArrowLeft size={16} /> Documentos</Link>
        <input className="input editor-nome" placeholder="Nome do modelo (ex.: Procuração ad judicia)" value={nome}
          onChange={(e) => { setNome(e.target.value); setAlterado(true); }} />
        <select className="select" style={{ width: 170 }} value={categoria} onChange={(e) => { setCategoria(e.target.value); setAlterado(true); }} aria-label="Categoria">
          {CATEGORIAS_MODELO.map((c) => <option key={c}>{c}</option>)}
        </select>
        <button className="btn" onClick={abrirPrevia}><Eye size={16} /> Pré-visualizar</button>
        <button className="btn btn-primary" onClick={salvarModelo} disabled={salvando}>
          {salvo ? <><Check size={16} /> Salvo</> : <><Save size={16} /> {salvando ? "Salvando..." : "Salvar"}</>}
        </button>
      </div>
      {erro && <div className="error">{erro}</div>}

      {editor && (
        <Faixa editor={editor} cabEditor={cabEditor} rodEditor={rodEditor} aba={aba} setAba={setAba} pagina={pagina} mudarPagina={mudarPagina}
          mudarImagem={mudarImagem} marcarExclusao={marcarExclusao}
          usarPronto={usarPronto} />
      )}

      <Folha editor={editor} cabEditor={cabEditor} rodEditor={rodEditor} pagina={pagina} zoom={zoom} setZoom={setZoom}
        editandoCabecalho={aba === "cabecalho"} mudarImagem={mudarImagem}
        entrarCabecalho={() => setAba("cabecalho")} />

      {previa && (
        <Modal wide titulo="Pré-visualização" sub="Exatamente como o documento será gerado (campos destacados)" onClose={() => setPrevia("")}>
          <iframe className="previa-doc" srcDoc={previa} title="Pré-visualização do modelo" />
        </Modal>
      )}
    </div>
  );
}

/* =============================== Folha A4 =============================== */

function Folha({ editor, cabEditor, rodEditor, pagina, zoom, setZoom, editandoCabecalho, mudarImagem, entrarCabecalho }: {
  editor: Editor | null; cabEditor: Editor | null; rodEditor: Editor | null; pagina: PaginaModelo; zoom: "ajustar" | number; setZoom: (z: "ajustar" | number) => void;
  editandoCabecalho: boolean; mudarImagem: (q: QualImagem, i: ImagemModelo | null) => void; entrarCabecalho: () => void;
}) {
  const areaRef = useRef<HTMLDivElement>(null);
  const conteudoRef = useRef<HTMLDivElement>(null);
  const [larguraArea, setLarguraArea] = useState(LARGURA_A4 + 40);
  const [altura, setAltura] = useState(ALTURA_A4);
  const m = pagina.margens;
  const escala = zoom === "ajustar" ? Math.min(1.25, (larguraArea - 32) / LARGURA_A4) : zoom;

  // No modo cabeçalho, topo e rodapé são desenhados como imagens arrastáveis (não como fundo).
  const timbrado = useMemo(() => estiloTimbrado(pagina), [pagina]);
  const timbradoSemCabecalho = useMemo(() => estiloTimbrado({ ...pagina, topo: null, rodape: null }), [pagina]);

  useLayoutEffect(() => {
    const area = areaRef.current, conteudo = conteudoRef.current;
    if (!area || !conteudo) return;
    const medir = () => {
      setLarguraArea(area.clientWidth);
      setAltura(conteudo.offsetHeight + (m.topo + m.base) * MM);
    };
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(area);
    ro.observe(conteudo);
    return () => ro.disconnect();
  }, [m.topo, m.base]);

  const paginas = Math.max(1, Math.ceil((altura - 2) / ALTURA_A4));
  const distTopo = pagina.distTextoTopo ?? DIST_CABECALHO;
  const distRodape = pagina.distTextoRodape ?? DIST_CABECALHO;
  // Na folha (fora do modo de edição) o número da página aparece já preenchido.
  const numerar = (html: string, n: number) => html
    .replace(/<span[^>]*data-campo="pagina"[^>]*>.*?<\/span>/g, String(n))
    .replace(/<span[^>]*data-campo="total_paginas"[^>]*>.*?<\/span>/g, String(paginas));

  return (
    <div className="editor-area-wrap">
      <div className={`editor-area ${editandoCabecalho ? "modo-cabecalho" : ""}`} ref={areaRef}>
        <div style={{ width: LARGURA_A4 * escala, height: paginas * ALTURA_A4 * escala, margin: "0 auto" }}>
          <div className="folha"
            style={{ transform: `scale(${escala})`, padding: `${m.topo}mm ${m.direita}mm ${m.base}mm ${m.esquerda}mm`, minHeight: paginas * ALTURA_A4 }}
            onClick={(e) => { if (!editandoCabecalho && e.target === e.currentTarget) editor?.commands.focus("end"); }}
            onDoubleClick={(e) => {
              // Duplo clique na área do cabeçalho/rodapé abre a edição, como no Word.
              const y = (e.nativeEvent.offsetY) / MM;
              if (!editandoCabecalho && e.target === e.currentTarget && (y < m.topo || y % A4.altura > A4.altura - m.base)) entrarCabecalho();
            }}>
            {Array.from({ length: paginas }).map((_, i) => {
              const editavel = editandoCabecalho && i === 0;
              return (
                <div key={i} className="folha-pagina" style={{ top: i * ALTURA_A4, ...((editavel ? timbradoSemCabecalho : timbrado) ?? {}) }}>
                  {i > 0 && <span className="folha-num">Página {i + 1} (aproximada)</span>}
                  {!editavel && temTexto(pagina.textoTopo) && (
                    <div className="cab-texto-ed cab-estatico" style={{ left: `${m.esquerda}mm`, right: `${m.direita}mm`, top: `${distTopo}mm` }}
                      onDoubleClick={entrarCabecalho} title="Clique duas vezes para editar o cabeçalho"
                      dangerouslySetInnerHTML={{ __html: numerar(pagina.textoTopo!, i + 1) }} />
                  )}
                  {!editavel && temTexto(pagina.textoRodape) && (
                    <div className="cab-texto-ed cab-estatico" style={{ left: `${m.esquerda}mm`, right: `${m.direita}mm`, bottom: `${distRodape}mm` }}
                      onDoubleClick={entrarCabecalho} title="Clique duas vezes para editar o rodapé"
                      dangerouslySetInnerHTML={{ __html: numerar(pagina.textoRodape!, i + 1) }} />
                  )}
                  {editavel && (
                    <>
                      <div className="cab-texto-ed cab-caixa" style={{ left: `${m.esquerda}mm`, right: `${m.direita}mm`, top: `${distTopo}mm` }}>
                        <span className="cab-rotulo">Texto do cabeçalho</span>
                        <EditorContent editor={cabEditor} />
                      </div>
                      <div className="cab-texto-ed cab-caixa" style={{ left: `${m.esquerda}mm`, right: `${m.direita}mm`, bottom: `${distRodape}mm` }}>
                        <span className="cab-rotulo baixo">Texto do rodapé</span>
                        <EditorContent editor={rodEditor} />
                      </div>
                      <div className="guia-margem" style={{ top: `${m.topo}mm` }}><span>Início do texto</span></div>
                      <div className="guia-margem" style={{ top: `${A4.altura - m.base}mm` }}><span>Fim do texto</span></div>
                      {pagina.topo && <ImagemArrastavel qual="topo" img={pagina.topo} escala={escala} mudar={(i2) => mudarImagem("topo", i2)} />}
                      {pagina.rodape && <ImagemArrastavel qual="rodape" img={pagina.rodape} escala={escala} mudar={(i2) => mudarImagem("rodape", i2)} />}
                    </>
                  )}
                </div>
              );
            })}
            <div ref={conteudoRef} className="folha-conteudo"><EditorContent editor={editor} /></div>
          </div>
        </div>
      </div>

      <div className="barra-status">
        <span><FileText size={13} /> {paginas} {paginas === 1 ? "página" : "páginas"} (aproximado — use Pré-visualizar para a paginação exata)</span>
        <label>
          Zoom
          <select value={String(zoom)} onChange={(e) => setZoom(e.target.value === "ajustar" ? "ajustar" : Number(e.target.value))}>
            <option value="ajustar">Ajustar à tela</option>
            {[0.5, 0.75, 1, 1.25, 1.5].map((z) => <option key={z} value={z}>{Math.round(z * 100)}%</option>)}
          </select>
        </label>
      </div>
    </div>
  );
}

/** Imagem de cabeçalho/rodapé: arraste para mover, puxe o canto para redimensionar (como no Word). */
function ImagemArrastavel({ qual, img, escala, mudar }: {
  qual: "topo" | "rodape"; img: ImagemModelo; escala: number; mudar: (i: ImagemModelo) => void;
}) {
  const c = caixaImagem(img);
  const inicio = useRef<{ px: number; py: number; x: number; y: number; largura: number; modo: "mover" | "tamanho" } | null>(null);
  const [ativo, setAtivo] = useState(false);

  const comecar = (e: React.PointerEvent, modo: "mover" | "tamanho") => {
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    inicio.current = { px: e.clientX, py: e.clientY, x: c.x, y: c.y, largura: c.largura, modo };
    setAtivo(true);
  };
  const mover = (e: React.PointerEvent) => {
    const s = inicio.current;
    if (!s) return;
    const dx = (e.clientX - s.px) / (escala * MM);
    const dy = (e.clientY - s.py) / (escala * MM);
    if (s.modo === "mover") {
      const y = qual === "topo" ? s.y + dy : s.y - dy;
      mudar({ ...img, x: arred(Math.max(-20, Math.min(A4.largura - 5, s.x + dx))), y: arred(Math.max(0, Math.min(150, y))) });
    } else {
      mudar({ ...img, largura: arred(Math.max(10, Math.min(A4.largura + 20, s.largura + dx))) });
    }
  };
  const terminar = () => { inicio.current = null; setAtivo(false); };

  return (
    <div className={`img-cabecalho ${ativo ? "ativo" : ""}`}
      style={{ left: `${c.x}mm`, width: `${c.largura}mm`, ...(qual === "topo" ? { top: `${c.y}mm` } : { bottom: `${c.y}mm` }) }}
      onPointerDown={(e) => comecar(e, "mover")} onPointerMove={mover} onPointerUp={terminar} onPointerCancel={terminar}
      title="Arraste para mover">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={img.url} alt={qual === "topo" ? "Imagem do cabeçalho" : "Imagem do rodapé"} draggable={false}
        onLoad={(e) => {
          const el = e.currentTarget;
          if (!img.proporcao && el.naturalWidth) mudar({ ...img, proporcao: el.naturalHeight / el.naturalWidth });
        }} />
      <span className="img-rotulo">{qual === "topo" ? "Cabeçalho" : "Rodapé"} · {c.largura} mm</span>
      <span className={`alca ${qual === "topo" ? "se" : "ne"}`} title="Puxe para redimensionar"
        onPointerDown={(e) => comecar(e, "tamanho")} onPointerMove={mover} onPointerUp={terminar} onPointerCancel={terminar} />
    </div>
  );
}

/* =============================== Faixa (Ribbon) =============================== */

function Botao({ ativo, titulo, onClick, children, desab, rotulo }: {
  ativo?: boolean; titulo: string; onClick: () => void; children: React.ReactNode; desab?: boolean; rotulo?: string;
}) {
  return (
    <button type="button" className={`ferr ${ativo ? "on" : ""} ${rotulo ? "com-rotulo" : ""}`} title={titulo} aria-label={titulo} aria-pressed={!!ativo}
      disabled={desab} onMouseDown={(e) => e.preventDefault()} onClick={onClick}>
      {children}{rotulo && <span>{rotulo}</span>}
    </button>
  );
}

function Grupo({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="faixa-grupo">
      <div className="faixa-itens">{children}</div>
      <span className="faixa-rotulo">{rotulo}</span>
    </div>
  );
}

function Faixa({ editor, cabEditor, rodEditor, aba, setAba, pagina, mudarPagina, mudarImagem, marcarExclusao, usarPronto }: {
  editor: Editor; cabEditor: Editor | null; rodEditor: Editor | null; aba: Aba; setAba: (a: Aba) => void; pagina: PaginaModelo; mudarPagina: (p: Partial<PaginaModelo>) => void;
  mudarImagem: (q: QualImagem, i: ImagemModelo | null) => void; marcarExclusao: (c: string) => void; usarPronto: (id: string) => void;
}) {
  const ABAS: [Aba, string][] = [["inicio", "Página Inicial"], ["inserir", "Inserir"], ["layout", "Layout"], ["cabecalho", "Cabeçalho e Rodapé"]];
  return (
    <div className="faixa">
      <div className="faixa-abas" role="tablist">
        {ABAS.map(([k, r]) => (
          <button key={k} role="tab" aria-selected={aba === k} className={aba === k ? "on" : ""} onClick={() => setAba(k)}>{r}</button>
        ))}
      </div>
      <div className="faixa-conteudo">
        {aba === "inicio" && <AbaInicio editor={editor} pagina={pagina} />}
        {aba === "inserir" && <AbaInserir editor={editor} usarPronto={usarPronto} />}
        {aba === "layout" && <AbaLayout pagina={pagina} mudarPagina={mudarPagina} />}
        {aba === "cabecalho" && (
          <AbaCabecalho cabEditor={cabEditor} rodEditor={rodEditor} pagina={pagina} mudarPagina={mudarPagina}
            mudarImagem={mudarImagem} marcarExclusao={marcarExclusao} />
        )}
      </div>
    </div>
  );
}

function useEstado(editor: Editor) {
  return useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      negrito: e.isActive("bold"), italico: e.isActive("italic"), sublinhado: e.isActive("underline"), riscado: e.isActive("strike"),
      esq: e.isActive({ textAlign: "left" }), centro: e.isActive({ textAlign: "center" }),
      dir: e.isActive({ textAlign: "right" }), just: e.isActive({ textAlign: "justify" }),
      marcadores: e.isActive("bulletList"), numerada: e.isActive("orderedList"),
      tabela: e.isActive("table"),
      fonte: (e.getAttributes("textStyle").fontFamily as string) ?? "",
      tamanho: ((e.getAttributes("textStyle").fontSize as string) ?? "").replace("pt", ""),
      espacamento: (e.getAttributes("paragraph").espacamento as string) ?? (e.getAttributes("heading").espacamento as string) ?? "",
      recuo: !!(e.getAttributes("paragraph").recuo || e.getAttributes("heading").recuo),
      estilo: e.isActive("heading", { level: 1 }) ? "h1" : e.isActive("heading", { level: 2 }) ? "h2" : e.isActive("heading", { level: 3 }) ? "h3" : "p",
      desfazer: e.can().undo(), refazer: e.can().redo(),
    }),
  });
}

function AbaInicio({ editor, pagina }: { editor: Editor; pagina: PaginaModelo }) {
  const s = useEstado(editor);
  const c = () => editor.chain().focus();
  const fonteAtual = Object.keys(FONTES).find((k) => FONTES[k] === s.fonte) ?? "";
  return (
    <>
      <Grupo rotulo="Desfazer">
        <Botao titulo="Desfazer" desab={!s.desfazer} onClick={() => c().undo().run()}><Undo2 size={17} /></Botao>
        <Botao titulo="Refazer" desab={!s.refazer} onClick={() => c().redo().run()}><Redo2 size={17} /></Botao>
      </Grupo>
      <Grupo rotulo="Fonte">
        <div className="faixa-coluna">
          <div className="faixa-linha">
            <select className="ferr-sel" value={fonteAtual} aria-label="Fonte" onChange={(e) => {
              const v = e.target.value;
              if (v) c().setFontFamily(FONTES[v]).run(); else c().unsetFontFamily().run();
            }}>
              <option value="">{pagina.fonte} (padrão)</option>
              {Object.keys(FONTES).map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
            <select className="ferr-sel" style={{ width: 78 }} value={s.tamanho} aria-label="Tamanho da fonte" onChange={(e) => {
              const v = e.target.value;
              if (v) c().setFontSize(`${v}pt`).run(); else c().unsetFontSize().run();
            }}>
              <option value="">{pagina.tamanho}</option>
              {TAMANHOS.map((t) => <option key={t} value={String(t)}>{t}</option>)}
            </select>
          </div>
          <div className="faixa-linha">
            <Botao titulo="Negrito" ativo={s.negrito} onClick={() => c().toggleBold().run()}><Bold size={16} /></Botao>
            <Botao titulo="Itálico" ativo={s.italico} onClick={() => c().toggleItalic().run()}><Italic size={16} /></Botao>
            <Botao titulo="Sublinhado" ativo={s.sublinhado} onClick={() => c().toggleUnderline().run()}><Underline size={16} /></Botao>
            <Botao titulo="Tachado" ativo={s.riscado} onClick={() => c().toggleStrike().run()}><Strikethrough size={16} /></Botao>
          </div>
        </div>
      </Grupo>
      <Grupo rotulo="Parágrafo">
        <div className="faixa-coluna">
          <div className="faixa-linha">
            <Botao titulo="Marcadores" ativo={s.marcadores} onClick={() => c().toggleBulletList().run()}><List size={16} /></Botao>
            <Botao titulo="Numeração" ativo={s.numerada} onClick={() => c().toggleOrderedList().run()}><ListOrdered size={16} /></Botao>
            <Botao titulo="Recuo da primeira linha" ativo={s.recuo} onClick={() => c().alternarRecuo().run()}><IndentIncrease size={16} /></Botao>
            <select className="ferr-sel" style={{ width: 112 }} value={s.espacamento} aria-label="Espaçamento entre linhas"
              onChange={(e) => c().definirEspacamento(e.target.value || null).run()}>
              <option value="">Espaçamento</option>
              {ESPACAMENTOS.map((x) => <option key={x.valor} value={x.valor}>{x.rotulo}</option>)}
            </select>
          </div>
          <div className="faixa-linha">
            <Botao titulo="Alinhar à esquerda" ativo={s.esq} onClick={() => c().setTextAlign("left").run()}><AlignLeft size={16} /></Botao>
            <Botao titulo="Centralizar" ativo={s.centro} onClick={() => c().setTextAlign("center").run()}><AlignCenter size={16} /></Botao>
            <Botao titulo="Alinhar à direita" ativo={s.dir} onClick={() => c().setTextAlign("right").run()}><AlignRight size={16} /></Botao>
            <Botao titulo="Justificar" ativo={s.just} onClick={() => c().setTextAlign("justify").run()}><AlignJustify size={16} /></Botao>
          </div>
        </div>
      </Grupo>
      <Grupo rotulo="Estilos">
        <div className="estilos">
          {([["p", "Normal"], ["h1", "Título 1"], ["h2", "Título 2"], ["h3", "Título 3"]] as const).map(([k, r]) => (
            <button key={k} type="button" className={`estilo ${k} ${s.estilo === k ? "on" : ""}`} onMouseDown={(e) => e.preventDefault()}
              onClick={() => (k === "p" ? c().setParagraph().run() : c().setHeading({ level: Number(k[1]) as 1 | 2 | 3 }).run())}>
              {r}
            </button>
          ))}
        </div>
      </Grupo>
    </>
  );
}

function AbaInserir({ editor, usarPronto }: { editor: Editor; usarPronto: (id: string) => void }) {
  const s = useEstado(editor);
  const c = () => editor.chain().focus();
  const [campos, setCampos] = useState(false);
  // A faixa corta o que passa da altura dela; a lista fica fixa na tela, logo abaixo do botão.
  const ancora = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const abrirCampos = () => {
    const r = ancora.current?.getBoundingClientRect();
    if (r) setPos({ top: r.bottom + 6, left: Math.max(8, Math.min(r.left, window.innerWidth - 348)) });
    setCampos((v) => !v);
  };
  return (
    <>
      <Grupo rotulo="Campos automáticos">
        <div className="campos-menu" ref={ancora}>
          <Botao titulo="Inserir campo" rotulo="Inserir campo" onClick={abrirCampos}><Braces size={20} /></Botao>
          {campos && (
            <div className="dropdown campos-lista" style={{ top: pos.top, left: pos.left }} onMouseDown={(e) => e.preventDefault()}>
              <div className="row-between" style={{ padding: "4px 6px 8px" }}>
                <strong style={{ fontSize: 13 }}>Preenchidos com os dados do cliente</strong>
                <button className="icon-btn sm" aria-label="Fechar" onClick={() => setCampos(false)}><X size={14} /></button>
              </div>
              {CHAVES.map((g) => (
                <div key={g.grupo}>
                  <div className="campos-grupo">{g.grupo}</div>
                  {g.itens.map((i) => (
                    <button key={i.chave} className="dropdown-item" onClick={() => { c().inserirCampo(i.chave).run(); setCampos(false); }}>
                      <span className="grow">{i.desc}</span><code>{`{${i.chave}}`}</code>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </Grupo>
      <Grupo rotulo="Tabela">
        <Botao titulo="Inserir tabela (3 × 2)" rotulo="Tabela" onClick={() => c().insertTable({ rows: 3, cols: 2, withHeaderRow: false }).run()}><Table size={20} /></Botao>
        {s.tabela && (
          <div className="faixa-coluna">
            <div className="faixa-linha">
              <button type="button" className="ferr txt" onMouseDown={(e) => e.preventDefault()} onClick={() => c().addRowAfter().run()}>+ linha</button>
              <button type="button" className="ferr txt" onMouseDown={(e) => e.preventDefault()} onClick={() => c().addColumnAfter().run()}>+ coluna</button>
            </div>
            <div className="faixa-linha">
              <button type="button" className="ferr txt" onMouseDown={(e) => e.preventDefault()} onClick={() => c().deleteRow().run()}>− linha</button>
              <button type="button" className="ferr txt" onMouseDown={(e) => e.preventDefault()} onClick={() => c().deleteColumn().run()}>− coluna</button>
              <Botao titulo="Excluir tabela" onClick={() => c().deleteTable().run()}><Trash2 size={15} /></Botao>
            </div>
          </div>
        )}
      </Grupo>
      <Grupo rotulo="Páginas">
        <Botao titulo="Quebra de página" rotulo="Quebra de página" onClick={() => c().inserirQuebraPagina().run()}><SeparatorHorizontal size={20} /></Botao>
      </Grupo>
      <Grupo rotulo="Modelos prontos do escritório">
        <div className="faixa-coluna">
          <FileText size={18} className="muted" style={{ alignSelf: "center" }} />
          <select className="ferr-sel" style={{ width: 240 }} value="" aria-label="Carregar modelo pronto"
            onChange={(e) => {
              const id = e.target.value;
              const m = MODELOS_PRONTOS.find((x) => x.id === id);
              if (m && (editor.isEmpty || confirm(`Substituir todo o documento por "${m.nome}"? (texto, margens e timbrado)`))) usarPronto(id);
            }}>
            <option value="">Carregar modelo pronto...</option>
            {MODELOS_PRONTOS.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
          </select>
        </div>
      </Grupo>
    </>
  );
}

function AbaLayout({ pagina, mudarPagina }: { pagina: PaginaModelo; mudarPagina: (p: Partial<PaginaModelo>) => void }) {
  const m = pagina.margens;
  const predef = PREDEF_MARGENS.find((p) => JSON.stringify(p.m) === JSON.stringify(m))?.nome ?? "";
  const margem = (k: keyof PaginaModelo["margens"], v: string) =>
    mudarPagina({ margens: { ...m, [k]: Math.max(0, Math.min(100, Number(v.replace(",", ".")) || 0)) } });
  return (
    <>
      <Grupo rotulo="Margens (mm)">
        <div className="faixa-coluna">
          <select className="ferr-sel" style={{ width: 220 }} value={predef} aria-label="Margens predefinidas"
            onChange={(e) => { const p = PREDEF_MARGENS.find((x) => x.nome === e.target.value); if (p) mudarPagina({ margens: { ...p.m } }); }}>
            <option value="">Personalizadas</option>
            {PREDEF_MARGENS.map((p) => <option key={p.nome}>{p.nome}</option>)}
          </select>
          <div className="faixa-linha margens">
            {([["topo", "Sup."], ["base", "Inf."], ["esquerda", "Esq."], ["direita", "Dir."]] as const).map(([k, r]) => (
              <label key={k}>{r}<input type="number" min={0} max={100} step={0.5} value={m[k]} onChange={(e) => margem(k, e.target.value)} /></label>
            ))}
          </div>
        </div>
      </Grupo>
      <Grupo rotulo="Texto padrão do documento">
        <div className="faixa-coluna">
          <div className="faixa-linha">
            <select className="ferr-sel" value={pagina.fonte} aria-label="Fonte padrão" onChange={(e) => mudarPagina({ fonte: e.target.value })}>
              {Object.keys(FONTES).map((f) => <option key={f}>{f}</option>)}
            </select>
            <select className="ferr-sel" style={{ width: 80 }} value={pagina.tamanho} aria-label="Tamanho padrão" onChange={(e) => mudarPagina({ tamanho: Number(e.target.value) })}>
              {TAMANHOS.map((t) => <option key={t} value={t}>{t} pt</option>)}
            </select>
          </div>
          <select className="ferr-sel" value={String(pagina.espacamento)} aria-label="Espaçamento padrão" onChange={(e) => mudarPagina({ espacamento: Number(e.target.value) })}>
            {ESPACAMENTOS.map((x) => <option key={x.valor} value={x.valor}>Espaçamento {x.rotulo}</option>)}
          </select>
        </div>
      </Grupo>
      <Grupo rotulo="Papel">
        <div className="faixa-info">A4 · Retrato<br /><small>210 × 297 mm</small></div>
      </Grupo>
    </>
  );
}

function AbaCabecalho({ cabEditor, rodEditor, pagina, mudarPagina, mudarImagem, marcarExclusao }: {
  cabEditor: Editor | null; rodEditor: Editor | null;
  pagina: PaginaModelo; mudarPagina: (p: Partial<PaginaModelo>) => void;
  mudarImagem: (q: QualImagem, i: ImagemModelo | null) => void; marcarExclusao: (c: string) => void;
}) {
  const [alvo, setAlvo] = useState<"topo" | "rodape">("topo");
  // O texto que recebeu o clique por último passa a ser o alvo da formatação.
  useEffect(() => {
    const focoTopo = () => setAlvo("topo");
    const focoRodape = () => setAlvo("rodape");
    cabEditor?.on("focus", focoTopo);
    rodEditor?.on("focus", focoRodape);
    return () => { cabEditor?.off("focus", focoTopo); rodEditor?.off("focus", focoRodape); };
  }, [cabEditor, rodEditor]);
  const ed = alvo === "topo" ? cabEditor : rodEditor;

  return (
    <>
      {ed && <GrupoTextoCabecalho ed={ed} alvo={alvo} setAlvo={setAlvo} pagina={pagina} mudarPagina={mudarPagina} />}
      <GrupoImagem qual="topo" rotulo="Imagem do cabeçalho" img={pagina.topo} pagina={pagina} mudarPagina={mudarPagina} mudarImagem={mudarImagem} marcarExclusao={marcarExclusao} />
      <GrupoImagem qual="rodape" rotulo="Imagem do rodapé" img={pagina.rodape} pagina={pagina} mudarPagina={mudarPagina} mudarImagem={mudarImagem} marcarExclusao={marcarExclusao} />
      <GrupoImagem qual="fundo" rotulo="Fundo da página (A4 inteira)" img={pagina.fundo} pagina={pagina} mudarPagina={mudarPagina} mudarImagem={mudarImagem} marcarExclusao={marcarExclusao} />
      <div className="faixa-dica"><MousePointer2 size={14} /> Digite nas caixas pontilhadas da folha. Imagens: arraste para mover e puxe o canto dourado para redimensionar.</div>
    </>
  );
}

/** Formatação do texto do cabeçalho/rodapé (negrito, alinhamento, tamanho, campos e nº da página). */
function GrupoTextoCabecalho({ ed, alvo, setAlvo, pagina, mudarPagina }: {
  ed: Editor; alvo: "topo" | "rodape"; setAlvo: (a: "topo" | "rodape") => void;
  pagina: PaginaModelo; mudarPagina: (p: Partial<PaginaModelo>) => void;
}) {
  const s = useEditorState({
    editor: ed,
    selector: ({ editor: e }) => ({
      negrito: e.isActive("bold"), italico: e.isActive("italic"), sublinhado: e.isActive("underline"),
      esq: e.isActive({ textAlign: "left" }), centro: e.isActive({ textAlign: "center" }), dir: e.isActive({ textAlign: "right" }),
      tamanho: ((e.getAttributes("textStyle").fontSize as string) ?? "").replace("pt", ""),
    }),
  });
  const c = () => ed.chain().focus();
  const chaveDist = alvo === "topo" ? "distTextoTopo" : "distTextoRodape";
  const dist = pagina[chaveDist] ?? DIST_CABECALHO;

  return (
    <Grupo rotulo="Texto do cabeçalho e rodapé">
      <div className="faixa-coluna">
        <div className="faixa-linha">
          <div className="seg-mini">
            <button type="button" className={alvo === "topo" ? "on" : ""} onClick={() => { setAlvo("topo"); }}>Cabeçalho</button>
            <button type="button" className={alvo === "rodape" ? "on" : ""} onClick={() => { setAlvo("rodape"); }}>Rodapé</button>
          </div>
          <select className="ferr-sel" style={{ width: 66 }} value={s.tamanho} aria-label="Tamanho" onChange={(e) => {
            const v = e.target.value;
            if (v) c().setFontSize(`${v}pt`).run(); else c().unsetFontSize().run();
          }}>
            <option value="">{pagina.tamanho}</option>
            {TAMANHOS.map((t) => <option key={t} value={String(t)}>{t}</option>)}
          </select>
          <label className="mini-num" title={alvo === "topo" ? "Distância da borda superior até o texto" : "Distância da borda inferior até o texto"}>
            {alvo === "topo" ? "Do topo" : "Da base"}
            <input type="number" min={0} max={80} step={0.5} value={dist}
              onChange={(e) => mudarPagina({ [chaveDist]: Math.max(0, Number(e.target.value.replace(",", ".")) || 0) } as Partial<PaginaModelo>)} />
          </label>
        </div>
        <div className="faixa-linha">
          <Botao titulo="Negrito" ativo={s.negrito} onClick={() => c().toggleBold().run()}><Bold size={15} /></Botao>
          <Botao titulo="Itálico" ativo={s.italico} onClick={() => c().toggleItalic().run()}><Italic size={15} /></Botao>
          <Botao titulo="Sublinhado" ativo={s.sublinhado} onClick={() => c().toggleUnderline().run()}><Underline size={15} /></Botao>
          <Botao titulo="Alinhar à esquerda" ativo={s.esq} onClick={() => c().setTextAlign("left").run()}><AlignLeft size={15} /></Botao>
          <Botao titulo="Centralizar" ativo={s.centro} onClick={() => c().setTextAlign("center").run()}><AlignCenter size={15} /></Botao>
          <Botao titulo="Alinhar à direita" ativo={s.dir} onClick={() => c().setTextAlign("right").run()}><AlignRight size={15} /></Botao>
          <Botao titulo="Inserir número da página (Página X de Y)" onClick={() =>
            c().insertContent([{ type: "text", text: "Página " }, { type: "campo", attrs: { chave: "pagina" } },
              { type: "text", text: " de " }, { type: "campo", attrs: { chave: "total_paginas" } }]).run()}>
            <Hash size={15} />
          </Botao>
          <select className="ferr-sel" style={{ width: 120 }} value="" aria-label="Inserir campo"
            onChange={(e) => { if (e.target.value) c().inserirCampo(e.target.value).run(); }}>
            <option value="">+ Campo</option>
            {CHAVES.map((g) => (
              <optgroup key={g.grupo} label={g.grupo}>
                {g.itens.map((i) => <option key={i.chave} value={i.chave}>{i.desc}</option>)}
              </optgroup>
            ))}
          </select>
        </div>
      </div>
    </Grupo>
  );
}

function GrupoImagem({ qual, rotulo, img, pagina, mudarPagina, mudarImagem, marcarExclusao }: {
  qual: QualImagem; rotulo: string; img?: ImagemModelo | null; pagina: PaginaModelo;
  mudarPagina: (p: Partial<PaginaModelo>) => void; mudarImagem: (q: QualImagem, i: ImagemModelo | null) => void; marcarExclusao: (c: string) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const c = img ? caixaImagem(img) : null;
  const ajustavel = qual !== "fundo" && img && c;

  const escolher = async (f: File | null) => {
    if (!f) return;
    setErro(""); setEnviando(true);
    try {
      const nova = await enviarImagemModelo(f);
      if (img) marcarExclusao(img.caminho);
      mudarImagem(qual, { ...nova, largura: img?.largura, x: img?.x, y: img?.y });
    } catch (e) {
      setErro(mensagemErro(e));
    } finally {
      setEnviando(false);
    }
  };
  const ajustar = (campos: Partial<ImagemModelo>) => img && mudarImagem(qual, { ...img, ...campos });
  const num = (v: string) => Number(v.replace(",", ".")) || 0;
  const alinhar = (onde: "esq" | "centro" | "dir") => {
    if (!c) return;
    const x = onde === "esq" ? pagina.margens.esquerda : onde === "dir" ? A4.largura - pagina.margens.direita - c.largura : (A4.largura - c.largura) / 2;
    ajustar({ x: arred(x) });
  };
  // Faz o texto começar logo abaixo do cabeçalho (ou terminar acima do rodapé), com 5 mm de folga.
  const ajustarMargem = () => {
    if (!c?.altura) return;
    const valor = Math.ceil(c.y + c.altura + 5);
    mudarPagina({ margens: { ...pagina.margens, [qual === "topo" ? "topo" : "base"]: valor } });
  };

  return (
    <Grupo rotulo={rotulo}>
      <div className="slot-thumb" style={img ? { backgroundImage: `url("${img.url}")` } : undefined}>{!img && <ImagePlus size={18} />}</div>
      <div className="faixa-coluna">
        <div className="faixa-linha">
          <button type="button" className="ferr txt" disabled={enviando} onClick={() => ref.current?.click()}>
            {enviando ? "Enviando..." : img ? "Trocar imagem" : "Inserir imagem"}
          </button>
          {img && (
            <button type="button" className="ferr txt perigo" onClick={() => { marcarExclusao(img.caminho); mudarImagem(qual, null); }}>Remover</button>
          )}
        </div>
        {ajustavel && c && (
          <>
            <div className="faixa-linha margens">
              <label>Largura<input type="number" min={10} max={230} step={0.5} value={c.largura} onChange={(e) => ajustar({ largura: Math.max(10, num(e.target.value)) })} /></label>
              <label>Da esq.<input type="number" min={-20} max={205} step={0.5} value={c.x} onChange={(e) => ajustar({ x: num(e.target.value) })} /></label>
              <label>{qual === "topo" ? "Do topo" : "Da base"}<input type="number" min={0} max={150} step={0.5} value={c.y} onChange={(e) => ajustar({ y: Math.max(0, num(e.target.value)) })} /></label>
            </div>
            <div className="faixa-linha">
              <Botao titulo="Alinhar à margem esquerda" onClick={() => alinhar("esq")}><AlignLeft size={15} /></Botao>
              <Botao titulo="Centralizar na página" onClick={() => alinhar("centro")}><AlignCenter size={15} /></Botao>
              <Botao titulo="Alinhar à margem direita" onClick={() => alinhar("dir")}><AlignRight size={15} /></Botao>
              <Botao titulo="Largura total da folha" onClick={() => ajustar({ largura: A4.largura, x: 0 })}><Maximize2 size={15} /></Botao>
              <button type="button" className="ferr txt" disabled={!c.altura} onClick={ajustarMargem}
                title={qual === "topo" ? "Faz o texto começar logo abaixo do cabeçalho" : "Faz o texto terminar logo acima do rodapé"}>
                Ajustar margem
              </button>
            </div>
          </>
        )}
        {erro && <small className="error">{erro}</small>}
      </div>
      <input ref={ref} type="file" hidden accept="image/png,image/jpeg,image/webp"
        onChange={(e) => { escolher(e.target.files?.[0] ?? null); e.target.value = ""; }} />
    </Grupo>
  );
}
