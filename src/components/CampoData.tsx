"use client";

import { useEffect, useState } from "react";

/** AAAA-MM-DD → dd/mm/aaaa */
const paraTela = (iso?: string) => (iso && /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso.split("-").reverse().join("/") : "");

/** Máscara dd/mm/aaaa enquanto digita. */
const mascarar = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
};

/** dd/mm/aaaa completo e existente (ex.: recusa 31/02) → AAAA-MM-DD; senão null. */
function paraIso(tela: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(tela);
  if (!m) return null;
  const [dia, mes, ano] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (ano < 1900 || ano > 2100) return null;
  const d = new Date(ano, mes - 1, dia);
  if (d.getFullYear() !== ano || d.getMonth() !== mes - 1 || d.getDate() !== dia) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

/**
 * Campo de data digitado com máscara (dd/mm/aaaa), sem calendário.
 * Recebe e devolve a data no formato AAAA-MM-DD (o mesmo já gravado no banco); "" = sem data.
 */
export default function CampoData({ value, onChange, className = "input", style, id, ariaLabel, disabled }: {
  value?: string; onChange: (iso: string) => void; className?: string; style?: React.CSSProperties; id?: string; ariaLabel?: string; disabled?: boolean;
}) {
  const [texto, setTexto] = useState(paraTela(value));
  const [invalida, setInvalida] = useState(false);

  // Acompanha mudanças vindas de fora (ex.: dados carregados depois).
  useEffect(() => {
    if ((paraIso(texto) ?? "") !== (value && value !== "—" ? value : "")) setTexto(paraTela(value));
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  const mudar = (v: string) => {
    const t = mascarar(v);
    setTexto(t);
    if (!t) { setInvalida(false); onChange(""); return; }
    if (t.length === 10) {
      const iso = paraIso(t);
      setInvalida(!iso);
      if (iso) onChange(iso);
    } else {
      setInvalida(false);
    }
  };

  return (
    <input
      id={id} aria-label={ariaLabel} className={`${className} ${invalida ? "campo-invalido" : ""}`} style={style}
      type="text" inputMode="numeric" autoComplete="off" placeholder="dd/mm/aaaa" maxLength={10}
      value={texto} onChange={(e) => mudar(e.target.value)} disabled={disabled}
      onBlur={() => { if (texto && texto.length < 10) setInvalida(true); }}
      title={invalida ? "Data inválida" : undefined}
    />
  );
}
