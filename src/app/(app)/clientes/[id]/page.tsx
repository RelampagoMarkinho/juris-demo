"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Eye, Handshake, Plus, Mail, Pencil, Phone, Printer, Trash2, Upload, Wand2 } from "lucide-react";
import { Badge, IconeArquivo } from "@/components/ui";
import { useAuth } from "@/components/AuthProvider";
import FormCliente from "@/components/FormCliente";
import GeradorDocumento from "@/components/GeradorDocumento";
import { ListaParcelamentos } from "@/components/Parcelamentos";
import EditarDocumento from "@/components/editor/EditarDocumento";
import { montarDocumento, PAGINA_PADRAO } from "@/lib/documento";
import { gerarPdf } from "@/lib/pdf";
import { DetalheProcesso, NovoProcesso } from "@/components/Processos";
import { excluir, useColecao } from "@/lib/db";
import { mensagemErro } from "@/lib/firebase";
import { abrirDocumento, enviarDocumentoCliente, excluirDocumento, LIMITE_ARQUIVO_MB, salvarDocumentoGerado } from "@/lib/arquivos";
import { enderecoCompleto } from "@/lib/modelos";
import { idade } from "@/lib/aniversarios";
import { brl, CATEGORIAS_DOC, dataBR, iniciais, type Cliente, type Corretor, type Documento, type Lancamento, type Processo } from "@/lib/mock";

type Aba = "dados" | "documentos" | "gerados" | "processos" | "financeiro";

