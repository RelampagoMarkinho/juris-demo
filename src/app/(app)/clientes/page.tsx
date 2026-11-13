"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Mail, Phone, Plus, Search } from "lucide-react";
import { Badge, StatCard } from "@/components/ui";
import { useAuth } from "@/components/AuthProvider";
import FormCliente, { CLIENTE_VAZIO } from "@/components/FormCliente";
import { useColecao } from "@/lib/db";
import { NovoProcesso } from "@/components/Processos";
import { AREAS_PROCESSO, dataBR, iniciais, processoAtivo, type Cliente, type Corretor, type Documento, type Processo } from "@/lib/mock";

export default function ClientesPage() {
  const router = useRouter();
  const { pode, podeFazer } = useAuth();
  const { dados: docs } = useColecao<Documento>("documentos");
  const { dados: lista, carregando, erro } = useColecao<Cliente>("clientes", { campo: "nome" });
  const { dados: procs } = useColecao<Processo>("processos", undefined, pode("Processos"));
  const { dados: corretores } = useColecao<Corretor>("corretores", { campo: "nome" }, pode("Corretores"));
  const [corretor, setCorretor] = useState("");
  const [area, setArea] = useState(""); // área de atuação (tipo dos processos do cliente)
  const qtdProc = (c: Cliente) => (pode("Processos") ? procs.filter((p) => p.clienteId === c.id || p.cliente === c.nome).length : "—");
  const [etapa2, setEtapa2] = useState<{ id: string; nome: string; tipoProcesso?: string } | null>(null); // processo do cliente recém-cadastrado

  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState("");
  const [novo, setNovo] = useState(false);

  // Processos de cada cliente (tipo e situação ficam no processo; um cliente pode ter vários).
  const procsDe = (c: Cliente) => procs.filter((p) => p.clienteId === c.id || p.cliente === c.nome);
  const tiposDe = (c: Cliente) => {
    const t = Array.from(new Set(procsDe(c).map((p) => p.area).filter(Boolean)));
    return t.length ? t : c.tipoProcesso ? [c.tipoProcesso] : [];
  };
  const SITUACOES_PROC = ["Judicializar", "Protocolar no Administrativo"];
  // Ativo/Inativo vêm dos processos: ativo = tem algum processo em curso; inativo = todos concluídos/arquivados.
  // Sem processos, vale o status do cadastro.
  const situacaoDe = (c: Cliente) => {
    if (c.status === "Prospecto") return "Prospecto";
    const ps = procsDe(c);
    if (ps.length) return ps.some(processoAtivo) ? "Ativo" : "Inativo";
    return c.status === "Inativo" ? "Inativo" : "Ativo";
  };
  const casaStatus = (c: Cliente, st: string) => (SITUACOES_PROC.includes(st)
    ? procsDe(c).some((p) => p.status === st) || c.status === st
    : situacaoDe(c) === st);
  const FILTROS_STATUS = ["", "Ativo", ...SITUACOES_PROC, "Prospecto", "Inativo"];

  const filtrados = lista.filter(
    (c) =>
      (!status || casaStatus(c, status)) &&
      (!corretor || (corretor === "-" ? !c.corretorId : c.corretorId === corretor)) &&
      (!area || (area === "-" ? tiposDe(c).length === 0 : tiposDe(c).includes(area))) &&
      [c.nome, c.documento, c.email, c.cidade, c.rg].join(" ").toLowerCase().includes(busca.toLowerCase()),
  );

  return (
    <>
      <section className="stats">
        <StatCard hero label="Total de clientes" valor={String(lista.length)} />
        <StatCard label="Ativos" valor={String(lista.filter((c) => situacaoDe(c) === "Ativo").length)} />
        <StatCard label="Processos a judicializar" valor={String(procs.filter((p) => p.status === "Judicializar").length)} />
        <StatCard label="A protocolar no administrativo" valor={String(procs.filter((p) => p.status === "Protocolar no Administrativo").length)} />
      </section>

      <section className="card">
        <div className="toolbar">
          <div className="filtros-linhas">
            <div className="pills" aria-label="Filtrar por status">
              {FILTROS_STATUS.map((st) => (
                <button key={st || "todos"} className={`pill ${status === st ? "active" : ""}`} onClick={() => setStatus(st)}
                  style={status === st ? undefined : { background: "var(--surface-2)" }}>
                  {st || "Todos"}<span className="count">{st ? lista.filter((c) => casaStatus(c, st)).length : lista.length}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="toolbar-right">
            <label className="search" style={{ background: "var(--surface-2)", display: "flex", width: 240 }}>
              <Search size={16} />
              <input placeholder="Buscar cliente..." value={busca} onChange={(e) => setBusca(e.target.value)} />
            </label>
            {pode("Processos") && (
              <select className="select" style={{ width: 200, height: 40 }} value={area} onChange={(e) => setArea(e.target.value)} aria-label="Filtrar por área de atuação">
                <option value="">Todas as áreas</option>
                {AREAS_PROCESSO.map((a) => (
                  <option key={a} value={a}>{a} ({lista.filter((c) => tiposDe(c).includes(a)).length})</option>
                ))}
                <option value="-">Sem processo</option>
              </select>
            )}
            {pode("Corretores") && (
              <select className="select" style={{ width: 200, height: 40 }} value={corretor} onChange={(e) => setCorretor(e.target.value)} aria-label="Filtrar por corretor">
                <option value="">Todos os corretores</option>
                <option value="-">Sem corretor</option>
                {corretores.map((k) => <option key={k.id} value={k.id}>{k.nome}</option>)}
              </select>
            )}
            {podeFazer("clientes_criar") && <button className="btn btn-primary" onClick={() => setNovo(true)}><Plus size={17} /> Novo cliente</button>}
          </div>
        </div>

        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr><th>Cliente</th><th>CPF / CNPJ</th><th>Contato</th><th>Cidade</th><th className="c">Processos</th><th className="c">Documentos</th><th>Status</th><th>Tipo</th><th></th></tr>
            </thead>
            <tbody>
              {filtrados.map((c) => (
                <tr key={c.id} className="click" onClick={() => router.push(`/clientes/${c.id}`)}>
                  <td>
                    <div className="who">
                      <span className="avatar sm gray">{iniciais(c.nome)}</span>
                      <div>{c.nome}<small>{c.tipo === "PF" ? "Pessoa física" : "Pessoa jurídica"} · desde {dataBR(c.desde)}</small></div>
                    </div>
                  </td>
                  <td className="mono">{c.documento}</td>
                  <td>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2, fontWeight: 400, fontSize: 12.5 }}>
                      <span style={{ display: "flex", gap: 6, alignItems: "center" }}><Mail size={13} className="muted" /> {c.email}</span>
                      <span style={{ display: "flex", gap: 6, alignItems: "center" }}><Phone size={13} className="muted" /> {c.telefone}</span>
                    </div>
                  </td>
                  <td>{[c.cidade, c.uf].filter(Boolean).join("/")}</td>
                  <td className="c num">{qtdProc(c)}</td>
                  <td className="c num">{docs.filter((d) => d.clienteId === c.id).length}</td>
                  <td><Badge>{situacaoDe(c)}</Badge></td>
                  <td>{tiposDe(c).length ? <div className="badges">{tiposDe(c).map((t) => <span key={t} className="badge">{t}</span>)}</div> : <span className="muted">—</span>}</td>
                  <td><ChevronRight size={18} className="muted" /></td>
                </tr>
              ))}
              {filtrados.length === 0 && (
                <tr><td colSpan={9} className="empty">{carregando ? "Carregando..." : erro || "Nenhum cliente encontrado."}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>


      {/* Etapa 1: dados do cliente → Etapa 2: processo do cliente */}
      {novo && (
        <FormCliente inicial={{ ...CLIENTE_VAZIO }} onClose={() => setNovo(false)}
          onSalvo={(id, nome, tipoProcesso) => (podeFazer("processos_criar") ? setEtapa2({ id, nome, tipoProcesso }) : router.push(`/clientes/${id}`))} />
      )}
      {etapa2 && (
        <NovoProcesso etapa clienteFixo={etapa2} onClose={() => { const id = etapa2.id; setEtapa2(null); router.push(`/clientes/${id}?aba=processos`); }} />
      )}
    </>
  );
}
