"use client";

import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import { FontFamily, FontSize, TextStyle } from "@tiptap/extension-text-style";
import { TableKit } from "@tiptap/extension-table";
import {
  AlignCenter, AlignJustify, AlignLeft, AlignRight, Bold, Check, IndentIncrease, Italic, List, ListOrdered, Loader2,
  Redo2, SeparatorHorizontal, Underline, Undo2,
} from "lucide-react";
import { Modal } from "@/components/Shell";
import { Campo, Paragrafo, QuebraPagina } from "./extensoes";
import { cssConteudo, LINK_FONTES, TAMANHOS, type PaginaModelo } from "@/lib/documento";

/**
 * Edita o texto de UM documento já gerado (só deste cliente). O modelo original não é alterado.
 * Ao aplicar, devolve o novo conteúdo para gerar o documento de novo.
 */
export default function EditarDocumento({ titulo, conteudo, pagina, aplicando, onCancelar, onAplicar }: {
  titulo: string; conteudo: string; pagina: PaginaModelo; aplicando?: boolean;
  onCancelar: () => void; onAplicar: (html: string) => void;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ horizontalRule: false, link: false, heading: { levels: [1, 2, 3] } }),
      TextStyle, FontFamily, FontSize,
      TextAlign.configure({ types: ["heading", "paragraph"], alignments: ["left", "center", "right", "justify"] }),
      TableKit.configure({ table: { resizable: false } }),
      Campo, QuebraPagina, Paragrafo,
    ],
    content: conteudo,
    immediatelyRender: false,
  });
  const m = pagina.margens;
  const larguraTexto = 210 - m.esquerda - m.direita; // mm — quebra as linhas como no documento final

  return (
    <Modal wide titulo={`Editar: ${titulo}`} sub="Altere ou acrescente texto só neste documento. O modelo original não muda." onClose={onCancelar}
      footer={<>
        <button className="btn" onClick={onCancelar} disabled={aplicando}>Cancelar</button>
        <button className="btn btn-primary" disabled={!editor || aplicando} onClick={() => editor && onAplicar(editor.getHTML())}>
          {aplicando ? <><Loader2 size={16} className="girar" /> Gerando...</> : <><Check size={16} /> Aplicar e gerar de novo</>}
        </button>
      </>}>
      <link rel="stylesheet" href={LINK_FONTES} />
      <style>{cssConteudo(".edit-doc .ProseMirror", pagina)}</style>
      {editor && <BarraSimples editor={editor} pagina={pagina} />}
      <div className="edit-doc-area">
        <div className="edit-doc" style={{ width: `${larguraTexto}mm` }}>
          <EditorContent editor={editor} />
        </div>
      </div>
    </Modal>
  );
}

function B({ ativo, titulo, onClick, children, desab }: { ativo?: boolean; titulo: string; onClick: () => void; children: React.ReactNode; desab?: boolean }) {
  return (
    <button type="button" className={`ferr ${ativo ? "on" : ""}`} title={titulo} aria-label={titulo} disabled={desab}
      onMouseDown={(e) => e.preventDefault()} onClick={onClick}>{children}</button>
  );
}

function BarraSimples({ editor, pagina }: { editor: Editor; pagina: PaginaModelo }) {
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      b: e.isActive("bold"), i: e.isActive("italic"), u: e.isActive("underline"),
      esq: e.isActive({ textAlign: "left" }), cen: e.isActive({ textAlign: "center" }),
      dir: e.isActive({ textAlign: "right" }), jus: e.isActive({ textAlign: "justify" }),
      ul: e.isActive("bulletList"), ol: e.isActive("orderedList"),
      recuo: !!e.getAttributes("paragraph").recuo,
      tam: ((e.getAttributes("textStyle").fontSize as string) ?? "").replace("pt", ""),
      desfazer: e.can().undo(), refazer: e.can().redo(),
    }),
  });
  const c = () => editor.chain().focus();
  return (
    <div className="barra-editor" style={{ position: "static", marginBottom: 10, boxShadow: "none" }}>
      <B titulo="Desfazer" desab={!s.desfazer} onClick={() => c().undo().run()}><Undo2 size={16} /></B>
      <B titulo="Refazer" desab={!s.refazer} onClick={() => c().redo().run()}><Redo2 size={16} /></B>
      <span className="sep" />
      <select className="ferr-sel" style={{ width: 72 }} value={s.tam} aria-label="Tamanho" onChange={(e) => {
        const v = e.target.value;
        if (v) c().setFontSize(`${v}pt`).run(); else c().unsetFontSize().run();
      }}>
        <option value="">{pagina.tamanho}</option>
        {TAMANHOS.map((t) => <option key={t} value={String(t)}>{t}</option>)}
      </select>
      <B titulo="Negrito" ativo={s.b} onClick={() => c().toggleBold().run()}><Bold size={16} /></B>
      <B titulo="Itálico" ativo={s.i} onClick={() => c().toggleItalic().run()}><Italic size={16} /></B>
      <B titulo="Sublinhado" ativo={s.u} onClick={() => c().toggleUnderline().run()}><Underline size={16} /></B>
      <span className="sep" />
      <B titulo="Alinhar à esquerda" ativo={s.esq} onClick={() => c().setTextAlign("left").run()}><AlignLeft size={16} /></B>
      <B titulo="Centralizar" ativo={s.cen} onClick={() => c().setTextAlign("center").run()}><AlignCenter size={16} /></B>
      <B titulo="Alinhar à direita" ativo={s.dir} onClick={() => c().setTextAlign("right").run()}><AlignRight size={16} /></B>
      <B titulo="Justificar" ativo={s.jus} onClick={() => c().setTextAlign("justify").run()}><AlignJustify size={16} /></B>
      <B titulo="Recuo da primeira linha" ativo={s.recuo} onClick={() => c().alternarRecuo().run()}><IndentIncrease size={16} /></B>
      <B titulo="Marcadores" ativo={s.ul} onClick={() => c().toggleBulletList().run()}><List size={16} /></B>
      <B titulo="Numeração" ativo={s.ol} onClick={() => c().toggleOrderedList().run()}><ListOrdered size={16} /></B>
      <B titulo="Quebra de página" onClick={() => c().inserirQuebraPagina().run()}><SeparatorHorizontal size={16} /></B>
    </div>
  );
}
