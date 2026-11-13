"use client";

import { useEffect, useState } from "react";
import { Check, Eye, EyeOff, Lock, Pencil, Plus, RotateCcw, Save, ShieldCheck } from "lucide-react";
import { doc, setDoc } from "firebase/firestore";
import { Modal } from "@/components/Shell";
import { StatCard } from "@/components/ui";
import { useAuth } from "@/components/AuthProvider";
import { atualizar, definir, useColecao } from "@/lib/db";
import { criarContaAuth, db, mensagemErro } from "@/lib/firebase";
import { iniciais, type Perfil, type Usuario } from "@/lib/mock";
import {
  MODULOS_PERMISSAO, PERFIS, PERFIS_CONFIGURAVEIS, PERMISSOES_PADRAO, TODAS_CHAVES, permitido,
  type ChavePermissao, type TabelaPermissoes,
} from "@/lib/permissoes";
import CampoData from "@/components/CampoData";

export default function UsuariosPage() {
  const { usuario: eu, podeFazer } = useAuth();
  const { dados: lista, carregando, erro } = useColecao<Usuario>("usuarios", { campo: "nome" });
  const [editando, setEditando] = useState<Partial<Usuario> | null>(null);
  const souAdmin = eu?.perfil === "Administrador";
  // Quem não é administrador não mexe em administradores.
  const podeMexer = (u: Usuario) => souAdmin || u.perfil !== "Administrador";

  const alternarAtivo = async (u: Usuario) => {
    if (u.id === eu?.id) return alert("Você não pode desativar a própria conta.");
    try { await atualizar("usuarios", u.id, { ativo: !u.ativo }); } catch (e) { alert(mensagemErro(e)); }
  };

  return (
    <>
      <section className="stats">
        <StatCard hero label="Usuários" valor={String(lista.length)} />
        <StatCard label="Ativos" valor={String(lista.filter((u) => u.ativo).length)} />
        <StatCard label="Advogados" valor={String(lista.filter((u) => u.perfil === "Advogado" || u.perfil === "Administrador").length)} />
        <StatCard label="Inativos" valor={String(lista.filter((u) => !u.ativo).length)} />
      </section>

      <section className="card" style={{ marginBottom: 16 }}>
        <div className="card-head">
          <h3>Equipe</h3>
          {podeFazer("usuarios_criar") && (
            <button className="btn btn-primary" onClick={() => setEditando({ perfil: "Advogado" })}><Plus size={17} /> Novo usuário</button>
          )}
        </div>
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>Usuário</th><th>OAB</th><th>Perfil</th><th>Último acesso</th><th className="c">Ativo</th><th></th></tr></thead>
            <tbody>
              {lista.map((u) => (
                <tr key={u.id} style={{ opacity: u.ativo ? 1 : 0.55 }}>
                  <td>
                    <div className="who">
                      <span className="avatar sm">{iniciais(u.nome)}</span>
                      <div>{u.nome}{u.id === eu?.id && <span className="muted"> (você)</span>}<small>{u.email}</small></div>
                    </div>
                  </td>
                  <td className="mono">{u.oab || "—"}</td>
                  <td>
                    <span className={`badge ${u.perfil === "Administrador" ? "gray" : ""}`}>
                      {u.perfil === "Administrador" && <ShieldCheck size={13} />} {u.perfil}
                    </span>
                  </td>
                  <td>{u.ultimoAcesso || "—"}</td>
                  <td className="c">
                    <button className={`switch ${u.ativo ? "on" : ""}`} aria-label={u.ativo ? "Desativar" : "Ativar"}
                      disabled={u.id === eu?.id || !podeFazer("usuarios_ativar") || !podeMexer(u)} onClick={() => alternarAtivo(u)} />
                  </td>
                  <td>
                    {podeFazer("usuarios_editar") && podeMexer(u) && (u.id !== eu?.id || souAdmin) && (
                      <button className="icon-btn sm" aria-label="Editar" onClick={() => setEditando(u)}><Pencil size={15} /></button>
                    )}
                  </td>
                </tr>
              ))}
              {lista.length === 0 && (
                <tr><td colSpan={6} className="empty">{carregando ? "Carregando..." : erro || "Nenhum usuário."}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <EditorPermissoes podeEditar={souAdmin} />

      {editando && <FormUsuario inicial={editando} euId={eu?.id} souAdmin={souAdmin} onClose={() => setEditando(null)} />}
    </>
  );
}

/** Tabela "o que cada perfil pode fazer", ação por ação de cada módulo. Só o administrador altera. */
function EditorPermissoes({ podeEditar }: { podeEditar: boolean }) {
  const { permissoes } = useAuth();
  const [tabela, setTabela] = useState<TabelaPermissoes>(permissoes ?? PERMISSOES_PADRAO);
  const [alterado, setAlterado] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState("");

  // Acompanha o que está salvo enquanto não houver alteração pendente nesta tela
  // (sem a tabela salva carregada, mantém o que está na tela — nunca volta sozinho para o padrão).
  useEffect(() => { if (!alterado && permissoes) setTabela(permissoes); }, [permissoes, alterado]);

  const marcado = (p: Perfil, k: ChavePermissao) => permitido(tabela, p, k);
  const marcar = (p: Perfil, chaves: readonly ChavePermissao[], v: boolean) => {
    setTabela((t) => ({ ...t, [p]: { ...(t[p] ?? {}), ...Object.fromEntries(chaves.map((k) => [k, v])) } }));
    setAlterado(true); setMsg("");
  };

  const salvar = async () => {
    setSalvando(true); setMsg("");
    try {
      // Grava a tabela completa (toda ação de todo perfil), que é o que as regras do Firebase leem.
      const completa = Object.fromEntries(PERFIS_CONFIGURAVEIS.map((p) => [p, Object.fromEntries(TODAS_CHAVES.map((k) => [k, marcado(p, k)]))]));
      await setDoc(doc(db, "config", "permissoes"), completa);
      setTabela(completa as TabelaPermissoes);
      setAlterado(false);
      setMsg("Permissões salvas. Já valem para todos os usuários.");
    } catch (e) {
      setMsg(mensagemErro(e));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <section className="card">
      <div className="card-head">
        <h3>Permissões por perfil</h3>
        {podeEditar ? (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="btn" onClick={() => { setTabela(PERMISSOES_PADRAO); setAlterado(true); setMsg(""); }}><RotateCcw size={15} /> Restaurar padrão</button>
            <button className="btn btn-primary" onClick={salvar} disabled={!alterado || salvando}>
              <Save size={15} /> {salvando ? "Salvando..." : "Salvar permissões"}
            </button>
          </div>
        ) : <span className="muted" style={{ fontSize: 13 }}><Lock size={13} /> Só o administrador altera</span>}
      </div>
      <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>
        Marque o que cada perfil pode fazer em cada módulo. O <b>Administrador</b> sempre pode tudo.
        Sem a primeira opção de um módulo (acessar), o perfil não vê o módulo no menu.
      </p>
      {msg && <div className={alterado ? "error" : "aviso ok"} style={{ marginBottom: 12 }}>{!alterado && <Check size={16} />}<div>{msg}</div></div>}
      {alterado && <div className="aviso" style={{ marginBottom: 12 }}><div>Há alterações não salvas.</div></div>}
      <div className="table-wrap">
        <table className="tbl tbl-permissoes" style={{ minWidth: 640 }}>
          <thead><tr><th>Ação</th>{PERFIS.map((p) => <th key={p} className="c">{p}</th>)}</tr></thead>
          {MODULOS_PERMISSAO.map((m) => {
            const chaves = m.acoes.map((a) => a.chave);
            return (
              <tbody key={m.modulo}>
                <tr className="perm-modulo">
                  <td>{m.modulo}</td>
                  {PERFIS.map((p) => {
                    const todos = chaves.every((k) => marcado(p, k));
                    return (
                      <td key={p} className="c">
                        {p === "Administrador" ? null : (
                          <label className="checkbox" title={`Marcar/desmarcar tudo de ${m.modulo} para ${p}`}>
                            <input type="checkbox" checked={todos} disabled={!podeEditar}
                              ref={(el) => { if (el) el.indeterminate = !todos && chaves.some((k) => marcado(p, k)); }}
                              onChange={(e) => marcar(p, chaves, e.target.checked)} />
                          </label>
                        )}
                      </td>
                    );
                  })}
                </tr>
                {m.acoes.map((a) => (
                  <tr key={a.chave}>
                    <td className="perm-acao">{a.rotulo}{"detalhe" in a && <small>{a.detalhe}</small>}</td>
                    {PERFIS.map((p) => (
                      <td key={p} className="c">
                        {p === "Administrador" ? <span className="check on" title="Administrador sempre pode"><Check size={14} /></span> : (
                          <input type="checkbox" className="perm-check" aria-label={`${p}: ${a.rotulo}`} checked={marcado(p, a.chave)}
                            disabled={!podeEditar} onChange={(e) => marcar(p, [a.chave], e.target.checked)} />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            );
          })}
        </table>
      </div>
    </section>
  );
}

function FormUsuario({ inicial, euId, souAdmin, onClose }: { inicial: Partial<Usuario>; euId?: string; souAdmin: boolean; onClose: () => void }) {
  const [u, setU] = useState(inicial);
  const [senha, setSenha] = useState("");
  const [ver, setVer] = useState(false);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const set = (k: keyof Usuario, v: string) => setU((x) => ({ ...x, [k]: v }));
  const novo = !u.id;
  const perfis = souAdmin ? PERFIS : PERFIS_CONFIGURAVEIS; // só o administrador cria/promove administradores

  const confirmar = async () => {
    setErro("");
    if (!u.nome?.trim()) return setErro("Informe o nome.");
    if (novo && !u.email?.includes("@")) return setErro("Informe um e-mail válido.");
    if (novo && senha.length < 6) return setErro("A senha inicial deve ter ao menos 6 caracteres.");
    if (!novo && u.id === euId && u.perfil !== "Administrador") return setErro("Você não pode remover seu próprio perfil de administrador.");
    setSalvando(true);
    try {
      const dados = { nome: u.nome!.trim(), perfil: u.perfil ?? "Advogado", oab: u.oab?.trim() ?? "", dataNascimento: u.dataNascimento ?? "" };
      if (novo) {
        const email = u.email!.trim().toLowerCase();
        const uid = await criarContaAuth(email, senha);
        await definir("usuarios", uid, { ...dados, email, ativo: true, ultimoAcesso: "Nunca" });
      } else {
        await atualizar("usuarios", u.id!, dados);
      }
      onClose();
    } catch (e) {
      setErro(mensagemErro(e));
      setSalvando(false);
    }
  };

  return (
    <Modal titulo={novo ? "Novo usuário" : "Editar usuário"} sub="Acesso ao sistema" onClose={onClose}
      footer={<>
        <button className="btn" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" disabled={salvando} onClick={confirmar}>{salvando ? "Salvando..." : "Salvar"}</button>
      </>}>
      <div className="form-grid">
        <div className="field span-2"><label>Nome completo</label>
          <input className="input" value={u.nome ?? ""} onChange={(e) => set("nome", e.target.value)} autoFocus /></div>
        <div className="field span-2"><label>E-mail {novo ? "" : "(não pode ser alterado)"}</label>
          <input className="input" type="email" value={u.email ?? ""} disabled={!novo} onChange={(e) => set("email", e.target.value)} /></div>
        {novo && (
          <div className="field span-2"><label>Senha inicial</label>
            <div className="pwd">
              <input className="input" type={ver ? "text" : "password"} autoComplete="new-password" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Mínimo 6 caracteres" />
              <button type="button" onClick={() => setVer((v) => !v)} aria-label={ver ? "Ocultar senha" : "Mostrar senha"}>
                {ver ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
        )}
        <div className="field"><label>Perfil</label>
          <select className="select" value={u.perfil} onChange={(e) => set("perfil", e.target.value)}>
            {perfis.map((p) => <option key={p}>{p}</option>)}
          </select></div>
        <div className="field"><label>OAB (opcional)</label>
          <input className="input" placeholder="OAB/UF 000.000" value={u.oab ?? ""} onChange={(e) => set("oab", e.target.value)} /></div>
        <div className="field"><label>Data de nascimento</label>
          <CampoData value={u.dataNascimento} onChange={(v) => set("dataNascimento", v)} /></div>
      </div>
      {novo && <p className="muted" style={{ fontSize: 12.5, marginBottom: 0 }}>Informe a senha inicial ao colaborador. Ele pode trocá-la em “Meu perfil”.</p>}
      {erro && <div className="error" style={{ marginTop: 12 }}>{erro}</div>}
    </Modal>
  );
}
