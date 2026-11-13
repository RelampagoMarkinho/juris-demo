"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Cake, CalendarDays, ChevronLeft, ChevronRight, Copy, Database, Handshake, Mail, MessageCircle, Phone, X } from "lucide-react";
import { Badge, BarChart, Donut, StatCard } from "@/components/ui";
import { useAuth } from "@/components/AuthProvider";
import { useColecao } from "@/lib/db";
import { escala, serieMensal } from "@/lib/calc";
import { mensagemErro } from "@/lib/firebase";
import { carregarExemplos } from "@/lib/seed";
import { dataCaixa } from "@/lib/parcelas";
import { brl, dataBR, processoAtivo, type Cliente, type Corretor, type Lancamento, type Processo, type Usuario } from "@/lib/mock";
import { aniversariantes, linkParabens } from "@/lib/aniversarios";

const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const MES_CURTO = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const somaDias = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

type Periodo = "Dia" | "Semana" | "Mês" | "Ano";

function intervalo(p: Periodo): [Date, Date] {
  const h = new Date(); h.setHours(0, 0, 0, 0);
  if (p === "Dia") return [h, h];
  if (p === "Semana") return [somaDias(h, -h.getDay()), somaDias(h, 6 - h.getDay())];
  if (p === "Mês") return [new Date(h.getFullYear(), h.getMonth(), 1), new Date(h.getFullYear(), h.getMonth() + 1, 0)];
  return [new Date(h.getFullYear(), 0, 1), new Date(h.getFullYear(), 11, 31)];
}

