"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, Info, Pencil, Plus, Search, Trash2, Wand2 } from "lucide-react";
import { IconeArquivo, StatCard } from "@/components/ui";
import { useAuth } from "@/components/AuthProvider";
import GeradorDocumento from "@/components/GeradorDocumento";
import { excluir, hojeISO, useColecao } from "@/lib/db";
import { mensagemErro } from "@/lib/firebase";
import { abrirDocumento, excluirArquivo, tamanhoLegivel } from "@/lib/arquivos";
import { ehModeloEditor } from "@/lib/documento";
import { CATEGORIAS_DOC, dataBR, type Documento, type Modelo } from "@/lib/mock";
import { MODELOS_PRONTOS } from "@/lib/modelosProntos";

export default function DocumentosPage() {
  const [aba, setAba] = useState<"modelos" | "clientes">("modelos");
  return (
    <>
      <div className="tabs" style={{ marginTop: 0 }}>
        <button className={aba === "modelos" ? "on" : ""} onClick={() => setAba("modelos")}>Modelos para emissão</button>
        <button className={aba === "clientes" ? "on" : ""} onClick={() => setAba("clientes")}>Documentos dos clientes</button>
      </div>
      {aba === "modelos" ? <Modelos /> : <DocumentosClientes />}
    </>
  );
}

/* ---------------------------- Modelos ---------------------------- */

