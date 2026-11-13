"use client";

import { useMemo, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Download, Pencil, Plus, Trash2 } from "lucide-react";
import { Modal } from "@/components/Shell";
import { Badge, BarChart, StatCard } from "@/components/ui";
import { atualizar, excluir, hojeISO, salvar, useColecao } from "@/lib/db";
import { mensagemErro } from "@/lib/firebase";
import { brl, dataBR, type Cliente, type Lancamento } from "@/lib/mock";
import { escala, serieMensal } from "@/lib/calc";
import CampoData from "@/components/CampoData";
import { useAuth } from "@/components/AuthProvider";
import { ListaParcelamentos } from "@/components/Parcelamentos";
import { ContasPagarMes } from "@/components/ContasPagar";
import { dataCaixa, statusEfetivo } from "@/lib/parcelas";


type Filtro = "Todos" | "Pagas" | "Pendentes" | "Inadimplentes";
const FILTROS: [Filtro, string][] = [["Todos", "Todas"], ["Pagas", "Receitas pagas"], ["Pendentes", "Receitas pendentes"], ["Inadimplentes", "Receitas inadimplentes"]];
const STATUS_FILTRO: Record<Exclude<Filtro, "Todos">, Lancamento["status"]> = { Pagas: "Pago", Pendentes: "Pendente", Inadimplentes: "Atrasado" };

