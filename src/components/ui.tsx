"use client";

import { useState } from "react";
import { FileImage, FileSpreadsheet, FileText, TrendingDown, TrendingUp } from "lucide-react";

const TOM: Record<string, string> = {
  // processos
  "Em andamento": "info", Aguardando: "warn", "Concluído": "pos", Arquivado: "",
  // financeiro
  Pago: "gray", Pendente: "warn", Atrasado: "neg",
  // clientes / usuários
  Ativo: "pos", Inativo: "", Prospecto: "info", Judicializar: "neg", "Protocolar no Administrativo": "warn",
};

export function Badge({ children }: { children: string }) {
  return <span className={`badge ${TOM[children] ?? ""}`}>{children}</span>;
}

export function StatCard({ label, valor, delta, hero, icon, sufixo = "vs. mês anterior" }: {
  label: string; valor: string; delta?: number; hero?: boolean; icon?: React.ReactNode; sufixo?: string;
}) {
  const up = (delta ?? 0) >= 0;
  return (
    <div className={`card stat ${hero ? "hero" : ""}`}>
      <div className="label">{label} {icon}</div>
      <div className="value num">{valor}</div>
      {delta !== undefined && (
        <div className="delta">
          <span className={up ? "pos" : "neg"} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            {up ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            <b>{Math.abs(delta).toLocaleString("pt-BR")}%</b>
          </span>
          {sufixo}
        </div>
      )}
    </div>
  );
}

type Serie = { rotulo: string; valores: number[] };

/** Gráfico de barras em CSS puro (estilo do layout). Um ou dois valores por coluna. */
export function BarChart({ dados, max = 10000, selecionadoInicial, formatar }: {
  dados: Serie[]; max?: number; selecionadoInicial?: number; formatar: (v: number) => string;
}) {
  const [sel, setSel] = useState<number | null>(selecionadoInicial ?? null);
  const ticks = [max, max * 0.8, max * 0.6, max * 0.4, max * 0.2, 0];
  const k = (v: number) => (v >= 1000 ? `${v / 1000}K` : String(v));

  return (
    <div className="chart">
      <div className="chart-y">{ticks.map((t) => <span key={t}>{k(t)}</span>)}</div>
      <div className="chart-plot">
        {dados.map((d, i) => (
          <button key={d.rotulo} className={`bar-col ${sel === i ? "sel" : ""}`} onClick={() => setSel(sel === i ? null : i)}
            aria-label={`${d.rotulo}: ${d.valores.map(formatar).join(" / ")}`}>
            <div className="bar-stack">
              {d.valores.map((v, j) => (
                <div key={j} className={`bar ${j > 0 ? "alt" : ""}`} style={{ height: `${Math.min(100, (v / max) * 100)}%` }}>
                  {sel === i && j === 0 && <span className="bar-tip">{formatar(v)}</span>}
                </div>
              ))}
            </div>
            <span className="lbl">{d.rotulo}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function Donut({ pct }: { pct: number }) {
  const r = 26, c = 2 * Math.PI * r;
  return (
    <div className="donut">
      <svg viewBox="0 0 62 62" width="62" height="62">
        <circle cx="31" cy="31" r={r} fill="none" stroke="var(--surface-3)" strokeWidth="6" />
        <circle cx="31" cy="31" r={r} fill="none" stroke="var(--accent)" strokeWidth="6" strokeLinecap="round"
          strokeDasharray={`${(pct / 100) * c} ${c}`} transform="rotate(-90 31 31)" />
      </svg>
      <span>{pct}%</span>
    </div>
  );
}

export function IconeArquivo({ tipo, size = 18 }: { tipo: "pdf" | "docx" | "xlsx" | "img"; size?: number }) {
  if (tipo === "xlsx") return <FileSpreadsheet size={size} className="pos" />;
  if (tipo === "img") return <FileImage size={size} style={{ color: "var(--warn)" }} />;
  return <FileText size={size} className={tipo === "pdf" ? "neg" : ""} style={tipo === "docx" ? { color: "var(--info)" } : undefined} />;
}
