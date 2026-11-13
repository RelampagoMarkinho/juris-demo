"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Info, Landmark, Loader2, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import { Modal } from "@/components/Shell";
import { Badge, StatCard } from "@/components/ui";
import { atualizar, excluir, hojeISO, salvar, useColecao } from "@/lib/db";
import { mensagemErro } from "@/lib/firebase";
import { AREAS_PROCESSO, brl, dataBR, STATUS_PROCESSO, type Cliente, type Processo, type ResumoTribunal, type StatusProcesso, type Usuario } from "@/lib/mock";
import { cnjValido, mascaraCnj, tribunalDoCnj, type DadosTribunal } from "@/lib/cnj";
import { consultarTribunal, mesclarAndamentos, resumoTribunal } from "@/lib/tribunal";
import CampoData from "@/components/CampoData";
import { useAuth } from "@/components/AuthProvider";

const STATUS: ("Todos" | StatusProcesso)[] = ["Todos", ...STATUS_PROCESSO];

/** Lista de todos os processos — somente consulta. O cadastro de processo é feito no cliente. */
export function ListaProcessos() {
  const { podeFazer } = useAuth();
  const { dados: lista, carregando, erro } = useColecao<Processo>("processos", { campo: "proximoPrazo" });
  const [filtro, setFiltro] = useState<(typeof STATUS)[number]>("Todos");
  const [busca, setBusca] = useState("");
  const [abertoId, setAbertoId] = useState<string | null>(null);
  const [lote, setLote] = useState<{ feitos: number; total: number; novos: number; falhas: number } | null>(null);

  // Atualiza do tribunal todos os processos com número CNJ válido (um por vez, para não sobrecarregar o CNJ).
  const atualizarTodos = async () => {
    const alvos = lista.filter((p) => cnjValido(p.numero) && tribunalDoCnj(p.numero) && p.status !== "Arquivado");
    if (!alvos.length) return alert("Nenhum processo com número CNJ válido para consultar.");
    if (!confirm(`Consultar ${alvos.length} processo(s) na base pública do CNJ? Isso pode levar alguns minutos.`)) return;
    const prog = { feitos: 0, total: alvos.length, novos: 0, falhas: 0 };
    setLote({ ...prog });
    for (const p of alvos) {
      try {
        const d = await consultarTribunal(p.numero);
        const { andamentos, novos } = mesclarAndamentos(p.andamentos ?? [], d.movimentos);
        await atualizar("processos", p.id, { tribunal: resumoTribunal(d), andamentos, ...(!p.vara && d.orgao ? { vara: d.orgao } : {}) });
        prog.novos += novos;
      } catch {
        prog.falhas += 1;
      }
      prog.feitos += 1;
      setLote({ ...prog });
    }
  };

  const aberto = lista.find((p) => p.id === abertoId) ?? null; // acompanha atualizações em tempo real
  const filtrados = lista.filter(
    (p) =>
      (filtro === "Todos" || p.status === filtro) &&
      [p.numero, p.cliente, p.parteContraria, p.area, p.vara].join(" ").toLowerCase().includes(busca.toLowerCase()),
  );
  const conta = (s: StatusProcesso) => lista.filter((p) => p.status === s).length;

  return (
    <>
      <section className="stats">
        <StatCard hero label="Em andamento" valor={String(conta("Em andamento"))} />
        <StatCard label="Aguardando" valor={String(conta("Aguardando"))} />
        <StatCard label="Concluídos" valor={String(conta("Concluído"))} />
        <StatCard label="Valor total em causa" valor={brl(lista.reduce((s, p) => s + (p.valorCausa || 0), 0))} />
      </section>

      <section className="card">
        <div className="toolbar">
          <div className="pills">
            {STATUS.map((s) => (
              <button key={s} className={`pill ${filtro === s ? "active" : ""}`} onClick={() => setFiltro(s)}
                style={filtro === s ? undefined : { background: "var(--surface-2)" }}>
                {s}<span className="count">{s === "Todos" ? lista.length : conta(s)}</span>
              </button>
            ))}
          </div>
          <div className="toolbar-right">
            {podeFazer("processos_tribunal") && (
              <button className="btn" onClick={atualizarTodos} disabled={!!lote && lote.feitos < lote.total}
                title="Busca movimentações novas de todos os processos na base pública do CNJ">
                {lote && lote.feitos < lote.total ? <Loader2 size={16} className="girar" /> : <RefreshCw size={16} />}
                {lote && lote.feitos < lote.total ? `Atualizando ${lote.feitos}/${lote.total}...` : "Atualizar todos do tribunal"}
              </button>
            )}
            <label className="search" style={{ background: "var(--surface-2)", display: "flex", width: 240 }}>
              <Search size={16} />
              <input placeholder="Nº, cliente, vara..." value={busca} onChange={(e) => setBusca(e.target.value)} />
            </label>
          </div>
        </div>

        {lote && lote.feitos === lote.total && (
          <div className="aviso ok"><CheckCircle2 size={16} />
            <div>Consulta concluída: {lote.total} processo(s), {lote.novos} movimentação(ões) nova(s){lote.falhas ? `, ${lote.falhas} não encontrado(s) ou com erro` : ""}.{" "}
              <button className="link" style={{ background: "none", border: 0, padding: 0 }} onClick={() => setLote(null)}>ok</button></div>
          </div>
        )}
        <div className="aviso info" style={{ marginBottom: 14 }}>
          <Info size={16} />
          <div>Para cadastrar um processo, abra o <Link className="link" href="/clientes">cliente</Link> e use <b>Novo processo</b> (ou cadastre um cliente novo).</div>
        </div>
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr><th>Número (CNJ)</th><th>Cliente</th><th>Parte contrária</th><th>Área</th><th>Responsável</th><th>Prazo</th><th>Status</th></tr>
            </thead>
            <tbody>
              {filtrados.map((p) => (
                <tr key={p.id} className="click" onClick={() => setAbertoId(p.id)}>
                  <td className="mono">{p.numero}</td>
                  <td>{p.cliente}</td>
                  <td>{p.parteContraria}</td>
                  <td>{p.area}</td>
                  <td>{p.responsavel}</td>
                  <td className="num">{dataBR(p.proximoPrazo)}</td>
                  <td><Badge>{p.status}</Badge></td>
                </tr>
              ))}
              {filtrados.length === 0 && (
                <tr><td colSpan={7} className="empty">{carregando ? "Carregando..." : erro || "Nenhum processo encontrado."}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {aberto && <DetalheProcesso p={aberto} onClose={() => setAbertoId(null)} />}
    </>
  );
}

export function DetalheProcesso({ p, onClose }: { p: Processo; onClose: () => void }) {
  const { podeFazer } = useAuth();
  const podeEditar = podeFazer("processos_editar");
  const [texto, setTexto] = useState("");
  const [sincronizando, setSincronizando] = useState(false);
  const [aviso, setAviso] = useState("");
  const [prazo, setPrazo] = useState(p.proximoPrazo && p.proximoPrazo !== "—" ? p.proximoPrazo : "");
  const [erro, setErro] = useState("");

  const exec = async (fn: () => Promise<void>) => {
    setErro("");
    // Erro do Firebase vira texto amigável; os do CNJ já vêm explicados pelo servidor.
    try { await fn(); } catch (e) { setErro((e as { code?: string }).code ? mensagemErro(e) : (e as Error).message); }
  };

  const addAndamento = () => exec(async () => {
    if (!texto.trim()) return;
    await atualizar("processos", p.id, { andamentos: [{ data: hojeISO(), descricao: texto.trim() }, ...(p.andamentos ?? [])] });
    setTexto("");
  });

  const atualizarDoTribunal = () => exec(async () => {
    setSincronizando(true); setAviso("");
    try {
      const d = await consultarTribunal(p.numero);
      const { andamentos, novos } = mesclarAndamentos(p.andamentos ?? [], d.movimentos);
      await atualizar("processos", p.id, {
        tribunal: resumoTribunal(d), andamentos,
        ...(!p.vara && d.orgao ? { vara: d.orgao } : {}),
      });
      setAviso(novos ? `${novos} movimentação(ões) nova(s) trazida(s) do ${d.sigla}.` : `Nenhuma movimentação nova no ${d.sigla}.`);
    } finally {
      setSincronizando(false);
    }
  });

  const remover = () => exec(async () => {
    if (!confirm(`Excluir o processo ${p.numero}?`)) return;
    await excluir("processos", p.id);
    onClose();
  });

  return (
    <Modal wide titulo={`Processo ${p.numero}`} sub={p.vara} onClose={onClose}
      footer={<>
        {podeFazer("processos_excluir") && <button className="btn btn-danger" style={{ marginRight: "auto" }} onClick={remover}><Trash2 size={15} /> Excluir</button>}
        <button className="btn btn-primary" onClick={onClose}>Fechar</button>
      </>}>
      <div className="kv">
        <div><span>Cliente</span><strong>{p.cliente}</strong></div>
        <div><span>Parte contrária</span><strong>{p.parteContraria || "—"}</strong></div>
        <div><span>Área</span><strong>{p.area}</strong></div>
        <div><span>Responsável</span><strong>{p.responsavel}</strong></div>
        <div><span>Valor da causa</span><strong>{p.valorCausa ? brl(p.valorCausa) : "—"}</strong></div>
        <div>
          <span>Status</span>
          <select className="select" style={{ height: 36 }} value={p.status} disabled={!podeEditar}
            onChange={(e) => exec(() => atualizar("processos", p.id, { status: e.target.value }))}>
            {STATUS.slice(1).map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <span>Próximo prazo</span>
          <CampoData style={{ height: 36 }} value={prazo} disabled={!podeEditar}
            onChange={(v) => { setPrazo(v); exec(() => atualizar("processos", p.id, { proximoPrazo: v || "—" })); }} />
        </div>
      </div>

      <QuadroTribunal t={p.tribunal} numero={p.numero} sincronizando={sincronizando} onAtualizar={podeFazer("processos_tribunal") ? atualizarDoTribunal : undefined} />
      {aviso && <div className="aviso ok" style={{ marginTop: -6 }}><CheckCircle2 size={16} /><div>{aviso}</div></div>}

      <h4 style={{ marginBottom: 12, fontWeight: 600 }}>Andamentos</h4>
      {podeEditar && <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input className="input" placeholder="Registrar novo andamento..." value={texto} onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addAndamento()} />
        <button className="btn btn-primary" onClick={addAndamento} disabled={!texto.trim()}><Plus size={16} /></button>
      </div>}
      {erro && <div className="error" style={{ marginBottom: 12 }}>{erro}</div>}
      <ul className="timeline">
        {(p.andamentos ?? []).map((a, i) => (
          <li key={i}><small>{dataBR(a.data)}{a.origem === "tribunal" && <span className="selo-tribunal">tribunal</span>}</small>{a.descricao}</li>
        ))}
      </ul>
    </Modal>
  );
}

/** Cadastro de processo. Com `clienteFixo`, o cliente já vem definido (etapa 2 do cadastro e perfil do cliente). */
export function NovoProcesso({ onClose, clienteFixo, etapa }: {
  onClose: () => void; clienteFixo?: Pick<Cliente, "id" | "nome" | "tipoProcesso">; etapa?: boolean;
}) {
  const { dados: clientes } = useColecao<Cliente>("clientes", { campo: "nome" });
  const { dados: equipe } = useColecao<Usuario>("usuarios", { campo: "nome" });
  const advogados = equipe.filter((u) => u.ativo && (u.perfil === "Advogado" || u.perfil === "Administrador"));
  const [p, setP] = useState({ numero: "", cliente: clienteFixo?.nome ?? "", parteContraria: "", area: clienteFixo?.tipoProcesso || "Cível", status: "Em andamento" as StatusProcesso, vara: "", responsavel: "", valorCausa: "", proximoPrazo: "" });
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [dadosTj, setDadosTj] = useState<DadosTribunal | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [erroTj, setErroTj] = useState("");
  const set = (k: keyof typeof p, v: string) => setP((x) => ({ ...x, [k]: v }));
  const numeroOk = cnjValido(p.numero);
  const tribunal = tribunalDoCnj(p.numero);

  const buscar = async (numero = p.numero) => {
    setBuscando(true); setErroTj(""); setDadosTj(null);
    try {
      const d = await consultarTribunal(numero);
      setDadosTj(d);
      setP((x) => ({
        ...x,
        vara: x.vara || d.orgao,
        area: d.sigla.startsWith("TRT") ? "Trabalhista" : x.area,
      }));
    } catch (e) {
      setErroTj((e as Error).message);
    } finally {
      setBuscando(false);
    }
  };

  // Número completo e válido → consulta o tribunal automaticamente.
  const mudarNumero = (v: string) => {
    const m = mascaraCnj(v);
    set("numero", m);
    setDadosTj(null); setErroTj("");
    if (cnjValido(m) && tribunalDoCnj(m)) buscar(m);
  };

  const confirmar = async () => {
    if (!p.cliente) return setErro("Selecione o cliente.");
    setSalvando(true); setErro("");
    try {
      await salvar<Omit<Processo, "id">>("processos", {
        ...p,
        numero: p.numero.trim() || "Sem número (administrativo)",
        clienteId: clienteFixo?.id ?? clientes.find((c) => c.nome === p.cliente)?.id ?? "",
        responsavel: p.responsavel || advogados[0]?.nome || "—",
        valorCausa: Number(p.valorCausa) || 0,
        proximoPrazo: p.proximoPrazo || "—",
        status: p.status,
        andamentos: dadosTj
          ? mesclarAndamentos([{ data: hojeISO(), descricao: "Processo cadastrado no sistema" }], dadosTj.movimentos).andamentos
          : [{ data: hojeISO(), descricao: "Processo cadastrado no sistema" }],
        ...(dadosTj ? { tribunal: resumoTribunal(dadosTj) } : {}),
      });
      onClose();
    } catch (e) {
      setErro(mensagemErro(e));
      setSalvando(false);
    }
  };

  return (
    <Modal wide
      titulo={etapa ? "Etapa 2 de 2 — Processo do cliente" : "Novo processo"}
      sub={clienteFixo ? `Cliente: ${clienteFixo.nome}. Digite o número CNJ: os dados do tribunal são buscados automaticamente.`
        : "Digite o número CNJ: os dados públicos do tribunal são buscados automaticamente"}
      onClose={onClose}
      footer={<>
        <button className="btn" onClick={onClose}>{etapa ? "Pular — cliente ainda sem processo" : "Cancelar"}</button>
        <button className="btn btn-primary" disabled={salvando} onClick={confirmar}>{salvando ? "Salvando..." : etapa ? "Salvar processo" : "Salvar"}</button>
      </>}>
      <div className="form-grid">
        <div className="field span-2"><label>Número do processo (CNJ) <span className="muted">— deixe em branco se for pedido administrativo</span></label>
          <div style={{ display: "flex", gap: 8 }}>
            <input className="input mono" placeholder="0000000-00.0000.0.00.0000" value={p.numero} onChange={(e) => mudarNumero(e.target.value)} autoFocus />
            <button type="button" className="btn" disabled={!numeroOk || !tribunal || buscando} onClick={() => buscar()}>
              {buscando ? <Loader2 size={16} className="girar" /> : <Landmark size={16} />} Buscar no tribunal
            </button>
          </div>
          {p.numero.replace(/\D/g, "").length === 20 && !numeroOk && <small className="error">Número CNJ inválido (dígito verificador não confere).</small>}
          {numeroOk && !tribunal && <small className="muted">Tribunal não atendido pela consulta pública — preencha os dados manualmente.</small>}
          {numeroOk && tribunal && !dadosTj && !buscando && !erroTj && <small className="muted">Tribunal: {tribunal.sigla}</small>}
        </div>
        {(buscando || dadosTj || erroTj) && (
          <div className="span-2">
            {buscando && <div className="aviso info"><Loader2 size={16} className="girar" /><div>Consultando o {tribunal?.sigla} na base pública do CNJ...</div></div>}
            {erroTj && <div className="aviso"><Landmark size={16} /><div>{erroTj}</div></div>}
            {dadosTj && <QuadroTribunal t={{ ...resumoTribunal(dadosTj) }} numero={p.numero} movimentos={dadosTj.movimentos.length} />}
          </div>
        )}
        {clienteFixo ? (
          <div className="field"><label>Cliente</label><input className="input" value={clienteFixo.nome} disabled /></div>
        ) : (
          <div className="field"><label>Cliente</label>
            <select className="select" value={p.cliente} onChange={(e) => set("cliente", e.target.value)}>
              <option value="">Selecione...</option>
              {clientes.map((c) => <option key={c.id}>{c.nome}</option>)}
            </select></div>
        )}
        <div className="field"><label>Parte contrária</label>
          <input className="input" value={p.parteContraria} onChange={(e) => set("parteContraria", e.target.value)} /></div>
        <div className="field"><label>Tipo de processo</label>
          <select className="select" value={p.area} onChange={(e) => set("area", e.target.value)}>
            {AREAS_PROCESSO.map((a) => <option key={a}>{a}</option>)}
          </select></div>
        <div className="field"><label>Situação</label>
          <select className="select" value={p.status} onChange={(e) => set("status", e.target.value)}>
            {STATUS_PROCESSO.map((x) => <option key={x}>{x}</option>)}
          </select></div>
        <div className="field"><label>Responsável</label>
          <select className="select" value={p.responsavel} onChange={(e) => set("responsavel", e.target.value)}>
            {advogados.map((a) => <option key={a.id}>{a.nome}</option>)}
          </select></div>
        <div className="field span-2"><label>Vara / Tribunal</label>
          <input className="input" value={p.vara} onChange={(e) => set("vara", e.target.value)} /></div>
        <div className="field"><label>Valor da causa (R$)</label>
          <input className="input" type="number" min={0} value={p.valorCausa} onChange={(e) => set("valorCausa", e.target.value)} /></div>
        <div className="field"><label>Próximo prazo</label>
          <CampoData value={p.proximoPrazo} onChange={(v) => set("proximoPrazo", v)} /></div>
      </div>
      {!clienteFixo && clientes.length === 0 && <p className="muted" style={{ fontSize: 12.5 }}>Cadastre um cliente antes de criar processos.</p>}
      {erro && <div className="error" style={{ marginTop: 12 }}>{erro}</div>}
    </Modal>
  );
}

export function QuadroTribunal({ t, numero, sincronizando, onAtualizar, movimentos }: {
  t?: ResumoTribunal; numero: string; sincronizando?: boolean; onAtualizar?: () => void; movimentos?: number;
}) {
  const podeConsultar = cnjValido(numero) && !!tribunalDoCnj(numero);
  return (
    <div className="quadro-tribunal">
      <div className="row-between" style={{ marginBottom: t ? 10 : 0, flexWrap: "wrap" }}>
        <strong style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Landmark size={16} /> Dados do tribunal {t && <span className="badge gray">{t.sigla}</span>}
        </strong>
        {onAtualizar && (
          <button className="btn" style={{ height: 34 }} onClick={onAtualizar} disabled={!podeConsultar || sincronizando}
            title={podeConsultar ? "Buscar movimentações novas na base pública do CNJ" : "Número CNJ inválido"}>
            {sincronizando ? <Loader2 size={15} className="girar" /> : <RefreshCw size={15} />} {t ? "Atualizar do tribunal" : "Buscar no tribunal"}
          </button>
        )}
      </div>
      {sincronizando && (
        <p className="muted" style={{ fontSize: 12.5, margin: "0 0 8px" }}>Consultando o CNJ... quando a base pública está lenta, pode levar até 2 minutos. Não feche esta janela.</p>
      )}
      {t ? (
        <div className="kv" style={{ marginBottom: 0 }}>
          <div><span>Classe</span><strong>{t.classe || "—"}</strong></div>
          <div><span>Órgão julgador</span><strong>{t.orgao || "—"}</strong></div>
          <div><span>Assuntos</span><strong>{t.assuntos.join("; ") || "—"}</strong></div>
          <div><span>Ajuizamento</span><strong>{t.dataAjuizamento ? dataBR(t.dataAjuizamento) : "—"}</strong></div>
          <div><span>Instâncias</span><strong>{t.graus.map((g) => (g === "G1" ? "1º grau" : g === "G2" ? "2º grau" : g)).join(", ") || "—"}</strong></div>
          <div><span>Sistema</span><strong>{[t.sistema, t.formato].filter(Boolean).join(" · ") || "—"}</strong></div>
          {movimentos !== undefined && <div><span>Movimentações encontradas</span><strong>{movimentos}</strong></div>}
          {t.sincronizadoEm && movimentos === undefined && (
            <div><span>Consultado em</span><strong>{new Date(t.sincronizadoEm).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</strong></div>
          )}
        </div>
      ) : (
        !onAtualizar ? null : <p className="muted" style={{ fontSize: 12.5, margin: "8px 0 0" }}>Ainda não consultado. A base pública do CNJ traz classe, assuntos, vara e movimentações (não traz documentos nem o nome das partes).</p>
      )}
    </div>
  );
}
