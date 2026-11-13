"use client";

import { useEffect, useRef, useState } from "react";
import { Building2, Check, ImagePlus } from "lucide-react";
import { mCep, mCnpj, mTel, soDig, UFS } from "./FormCliente";
import { EMPRESA_PADRAO, salvarEmpresa, useEmpresa, type Empresa } from "@/lib/empresa";
import { enviarLogoEmpresa, excluirArquivo } from "@/lib/arquivos";
import { mensagemErro } from "@/lib/firebase";

/** Configurações → Empresa (somente administrador). */
export default function DadosEmpresa() {
  const { empresa, carregando } = useEmpresa();
  const [e, setE] = useState<Empresa>(EMPRESA_PADRAO);
  const [logoAntigo, setLogoAntigo] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [enviandoLogo, setEnviandoLogo] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [buscandoCep, setBuscandoCep] = useState(false);
  const logoRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (!carregando) setE(empresa); }, [carregando]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = <K extends keyof Empresa>(k: K, v: Empresa[K]) => { setE((x) => ({ ...x, [k]: v })); setMsg(null); };

  const buscarCep = async (cep: string) => {
    if (soDig(cep).length !== 8) return;
    setBuscandoCep(true);
    try {
      const j = await (await fetch(`https://viacep.com.br/ws/${soDig(cep)}/json/`)).json();
      if (!j.erro) setE((x) => ({ ...x, rua: j.logradouro || x.rua, bairro: j.bairro || x.bairro, cidade: j.localidade || x.cidade, uf: j.uf || x.uf, oabUf: x.oabUf || j.uf || "" }));
    } catch { /* manual */ } finally { setBuscandoCep(false); }
  };

  const trocarLogo = async (f: File | null) => {
    if (!f) return;
    setEnviandoLogo(true); setMsg(null);
    try {
      const novo = await enviarLogoEmpresa(f);
      if (e.logo?.caminho) setLogoAntigo(e.logo.caminho);
      set("logo", novo);
    } catch (err) {
      setMsg({ ok: false, t: mensagemErro(err) });
    } finally {
      setEnviandoLogo(false);
    }
  };

  const salvar = async () => {
    setSalvando(true); setMsg(null);
    try {
      await salvarEmpresa(e);
      if (logoAntigo) { await excluirArquivo(logoAntigo).catch(() => {}); setLogoAntigo(null); }
      setMsg({ ok: true, t: "Dados da empresa salvos." });
    } catch (err) {
      setMsg({ ok: false, t: mensagemErro(err) });
    } finally {
      setSalvando(false);
    }
  };

  if (carregando) return <div className="card empty">Carregando...</div>;

  return (
    <section className="card">
      <div className="card-head"><h3 style={{ display: "flex", gap: 8, alignItems: "center" }}><Building2 size={18} /> Dados da empresa</h3></div>

      <div className="logo-empresa">
        <div className="logo-caixa" style={e.logo ? { backgroundImage: `url("${e.logo.url}")` } : undefined}>{!e.logo && <ImagePlus size={22} />}</div>
        <div>
          <strong>Logo do escritório</strong>
          <p className="muted" style={{ fontSize: 12.5, margin: "4px 0 8px" }}>Aparece no menu lateral do sistema. PNG com fundo transparente fica melhor.</p>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn" style={{ height: 34 }} disabled={enviandoLogo} onClick={() => logoRef.current?.click()}>
              {enviandoLogo ? "Enviando..." : e.logo ? "Trocar logo" : "Enviar logo"}
            </button>
            {e.logo && <button className="btn btn-danger" style={{ height: 34 }} onClick={() => { setLogoAntigo(e.logo!.caminho); set("logo", null); }}>Remover</button>}
          </div>
        </div>
        <input ref={logoRef} type="file" hidden accept="image/png,image/jpeg,image/webp,image/svg+xml"
          onChange={(ev) => { trocarLogo(ev.target.files?.[0] ?? null); ev.target.value = ""; }} />
      </div>

      <div className="form-section">Identificação</div>
      <div className="form-grid g3">
        <div className="field span-2"><label>Nome do escritório (nome fantasia)</label>
          <input className="input" value={e.nomeFantasia} onChange={(v) => set("nomeFantasia", v.target.value)} /></div>
        <div className="field"><label>CNPJ</label>
          <input className="input" inputMode="numeric" placeholder="00.000.000/0000-00" value={e.cnpj} onChange={(v) => set("cnpj", mCnpj(v.target.value))} /></div>
        <div className="field span-3"><label>Razão social</label>
          <input className="input" value={e.razaoSocial} onChange={(v) => set("razaoSocial", v.target.value)} /></div>
        <div className="field"><label>Telefone</label>
          <input className="input" inputMode="tel" value={e.telefone} onChange={(v) => set("telefone", mTel(v.target.value))} /></div>
        <div className="field"><label>E-mail</label>
          <input className="input" type="email" value={e.email} onChange={(v) => set("email", v.target.value)} /></div>
        <div className="field"><label>Site</label>
          <input className="input" value={e.site} onChange={(v) => set("site", v.target.value)} placeholder="www..." /></div>
      </div>

      <div className="form-section">Advogado(a) responsável</div>
      <div className="form-grid g3">
        <div className="field"><label>Nome</label>
          <input className="input" value={e.responsavel} onChange={(v) => set("responsavel", v.target.value)} /></div>
        <div className="field"><label>Nº da OAB</label>
          <input className="input" placeholder="12.345" value={e.oab} onChange={(v) => set("oab", v.target.value)} /></div>
        <div className="field"><label>UF da OAB</label>
          <select className="select" value={e.oabUf} onChange={(v) => set("oabUf", v.target.value)}>
            <option value="">—</option>{UFS.map((u) => <option key={u}>{u}</option>)}
          </select></div>
      </div>

      <div className="form-section">Endereço</div>
      <div className="form-grid g3">
        <div className="field"><label>CEP {buscandoCep && <span className="muted">— buscando...</span>}</label>
          <input className="input" inputMode="numeric" placeholder="00000-000" value={e.cep}
            onChange={(v) => { const c = mCep(v.target.value); set("cep", c); buscarCep(c); }} /></div>
        <div className="field span-2"><label>Rua / Logradouro</label>
          <input className="input" value={e.rua} onChange={(v) => set("rua", v.target.value)} /></div>
        <div className="field"><label>Número</label>
          <input className="input" value={e.numero} onChange={(v) => set("numero", v.target.value)} /></div>
        <div className="field span-2"><label>Complemento</label>
          <input className="input" value={e.complemento} onChange={(v) => set("complemento", v.target.value)} /></div>
        <div className="field"><label>Bairro</label>
          <input className="input" value={e.bairro} onChange={(v) => set("bairro", v.target.value)} /></div>
        <div className="field"><label>Cidade</label>
          <input className="input" value={e.cidade} onChange={(v) => set("cidade", v.target.value)} /></div>
        <div className="field"><label>UF</label>
          <select className="select" value={e.uf} onChange={(v) => set("uf", v.target.value)}>
            <option value="">—</option>{UFS.map((u) => <option key={u}>{u}</option>)}
          </select></div>
      </div>

      <div className="modal-foot" style={{ alignItems: "center" }}>
        {msg && <span className={msg.ok ? "pos" : "error"} style={{ fontSize: 13, marginRight: "auto" }}>{msg.t}</span>}
        <button className="btn btn-primary" onClick={salvar} disabled={salvando}>
          {salvando ? "Salvando..." : msg?.ok ? <><Check size={16} /> Salvo</> : "Salvar dados da empresa"}
        </button>
      </div>
    </section>
  );
}