export default function PerfilCliente() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { usuario, pode, podeFazer } = useAuth();
  const { dados: clientes, carregando } = useColecao<Cliente>("clientes");
  const { dados: todosDocs } = useColecao<Documento>("documentos", { campo: "data", desc: true });
  const { dados: processos } = useColecao<Processo>("processos", undefined, pode("Processos"));
  const { dados: corretores } = useColecao<Corretor>("corretores", undefined, pode("Corretores"));
  const { dados: lancamentos } = useColecao<Lancamento>("lancamentos", undefined, pode("Financeiro"));
  const [aba, setAba] = useState<Aba>("dados");
  useEffect(() => {
    const a = new URLSearchParams(window.location.search).get("aba");
    if (a === "documentos" || a === "gerados" || a === "processos" || a === "financeiro") setAba(a);
  }, []);
  const [editando, setEditando] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [novoProc, setNovoProc] = useState(false);
  const [procAberto, setProcAberto] = useState<string | null>(null);

  const c = clientes.find((x) => x.id === id);
  if (carregando) return <div className="card empty">Carregando...</div>;
  if (!c) return <div className="card empty">Cliente não encontrado. <Link className="link" href="/clientes">Voltar</Link></div>;

  const docs = todosDocs.filter((d) => d.clienteId === c.id);
  const enviados = docs.filter((d) => d.origem !== "gerado");
  const gerados = docs.filter((d) => d.origem === "gerado");
  const procs = processos.filter((p) => p.clienteId === c.id || p.cliente === c.nome);

  const remover = async () => {
    if (docs.length) return alert("Exclua os documentos deste cliente antes de excluir o cadastro.");
    if (!confirm(`Excluir o cliente "${c.nome}"? Esta ação não pode ser desfeita.`)) return;
    try {
      await excluir("clientes", c.id);
      router.replace("/clientes");
    } catch (e) {
      alert(mensagemErro(e));
    }
  };

  return (
    <>
      <Link href="/clientes" className="voltar"><ArrowLeft size={16} /> Clientes</Link>

      <section className="card perfil-head">
        <span className="avatar lg">{iniciais(c.nome)}</span>
        <div className="perfil-info">
          <h2>{c.nome}</h2>
          <div className="perfil-meta">
            <Badge>{c.status}</Badge>
            <span>{c.tipo === "PF" ? "Pessoa física" : "Pessoa jurídica"}</span>
            {c.documento && <span className="mono">{c.documento}</span>}
            {c.email && <span><Mail size={13} /> {c.email}</span>}
            {c.telefone && <span><Phone size={13} /> {c.telefone}</span>}
            {c.corretorId && corretores.find((k) => k.id === c.corretorId) && (
              <span><Handshake size={13} /> Indicado por <b>{corretores.find((k) => k.id === c.corretorId)!.nome}</b></span>
            )}
          </div>
        </div>
        <div className="perfil-acoes">
          {podeFazer("clientes_editar") && <button className="btn" onClick={() => setEditando(true)}><Pencil size={15} /> Editar</button>}
          {podeFazer("clientes_gerar") && <button className="btn btn-primary" onClick={() => setGerando(true)}><Wand2 size={15} /> Gerar documento</button>}
          {podeFazer("clientes_excluir") && <button className="icon-btn sm" aria-label="Excluir cliente" onClick={remover}><Trash2 size={15} /></button>}
        </div>
      </section>

      <div className="tabs">
        <button className={aba === "dados" ? "on" : ""} onClick={() => setAba("dados")}>Dados cadastrais</button>
        <button className={aba === "documentos" ? "on" : ""} onClick={() => setAba("documentos")}>Documentos anexados <span className="count">{enviados.length}</span></button>
        <button className={aba === "gerados" ? "on" : ""} onClick={() => setAba("gerados")}>Documentos gerados <span className="count">{gerados.length}</span></button>
        {pode("Processos") && (
          <button className={aba === "processos" ? "on" : ""} onClick={() => setAba("processos")}>Processos <span className="count">{procs.length}</span></button>
        )}
        {pode("Financeiro") && (
          <button className={aba === "financeiro" ? "on" : ""} onClick={() => setAba("financeiro")}>Pagamentos</button>
        )}
      </div>

      {aba === "dados" && <DadosCliente c={c} />}
      {aba === "documentos" && <DocumentosCliente c={c} docs={enviados} enviadoPor={usuario?.nome ?? ""} />}
      {aba === "gerados" && (
        <DocumentosGerados c={c} docs={gerados} anexados={enviados} enviadoPor={usuario?.nome ?? ""} onGerar={() => setGerando(true)} />
      )}
      {aba === "processos" && (
        <section className="card">
          <div className="toolbar">
            <h3 style={{ fontSize: 17, fontWeight: 500 }}>Processos do cliente</h3>
            {podeFazer("processos_criar") && <button className="btn btn-primary" onClick={() => setNovoProc(true)}><Plus size={16} /> Novo processo</button>}
          </div>
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>Número</th><th>Área</th><th>Vara</th><th>Prazo</th><th>Valor</th><th>Status</th></tr></thead>
              <tbody>
                {procs.map((p) => (
                  <tr key={p.id} className="click" onClick={() => setProcAberto(p.id)}>
                    <td className="mono">{p.numero}</td><td>{p.area}</td><td>{p.vara}</td>
                    <td className="num">{dataBR(p.proximoPrazo)}</td>
                    <td className="num">{p.valorCausa ? brl(p.valorCausa) : "—"}</td>
                    <td><Badge>{p.status}</Badge></td>
                  </tr>
                ))}
                {procs.length === 0 && <tr><td colSpan={6} className="empty">Nenhum processo deste cliente.{podeFazer("processos_criar") && " Clique em “Novo processo” para cadastrar."}</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {aba === "financeiro" && pode("Financeiro") && (
        <ListaParcelamentos titulo="Parcelamentos do cliente" cliente={c}
          lancamentos={lancamentos.filter((l) => l.clienteId === c.id || l.cliente === c.nome)} />
      )}

      {editando && <FormCliente inicial={c} onClose={() => setEditando(false)} />}
      {gerando && <GeradorDocumento clienteId={c.id} onClose={() => setGerando(false)} />}
      {novoProc && <NovoProcesso clienteFixo={c} onClose={() => setNovoProc(false)} />}
      {procAberto && procs.find((p) => p.id === procAberto) && (
        <DetalheProcesso p={procs.find((p) => p.id === procAberto)!} onClose={() => setProcAberto(null)} />
      )}
    </>
  );
}

function Campo({ rotulo, valor }: { rotulo: string; valor?: string }) {
  return <div><span>{rotulo}</span><strong>{valor || "—"}</strong></div>;
}

function DadosCliente({ c }: { c: Cliente }) {
  return (
    <div className="grid-2 even">
      <section className="card">
        <div className="card-head"><h3>{c.tipo === "PF" ? "Dados pessoais" : "Dados da empresa"}</h3></div>
        <div className="kv">
          <Campo rotulo={c.tipo === "PF" ? "CPF" : "CNPJ"} valor={c.documento} />
          <Campo rotulo="Cliente desde" valor={dataBR(c.desde)} />
          {c.tipo === "PF" && <>
            <Campo rotulo="RG" valor={c.rg} />
            <Campo rotulo="Órgão emissor" valor={c.orgaoEmissor} />
            <Campo rotulo="Data de emissão" valor={c.dataEmissaoRg ? dataBR(c.dataEmissaoRg) : ""} />
            <Campo rotulo="Data de nascimento" valor={c.dataNascimento ? `${dataBR(c.dataNascimento)} (${idade(c.dataNascimento)} anos)` : ""} />
            <Campo rotulo="Estado civil" valor={c.estadoCivil} />
            <Campo rotulo="Sexo" valor={c.sexo} />
            <Campo rotulo="Nacionalidade" valor={c.nacionalidade} />
            <Campo rotulo="Profissão" valor={c.profissao} />
          </>}
          <Campo rotulo="E-mail" valor={c.email} />
          <Campo rotulo="Telefone" valor={c.telefone} />
        </div>
      </section>
      <section className="card">
        <div className="card-head"><h3>Endereço</h3></div>
        <div className="kv">
          <Campo rotulo="CEP" valor={c.cep} />
          <Campo rotulo="Rua" valor={c.rua} />
          <Campo rotulo="Número" valor={c.numero} />
          <Campo rotulo="Complemento" valor={c.complemento} />
          <Campo rotulo="Bairro" valor={c.bairro} />
          <Campo rotulo="Cidade/UF" valor={[c.cidade, c.uf].filter(Boolean).join("/")} />
        </div>
        <div className="muted" style={{ fontSize: 12.5 }}>{enderecoCompleto(c)}</div>
      </section>
      {c.observacoes?.trim() && (
        <section className="card" style={{ gridColumn: "1 / -1" }}>
          <div className="card-head"><h3>Observações</h3></div>
          <p style={{ margin: 0, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{c.observacoes}</p>
        </section>
      )}
      {c.tipo === "PF" && (c.representante || c.rogado || (c.capacidade && c.capacidade !== "Capaz")) && (
        <section className="card" style={{ gridColumn: "1 / -1" }}>
          <div className="card-head"><h3>Capacidade e representação</h3></div>
          <div className="kv">
            <Campo rotulo="Capacidade civil" valor={c.capacidade ?? "Capaz"} />
            {c.representante && <>
              <Campo rotulo={`Representante (${c.representante.tipo})`} valor={c.representante.nome} />
              <Campo rotulo="CPF do representante" valor={c.representante.cpf} />
              <Campo rotulo="RG do representante" valor={[c.representante.rg, c.representante.orgaoEmissor].filter(Boolean).join(" ")} />
              <Campo rotulo="Estado civil / profissão" valor={[c.representante.estadoCivil, c.representante.profissao].filter(Boolean).join(" · ")} />
              <Campo rotulo="Telefone do representante" valor={c.representante.telefone} />
              <Campo rotulo="Endereço do representante" valor={c.representante.mesmoEndereco === false ? c.representante.endereco : "Mesmo do cliente"} />
            </>}
            {c.rogado && <>
              <Campo rotulo="Assina a rogo (rogado)" valor={c.rogado.nome} />
              <Campo rotulo="RG / CPF do rogado" valor={[c.rogado.rg, c.rogado.cpf].filter(Boolean).join(" · ")} />
            </>}
          </div>
        </section>
      )}
    </div>
  );
}

function DocumentosCliente({ c, docs, enviadoPor }: { c: Cliente; docs: Documento[]; enviadoPor: string }) {
  const { podeFazer } = useAuth();
  const podeAnexar = podeFazer("clientes_anexar");
  const [categoria, setCategoria] = useState(CATEGORIAS_DOC[0]);
  const [envios, setEnvios] = useState<{ nome: string; pct: number }[]>([]);
  const [erro, setErro] = useState("");
  const [arrastando, setArrastando] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const enviar = async (files: FileList | null) => {
    if (!files?.length) return;
    setErro("");
    for (const f of Array.from(files)) {
      setEnvios((l) => [...l, { nome: f.name, pct: 0 }]);
      try {
        await enviarDocumentoCliente(c, f, categoria, enviadoPor, (pct) =>
          setEnvios((l) => l.map((x) => (x.nome === f.name ? { ...x, pct } : x))));
      } catch (e) {
        setErro(`${f.name}: ${mensagemErro(e)}`);
      } finally {
        setEnvios((l) => l.filter((x) => x.nome !== f.name));
      }
    }
  };

  const exec = async (fn: () => Promise<void>) => { try { await fn(); } catch (e) { alert(mensagemErro(e)); } };

  return (
    <section className="card">
      <div className="toolbar">
        <h3 style={{ fontSize: 17, fontWeight: 500 }}>Documentos anexados <span className="muted" style={{ fontSize: 13 }}>· RG, CPF, documentos assinados...</span></h3>
        {podeAnexar && <div className="toolbar-right">
          <select className="select" style={{ width: 230, height: 40 }} value={categoria} onChange={(e) => setCategoria(e.target.value)} aria-label="Categoria do documento">
            {CATEGORIAS_DOC.map((x) => <option key={x}>{x}</option>)}
          </select>
          <button className="btn btn-primary" onClick={() => inputRef.current?.click()}><Upload size={16} /> Anexar documentos</button>
          <input ref={inputRef} type="file" multiple hidden accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.doc,.docx,.xls,.xlsx,.txt"
            onChange={(e) => { enviar(e.target.files); e.target.value = ""; }} />
        </div>}
      </div>

      {podeAnexar && <div className={`dropzone ${arrastando ? "over" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setArrastando(true); }}
        onDragLeave={() => setArrastando(false)}
        onDrop={(e) => { e.preventDefault(); setArrastando(false); enviar(e.dataTransfer.files); }}>
        <Upload size={20} style={{ marginBottom: 4 }} />
        <div>Arraste arquivos aqui para enviar como <b>{categoria}</b></div>
        <div style={{ fontSize: 12, marginTop: 4 }}>PDF, imagens, Word ou Excel — até {LIMITE_ARQUIVO_MB} MB por arquivo</div>
      </div>}

      {envios.map((e) => (
        <div key={e.nome} className="progresso">
          <span>{e.nome}</span>
          <div><i style={{ width: `${e.pct}%` }} /></div>
          <span className="num">{e.pct}%</span>
        </div>
      ))}
      {erro && <div className="error" style={{ marginBottom: 12 }}>{erro}</div>}

      <div className="table-wrap">
        <table className="tbl">
          <thead><tr><th>Arquivo</th><th>Categoria</th><th>Tamanho</th><th>Enviado em</th><th>Por</th><th></th></tr></thead>
          <tbody>
            {docs.map((d) => (
              <tr key={d.id}>
                <td><div className="who"><span className="thumb" style={{ width: 40 }}><IconeArquivo tipo={d.tipo} /></span>{d.nome}</div></td>
                <td><span className="badge">{d.categoria}</span></td>
                <td className="num">{d.tamanho}</td>
                <td className="num">{dataBR(d.data)}</td>
                <td>{d.enviadoPor || "—"}</td>
                <td>
                  <div className="card-actions">
                    <button className="icon-btn sm" aria-label="Visualizar" title="Visualizar / baixar" onClick={() => exec(() => abrirDocumento(d))}><Eye size={15} /></button>
                    {podeFazer("clientes_excluir_anexo") && (
                      <button className="icon-btn sm" aria-label="Excluir" onClick={() => confirm(`Excluir "${d.nome}"?`) && exec(() => excluirDocumento(d))}><Trash2 size={15} /></button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {docs.length === 0 && <tr><td colSpan={6} className="empty">Nenhum documento enviado para este cliente.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function DocumentosGerados({ c, docs, anexados, enviadoPor, onGerar }: {
  c: Cliente; docs: Documento[]; anexados: Documento[]; enviadoPor: string; onGerar: () => void;
}) {
  const { podeFazer } = useAuth();
  const podeAssinado = podeFazer("clientes_anexar_assinado");
  const exec = async (fn: () => Promise<void>) => { try { await fn(); } catch (e) { alert(mensagemErro(e)); } };
  const inputRef = useRef<HTMLInputElement>(null);
  const [alvo, setAlvo] = useState<Documento | null>(null); // documento gerado que recebe a via assinada
  const [editandoDoc, setEditandoDoc] = useState<Documento | null>(null);
  const [aplicando, setAplicando] = useState(false);

  // Gera de novo só este documento com o texto alterado; a versão anterior é substituída.
  const aplicarEdicao = async (d: Documento, conteudo: string) => {
    setAplicando(true);
    try {
      const pagina = d.paginaDoc ?? PAGINA_PADRAO;
      const nome = d.nome.replace(/\.pdf$/i, "");
      const pdf = await gerarPdf(montarDocumento(conteudo, pagina, nome));
      await salvarDocumentoGerado(c, pdf, nome, d.categoria, d.modeloId ?? "", enviadoPor, { conteudo, paginaDoc: pagina, editado: true });
      await excluirDocumento(d);
      setEditandoDoc(null);
    } catch (e) {
      alert((e as { code?: string }).code ? mensagemErro(e) : (e as Error).message);
    } finally {
      setAplicando(false);
    }
  };
  const [enviando, setEnviando] = useState<string | null>(null);

  const assinadoDe = (d: Documento) => anexados.find((x) => x.assinadoDe === d.id);
  const escolher = (d: Documento | null) => { setAlvo(d); setTimeout(() => inputRef.current?.click(), 0); };

  const anexar = async (files: FileList | null) => {
    if (!files?.length) return;
    for (const f of Array.from(files)) {
      const ext = f.name.includes(".") ? f.name.slice(f.name.lastIndexOf(".")) : "";
      setEnviando(alvo?.id ?? "geral");
      await exec(() => enviarDocumentoCliente(c, f, "Documento assinado", enviadoPor, undefined,
        alvo ? { nome: `${alvo.nome.replace(/\.pdf$/i, "")} (assinado)${ext}`, assinadoDe: alvo.id } : undefined));
    }
    setEnviando(null);
    setAlvo(null);
  };

  return (
    <section className="card">
      <div className="toolbar">
        <h3 style={{ fontSize: 17, fontWeight: 500 }}>Documentos gerados por modelo</h3>
        <div className="toolbar-right">
          {podeAssinado && (
            <button className="btn" onClick={() => escolher(null)} disabled={!!enviando}>
              <Upload size={16} /> {enviando === "geral" ? "Anexando..." : "Anexar documento assinado"}
            </button>
          )}
          {podeFazer("clientes_gerar") && <button className="btn btn-primary" onClick={onGerar}><Wand2 size={16} /> Gerar documento</button>}
        </div>
      </div>
      <input ref={inputRef} type="file" hidden multiple accept=".pdf,.jpg,.jpeg,.png,.webp,.heic"
        onChange={(e) => { anexar(e.target.files); e.target.value = ""; }} />
      <div className="table-wrap">
        <table className="tbl">
          <thead><tr><th>Documento</th><th>Tipo</th><th>Gerado em</th><th>Por</th><th>Assinado</th><th></th></tr></thead>
          <tbody>
            {docs.map((d) => {
              const via = assinadoDe(d);
              return (
                <tr key={d.id}>
                  <td><div className="who"><span className="thumb" style={{ width: 40 }}><IconeArquivo tipo="pdf" /></span>
                    <div>{d.nome}{d.editado && <small>texto alterado neste documento</small>}</div></div></td>
                  <td><span className="badge">{d.categoria}</span></td>
                  <td className="num">{dataBR(d.data)}</td>
                  <td>{d.enviadoPor || "—"}</td>
                  <td>
                    {via ? (
                      <button className="badge pos" style={{ border: 0, cursor: "pointer" }} title="Ver a via assinada" onClick={() => exec(() => abrirDocumento(via))}>
                        ✓ Assinado
                      </button>
                    ) : podeAssinado ? (
                      <button className="btn" style={{ height: 30, padding: "0 10px", fontSize: 12.5 }} disabled={!!enviando} onClick={() => escolher(d)}>
                        <Upload size={13} /> {enviando === d.id ? "Anexando..." : "Anexar assinado"}
                      </button>
                    ) : <span className="muted">—</span>}
                  </td>
                  <td>
                    <div className="card-actions">
                      <button className="btn" style={{ height: 32, padding: "0 12px" }} onClick={() => exec(() => abrirDocumento(d))}>
                        <Printer size={14} /> Ver / imprimir
                      </button>
                      {d.conteudo && !via && podeFazer("clientes_editar_gerado") && (
                        <button className="icon-btn sm" aria-label="Editar este documento" title="Editar o texto só deste documento" onClick={() => setEditandoDoc(d)}>
                          <Pencil size={15} />
                        </button>
                      )}
                      {podeFazer("clientes_excluir_gerado") && (
                        <button className="icon-btn sm" aria-label="Excluir" onClick={() => confirm(`Excluir "${d.nome}"?`) && exec(() => excluirDocumento(d))}><Trash2 size={15} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {docs.length === 0 && <tr><td colSpan={6} className="empty">Nenhum documento gerado para este cliente ainda.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="muted" style={{ fontSize: 12.5, margin: "12px 0 0" }}>
        Depois que o cliente assinar, escaneie ou fotografe o documento e use <b>Anexar assinado</b>. A via assinada fica em <b>Documentos anexados</b>.
        Para corrigir ou acrescentar texto antes da assinatura, use o lápis (<b>Editar</b>) — o modelo original não muda.
      </p>
      {editandoDoc && editandoDoc.conteudo && (
        <EditarDocumento titulo={editandoDoc.nome.replace(/\.pdf$/i, "")} conteudo={editandoDoc.conteudo}
          pagina={editandoDoc.paginaDoc ?? PAGINA_PADRAO} aplicando={aplicando}
          onCancelar={() => setEditandoDoc(null)} onAplicar={(html) => aplicarEdicao(editandoDoc, html)} />
      )}
    </section>
  );
}