export default function FinanceiroPage() {
  const { podeFazer } = useAuth();
  const { dados: lista, carregando, erro } = useColecao<Lancamento>("lancamentos", { campo: "data", desc: true });
  const [aba, setAba] = useState<Lancamento["tipo"]>("Receita");
  const [quadro, setQuadro] = useState<"parcelamentos" | "contas">("parcelamentos");
  const [filtro, setFiltro] = useState<Filtro>("Pendentes"); // abre sempre nas receitas pendentes
  const [novo, setNovo] = useState(false);
  const [editando, setEditando] = useState<Lancamento | null>(null);

  const mesAtual = hojeISO().slice(0, 7);
  const doMes = lista.filter((l) => dataCaixa(l)?.startsWith(mesAtual)); // pago: conta no mês em que o dinheiro entrou
  const soma = (arr: Lancamento[], f: (l: Lancamento) => boolean) => arr.filter(f).reduce((s, l) => s + l.valor, 0);
  const receitas = soma(doMes, (l) => l.tipo === "Receita" && l.status === "Pago");
  const despesas = soma(doMes, (l) => l.tipo === "Despesa" && l.status === "Pago");
  const aReceber = soma(lista, (l) => l.tipo === "Receita" && l.status !== "Pago");
  const atrasados = lista.filter((l) => statusEfetivo(l) === "Atrasado"); // pendente com vencimento passado
  // Parcelas de parcelamento só aparecem aqui quando pagas (ou em atraso); as futuras ficam no quadro Parcelamentos.
  const visiveis = lista.filter((l) => !l.parcelamentoId || statusEfetivo(l) !== "Pendente");
  const casa = (l: Lancamento, f: Filtro) => f === "Todos" || statusEfetivo(l) === STATUS_FILTRO[f];
  const filtrados = visiveis.filter((l) => l.tipo === aba && (aba === "Despesa" || casa(l, filtro)))
    .sort((a, b) => dataCaixa(b).localeCompare(dataCaixa(a))); // pagas: pela data do pagamento

  const serie = useMemo(() => serieMensal(lista), [lista]);
  const max = escala(Math.max(...serie.flatMap((m) => [m.receita, m.despesa])));

  const categorias = useMemo(() => {
    const rec = lista.filter((l) => l.tipo === "Receita" && l.status === "Pago");
    const total = rec.reduce((s, l) => s + l.valor, 0) || 1;
    const por: Record<string, number> = {};
    rec.forEach((l) => (por[l.categoria] = (por[l.categoria] ?? 0) + l.valor));
    return Object.entries(por).sort((a, b) => b[1] - a[1]).map(([nome, v]) => ({ nome, v: Math.round((v / total) * 100) }));
  }, [lista]);

  const exec = async (fn: () => Promise<void>) => { try { await fn(); } catch (e) { alert(mensagemErro(e)); } };

  const exportar = () => {
    const linhas = [["Data", "Descrição", "Cliente", "Categoria", "Tipo", "Valor", "Status"],
      ...filtrados.map((l) => [dataBR(l.data), l.descricao, l.cliente, l.categoria, l.tipo, l.valor.toFixed(2).replace(".", ","), l.status])];
    const csv = "﻿" + linhas.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = `lancamentos-${hojeISO()}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <>
      <section className="stats">
        <StatCard hero label="Saldo do mês" valor={brl(receitas - despesas)} />
        <StatCard label="Receitas recebidas (mês)" valor={brl(receitas)} />
        <StatCard label="Despesas pagas (mês)" valor={brl(despesas)} />
        {podeFazer("financeiro_ver_receber") && <StatCard label="A receber" valor={brl(aReceber)} />}
      </section>

      <section className="grid-2">
        <div className="card">
          <div className="card-head">
            <h3>Receitas x Despesas</h3>
            <div className="legend">
              <span><i style={{ background: "var(--ink)" }} />Receitas</span>
              <span><i style={{ background: "var(--surface-3)" }} />Despesas</span>
            </div>
          </div>
          <BarChart max={max} dados={serie.map((m) => ({ rotulo: m.mes, valores: [m.receita, m.despesa] }))} formatar={brl} />
        </div>

        <div className="card">
          <div className="card-head"><h3>Receitas por categoria</h3></div>
          {categorias.length === 0 && <div className="empty">Sem receitas recebidas ainda.</div>}
          {categorias.map((c) => (
            <div key={c.nome} style={{ marginBottom: 16 }}>
              <div className="row-between" style={{ marginBottom: 6 }}>
                <span style={{ fontWeight: 500 }}>{c.nome}</span><span className="muted num">{c.v}%</span>
              </div>
              <div style={{ height: 10, borderRadius: 999, background: "var(--surface-2)", overflow: "hidden" }}>
                <div style={{ width: `${c.v}%`, height: "100%", borderRadius: 999, background: "var(--ink)" }} />
              </div>
            </div>
          ))}
          <div className="growth" style={{ marginTop: 20 }}>
            <div>
              <h4>Inadimplência</h4>
              <div className="muted" style={{ fontSize: 12 }}>{atrasados.length} lançamento(s) em atraso</div>
            </div>
            <strong className="neg num">{brl(soma(atrasados, () => true))}</strong>
          </div>
        </div>
      </section>

      {/* Parcelamentos (receitas a receber dos clientes) e Contas a pagar (despesas fixas/parceladas do escritório) */}
      <section className="card" style={{ marginTop: 16 }}>
        <div className="tabs" style={{ marginTop: 0 }}>
          <button className={quadro === "parcelamentos" ? "on" : ""} onClick={() => setQuadro("parcelamentos")}>
            <ArrowDownLeft size={15} /> Parcelamentos <span className="muted" style={{ fontWeight: 400 }}>(receitas)</span>
          </button>
          <button className={quadro === "contas" ? "on" : ""} onClick={() => setQuadro("contas")}>
            <ArrowUpRight size={15} /> Contas a pagar <span className="muted" style={{ fontWeight: 400 }}>(despesas fixas)</span>
          </button>
        </div>
        {quadro === "parcelamentos" ? <ListaParcelamentos lancamentos={lista} embutido /> : <ContasPagarMes lancamentos={lista} />}
      </section>

      <section className="card" style={{ marginTop: 16 }}>
        {/* Abas: receitas e despesas separadas */}
        <div className="tabs" style={{ marginTop: 0 }}>
          <button className={aba === "Receita" ? "on" : ""} onClick={() => setAba("Receita")}>
            <ArrowDownLeft size={15} /> Receitas <span className="count">{visiveis.filter((l) => l.tipo === "Receita").length}</span>
          </button>
          <button className={aba === "Despesa" ? "on" : ""} onClick={() => setAba("Despesa")}>
            <ArrowUpRight size={15} /> Despesas <span className="count">{visiveis.filter((l) => l.tipo === "Despesa").length}</span>
          </button>
        </div>
        <div className="toolbar">
          {aba === "Receita" ? (
            <div className="pills">
              {FILTROS.map(([f, rotulo]) => (
                <button key={f} className={`pill ${filtro === f ? "active" : ""}`} onClick={() => setFiltro(f)}
                  style={filtro === f ? undefined : { background: "var(--surface-2)" }}>
                  {rotulo}<span className="count">{visiveis.filter((l) => l.tipo === "Receita" && casa(l, f)).length}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="muted" style={{ fontSize: 13.5 }}>
              Total de despesas: <b className="neg num">{brl(soma(visiveis, (l) => l.tipo === "Despesa"))}</b>
            </div>
          )}
          <div className="toolbar-right">
            {podeFazer("financeiro_exportar") && <button className="btn" onClick={exportar} disabled={!filtrados.length}><Download size={16} /> Exportar CSV</button>}
            {podeFazer("financeiro_criar") && (
              <button className="btn btn-primary" onClick={() => setNovo(true)}><Plus size={17} /> {aba === "Receita" ? "Nova receita" : "Nova despesa"}</button>
            )}
          </div>
        </div>
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr>
              <th>Data</th><th>Descrição</th>
              {aba === "Receita" && <><th>Cliente</th><th>Categoria</th></>}
              <th>Valor</th>{aba === "Receita" && <th>Status</th>}<th></th>
            </tr></thead>
            <tbody>
              {filtrados.map((l) => (
                <tr key={l.id}>
                  <td className="num">{dataBR(dataCaixa(l))}</td>
                  <td>{l.descricao}</td>
                  {aba === "Receita" && <><td>{l.cliente}</td><td>{l.categoria}</td></>}
                  <td className={`num ${l.tipo === "Receita" ? "pos" : "neg"}`}>{l.tipo === "Despesa" ? "− " : "+ "}{brl(l.valor)}</td>
                  {aba === "Receita" && <td><Badge>{statusEfetivo(l)}</Badge></td>}
                  <td>
                    <div className="card-actions">
                      {l.status !== "Pago" && podeFazer("financeiro_baixar") && (
                        <button className="btn" style={{ height: 32, padding: "0 12px" }}
                          onClick={() => exec(() => atualizar("lancamentos", l.id, { status: "Pago", pagoEm: hojeISO() }))}>Baixar</button>
                      )}
                      {podeFazer("financeiro_editar") && (
                        <button className="icon-btn sm" aria-label="Editar" title="Editar lançamento" onClick={() => setEditando(l)}><Pencil size={15} /></button>
                      )}
                      {podeFazer("financeiro_excluir") && (
                        <button className="icon-btn sm" aria-label="Excluir"
                          onClick={() => confirm("Excluir este lançamento?") && exec(() => excluir("lancamentos", l.id))}><Trash2 size={15} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtrados.length === 0 && (
                <tr><td colSpan={7} className="empty">{carregando ? "Carregando..." : erro || (aba === "Despesa" ? "Nenhuma despesa lançada."
                  : filtro === "Todos" ? "Nenhuma receita." : `Nenhum lançamento em “${FILTROS.find(([f]) => f === filtro)?.[1]}”.`)}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {novo && <NovoLancamento tipo={aba} onClose={() => setNovo(false)} />}
      {editando && <NovoLancamento inicial={editando} onClose={() => setEditando(null)} />}
    </>
  );
}

/** Novo lançamento, ou edição de um existente (`inicial`). */
function NovoLancamento({ onClose, inicial, tipo }: { onClose: () => void; inicial?: Lancamento; tipo?: Lancamento["tipo"] }) {
  const { dados: clientes } = useColecao<Cliente>("clientes", { campo: "nome" });
  const [l, setL] = useState({
    tipo: inicial?.tipo ?? tipo ?? "Receita" as Lancamento["tipo"], descricao: inicial?.descricao ?? "", cliente: inicial?.cliente || "—",
    categoria: inicial?.categoria ?? "Honorários", valor: inicial ? String(inicial.valor) : "", data: inicial?.data ?? hojeISO(),
    status: inicial?.status ?? "Pendente" as Lancamento["status"], pagoEm: inicial?.pagoEm ?? "",
  });
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const set = (k: keyof typeof l, v: string) => setL((x) => ({ ...x, [k]: v }));
  const despesa = l.tipo === "Despesa";

  const confirmar = async () => {
    setSalvando(true); setErro("");
    try {
      const valor = Number(String(l.valor).replace(",", "."));
      // Despesa: só descrição, valor e data — registrada como paga nessa data, sem cliente.
      const dados = despesa
        ? { ...l, valor, cliente: "—", clienteId: "", categoria: "Despesa", status: "Pago" as const, pagoEm: l.data || hojeISO() }
        : (() => {
            const cli = clientes.find((c) => c.nome === l.cliente);
            // Pago: guarda a data do pagamento (se não informada, a de hoje); voltou a pendente: limpa.
            const pagoEm = l.status === "Pago" ? l.pagoEm || hojeISO() : "";
            return { ...l, valor, pagoEm, clienteId: cli?.id ?? "" };
          })();
      if (inicial) await atualizar("lancamentos", inicial.id, dados);
      else await salvar<Omit<Lancamento, "id">>("lancamentos", dados);
      onClose();
    } catch (e) {
      setErro(mensagemErro(e));
      setSalvando(false);
    }
  };

  return (
    <Modal titulo={`${inicial ? "Editar" : "Nova"} ${despesa ? "despesa" : "receita"}`} onClose={onClose}
      footer={<>
        <button className="btn" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" disabled={!l.descricao || !Number(String(l.valor).replace(",", ".")) || salvando} onClick={confirmar}>
          {salvando ? "Salvando..." : "Salvar"}
        </button>
      </>}>
      <div className="pills" style={{ marginBottom: 16 }}>
        {(["Receita", "Despesa"] as const).map((t) => (
          <button key={t} className={`pill ${l.tipo === t ? "active" : ""}`} style={l.tipo === t ? undefined : { background: "var(--surface-2)" }}
            onClick={() => set("tipo", t)}>{t}</button>
        ))}
      </div>
      <div className="form-grid">
        <div className="field span-2"><label>Descrição</label>
          <input className="input" value={l.descricao} onChange={(e) => set("descricao", e.target.value)} autoFocus /></div>
        <div className="field"><label>Valor (R$)</label>
          <input className="input" type="number" min={0} step="0.01" value={l.valor} onChange={(e) => set("valor", e.target.value)} /></div>
        <div className="field"><label>Data</label>
          <CampoData value={l.data} onChange={(v) => set("data", v)} /></div>
        {!despesa && <>
        <div className="field"><label>Cliente</label>
          <select className="select" value={l.cliente} onChange={(e) => set("cliente", e.target.value)}>
            <option>—</option>{clientes.map((c) => <option key={c.id}>{c.nome}</option>)}
            {l.cliente !== "—" && !clientes.some((c) => c.nome === l.cliente) && <option>{l.cliente}</option>}
          </select></div>
        <div className="field"><label>Categoria</label>
          <select className="select" value={l.categoria} onChange={(e) => set("categoria", e.target.value)}>
            {["Honorários", "Consultoria", "Custas", "Estrutura", "Software", "Outros"].map((c) => <option key={c}>{c}</option>)}
          </select></div>
        <div className={`field${l.status === "Pago" ? "" : " span-2"}`}><label>Status</label>
          <select className="select" value={l.status} onChange={(e) => set("status", e.target.value)}>
            <option>Pendente</option><option>Pago</option><option>Atrasado</option>
          </select></div>
        {l.status === "Pago" && (
          <div className="field"><label>Pago em</label>
            <CampoData value={l.pagoEm || hojeISO()} onChange={(v) => set("pagoEm", v)} /></div>
        )}
        </>}
      </div>
      {erro && <div className="error" style={{ marginTop: 12 }}>{erro}</div>}
    </Modal>
  );
}
