"use client";

import { useState } from "react";
import Link from "next/link";
import { BarChart3, Copy, Mail, Pencil, Phone, Plus, Search, Trash2 } from "lucide-react";
import { Modal } from "@/components/Shell";
import { StatCard } from "@/components/ui";
import { useAuth } from "@/components/AuthProvider";
import { mCep, mCpf, mTel, soDig, UFS } from "@/components/FormCliente";
import { excluir, hojeISO, salvar, useColecao } from "@/lib/db";
import { mensagemErro } from "@/lib/firebase";
import { dataBR, iniciais, TIPOS_PIX, type Cliente, type Corretor, type Processo } from "@/lib/mock";
import CampoData from "@/components/CampoData";

const VAZIO: Omit<Corretor, "id"> = {
  nome: "", cpf: "", telefone: "", email: "", tipoPix: "CPF", chavePix: "",
  cep: "", rua: "", numero: "", complemento: "", bairro: "", cidade: "", uf: "", observacoes: "", ativo: true, desde: "",
};

export default function CorretoresPage() {
  const { pode, podeFazer } = useAuth();
  const { dados: lista, carregando, erro } = useColecao<Corretor>("corretores", { campo: "nome" });
  const { dados: clientes } = useColecao<Cliente>("clientes");
  const { dados: processos } = useColecao<Processo>("processos", undefined, pode("Processos"));
  const [busca, setBusca] = useState("");
  const [editando, setEditando] = useState<Corretor | Omit<Corretor, "id"> | null>(null);

  const clientesDe = (id: string) => clientes.filter((c) => c.corretorId === id);
  const processosDe = (id: string) => {
    const nomes = new Set(clientesDe(id).map((c) => c.nome));
    return processos.filter((p) => nomes.has(p.cliente));
  };
  const filtrados = lista.filter((k) =>
    [k.nome, k.cpf, k.email, k.telefone, k.cidade].join(" ").toLowerCase().includes(busca.toLowerCase()));
  const indicados = clientes.filter((c) => c.corretorId).length;

  const remover = async (k: Corretor) => {
    const n = clientesDe(k.id).length;
    if (n) return alert(`${k.nome} tem ${n} cliente(s) vinculado(s). Desvincule os clientes antes de excluir, ou marque o corretor como inativo.`);
    if (!confirm(`Excluir o corretor "${k.nome}"?`)) return;
    try { await excluir("corretores", k.id); } catch (e) { alert(mensagemErro(e)); }
  };

  return (
    <>
      <section className="stats">
        <StatCard hero label="Corretores" valor={String(lista.length)} />
        <StatCard label="Ativos" valor={String(lista.filter((k) => k.ativo).length)} />
        <StatCard label="Clientes indicados" valor={String(indicados)} />
        <StatCard label="Sem corretor" valor={String(clientes.length - indicados)} />
      </section>

      <section className="card">
        <div className="toolbar">
          <h3 style={{ fontSize: 17, fontWeight: 500 }}>Corretores parceiros</h3>
          <div className="toolbar-right">
            <label className="search" style={{ background: "var(--surface-2)", display: "flex", width: 240 }}>
              <Search size={16} />
              <input placeholder="Buscar corretor..." value={busca} onChange={(e) => setBusca(e.target.value)} />
            </label>
            {podeFazer("corretores_criar") && <button className="btn btn-primary" onClick={() => setEditando({ ...VAZIO })}><Plus size={17} /> Novo corretor</button>}
          </div>
        </div>

        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr><th>Corretor</th><th>CPF</th><th>Contato</th><th>Chave PIX</th><th className="c">Clientes</th>
                {pode("Processos") && <th className="c">Processos</th>}<th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {filtrados.map((k) => (
                <tr key={k.id} style={{ opacity: k.ativo ? 1 : 0.55 }}>
                  <td>
                    <div className="who">
                      <span className="avatar sm">{iniciais(k.nome)}</span>
                      <div>{k.nome}<small>{[k.cidade, k.uf].filter(Boolean).join("/") || "—"} · desde {dataBR(k.desde)}</small></div>
                    </div>
                  </td>
                  <td className="mono">{k.cpf || "—"}</td>
                  <td>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2, fontWeight: 400, fontSize: 12.5 }}>
                      {k.telefone && <span style={{ display: "flex", gap: 6, alignItems: "center" }}><Phone size={13} className="muted" /> {k.telefone}</span>}
                      {k.email && <span style={{ display: "flex", gap: 6, alignItems: "center" }}><Mail size={13} className="muted" /> {k.email}</span>}
                    </div>
                  </td>
                  <td>
                    {k.chavePix ? (
                      <button className="pix" title="Copiar chave PIX" onClick={() => navigator.clipboard?.writeText(k.chavePix).catch(() => {})}>
                        <small>{k.tipoPix}</small> {k.chavePix} <Copy size={12} />
                      </button>
                    ) : "—"}
                  </td>
                  <td className="c num">{clientesDe(k.id).length}</td>
                  {pode("Processos") && <td className="c num">{processosDe(k.id).length}</td>}
                  <td><span className={`badge ${k.ativo ? "pos" : ""}`}>{k.ativo ? "Ativo" : "Inativo"}</span></td>
                  <td>
                    <div className="card-actions">
                      <Link className="icon-btn sm" title="Ver no dashboard" aria-label="Ver no dashboard" href={`/dashboard?corretor=${k.id}`}><BarChart3 size={15} /></Link>
                      {podeFazer("corretores_editar") && <button className="icon-btn sm" aria-label="Editar" onClick={() => setEditando(k)}><Pencil size={15} /></button>}
                      {podeFazer("corretores_excluir") && <button className="icon-btn sm" aria-label="Excluir" onClick={() => remover(k)}><Trash2 size={15} /></button>}
                    </div>
                  </td>
                </tr>
              ))}
              {filtrados.length === 0 && (
                <tr><td colSpan={8} className="empty">{carregando ? "Carregando..." : erro || "Nenhum corretor cadastrado."}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {editando && <FormCorretor inicial={editando} onClose={() => setEditando(null)} />}
    </>
  );
}