function Modelos() {
  const { podeFazer } = useAuth();
  const podeEditar = podeFazer("documentos_modelos");
  const podeExcluir = podeFazer("documentos_excluir_modelo");
  const podeGerar = podeFazer("clientes_gerar");
  const { dados: modelos, carregando, erro } = useColecao<Modelo>("modelos", { campo: "nome" });
  const [gerarId, setGerarId] = useState<string | null>(null);
  const doEditor = modelos.filter(ehModeloEditor);
  const antigos = modelos.filter((m) => !ehModeloEditor(m));

  const remover = async (m: Modelo) => {
    if (!confirm(`Excluir o modelo "${m.nome}"? Os documentos já gerados com ele continuam salvos nos clientes.`)) return;
    try {
      const p = m.pagina;
      await Promise.all([p?.topo?.caminho, p?.rodape?.caminho, p?.fundo?.caminho, m.caminho].map((c) => excluirArquivo(c).catch(() => {})));
      await excluir("modelos", m.id);
    } catch (e) {
      alert(mensagemErro(e));
    }
  };

  return (
    <>
      <section className="card">
        <div className="card-head">
          <h3>Modelos de documentos</h3>
          <div className="card-actions">
            {podeGerar && <button className="btn" onClick={() => setGerarId("")}><Wand2 size={16} /> Gerar documento</button>}
            {podeEditar && <Link className="btn btn-primary" href="/documentos/modelo?id=novo"><Plus size={16} /> Novo modelo</Link>}
          </div>
        </div>
        <div className="aviso" style={{ marginBottom: 16 }}>
          <Info size={16} />
          <div>
            Monte o modelo no editor (texto, timbrado e campos como <b>Nome</b>, <b>CPF</b> e <b>Endereço</b>). Ao gerar, o sistema preenche
            com os dados do cliente e salva o PDF no perfil dele, em <b>Documentos gerados</b>.
          </div>
        </div>
        <div className="table-wrap">
          <table className="tbl" style={{ minWidth: 560 }}>
            <thead><tr><th>Modelo</th><th>Categoria</th><th>Atualizado</th><th></th></tr></thead>
            <tbody>
              {doEditor.map((m) => (
                <tr key={m.id}>
                  <td><div className="who"><span className="thumb" style={{ width: 40 }}><IconeArquivo tipo="docx" /></span>
                    <div>{m.nome}<small>{m.pagina?.topo || m.pagina?.fundo ? "Com timbrado" : "Sem timbrado"}</small></div></div></td>
                  <td><span className="badge">{m.categoria}</span></td>
                  <td className="num">{dataBR(m.data)}</td>
                  <td>
                    <div className="card-actions">
                      {podeGerar && <button className="btn" style={{ height: 32, padding: "0 12px" }} onClick={() => setGerarId(m.id)}><Wand2 size={14} /> Gerar</button>}
                      {podeEditar && <Link className="icon-btn sm" aria-label="Editar" title="Editar modelo" href={`/documentos/modelo?id=${m.id}`}><Pencil size={15} /></Link>}
                      {podeExcluir && <button className="icon-btn sm" aria-label="Excluir" onClick={() => remover(m)}><Trash2 size={15} /></button>}
                    </div>
                  </td>
                </tr>
              ))}
              {doEditor.length === 0 && (
                <tr><td colSpan={4} className="empty">
                  {carregando ? "Carregando..." : erro || (podeEditar ? "Nenhum modelo ainda. Clique em “Novo modelo” para montar o primeiro." : "Nenhum modelo cadastrado.")}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>

        {antigos.length > 0 && podeExcluir && (
          <div className="aviso" style={{ marginTop: 16, marginBottom: 0 }}>
            <Info size={16} />
            <div>
              <b>Modelos antigos em Word</b> (não são mais usados — recrie-os no editor):{" "}
              {antigos.map((m, i) => (
                <span key={m.id}>{i > 0 && ", "}{m.nome}{" "}
                  <button className="link" style={{ background: "none", border: 0, padding: 0, fontSize: 12 }} onClick={() => remover(m)}>(excluir)</button>
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      {podeEditar && (
        <section className="card" style={{ marginTop: 16 }}>
          <div className="card-head">
            <h3>Modelos prontos do escritório</h3>
            <span className="muted hide-sm" style={{ fontSize: 13 }}>Com o timbrado oficial — abra, confira e salve</span>
          </div>
          <div className="prontos">
            {MODELOS_PRONTOS.map((m) => {
              const jaExiste = doEditor.some((x) => x.nome.trim().toLowerCase() === m.nome.toLowerCase());
              return (
                <div key={m.id} className="pronto">
                  <span className="thumb" style={{ width: 40 }}><IconeArquivo tipo="docx" /></span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <strong>{m.nome}</strong> <span className="badge" style={{ height: 22, fontSize: 11 }}>{m.categoria}</span>
                    <p className="muted">{m.descricao}</p>
                  </div>
                  <Link className={`btn ${jaExiste ? "" : "btn-primary"}`} style={{ height: 34 }} href={`/documentos/modelo?id=novo&pronto=${m.id}`}>
                    <Plus size={15} /> {jaExiste ? "Criar outra cópia" : "Usar este modelo"}
                  </Link>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {gerarId !== null && <GeradorDocumento modeloId={gerarId || undefined} onClose={() => setGerarId(null)} />}
    </>
  );
}

/* ---------------------- Documentos dos clientes ---------------------- */

function DocumentosClientes() {
  const { dados: docs, carregando, erro } = useColecao<Documento>("documentos", { campo: "data", desc: true });
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState("");
  const [origem, setOrigem] = useState<"" | "enviado" | "gerado">("");

  const origemDe = (d: Documento) => d.origem ?? "enviado";
  const filtrados = docs.filter(
    (d) => (!categoria || d.categoria === categoria) && (!origem || origemDe(d) === origem)
      && `${d.nome} ${d.cliente}`.toLowerCase().includes(busca.toLowerCase()),
  );
  const mes = hojeISO().slice(0, 7);
  const bytes = docs.reduce((s, d) => s + (d.bytes ?? 0), 0);
  const exec = async (fn: () => Promise<void>) => { try { await fn(); } catch (e) { alert(mensagemErro(e)); } };

  return (
    <>
      <section className="stats">
        <StatCard hero label="Documentos arquivados" valor={String(docs.length)} />
        <StatCard label="Gerados por modelo" valor={String(docs.filter((d) => origemDe(d) === "gerado").length)} />
        <StatCard label="Enviados este mês" valor={String(docs.filter((d) => d.data?.startsWith(mes)).length)} />
        <StatCard label="Espaço utilizado" valor={tamanhoLegivel(bytes)} />
      </section>

      <section className="card">
        <div className="toolbar">
          <div className="pills">
            {([["", "Todos"], ["enviado", "Enviados"], ["gerado", "Gerados"]] as const).map(([v, r]) => (
              <button key={v} className={`pill ${origem === v ? "active" : ""}`} onClick={() => setOrigem(v)}
                style={origem === v ? undefined : { background: "var(--surface-2)" }}>{r}</button>
            ))}
          </div>
          <div className="toolbar-right">
            <select className="select" style={{ width: 210, height: 40 }} value={categoria} onChange={(e) => setCategoria(e.target.value)} aria-label="Filtrar categoria">
              <option value="">Todas as categorias</option>
              {Array.from(new Set([...CATEGORIAS_DOC, ...docs.map((d) => d.categoria).filter(Boolean)])).map((c) => <option key={c}>{c}</option>)}
            </select>
            <label className="search" style={{ background: "var(--surface-2)", display: "flex", width: 220 }}>
              <Search size={16} />
              <input placeholder="Arquivo ou cliente..." value={busca} onChange={(e) => setBusca(e.target.value)} />
            </label>
          </div>
        </div>
        <div className="aviso" style={{ marginBottom: 14 }}>
          <Info size={16} />
          <div>Para enviar documentos, abra o <Link className="link" href="/clientes">perfil do cliente</Link>. Os gerados por modelo são salvos lá automaticamente.</div>
        </div>

        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>Arquivo</th><th>Cliente</th><th>Categoria</th><th>Origem</th><th>Tamanho</th><th>Data</th><th></th></tr></thead>
            <tbody>
              {filtrados.map((d) => (
                <tr key={d.id}>
                  <td><div className="who"><span className="thumb" style={{ width: 40 }}><IconeArquivo tipo={d.tipo} /></span>{d.nome}</div></td>
                  <td>{d.clienteId ? <Link className="link" href={`/clientes/ver?id=${d.clienteId}`}>{d.cliente}</Link> : d.cliente}</td>
                  <td><span className="badge">{d.categoria ?? "—"}</span></td>
                  <td><span className={`badge ${origemDe(d) === "gerado" ? "gray" : ""}`}>{origemDe(d) === "gerado" ? "Gerado" : "Enviado"}</span></td>
                  <td className="num">{d.tamanho}</td>
                  <td className="num">{dataBR(d.data)}</td>
                  <td><button className="icon-btn sm" aria-label="Visualizar" title="Visualizar / imprimir" onClick={() => exec(() => abrirDocumento(d))}><Eye size={15} /></button></td>
                </tr>
              ))}
              {filtrados.length === 0 && (
                <tr><td colSpan={7} className="empty">{carregando ? "Carregando..." : erro || "Nenhum documento encontrado."}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
