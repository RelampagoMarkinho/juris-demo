"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

/** Campo de senha com botão de olho para mostrar/ocultar o que foi digitado. */
export default function CampoSenha({ value, onChange, autoComplete, placeholder }: {
  value: string; onChange: (v: string) => void; autoComplete?: string; placeholder?: string;
}) {
  const [ver, setVer] = useState(false);
  return (
    <div className="pwd">
      <input className="input" type={ver ? "text" : "password"} autoComplete={autoComplete} placeholder={placeholder}
        value={value} onChange={(e) => onChange(e.target.value)} />
      <button type="button" onClick={() => setVer((v) => !v)} aria-label={ver ? "Ocultar senha" : "Mostrar senha"} title={ver ? "Ocultar senha" : "Mostrar senha"}>
        {ver ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}
