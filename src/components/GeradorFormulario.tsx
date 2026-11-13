"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, CheckCircle2, Loader2, Printer, Wand2 } from "lucide-react";
import { Modal } from "./Shell";
import { useAuth } from "./AuthProvider";
import { excluirDocumento, salvarDocumentoGerado } from "@/lib/arquivos";
import { mensagemErro } from "@/lib/firebase";
import { limitesFormulario, preencherFormulario, valoresIniciais, type FormularioPdf, type ValoresPdf } from "@/lib/formulariosPdf";
import type { Cliente, Documento } from "@/lib/mock";

const nomeArquivo = (s: string) => s.replace(/[\\/:*?"<>|]+/g, "-").trim();

/** Formulário oficial em PDF: confere/completa os dados na tela, preenche o PDF original e salva no cliente. */
export default function GeradorFormulario({ form, cliente, dados, onVoltar, onClose }: {
  form: FormularioPdf; cliente: Cliente; dados: Parameters<typeof valoresIniciais>[1]; onVoltar: () => void; onClose: () => void;
}) {
  const { usuario } = useAuth();
  const [valores, setValores] = useState<ValoresPdf>(() => valoresIniciais(form, dados));
  const [pdf, setPdf] = useState<{ blob: Blob; url: string } | null>(null);
  const [situacao, setSituacao] = useState<"" | "gerando" | "salvo" | "falhou">("");
  const [falha, setFalha] = useState("");
  const [salvo, setSalvo] = useState<{ id: string; caminho: string } | null>(null);
  const [limites, setLimites] = useState<Record<string, number>>({});
  const titulo = nomeArquivo(`${form.nome} - ${cliente.nome}`);
  useEffect(() => { limitesFormulario(form).then(setLimites).catch(() => {}); }, [form]);

  const grupos = useMemo(() => {
    const m = new Map<string, FormularioPdf["campos"]>();
    form.campos.forEach((c) => m.set(c.grupo, [...(m.get(c.grupo) ?? []), c]));
    return Array.from(m.entries());
  }, [form]);

  const gerar = async () => {
    setSituacao("gerando"); setFalha("");
    try {
      const blob = await preencherFormulario(form, valores);
      setPdf({ blob, url: URL.createObjectURL(blob) });
      const novo = await salvarDocumentoGerado(cliente, blob, titulo, form.categoria, `pdf:${form.id}`, usuario?.nome ?? "");
      // Gerou de novo depois de alterar: a versão nova substitui a anterior.
      if (salvo) await excluirDocumento({ id: salvo.id, caminho: salvo.caminho } as Documento).catch(() => {});
      setSalvo(novo);
      setSituacao("salvo");
    } catch (e) {
      setFalha((e as { code?: string }).code ? mensagemErro(e) : (e as Error).message);
      setSituacao("falhou");
    }
  };

  if (pdf) {
    return (
      <Modal wide titulo={titulo} sub="PDF original do formulário, preenchido" onClose={onClose}
        footer={<>
          <button className="btn" style={{ marginRight: "auto" }} onClick={() => setPdf(null)}><ArrowLeft size={16} /> Alterar dados</button>
          <button className="btn btn-primary" onClick={() => window.open(pdf.url, "_blank")}><Printer size={16} /> Imprimir</button>
        </>}>
        {situacao === "gerando" && <div className="aviso info"><Loader2 size={16} className="girar" /><div>Salvando no perfil do cliente...</div></div>}
        {situacao === "salvo" && (
          <div className="aviso ok"><CheckCircle2 size={16} />
            <div>PDF salvo em <b>Documentos gerados</b> de {cliente.nome}.{" "}
              <Link className="link" href={`/clientes/${cliente.id}?aba=gerados`} onClick={onClose}>Ver no perfil</Link></div>
          </div>
        )}
        {situacao === "falhou" && <div className="aviso"><AlertTriangle size={16} /><div>Não foi possível salvar no cliente ({falha}). Você ainda pode imprimir.</div></div>}
        <iframe className="previa-doc" src={pdf.url} title="Formulário preenchido" />
      </Modal>
    );
  }

  return (
    <Modal wide titulo={form.nome} sub={`Confira e complete os dados de ${cliente.nome} — o PDF do banco é preenchido exatamente como está`} onClose={onClose}
      footer={<>
        <button className="btn" style={{ marginRight: "auto" }} onClick={onVoltar}><ArrowLeft size={16} /> Voltar</button>
        <button className="btn btn-primary" onClick={gerar} disabled={situacao === "gerando"}>
          {situacao === "gerando" ? <Loader2 size={16} className="girar" /> : <Wand2 size={16} />} Gerar PDF
        </button>
      </>}>
      {situacao === "falhou" && <div className="aviso"><AlertTriangle size={16} /><div>Não foi possível gerar o PDF ({falha}).</div></div>}
      {grupos.map(([grupo, campos]) => (
        <fieldset key={grupo} className="form-pdf-grupo">
          <legend>{grupo}</legend>
          <div className="form-grid">
            {campos.map((c) => c.tipo === "marcar" ? (
              <label key={c.campo} className="checkbox span-2">
                <input type="checkbox" checked={valores[c.campo] === true}
                  onChange={(e) => setValores((v) => ({ ...v, [c.campo]: e.target.checked }))} /> {c.rotulo}
              </label>
            ) : (
              <div key={c.campo} className={`field${c.largo ? " span-2" : ""}`}><label>{c.rotulo}</label>
                <input className="input" value={String(valores[c.campo] ?? "")} maxLength={limites[c.campo]}
                  onChange={(e) => setValores((v) => ({ ...v, [c.campo]: e.target.value }))} />
              </div>
            ))}
          </div>
        </fieldset>
      ))}
    </Modal>
  );
}
