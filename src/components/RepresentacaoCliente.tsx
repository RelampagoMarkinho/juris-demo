"use client";

import { mCpf, mTel } from "./FormCliente";
import { CAPACIDADES, ESTADOS_CIVIS, TIPOS_REPRESENTANTE, type Cliente, type Representante, type Rogado } from "@/lib/mock";
import { idade } from "@/lib/aniversarios";

const REP_VAZIO: Representante = { tipo: "genitora", nome: "", sexo: "Feminino", nacionalidade: "brasileira", mesmoEndereco: true };
const ROGADO_VAZIO: Rogado = { nome: "", nacionalidade: "brasileiro(a)" };

/** Capacidade sugerida pela idade (menores de 16 / de 16 a 18 anos). */
function capacidadePelaIdade(nascimento?: string) {
  if (!nascimento) return null;
  const anos = idade(nascimento);
  if (anos < 16) return CAPACIDADES[1];
  if (anos < 18) return CAPACIDADES[2];
  return null;
}

/** Cadastro do cliente → capacidade civil, representante legal e assinatura a rogo. */
export default function RepresentacaoCliente({ c, set }: {
  c: Partial<Cliente>; set: <K extends keyof Cliente>(k: K, v: Cliente[K]) => void;
}) {
  const rep = c.representante ?? null;
  const rog = c.rogado ?? null;
  const sugerida = capacidadePelaIdade(c.dataNascimento);
  const precisaRep = !!c.capacidade && c.capacidade !== "Capaz";

  const setRep = (campos: Partial<Representante>) => set("representante", { ...(rep ?? REP_VAZIO), ...campos });
  const setRog = (campos: Partial<Rogado>) => set("rogado", { ...(rog ?? ROGADO_VAZIO), ...campos });

  return (
    <>
      <div className="form-section">Capacidade e representação</div>
      <div className="form-grid g3">
        <div className="field span-2"><label>Capacidade civil</label>
          <select className="select" value={c.capacidade ?? "Capaz"} onChange={(e) => {
            set("capacidade", e.target.value);
            if (e.target.value !== "Capaz" && !rep) set("representante", { ...REP_VAZIO, tipo: e.target.value.startsWith("Interditado") ? "curadora" : "genitora" });
          }}>
            {CAPACIDADES.map((x) => <option key={x}>{x}</option>)}
          </select>
          {sugerida && sugerida !== c.capacidade && (
            <small className="muted">Pela data de nascimento: <button type="button" className="link" style={{ background: "none", border: 0, padding: 0, fontSize: 12 }}
              onClick={() => { set("capacidade", sugerida); if (!rep) set("representante", { ...REP_VAZIO }); }}>{sugerida}</button></small>
          )}
        </div>
        <label className="checkbox" style={{ alignSelf: "end", paddingBottom: 10 }}>
          <input type="checkbox" checked={!!rep} onChange={(e) => set("representante", e.target.checked ? { ...REP_VAZIO } : null)} />
          Tem representante legal
        </label>
      </div>
      {precisaRep && !rep && <p className="error" style={{ fontSize: 12.5 }}>Informe o representante legal (quem responde e assina pelo cliente).</p>}

      {rep && (
        <div className="sub-bloco">
          <div className="sub-titulo">Representante legal</div>
          <div className="form-grid g3">
            <div className="field"><label>Representa como</label>
              <select className="select" value={rep.tipo} onChange={(e) => {
                const tipo = e.target.value;
                setRep({ tipo, sexo: tipo.endsWith("a") ? "Feminino" : tipo.endsWith("r") ? "Masculino" : rep.sexo });
              }}>
                {TIPOS_REPRESENTANTE.map((t) => <option key={t} value={t}>{t[0].toUpperCase() + t.slice(1)}</option>)}
              </select></div>
            <div className="field span-2"><label>Nome completo</label>
              <input className="input" value={rep.nome} onChange={(e) => setRep({ nome: e.target.value })} /></div>
            <div className="field"><label>Sexo</label>
              <select className="select" value={rep.sexo ?? ""} onChange={(e) => setRep({ sexo: (e.target.value || undefined) as Representante["sexo"] })}>
                <option value="">Não informado</option><option>Feminino</option><option>Masculino</option>
              </select></div>
            <div className="field"><label>Nacionalidade</label>
              <input className="input" value={rep.nacionalidade ?? ""} onChange={(e) => setRep({ nacionalidade: e.target.value })} /></div>
            <div className="field"><label>Estado civil</label>
              <select className="select" value={rep.estadoCivil ?? ""} onChange={(e) => setRep({ estadoCivil: e.target.value })}>
                <option value="">Selecione...</option>{ESTADOS_CIVIS.map((x) => <option key={x}>{x}</option>)}
              </select></div>
            <div className="field"><label>Profissão</label>
              <input className="input" value={rep.profissao ?? ""} onChange={(e) => setRep({ profissao: e.target.value })} /></div>
            <div className="field"><label>RG</label>
              <input className="input" value={rep.rg ?? ""} onChange={(e) => setRep({ rg: e.target.value })} /></div>
            <div className="field"><label>Órgão emissor</label>
              <input className="input" placeholder="SSP/MA" value={rep.orgaoEmissor ?? ""} onChange={(e) => setRep({ orgaoEmissor: e.target.value.toUpperCase() })} /></div>
            <div className="field"><label>CPF</label>
              <input className="input" inputMode="numeric" placeholder="000.000.000-00" value={rep.cpf ?? ""} onChange={(e) => setRep({ cpf: mCpf(e.target.value) })} /></div>
            <div className="field"><label>Telefone</label>
              <input className="input" inputMode="tel" value={rep.telefone ?? ""} onChange={(e) => setRep({ telefone: mTel(e.target.value) })} /></div>
            <label className="checkbox span-2" style={{ alignSelf: "end", paddingBottom: 10 }}>
              <input type="checkbox" checked={rep.mesmoEndereco !== false} onChange={(e) => setRep({ mesmoEndereco: e.target.checked })} />
              Mora no mesmo endereço do cliente
            </label>
            {rep.mesmoEndereco === false && (
              <div className="field span-3"><label>Endereço completo do representante</label>
                <input className="input" placeholder="Rua, nº, bairro, cidade/UF, CEP" value={rep.endereco ?? ""} onChange={(e) => setRep({ endereco: e.target.value })} /></div>
            )}
          </div>
        </div>
      )}

      <label className="checkbox" style={{ margin: "14px 0 4px" }}>
        <input type="checkbox" checked={!!rog} onChange={(e) => set("rogado", e.target.checked ? { ...ROGADO_VAZIO } : null)} />
        {rep ? "O representante não sabe assinar" : "O cliente não sabe assinar"} — assinatura a rogo
      </label>
      {rog && (
        <div className="sub-bloco">
          <div className="sub-titulo">Quem assina a rogo (rogado)</div>
          <div className="form-grid g3">
            <div className="field span-2"><label>Nome completo</label>
              <input className="input" value={rog.nome} onChange={(e) => setRog({ nome: e.target.value })} /></div>
            <div className="field"><label>Nacionalidade</label>
              <input className="input" value={rog.nacionalidade ?? ""} onChange={(e) => setRog({ nacionalidade: e.target.value })} /></div>
            <div className="field"><label>Estado civil</label>
              <select className="select" value={rog.estadoCivil ?? ""} onChange={(e) => setRog({ estadoCivil: e.target.value })}>
                <option value="">Selecione...</option>{ESTADOS_CIVIS.map((x) => <option key={x}>{x}</option>)}
              </select></div>
            <div className="field"><label>RG</label>
              <input className="input" value={rog.rg ?? ""} onChange={(e) => setRog({ rg: e.target.value })} /></div>
            <div className="field"><label>CPF</label>
              <input className="input" inputMode="numeric" placeholder="000.000.000-00" value={rog.cpf ?? ""} onChange={(e) => setRog({ cpf: mCpf(e.target.value) })} /></div>
            <div className="field span-3"><label>Endereço</label>
              <input className="input" placeholder="Rua, nº, bairro, cidade/UF" value={rog.endereco ?? ""} onChange={(e) => setRog({ endereco: e.target.value })} /></div>
          </div>
        </div>
      )}
    </>
  );
}
