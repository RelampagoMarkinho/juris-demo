"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth";
import { useTema, type Tema } from "@/components/ThemeProvider";
import { useAuth } from "@/components/AuthProvider";
import { auth, mensagemErro } from "@/lib/firebase";
import { atualizar } from "@/lib/db";
import { iniciais } from "@/lib/mock";
import DadosEmpresa from "@/components/DadosEmpresa";
import CampoData from "@/components/CampoData";
import CampoSenha from "@/components/CampoSenha";

const PREVIEW: Record<Tema, { bg: string; side: string; card: string; ink: string }> = {
  light: { bg: "#e9e8ec", side: "#ffffff", card: "#ffffff", ink: "#1f1f22" },
  dark: { bg: "#0e0e10", side: "#18181b", card: "#18181b", ink: "#ececef" },
};

export default function PerfilPage() {
  const { tema, setTema } = useTema();
  const { usuario, podeFazer } = useAuth();
  const [nome, setNome] = useState("");
  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  const [conf, setConf] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [salvando, setSalvando] = useState(false);

  const [nascimento, setNascimento] = useState("");
  const [aba, setAba] = useState<"perfil" | "empresa">("perfil");
  useEffect(() => { if (usuario) { setNome(usuario.nome); setNascimento(usuario.dataNascimento ?? ""); } }, [usuario]);
  if (!usuario) return null;

  const salvar = async () => {
    setMsg(null);
    if (nova && nova !== conf) return setMsg({ ok: false, t: "A confirmação não confere com a nova senha." });
    if (nova && nova.length < 6) return setMsg({ ok: false, t: "A nova senha deve ter ao menos 6 caracteres." });
    if (nova && !atual) return setMsg({ ok: false, t: "Informe a senha atual para trocar a senha." });
    setSalvando(true);
    try {
      if (nome.trim() && nome.trim() !== usuario.nome) await atualizar("usuarios", usuario.id, { nome: nome.trim() });
      if (nascimento !== (usuario.dataNascimento ?? "")) await atualizar("usuarios", usuario.id, { dataNascimento: nascimento });
      if (nova && auth.currentUser?.email) {
        await reauthenticateWithCredential(auth.currentUser, EmailAuthProvider.credential(auth.currentUser.email, atual));
        await updatePassword(auth.currentUser, nova);
        setAtual(""); setNova(""); setConf("");
      }
      setMsg({ ok: true, t: "Alterações salvas." });
    } catch (e) {
      setMsg({ ok: false, t: mensagemErro(e) });
    } finally {
      setSalvando(false);
    }
  };

  const admin = podeFazer("config_empresa"); // pode editar os dados da empresa

  return (
    <>
    <div className="tabs" style={{ marginTop: 0 }}>
      <button className={aba === "perfil" ? "on" : ""} onClick={() => setAba("perfil")}>Meu perfil</button>
      {admin && <button className={aba === "empresa" ? "on" : ""} onClick={() => setAba("empresa")}>Dados da empresa</button>}
    </div>
    {aba === "empresa" && admin ? <DadosEmpresa /> : (
    <div className="grid-2 even">
      <section className="card">
        <div className="profile-card" style={{ marginBottom: 22 }}>
          <span className="avatar lg">{iniciais(usuario.nome)}</span>
          <div>
            <h3 style={{ fontSize: 20 }}>{usuario.nome}</h3>
            <div className="muted">{usuario.perfil} · {usuario.email}</div>
          </div>
        </div>
        <div className="form-grid">
          <div className="field span-2"><label>Nome</label>
            <input className="input" value={nome} onChange={(e) => setNome(e.target.value)} /></div>
          <div className="field span-2"><label>Data de nascimento</label>
            <CampoData value={nascimento} onChange={setNascimento} /></div>
          <div className="field span-2"><label>E-mail</label>
            <input className="input" value={usuario.email} disabled /></div>
          <div className="field span-2"><label>Senha atual</label>
            <CampoSenha autoComplete="current-password" value={atual} onChange={setAtual} placeholder="Necessária só para trocar a senha" /></div>
          <div className="field"><label>Nova senha</label>
            <CampoSenha autoComplete="new-password" value={nova} onChange={setNova} /></div>
          <div className="field"><label>Confirmar senha</label>
            <CampoSenha autoComplete="new-password" value={conf} onChange={setConf} /></div>
        </div>
        <div className="modal-foot" style={{ alignItems: "center" }}>
          {msg && <span className={msg.ok ? "pos" : "error"} style={{ fontSize: 13, marginRight: "auto" }}>{msg.t}</span>}
          <button className="btn btn-primary" onClick={salvar} disabled={salvando}>
            {salvando ? "Salvando..." : msg?.ok ? <><Check size={16} /> Salvo</> : "Salvar alterações"}
          </button>
        </div>
      </section>

      <section className="card">
        <div className="card-head"><h3>Aparência</h3></div>
        <p className="muted" style={{ marginTop: -6 }}>Escolha o tema da interface. A preferência fica salva neste dispositivo.</p>
        <div className="theme-opts">
          {(["light", "dark"] as Tema[]).map((t) => {
            const c = PREVIEW[t];
            return (
              <button key={t} className={`theme-opt ${tema === t ? "on" : ""}`} onClick={() => setTema(t)}>
                <div className="mini" style={{ background: c.bg }}>
                  <i style={{ width: "26%", background: c.side }} />
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{ display: "flex", gap: 6, height: "40%" }}>
                      <i style={{ flex: 1, background: c.ink }} />
                      <i style={{ flex: 1, background: c.card }} />
                    </div>
                    <i style={{ flex: 1, background: c.card }} />
                  </div>
                </div>
                <strong>{t === "light" ? "Claro" : "Escuro"}</strong>
              </button>
            );
          })}
        </div>
      </section>
    </div>
    )}
    </>
  );
}
