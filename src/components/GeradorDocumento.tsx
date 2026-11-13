"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, CheckCircle2, Loader2, PenLine, Printer, RotateCw, Wand2 } from "lucide-react";
import { Modal } from "./Shell";
import { useAuth } from "./AuthProvider";
import { useColecao } from "@/lib/db";
import { dadosParaModelo } from "@/lib/modelos";
import { ehModeloEditor, montarDocumento, paginaDo, preencherCampos, type PaginaModelo } from "@/lib/documento";
import EditarDocumento from "./editor/EditarDocumento";
import GeradorFormulario from "./GeradorFormulario";
import { FORMULARIOS_PDF } from "@/lib/formulariosPdf";
import { excluirDocumento, salvarDocumentoGerado } from "@/lib/arquivos";
import { gerarPdf } from "@/lib/pdf";
import { mensagemErro } from "@/lib/firebase";
import { useEmpresa } from "@/lib/empresa";
import type { Cliente, Documento, Modelo, Processo } from "@/lib/mock";

const nomeArquivo = (s: string) => s.replace(/[\\/:*?"<>|]+/g, "-").trim();

type Situacao = "gerando" | "salvo" | "falhou";

export default function GeradorDocumento({ onClose, clienteId, modeloId }: { onClose: () => void; clienteId?: string; modeloId?: string }) {
  const { usuario, pode } = useAuth();
  const { dados: todos, carregando: cm } = useColecao<Modelo>("modelos", { campo: "nome" });
  const { dados: clientes } = useColecao<Cliente>("clientes", { campo: "nome" });
  const { dados: processos } = useColecao<Processo>("processos", undefined, pode("Processos"));
  const modelos = todos.filter(ehModeloEditor);
  const { empresa } = useEmpresa();

  const [mId, setMId] = useState(modeloId ?? "");
  const [cId, setCId] = useState(clienteId ?? "");
  const [pId, setPId] = useState("");
  const [html, setHtml] = useState("");          // documento preenchido e paginado
  const [vazios, setVazios] = useState<string[]>([]);
  const [situacao, setSituacao] = useState<Situacao>("gerando");
  const [falha, setFalha] = useState("");
  const [pdf, setPdf] = useState<Blob | null>(null);
  const [tentativa, setTentativa] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [conteudo, setConteudo] = useState("");                 // texto preenchido (editável só neste documento)
  const [paginaFinal, setPaginaFinal] = useState<PaginaModelo | null>(null);
  const [editando, setEditando] = useState(false);
  const editado = useRef(false);
  const salvo = useRef<{ id: string; caminho: string } | null>(null); // versão já salva no cliente (substituída ao editar)

  const [formPdfAberto, setFormPdfAberto] = useState(false);
  const formPdf = mId.startsWith("pdf:") ? FORMULARIOS_PDF.find((f) => `pdf:${f.id}` === mId) : undefined; // formulário oficial (PDF original)
  const modelo = modelos.find((m) => m.id === mId);
  const cliente = clientes.find((c) => c.id === cId);
  const doCliente = processos.filter((p) => p.cliente === cliente?.nome);
  const titulo = modelo && cliente ? nomeArquivo(`${modelo.nome} - ${cliente.nome}`) : "documento";

  useEffect(() => { if (!mId && !modeloId && modelos.length === 1) setMId(modelos[0].id); }, [modelos, mId, modeloId]);
  useEffect(() => { setPId(""); }, [cId]);

  const gerar = () => {
    if (!modelo || !cliente) return;
    const processo = processos.find((p) => p.id === pId) ?? null;
    const dados = dadosParaModelo(cliente, processo, usuario, empresa);
    const pg = paginaDo(modelo);
    const r = preencherCampos(modelo.html ?? "", dados);
    const topo = preencherCampos(pg.textoTopo ?? "", dados);
    const rodape = preencherCampos(pg.textoRodape ?? "", dados);
    setVazios(Array.from(new Set([...r.vazios, ...topo.vazios, ...rodape.vazios])));
    const pgFinal = { ...pg, textoTopo: topo.html, textoRodape: rodape.html };
    setConteudo(r.html);
    setPaginaFinal(pgFinal);
    editado.current = false;
    salvo.current = null;
    setHtml(montarDocumento(r.html, pgFinal, titulo));
    setPdf(null);
    setTentativa((t) => t + 1);
  };

  // Gera o PDF no servidor e salva em "Documentos gerados" do cliente.
  useEffect(() => {
    if (!html || !modelo || !cliente || !tentativa) return;
    let cancelado = false;
    setSituacao("gerando"); setFalha("");
    (async () => {
      try {
        const arquivo = await gerarPdf(html);
        if (cancelado) return;
        setPdf(arquivo);
        const novo = await salvarDocumentoGerado(cliente, arquivo, titulo, modelo.categoria, modelo.id, usuario?.nome ?? "",
          { conteudo, paginaDoc: paginaFinal ?? undefined, editado: editado.current });
        // Ao editar, a versão nova substitui a anterior (não fica duplicado no cliente).
        if (salvo.current) await excluirDocumento({ id: salvo.current.id, caminho: salvo.current.caminho } as Documento).catch(() => {});
        salvo.current = novo;
        if (!cancelado) setSituacao("salvo");
      } catch (e) {
        if (cancelado) return;
        setFalha((e as { code?: string }).code ? mensagemErro(e) : (e as Error).message);
        setSituacao("falhou");
      }
    })();
    return () => { cancelado = true; };
  }, [tentativa]); // eslint-disable-line react-hooks/exhaustive-deps

  const imprimir = () => {
    if (pdf) {
      window.open(URL.createObjectURL(pdf), "_blank"); // abre no visualizador de PDF do navegador, pronto para imprimir
      return;
    }
    const w = iframeRef.current?.contentWindow;
    if (w) { w.focus(); w.print(); }
  };

  const aplicarEdicao = (novoConteudo: string) => {
    if (!paginaFinal) return;
    editado.current = true;
    setConteudo(novoConteudo);
    setHtml(montarDocumento(novoConteudo, paginaFinal, titulo));
    setPdf(null);
    setEditando(false);
    setTentativa((t) => t + 1);
  };

  if (formPdfAberto && formPdf && cliente) {
    const processo = processos.find((p) => p.id === pId) ?? null;
    return <GeradorFormulario form={formPdf} cliente={cliente} onVoltar={() => setFormPdfAberto(false)} onClose={onClose}
      dados={{ c: cliente, p: processo, d: dadosParaModelo(cliente, processo, usuario, empresa), hoje: new Date() }} />;
  }

  if (html && editando && paginaFinal) {
    return <EditarDocumento titulo={titulo} conteudo={conteudo} pagina={paginaFinal} onCancelar={() => setEditando(false)} onAplicar={aplicarEdicao} />;
  }

  if (html) {
    return (
      <Modal wide titulo={titulo} sub="Pré-visualização exata do documento" onClose={onClose}
        footer={<>
          <button className="btn" style={{ marginRight: "auto" }} onClick={() => setHtml("")}><ArrowLeft size={16} /> Voltar</button>
          <button className="btn" onClick={() => setEditando(true)} disabled={situacao === "gerando"}><PenLine size={16} /> Editar este documento</button>
          <button className="btn btn-primary" onClick={imprimir} disabled={situacao === "gerando"}><Printer size={16} /> Imprimir</button>
        </>}>
        {situacao === "gerando" && (
          <div className="aviso info"><Loader2 size={16} className="girar" /><div>Gerando o PDF e salvando no perfil do cliente... A primeira geração do dia pode levar alguns segundos.</div></div>
        )}
        {situacao === "salvo" && (
          <div className="aviso ok"><CheckCircle2 size={16} />
            <div>PDF salvo em <b>Documentos gerados</b> de {cliente?.nome}.{" "}
              {cliente && <Link className="link" href={`/clientes/ver?id=${cliente.id}&aba=gerados`} onClick={onClose}>Ver no perfil</Link>}</div>
          </div>
        )}
        {situacao === "falhou" && (
          <div className="aviso"><AlertTriangle size={16} />
            <div>Não foi possível gerar e salvar o PDF agora ({falha}). Você ainda pode imprimir pela pré-visualização.{" "}
              <button className="link" style={{ background: "none", border: 0, padding: 0 }} onClick={() => setTentativa((t) => t + 1)}><RotateCw size={12} /> Tentar de novo</button></div>
          </div>
        )}
        {vazios.length > 0 && (
          <div className="aviso"><AlertTriangle size={16} /><div>Campos sem informação no cadastro (ficaram em branco): <b>{vazios.map((k) => `{${k}}`).join(", ")}</b></div></div>
        )}
        <iframe ref={iframeRef} className="previa-doc" srcDoc={html} title="Pré-visualização do documento" />
      </Modal>
    );
  }

  return (
    <Modal titulo="Gerar documento" sub="Preenche o modelo com os dados do cliente e salva o PDF no perfil dele" onClose={onClose}
      footer={<>
        <button className="btn" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" disabled={!(modelo || formPdf) || !cliente} onClick={() => (formPdf ? setFormPdfAberto(true) : gerar())}><Wand2 size={16} /> Gerar</button>
      </>}>
      <div className="form-grid">
        <div className="field span-2"><label>Modelo</label>
          <select className="select" value={mId} onChange={(e) => setMId(e.target.value)}>
            <option value="">{cm ? "Carregando..." : "Selecione..."}</option>
            {modelos.length > 0 && (
              <optgroup label="Modelos do escritório">
                {modelos.map((m) => <option key={m.id} value={m.id}>{m.nome} ({m.categoria})</option>)}
              </optgroup>
            )}
            <optgroup label="Formulários oficiais (PDF original do banco)">
              {FORMULARIOS_PDF.map((f) => <option key={f.id} value={`pdf:${f.id}`}>{f.nome}</option>)}
            </optgroup>
          </select></div>
        <div className="field span-2"><label>Cliente</label>
          <select className="select" value={cId} onChange={(e) => setCId(e.target.value)}>
            <option value="">Selecione...</option>
            {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select></div>
        {pode("Processos") && (
          <div className="field span-2"><label>Processo (opcional — preenche os campos de processo)</label>
            <select className="select" value={pId} onChange={(e) => setPId(e.target.value)} disabled={!cliente}>
              <option value="">Nenhum</option>
              {doCliente.map((p) => <option key={p.id} value={p.id}>{p.numero} — {p.area}</option>)}
            </select></div>
        )}
      </div>
    </Modal>
  );
}
