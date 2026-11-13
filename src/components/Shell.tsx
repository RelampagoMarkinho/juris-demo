"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Bell, Download, FileText, House, LogOut, Menu, Moon, Search, Settings, Sun,
  Gavel, Handshake, User, UserCog, Users, Wallet, X,
} from "lucide-react";
import { iniciais } from "@/lib/mock";
import { useTema } from "./ThemeProvider";
import { useAuth, type Modulo } from "./AuthProvider";
import { useEmpresa } from "@/lib/empresa";
import { useInstalarApp } from "@/lib/pwa";
import type { Usuario } from "@/lib/mock";

const NAV: { href: string; label: string; icon: typeof House; modulo: Modulo }[] = [
  { href: "/dashboard", label: "Dashboard", icon: House, modulo: "Dashboard" },
  { href: "/clientes", label: "Clientes", icon: Users, modulo: "Clientes" },
  { href: "/corretores", label: "Corretores", icon: Handshake, modulo: "Corretores" },
  { href: "/processos", label: "Processos", icon: Gavel, modulo: "Processos" },
  { href: "/financeiro", label: "Financeiro", icon: Wallet, modulo: "Financeiro" },
  { href: "/documentos", label: "Documentos", icon: FileText, modulo: "Documentos" },
  { href: "/usuarios", label: "Usuários", icon: UserCog, modulo: "Usuários" },
];

const TITULOS: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/clientes": "Clientes",
  "/processos": "Processos",
  "/corretores": "Corretores",
  "/financeiro": "Financeiro",
  "/documentos": "Documentos",
  "/usuarios": "Usuários",
  "/perfil": "Configurações",
};


/**
 * Marca do escritório. Versão de demonstração: sem logo fixa — mostra a logo enviada em
 * Configurações → Dados da empresa, se houver; senão, só o nome do escritório (ou nada).
 */
export function Brand({ className = "", src, nome }: { className?: string; src?: string; nome?: string }) {
  if (!src && !nome) return null;
  return (
    <div className={`brand ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {src ? <img src={src} alt="Logo do escritório" className="brand-logo" /> : <div className="brand-name">{nome}</div>}
    </div>
  );
}

/** Marca do menu lateral: usa a logo cadastrada em Configurações → Empresa, se houver. */
function BrandEmpresa() {
  const { empresa } = useEmpresa();
  return <Brand src={empresa.logo?.url} nome={empresa.nomeFantasia} />;
}

export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, usuario, carregando, pode, sair: sairAuth } = useAuth();
  const [menuAberto, setMenuAberto] = useState(false);

  useEffect(() => {
    if (!carregando && (!user || !usuario)) router.replace("/login");
  }, [carregando, user, usuario, router]);

  useEffect(() => setMenuAberto(false), [pathname]);

  const sair = async () => {
    await sairAuth();
    router.replace("/login");
  };

  if (carregando || !usuario) {
    return <div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }} className="muted">Carregando...</div>;
  }

  const modulo = NAV.find((n) => pathname.startsWith(n.href))?.modulo;
  const permitido = !modulo || pode(modulo);

  return (
    <div className="shell">
      <aside className={`sidebar ${menuAberto ? "open" : ""}`}>
        <BrandEmpresa />
        <nav className="nav">
          {NAV.filter((n) => pode(n.modulo)).map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className={`nav-link ${pathname.startsWith(href) ? "active" : ""}`}>
              <Icon size={19} strokeWidth={1.8} /> {label}
            </Link>
          ))}
        </nav>

        <div style={{ marginTop: "auto" }} />

        <div className="sidebar-footer">
          <Link href="/perfil" className={`nav-link ${pathname === "/perfil" ? "active" : ""}`}>
            <Settings size={19} strokeWidth={1.8} /> Configurações
          </Link>
          <button className="nav-link" style={{ border: 0, background: "none", textAlign: "left" }} onClick={sair}>
            <LogOut size={19} strokeWidth={1.8} /> Sair
          </button>
        </div>
      </aside>
      <div className={`backdrop ${menuAberto ? "open" : ""}`} onClick={() => setMenuAberto(false)} />

      <main className="main">
        <header className="topbar">
          <button className="icon-btn menu-btn" aria-label="Abrir menu" onClick={() => setMenuAberto(true)}>
            <Menu size={19} />
          </button>
          <h1>{TITULOS[pathname] ?? (pathname.startsWith("/clientes/ver") ? "Perfil do cliente"
            : pathname.startsWith("/documentos/modelo") ? "Editor de modelo" : "Juris")}</h1>
          <label className="search">
            <Search size={17} />
            <input placeholder="Pesquisar processos, clientes..." aria-label="Pesquisar" />
          </label>
          <button className="icon-btn" aria-label="Notificações">
            <Bell size={18} />
            <span className="dot" />
          </button>
          <ProfileMenu usuario={usuario} onSair={sair} />
        </header>
        {permitido ? children : (
          <div className="card empty" style={{ padding: 40 }}>Seu perfil ({usuario.perfil}) não tem acesso a este módulo.</div>
        )}
      </main>
    </div>
  );
}

function ProfileMenu({ usuario, onSair }: { usuario: Usuario; onSair: () => void }) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { tema, alternar } = useTema();
  const { disponivel: podeInstalar, instalar } = useInstalarApp();

  useEffect(() => {
    if (!aberto) return;
    const fechar = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    document.addEventListener("mousedown", fechar);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", fechar);
      document.removeEventListener("keydown", esc);
    };
  }, [aberto]);

  return (
    <div className="profile" ref={ref}>
      <button aria-label="Menu do perfil" aria-expanded={aberto} onClick={() => setAberto((v) => !v)}>
        <span className="avatar">{iniciais(usuario.nome)}</span>
      </button>
      {aberto && (
        <div className="dropdown" role="menu">
          <div className="dropdown-head">
            <span className="avatar">{iniciais(usuario.nome)}</span>
            <div style={{ minWidth: 0 }}>
              <strong>{usuario.nome}</strong>
              <span>{usuario.perfil}</span>
            </div>
          </div>
          <Link href="/perfil" className="dropdown-item" onClick={() => setAberto(false)}>
            <User size={17} /> <span className="grow">Meu perfil</span>
          </Link>
          <button className="dropdown-item" onClick={alternar} role="menuitemcheckbox" aria-checked={tema === "dark"}>
            {tema === "dark" ? <Moon size={17} /> : <Sun size={17} />}
            <span className="grow">Tema escuro</span>
            <span className={`switch ${tema === "dark" ? "on" : ""}`} />
          </button>
          {podeInstalar && (
            <button className="dropdown-item" onClick={() => { setAberto(false); instalar(); }}>
              <Download size={17} /> <span className="grow">Instalar aplicativo</span>
            </button>
          )}
          <button className="dropdown-item btn-danger" onClick={onSair}>
            <LogOut size={17} /> <span className="grow">Sair</span>
          </button>
        </div>
      )}
    </div>
  );
}

export function Modal({ titulo, sub, onClose, children, footer, wide }: {
  titulo: string; sub?: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode; wide?: boolean;
}) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [onClose]);

  return (
    <div className="modal-bg" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? "wide" : ""}`} role="dialog" aria-modal="true" aria-label={titulo}>
        <div className="modal-head">
          <div>
            <h3>{titulo}</h3>
            {sub && <div className="muted" style={{ marginTop: 4 }}>{sub}</div>}
          </div>
          <button className="icon-btn sm" aria-label="Fechar" onClick={onClose}><X size={17} /></button>
        </div>
        {children}
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}
