"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { doc, onSnapshot, setDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import type { Usuario } from "@/lib/mock";
import { PERMISSOES_PADRAO, permitido, type ChavePermissao, type TabelaPermissoes } from "@/lib/permissoes";

export type Modulo = "Dashboard" | "Clientes" | "Corretores" | "Processos" | "Financeiro" | "Documentos" | "Usuários";

/** Permissão de acesso a cada módulo do menu. */
const VER: Record<Modulo, ChavePermissao> = {
  Dashboard: "dashboard_ver", Clientes: "clientes_ver", Corretores: "corretores_ver", Processos: "processos_ver",
  Financeiro: "financeiro_ver", Documentos: "documentos_ver", Usuários: "usuarios_ver",
};

type Ctx = {
  user: User | null;
  usuario: Usuario | null;   // documento em /usuarios/{uid}
  carregando: boolean;
  aviso: string;             // motivo de logout forçado (conta inativa etc.)
  pode: (m: Modulo) => boolean;              // acessa o módulo
  podeFazer: (a: ChavePermissao) => boolean; // pode fazer a ação (tela Usuários → Permissões)
  permissoes: TabelaPermissoes | null;
  sair: () => Promise<void>;
};

const AuthCtx = createContext<Ctx>({
  user: null, usuario: null, carregando: true, aviso: "", pode: () => false, podeFazer: () => false, permissoes: null, sair: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [aviso, setAviso] = useState("");
  const [permissoes, setPermissoes] = useState<TabelaPermissoes | null>(null);
  const [religar, setReligar] = useState(0); // nova tentativa de ler as permissões após uma recusa

  useEffect(() => onAuthStateChanged(auth, (u) => {
    setUser(u);
    if (!u) {
      setUsuario(null);
      setCarregando(false);
    }
  }), []);

  // Perfil do usuário logado, em tempo real (se o admin desativar, a sessão cai na hora).
  useEffect(() => {
    if (!user) return;
    setCarregando(true);
    let primeiro = true;
    const unsub = onSnapshot(
      doc(db, "usuarios", user.uid),
      (snap) => {
        if (!snap.exists()) {
          // Conta criada no Auth mas sem cadastro no sistema (ex.: durante a configuração inicial).
          setUsuario(null);
          setCarregando(false);
          return;
        }
        const u = { ...(snap.data() as Omit<Usuario, "id">), id: snap.id } as Usuario;
        if (!u.ativo) {
          setAviso("Sua conta está desativada. Procure o administrador do escritório.");
          signOut(auth);
          return;
        }
        setAviso("");
        setUsuario(u);
        setCarregando(false);
        if (primeiro) {
          primeiro = false;
          const agora = new Date().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
          updateDoc(snap.ref, { ultimoAcesso: agora }).catch(() => {});
        }
      },
      () => {
        setUsuario(null);
        setCarregando(false);
      },
    );
    return unsub;
  }, [user]);

  // Tabela de permissões por perfil, em tempo real (o que o admin muda vale na hora para todos).
  const admin = usuario?.perfil === "Administrador";
  useEffect(() => {
    if (!usuario) return;
    const ref = doc(db, "config", "permissoes");
    return onSnapshot(ref, (snap) => {
      if (snap.exists()) setPermissoes(snap.data() as TabelaPermissoes);
      else {
        setPermissoes(null);
        // Primeira vez: o administrador grava o ponto de partida (as regras do Firebase leem daqui).
        if (admin) setDoc(ref, PERMISSOES_PADRAO).catch(() => {});
      }
    }, () => {
      // Recusado (ex.: regras do Firebase ainda não publicadas): a escuta morre no erro, então tenta de novo.
      setTimeout(() => setReligar((n) => n + 1), 8000);
    });
  }, [usuario?.id, admin, religar]); // eslint-disable-line react-hooks/exhaustive-deps

  const podeFazer = (a: ChavePermissao) => permitido(permissoes, usuario?.perfil, a);
  const pode = (m: Modulo) => podeFazer(VER[m]);

  const sair = async () => {
    await signOut(auth);
  };

  return <AuthCtx.Provider value={{ user, usuario, carregando, aviso, pode, podeFazer, permissoes, sair }}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