function FormCorretor({ inicial, onClose }: { inicial: Corretor | Omit<Corretor, "id">; onClose: () => void }) {
  const [k, setK] = useState(inicial);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [buscandoCep, setBuscandoCep] = useState(false);
  const novo = !("id" in k);
  const set = <C extends keyof Corretor>(c: C, v: Corretor[C]) => setK((x) => ({ ...x, [c]: v }));

  const buscarCep = async (cep: string) => {
    if (soDig(cep).length !== 8) return;
    setBuscandoCep(true);
    try {
      const j = await (await fetch(`https://viacep.com.br/ws/${soDig(cep)}/json/`)).json();
      if (!j.erro) setK((x) => ({ ...x, rua: j.logradouro || x.rua, bairro: j.bairro || x.bairro, cidade: j.localidade || x.cidade, uf: j.uf || x.uf }));
    } catch { /* preenchimento manual */ } finally { setBuscandoCep(false); }
  };

  // Máscara da chave PIX conforme o tipo escolhido.
  const mascaraPix = (v: string) => (k.tipoPix === "CPF" ? mCpf(v) : k.tipoPix === "Telefone" ? mTel(v) : v.trim());

  const confirmar = async () => {
    if (!k.nome.trim()) return setErro("Informe o nome.");
    setSalvando(true); setErro("");
    try {
      await salvar("corretores", novo ? { ...k, nome: k.nome.trim(), desde: hojeISO() } : { ...k, nome: k.nome.trim() });
      onClose();
    } catch (e) {
      setErro(mensagemErro(e));
      setSalvando(false);
    }
  };

  return (
    <Modal wide titulo={novo ? "Novo corretor" : "Editar corretor"} sub="Parceiro que indica clientes ao escritório" onClose={onClose}
      footer={<>
        <button className="btn" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" disabled={salvando} onClick={confirmar}>{salvando ? "Salvando..." : "Salvar"}</button>
      </>}>
      <div className="form-section">Identificação e contato</div>
      <div className="form-grid g3">
        <div className="field span-2"><label>Nome completo</label>
          <input className="input" value={k.nome} onChange={(e) => set("nome", e.target.value)} autoFocus /></div>
        <div className="field"><label>CPF</label>
          <input className="input" inputMode="numeric" placeholder="000.000.000-00" value={k.cpf} onChange={(e) => set("cpf", mCpf(e.target.value))} /></div>
        <div className="field"><label>Telefone / WhatsApp</label>
          <input className="input" inputMode="tel" placeholder="(00) 00000-0000" value={k.telefone} onChange={(e) => set("telefone", mTel(e.target.value))} /></div>
        <div className="field"><label>E-mail</label>
          <input className="input" type="email" value={k.email} onChange={(e) => set("email", e.target.value)} /></div>
        <div className="field"><label>Data de nascimento</label>
          <CampoData value={k.dataNascimento} onChange={(v) => set("dataNascimento", v)} /></div>
      </div>

      <div className="form-section">Chave PIX</div>
      <div className="form-grid g3">
        <div className="field"><label>Tipo da chave</label>
          <select className="select" value={k.tipoPix} onChange={(e) => { set("tipoPix", e.target.value); set("chavePix", ""); }}>
            {TIPOS_PIX.map((t) => <option key={t}>{t}</option>)}
          </select></div>
        <div className="field span-2"><label>Chave PIX</label>
          <input className="input" value={k.chavePix} onChange={(e) => set("chavePix", mascaraPix(e.target.value))}
            placeholder={k.tipoPix === "E-mail" ? "email@exemplo.com" : k.tipoPix === "Telefone" ? "(00) 00000-0000" : ""} /></div>
      </div>

      <div className="form-section">Endereço</div>
      <div className="form-grid g3">
        <div className="field"><label>CEP {buscandoCep && <span className="muted">— buscando...</span>}</label>
          <input className="input" inputMode="numeric" placeholder="00000-000" value={k.cep ?? ""}
            onChange={(e) => { const v = mCep(e.target.value); set("cep", v); buscarCep(v); }} /></div>
        <div className="field span-2"><label>Rua / Logradouro</label>
          <input className="input" value={k.rua ?? ""} onChange={(e) => set("rua", e.target.value)} /></div>
        <div className="field"><label>Número</label>
          <input className="input" value={k.numero ?? ""} onChange={(e) => set("numero", e.target.value)} /></div>
        <div className="field span-2"><label>Complemento</label>
          <input className="input" value={k.complemento ?? ""} onChange={(e) => set("complemento", e.target.value)} /></div>
        <div className="field"><label>Bairro</label>
          <input className="input" value={k.bairro ?? ""} onChange={(e) => set("bairro", e.target.value)} /></div>
        <div className="field"><label>Cidade</label>
          <input className="input" value={k.cidade ?? ""} onChange={(e) => set("cidade", e.target.value)} /></div>
        <div className="field"><label>UF</label>
          <select className="select" value={k.uf ?? ""} onChange={(e) => set("uf", e.target.value)}>
            <option value="">—</option>{UFS.map((u) => <option key={u}>{u}</option>)}
          </select></div>
      </div>

      <div className="form-section">Outros</div>
      <div className="form-grid">
        <div className="field span-2"><label>Observações</label>
          <textarea className="textarea" rows={2} value={k.observacoes ?? ""} onChange={(e) => set("observacoes", e.target.value)}
            placeholder="Ex.: comissão combinada, região de atuação..." /></div>
        <label className="checkbox"><input type="checkbox" checked={k.ativo} onChange={(e) => set("ativo", e.target.checked)} /> Corretor ativo</label>
      </div>
      {erro && <div className="error" style={{ marginTop: 12 }}>{erro}</div>}
    </Modal>
  );
}