export default function Dashboard() {
  const { pode, podeFazer, usuario } = useAuth();
  const veProc = pode("Processos"), veFin = pode("Financeiro") && podeFazer("dashboard_financeiro");
  const veCorr = pode("Corretores");
  const { dados: todosClientes, carregando: c1 } = useColecao<Cliente>("clientes");
  const { dados: todosProcessos, carregando: c2 } = useColecao<Processo>("processos", undefined, veProc);
  const { dados: todosLancamentos } = useColecao<Lancamento>("lancamentos", undefined, veFin);
  const { dados: corretores } = useColecao<Corretor>("corretores", { campo: "nome" }, veCorr);
  const { dados: equipe } = useColecao<Usuario>("usuarios");

  // Aniversariantes de hoje até 3 dias (de todos: clientes, corretores e colaboradores).
  const proximosAniversarios = useMemo(() => aniversariantes([
    ...todosClientes.map((c) => ({ id: c.id, nome: c.nome, tipo: "Cliente" as const, dataNascimento: c.dataNascimento, telefone: c.telefone, link: `/clientes/ver?id=${c.id}` })),
    ...corretores.filter((k) => k.ativo).map((k) => ({ id: k.id, nome: k.nome, tipo: "Corretor" as const, dataNascimento: k.dataNascimento, telefone: k.telefone, link: "/corretores" })),
    ...equipe.filter((u) => u.ativo).map((u) => ({ id: u.id, nome: u.nome, tipo: "Colaborador" as const, dataNascimento: u.dataNascimento })),
  ], 3), [todosClientes, corretores, equipe]);

  // Filtro por corretor: "" = todos (geral), "-" = clientes sem corretor, ou o id do corretor.
  const [corretor, setCorretor] = useState("");
  useEffect(() => {
    const k = new URLSearchParams(window.location.search).get("corretor");
    if (k) setCorretor(k);
  }, []);
  const doFiltro = (c: Cliente) => (corretor === "-" ? !c.corretorId : c.corretorId === corretor);
  const clientes = corretor ? todosClientes.filter(doFiltro) : todosClientes;
  const nomesClientes = new Set(clientes.map((c) => c.nome));
  const processos = corretor ? todosProcessos.filter((p) => nomesClientes.has(p.cliente)) : todosProcessos;
  const lancamentos = corretor ? todosLancamentos.filter((l) => nomesClientes.has(l.cliente)) : todosLancamentos;
  const corretorSel = corretores.find((k) => k.id === corretor);

  const [periodo, setPeriodo] = useState<Periodo>("Mês");
  const [dia, setDia] = useState(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; });
  const [inicioSemana, setInicioSemana] = useState(() => somaDias(dia, -2));
  const [semeando, setSemeando] = useState(false);

  const [ini, fim] = intervalo(periodo);
  const noPeriodo = (s?: string) => !!s && s >= iso(ini) && s <= iso(fim);

  const semana = useMemo(() => Array.from({ length: 5 }, (_, i) => somaDias(inicioSemana, i)), [inicioSemana]);
  const prazosDoDia = processos.filter((p) => p.proximoPrazo === iso(dia));
  const recentes = [...processos].filter((p) => processoAtivo(p))
    .sort((a, b) => (a.proximoPrazo > b.proximoPrazo ? 1 : -1)).slice(0, 6);

  const honorarios = lancamentos.filter((l) => l.tipo === "Receita" && l.status === "Pago" && noPeriodo(dataCaixa(l))).reduce((s, l) => s + l.valor, 0);
  const ativos = processos.filter((p) => processoAtivo(p)).length;
  const novosClientes = clientes.filter((c) => noPeriodo(c.desde)).length;
  const hoje = iso(new Date()), em7 = iso(somaDias(new Date(), 7));
  const prazos7 = processos.filter((p) => p.proximoPrazo >= hoje && p.proximoPrazo <= em7).length;
  const finalizados = processos.filter((p) => p.status === "Concluído" || p.status === "Arquivado").length;
  const taxa = processos.length ? Math.round((processos.filter((p) => p.status === "Concluído").length / Math.max(finalizados, 1)) * 100) : 0;

  const serie = useMemo(() => serieMensal(lancamentos), [lancamentos]);
  const max = escala(Math.max(...serie.map((m) => m.receita)));

  const vazio = !c1 && !c2 && todosClientes.length === 0 && todosProcessos.length === 0;
  const semear = async () => {
    if (!confirm("Carregar clientes, processos, lançamentos e documentos de exemplo?")) return;
    setSemeando(true);
    try { await carregarExemplos(); } catch (e) { alert(mensagemErro(e)); } finally { setSemeando(false); }
  };

  const fmt = (d: Date) => `${d.getDate()} ${MES_CURTO[d.getMonth()]} ${d.getFullYear()}`;

  return (
    <>
      {vazio && usuario?.perfil === "Administrador" && (
        <div className="card" style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <span className="icon-btn" style={{ background: "var(--surface-2)" }}><Database size={18} /></span>
          <div style={{ flex: 1, minWidth: 200 }}>
            <strong>Seu banco de dados está vazio</strong>
            <div className="muted">Cadastre clientes e processos, ou carregue dados de exemplo para conhecer o sistema.</div>
          </div>
          <button className="btn btn-primary" onClick={semear} disabled={semeando}>{semeando ? "Carregando..." : "Carregar dados de exemplo"}</button>
        </div>
      )}

      <div className="toolbar">
        {veCorr ? (
          <label className="filtro-corretor">
            <Handshake size={16} />
            <select value={corretor} onChange={(e) => setCorretor(e.target.value)} aria-label="Filtrar por corretor">
              <option value="">Todos os corretores (geral)</option>
              <option value="-">Clientes sem corretor</option>
              {corretores.map((k) => <option key={k.id} value={k.id}>{k.nome}</option>)}
            </select>
          </label>
        ) : <span />}
        <div className="toolbar-right">
        <div className="pills">
          {(["Dia", "Semana", "Mês", "Ano"] as Periodo[]).map((p) => (
            <button key={p} className={`pill ${periodo === p ? "active" : ""}`} onClick={() => setPeriodo(p)}>{p}</button>
          ))}
        </div>
        <span className="chip-date"><CalendarDays size={16} /> {periodo === "Dia" ? fmt(ini) : `${fmt(ini)} - ${fmt(fim)}`}</span>
        </div>
      </div>

      {corretorSel && (
        <section className="card corretor-resumo">
          <span className="avatar">{corretorSel.nome.split(" ").slice(0, 2).map((p) => p[0]).join("").toUpperCase()}</span>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div className="muted" style={{ fontSize: 12 }}>Mostrando apenas os dados do corretor</div>
            <strong style={{ fontSize: 17 }}>{corretorSel.nome}</strong>
            <div className="perfil-meta" style={{ marginTop: 4 }}>
              {corretorSel.telefone && <span><Phone size={13} /> {corretorSel.telefone}</span>}
              {corretorSel.email && <span><Mail size={13} /> {corretorSel.email}</span>}
              {corretorSel.chavePix && (
                <button className="pix" title="Copiar chave PIX" onClick={() => navigator.clipboard?.writeText(corretorSel.chavePix).catch(() => {})}>
                  <small>PIX {corretorSel.tipoPix}</small> {corretorSel.chavePix} <Copy size={12} />
                </button>
              )}
            </div>
          </div>
          <div className="corretor-num"><b>{clientes.length}</b><span>clientes</span></div>
          {veProc && <div className="corretor-num"><b>{processos.length}</b><span>processos</span></div>}
          <button className="icon-btn sm" aria-label="Voltar para todos" title="Voltar para todos" onClick={() => setCorretor("")}><X size={15} /></button>
        </section>
      )}

      <section className="card aniversarios">
        <div className="card-head" style={{ marginBottom: proximosAniversarios.length ? 12 : 0 }}>
          <h3><Cake size={18} className="bolo" /> Aniversariantes <span className="muted" style={{ fontSize: 13 }}>· hoje e próximos 3 dias</span></h3>
          {proximosAniversarios.length === 0 && <span className="muted" style={{ fontSize: 13 }}>Nenhum aniversário nos próximos 3 dias.</span>}
        </div>
        {proximosAniversarios.length > 0 && (
          <div className="aniv-lista">
            {proximosAniversarios.map((a) => {
              const zap = linkParabens(a.telefone, a.nome);
              return (
                <div key={`${a.tipo}-${a.id}`} className={`aniv ${a.dias === 0 ? "hoje" : ""}`}>
                  <div className="aniv-dias">
                    <b>{a.dias === 0 ? "Hoje" : a.dias}</b>
                    <span>{a.dias === 0 ? "🎉" : a.dias === 1 ? "dia" : "dias"}</span>
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="aniv-nome">{a.link ? <Link href={a.link}>{a.nome}</Link> : a.nome}</div>
                    <div className="aniv-info">
                      <span className={`badge ${a.tipo === "Cliente" ? "info" : a.tipo === "Corretor" ? "gray" : "pos"}`}>{a.tipo}</span>
                      <span>{a.data} · faz {a.idade} anos</span>
                    </div>
                  </div>
                  {zap && (
                    <a className="icon-btn sm" href={zap} target="_blank" rel="noopener noreferrer" title="Enviar parabéns pelo WhatsApp" aria-label="Enviar parabéns pelo WhatsApp">
                      <MessageCircle size={15} />
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="stats">
        {veFin
          ? <StatCard hero label="Honorários recebidos" valor={brl(honorarios)} />
          : <StatCard hero label="Clientes cadastrados" valor={String(clientes.length)} />}
        <StatCard label="Processos ativos" valor={veProc ? String(ativos) : "—"} />
        <StatCard label="Novos clientes" valor={String(novosClientes)} />
        <StatCard label="Prazos em 7 dias" valor={veProc ? String(prazos7) : "—"} />
      </section>

      <section className="grid-2">
        <div className="card">
          <div className="card-head">
            <h3>Honorários recebidos</h3>
            {veFin && <Link href="/financeiro" className="icon-btn sm" aria-label="Abrir financeiro"><ArrowUpRight size={17} /></Link>}
          </div>
          {veFin ? (
            <BarChart max={max} dados={serie.map((m) => ({ rotulo: m.mes, valores: [m.receita] }))} selecionadoInicial={5} formatar={brl} />
          ) : (
            <div className="empty" style={{ padding: 60 }}>Seu perfil não tem acesso ao financeiro.</div>
          )}
        </div>

        <div className="card">
          <div className="week-head">
            <button onClick={() => setInicioSemana((d) => somaDias(d, -5))} aria-label="Dias anteriores"><ChevronLeft size={18} /></button>
            <strong>{MESES[semana[2].getMonth()]} {semana[2].getFullYear()}</strong>
            <button onClick={() => setInicioSemana((d) => somaDias(d, 5))} aria-label="Próximos dias"><ChevronRight size={18} /></button>
          </div>
          <div className="week">
            {semana.map((d) => {
              const sel = iso(d) === iso(dia);
              const tem = processos.some((p) => p.proximoPrazo === iso(d));
              return (
                <button key={iso(d)} className={`day ${sel ? "sel" : ""}`} onClick={() => setDia(d)}>
                  <span className="dn">{DIAS[d.getDay()]}</span>
                  <span className="dd">{d.getDate()}</span>
                  {tem && !sel && <span className="has" />}
                </button>
              );
            })}
          </div>
          <div className="events">
            {prazosDoDia.length === 0 ? (
              <div className="empty">Nenhum prazo em {dataBR(iso(dia))}</div>
            ) : (
              prazosDoDia.map((p) => (
                <div className="event" key={p.id}>
                  <span className="time">Prazo</span>
                  <div style={{ minWidth: 0 }}>
                    <div className="t">{p.cliente} — {p.area}</div>
                    <div className="s">{p.vara} · {p.numero}</div>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="growth">
            <div>
              <h4>Taxa de êxito</h4>
              <div className="muted" style={{ fontSize: 12 }}>Concluídos sobre processos finalizados</div>
            </div>
            <Donut pct={taxa} />
          </div>
        </div>
      </section>

      {veProc && (
        <section className="card">
          <div className="card-head">
            <h3>Próximos prazos</h3>
            <Link href="/processos" className="icon-btn sm" aria-label="Ver todos"><ArrowUpRight size={17} /></Link>
          </div>
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr><th>Processo</th><th>Cliente</th><th>Área</th><th>Próximo prazo</th><th>Valor da causa</th><th>Status</th></tr>
              </thead>
              <tbody>
                {recentes.map((p) => (
                  <tr key={p.id}>
                    <td className="mono">{p.numero}</td>
                    <td>{p.cliente}</td>
                    <td>{p.area}</td>
                    <td className="num">{dataBR(p.proximoPrazo)}</td>
                    <td className="num">{p.valorCausa ? brl(p.valorCausa) : "—"}</td>
                    <td><Badge>{p.status}</Badge></td>
                  </tr>
                ))}
                {recentes.length === 0 && <tr><td colSpan={6} className="empty">{c2 ? "Carregando..." : "Nenhum processo ativo."}</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {veCorr && !corretor && corretores.length > 0 && (
        <section className="card" style={{ marginTop: 16 }}>
          <div className="card-head">
            <h3>Indicações por corretor</h3>
            <Link href="/corretores" className="icon-btn sm" aria-label="Abrir corretores"><ArrowUpRight size={17} /></Link>
          </div>
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr><th>Corretor</th><th className="c">Clientes</th><th className="c">Novos no período</th>
                  {veProc && <th className="c">Processos ativos</th>}{veFin && <th>Honorários no período</th>}</tr>
              </thead>
              <tbody>
                {corretores.map((k) => {
                  const cs = todosClientes.filter((c) => c.corretorId === k.id);
                  const nomes = new Set(cs.map((c) => c.nome));
                  const ativosK = todosProcessos.filter((p) => nomes.has(p.cliente) && processoAtivo(p)).length;
                  const honK = todosLancamentos.filter((l) => nomes.has(l.cliente) && l.tipo === "Receita" && l.status === "Pago" && noPeriodo(dataCaixa(l)))
                    .reduce((s, l) => s + l.valor, 0);
                  return (
                    <tr key={k.id} className="click" onClick={() => { setCorretor(k.id); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
                      <td><div className="who"><Handshake size={16} className="muted" />{k.nome}{!k.ativo && <small style={{ marginLeft: 6 }}>(inativo)</small>}</div></td>
                      <td className="c num">{cs.length}</td>
                      <td className="c num">{cs.filter((c) => noPeriodo(c.desde)).length}</td>
                      {veProc && <td className="c num">{ativosK}</td>}
                      {veFin && <td className="num">{brl(honK)}</td>}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}
