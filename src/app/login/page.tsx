"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Moon, Sun } from "lucide-react";
import {
  browserLocalPersistence, browserSessionPersistence, createUserWithEmailAndPassword,
  sendPasswordResetEmail, setPersistence, signInWithEmailAndPassword,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, writeBatch } from "firebase/firestore";
import { auth, db, mensagemErro } from "@/lib/firebase";
import { useTema } from "@/components/ThemeProvider";
import { useAuth } from "@/components/AuthProvider";
import { Brand } from "@/components/Shell";

type Modo = "carregando" | "login" | "setup";

export default function LoginPage() {
  const router = useRouter();
  const { tema, alternar } = useTema();
  const { user, usuario, aviso } = useAuth();
  const [modo, setModo] = useState<Modo>("carregando");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [lembrar, setLembrar] = useState(true);
  const [ver, setVer] = useState(false);
  // Campos "somente leitura" até receberem o foco: o navegador não preenche sozinho o e-mail e a senha salvos.
  const [liberado, setLiberado] = useState(false);
  const [erro, setErro] = useState("");
  const [info, setInfo] = useState("");
  const [enviando, setEnviando] = useState(false);

  // Já logado com cadastro válido → vai para o sistema.
  useEffect(() => {
    if (user && usuario) router.replace("/dashboard");
  }, [user, usuario, router]);

  // Se ainda não existe administrador, mostra a configuração inicial.
  useEffect(() => {
    const limite = new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), 10000));
    Promise.race([getDoc(doc(db, "config", "setup")), limite])
      .then((s) => setModo(s.exists() ? "login" : "setup"))
      .catch((e) => {
        setModo("login");
        setErro((e as { code?: string })?.code === "permission-denied"
          ? "O banco de dados recusou o acesso: as regras de segurança do Firestore ainda não foram publicadas."
          : "Não foi possível conectar ao banco de dados. Verifique sua internet ou se o Firestore foi criado no projeto.");
      });
  }, []);

  useEffect(() => { if (aviso) setErro(aviso); }, [aviso]);

  const entrar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) return setErro("Informe um e-mail válido.");
    if (!senha) return setErro("Informe a senha.");
    setErro(""); setInfo(""); setEnviando(true);
    try {
      await setPersistence(auth, lembrar ? browserLocalPersistence : browserSessionPersistence);
      const cred = await signInWithEmailAndPassword(auth, email.trim(), senha);
      const perfil = await getDoc(doc(db, "usuarios", cred.user.uid));
      if (!perfil.exists()) {
        await auth.signOut();
        setErro("Usuário sem cadastro no sistema. Peça ao administrador para liberar seu acesso.");
      }
    } catch (err) {
      setErro(mensagemErro(err));
    } finally {
      setEnviando(false);
    }
  };

  const criarAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return setErro("Informe seu nome.");
    if (!email.includes("@")) return setErro("Informe um e-mail válido.");
    if (senha.length < 6) return setErro("A senha deve ter ao menos 6 caracteres.");
    setErro(""); setEnviando(true);
    try {
      let uid: string;
      try {
        uid = (await createUserWithEmailAndPassword(auth, email.trim(), senha)).user.uid;
      } catch (err) {
        // Conta já criada antes (ex.: tentativa interrompida) → entra com ela.
        if ((err as { code?: string }).code !== "auth/email-already-in-use") throw err;
        uid = (await signInWithEmailAndPassword(auth, email.trim(), senha)).user.uid;
      }
      const batch = writeBatch(db);
      batch.set(doc(db, "usuarios", uid), {
        nome: nome.trim(), email: email.trim().toLowerCase(), perfil: "Administrador", ativo: true,
        ultimoAcesso: "—", criadoEm: serverTimestamp(),
      });
      batch.set(doc(db, "config", "setup"), { adminUid: uid, criadoEm: serverTimestamp() });
      await batch.commit();
      router.replace("/dashboard");
    } catch (err) {
      setErro(mensagemErro(err));
    } finally {
      setEnviando(false);
    }
  };

  const esqueci = async () => {
    if (!email.includes("@")) return setErro("Digite seu e-mail acima para receber o link de redefinição.");
    setErro("");
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setInfo("Enviamos um link de redefinição de senha para o seu e-mail.");
    } catch (err) {
      setErro(mensagemErro(err));
    }
  };

  const setup = modo === "setup";

  return (
    <div className="login">
      <section className="login-art">
        <Brand className="brand-login" />
        <div>
          <h2>Gestão completa para escritórios de advocacia</h2>
          <p style={{ marginTop: 14 }}>
            Clientes, processos, prazos, documentos e financeiro em um só lugar — no computador e no celular.
          </p>
        </div>
        <div className="login-stats">
          <div><b>Clientes</b><span>cadastro completo</span></div>
          <div><b>Prazos</b><span>agenda e andamentos</span></div>
          <div><b>24/7</b><span>acesso em qualquer lugar</span></div>
        </div>
      </section>

      <section className="login-form-wrap">
        <button className="icon-btn theme-float" onClick={alternar} aria-label="Alternar tema">
          {tema === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {modo === "carregando" ? (
          <div className="muted">Carregando...</div>
        ) : (
          <form className="login-form" onSubmit={setup ? criarAdmin : entrar} noValidate autoComplete="off">
            <Brand className="brand-m" />
            <div>
              <h1>{setup ? "Configuração inicial" : "Bem-vindo de volta"}</h1>
              <p className="muted" style={{ margin: "6px 0 0" }}>
                {setup
                  ? "Nenhum administrador cadastrado ainda. Crie a conta do administrador do escritório."
                  : "Entre com suas credenciais para acessar o sistema."}
              </p>
            </div>
            {setup && (
              <div className="field">
                <label htmlFor="nome">Nome completo</label>
                <input id="nome" className="input" autoComplete="name" value={nome} onChange={(e) => setNome(e.target.value)} />
              </div>
            )}
            <div className="field">
              <label htmlFor="email">E-mail</label>
              <input id="email" name="juris-email" className="input" type="email" autoComplete="off" readOnly={!liberado} onFocus={() => setLiberado(true)}
                value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="senha">Senha</label>
              <div className="pwd">
                <input id="senha" name="juris-senha" className="input" type={ver ? "text" : "password"}
                  autoComplete="new-password" readOnly={!liberado} onFocus={() => setLiberado(true)}
                  placeholder="••••••••" value={senha} onChange={(e) => setSenha(e.target.value)} />
                <button type="button" onClick={() => setVer((v) => !v)} aria-label={ver ? "Ocultar senha" : "Mostrar senha"}>
                  {ver ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            {!setup && (
              <div className="row-between">
                <label className="checkbox">
                  <input type="checkbox" checked={lembrar} onChange={(e) => setLembrar(e.target.checked)} /> Lembrar de mim
                </label>
                <button type="button" className="link" style={{ background: "none", border: 0, padding: 0 }} onClick={esqueci}>
                  Esqueci a senha
                </button>
              </div>
            )}
            {erro && <div className="error">{erro}</div>}
            {info && <div className="pos" style={{ fontSize: 13 }}>{info}</div>}
            <button className="btn btn-primary full" disabled={enviando}>
              {enviando ? "Aguarde..." : setup ? "Criar administrador" : "Entrar"}
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
