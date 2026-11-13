import { Extension, Node, mergeAttributes } from "@tiptap/react";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    campo: { inserirCampo: (chave: string) => ReturnType };
    quebraPagina: { inserirQuebraPagina: () => ReturnType };
    paragrafo: {
      definirEspacamento: (valor: string | null) => ReturnType;
      alternarRecuo: () => ReturnType;
    };
  }
}

/** Campo preenchido automaticamente ({nome}, {cpf}...). Fica como um bloco único dentro do texto
 *  e herda a formatação aplicada (negrito, tamanho, fonte). */
export const Campo = Node.create({
  name: "campo",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      chave: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-campo") ?? "",
        renderHTML: (a) => ({ "data-campo": a.chave }),
      },
    };
  },
  parseHTML() {
    return [{ tag: "span[data-campo]" }];
  },
  renderHTML({ node, HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes, { class: "campo" }), `{${node.attrs.chave}}`];
  },
  renderText({ node }) {
    return `{${node.attrs.chave}}`;
  },
  addCommands() {
    return {
      inserirCampo:
        (chave) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: { chave } }),
    };
  },
});

/** Quebra de página manual. */
export const QuebraPagina = Node.create({
  name: "quebraPagina",
  group: "block",
  atom: true,
  selectable: true,
  parseHTML() {
    return [{ tag: "hr.quebra-pagina" }];
  },
  renderHTML() {
    return ["hr", { class: "quebra-pagina" }];
  },
  addCommands() {
    return {
      inserirQuebraPagina:
        () =>
        ({ chain }) =>
          chain().insertContent({ type: this.name }).insertContent({ type: "paragraph" }).run(),
    };
  },
});

const TIPOS = ["paragraph", "heading"];

/** Espaçamento entre linhas e recuo da primeira linha, por parágrafo. */
export const Paragrafo = Extension.create({
  name: "paragrafo",

  addGlobalAttributes() {
    return [
      {
        types: TIPOS,
        attributes: {
          espacamento: {
            default: null,
            parseHTML: (el) => el.style.lineHeight || null,
            renderHTML: (a) => (a.espacamento ? { style: `line-height: ${a.espacamento}` } : {}),
          },
          recuo: {
            default: false,
            parseHTML: (el) => !!el.style.textIndent && el.style.textIndent !== "0px",
            renderHTML: (a) => (a.recuo ? { style: "text-indent: 1.25cm" } : {}),
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      definirEspacamento:
        (valor) =>
        ({ commands }) => {
          TIPOS.forEach((t) => commands.updateAttributes(t, { espacamento: valor }));
          return true;
        },
      alternarRecuo:
        () =>
        ({ editor, commands }) => {
          const atual = !!(editor.getAttributes("paragraph").recuo || editor.getAttributes("heading").recuo);
          TIPOS.forEach((t) => commands.updateAttributes(t, { recuo: !atual }));
          return true;
        },
    };
  },
});
