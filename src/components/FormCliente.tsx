"use client";

import { useState } from "react";
import { Modal } from "./Shell";
import { useAuth } from "./AuthProvider";
import { hojeISO, salvar, useColecao } from "@/lib/db";
import { mensagemErro } from "@/lib/firebase";
import { ESTADOS_CIVIS, STATUS_CLIENTE, type Cliente, type Corretor } from "@/lib/mock";
import CampoData from "./CampoData";
import RepresentacaoCliente from "./RepresentacaoCliente";

export type ClienteForm = Cliente | Omit<Cliente, "id">;

export const CLIENTE_VAZIO: Omit<Cliente, "id"> = {
  nome: "", tipo: "PF", documento: "", email: "", telefone: "", status: "Ativo", desde: "",
  sexo: undefined, rg: "", orgaoEmissor: "", dataEmissaoRg: "", estadoCivil: "", nacionalidade: "brasileira", profissao: "",
  cep: "", rua: "", numero: "", complemento: "", bairro: "", cidade: "", uf: "",
};

export const UFS = "AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO".split(" ");

// Máscaras simples
export const soDig = (v: string) => v.replace(/\D/g, "");
const mascara = (v: string, padrao: string) => {
  const d = soDig(v);
  let i = 0, out = "";
  for (const ch of padrao) {
    if (i >= d.length) break;
    out += ch === "#" ? d[i++] : ch;
  }
  return out;
};
export const mCpf = (v: string) => mascara(v, "###.###.###-##");
export const mCnpj = (v: string) => mascara(v, "##.###.###/####-##");
export const mCep = (v: string) => mascara(v, "#####-###");
export const mTel = (v: string) => (soDig(v).length > 10 ? mascara(v, "(##) #####-####") : mascara(v, "(##) ####-####"));

export default function FormCliente({ inicial, onClose, onSalvo }: {
  inicial: ClienteForm; onClose: () => void; onSalvo?: (id: string, nome: string, tipoProcesso?: string) => void;
}) {
  const [c, setC] = useState<ClienteForm>(inicial);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [buscandoCep, setBuscandoCep] = useState(false);
  const set = <K extends keyof Cliente>(k: K, v: Cliente[K]) => setC((x) => ({ ...x, [k]: v }));
  const novo = !("id" in c);
  const pf = c.tipo === "PF";
  const { pode } = useAuth();
  const { dados: corretores } = useColecao<Corretor>("corretores", { campo: "nome" }, pode("Corretores"));

  const buscarCep = async (cep: string) => {
    if (soDig(cep).length !== 8) return;
    setBuscandoCep(true);
    try {
      const r = await fetch(`https://viacep.com.br/ws/${soDig(cep)}/json/`);
      const j = await r.json();
      if (!j.erro) {
        setC((x) => ({
          ...x,
          rua: j.logradouro || x.rua, bairro: j.bairro || x.bairro, cidade: j.localidade || x.cidade, uf: j.uf || x.uf,
          complemento: x.complemento || j.complemento || "",
        }));
      }
    } catch {
      /* sem internet ou CEP inexistente: preenchimento manual */
    } finally {
      setBuscandoCep(false);
    }
  };

  const confirmar = async () => {
    if (!c.nome.trim()) return setErro("Informe o nome.");
    setSalvando(true); setErro("");
    try {
      const { processos: _p, ...dados } = c as Cliente;
      const limpo = Object.fromEntries(Object.entries(dados).filter(([, v]) => v !== undefined)) as typeof dados;
      const id = await salvar("clientes", novo ? { ...limpo, desde: hojeISO() } : limpo);
      onSalvo?.(id, c.nome.trim(), c.tipoProcesso);
      onClose();
    } catch (e) {
      setErro(mensagemErro(e));
      setSalvando(false);
    }
  };

  return (
    <Modal wide titulo={novo ? "Etapa 1 de 2 — Dados do cliente" : "Editar cliente"}
      sub={novo ? "Depois de salvar, você cadastra o processo deste cliente" : "Dados cadastrais do cliente"} onClose={onClose}
      footer={<>
        <button className="btn" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" disabled={salvando} onClick={confirmar}>{salvando ? "Salvando..." : "Salvar"}</button>
      </>}>

      <div className="form-section">Identificação</div>
      <div className="form-grid">
        <div className="field span-2"><label>{pf ? "Nome completo" : "Razão social"}</label>
          <input className="input" value={c.nome} onChange={(e) => set("nome", e.target.value)} autoFocus /></div>
        <div className="field"><label>Tipo</label>
          <select className="select" value={c.tipo} onChange={(e) => { set("tipo", e.target.value as Cliente["tipo"]); set("documento", ""); }}>
            <option value="PF">Pessoa física</option>
            <option value="PJ">Pessoa jurídica</option>
          </select></div>
        <div className="field"><label>{pf ? "CPF" : "CNPJ"}</label>
          <input className="input" inputMode="numeric" value={c.documento}
            onChange={(e) => set("documento", pf ? mCpf(e.target.value) : mCnpj(e.target.value))}
            placeholder={pf ? "000.000.000-00" : "00.000.000/0000-00"} /></div>
        <div className="field"><label>E-mail</label>
          <input className="input" type="email" value={c.email} onChange={(e) => set("email", e.target.value)} /></div>
        <div className="field"><label>Telefone</label>
          <input className="input" inputMode="tel" value={c.telefone} onChange={(e) => set("telefone", mTel(e.target.value))} placeholder="(00) 00000-0000" /></div>
        <div className="field"><label>Status</label>
          <select className="select" value={(STATUS_CLIENTE as readonly string[]).includes(c.status) ? c.status : "Ativo"} onChange={(e) => set("status", e.target.value as Cliente["status"])}>
            {STATUS_CLIENTE.map((x) => <option key={x}>{x}</option>)}
          </select></div>

        {pode("Corretores") && (
          <div className="field span-2"><label>Corretor (quem indicou o cliente)</label>
            <select className="select" value={c.corretorId ?? ""} onChange={(e) => set("corretorId", e.target.value)}>
              <option value="">Sem corretor — cliente direto</option>
              {corretores.filter((k) => k.ativo || k.id === c.corretorId).map((k) => <option key={k.id} value={k.id}>{k.nome}</option>)}
            </select></div>
        )}
      </div>

      {pf && (
        <>
          <div className="form-section">Dados pessoais</div>
          <div className="form-grid g3">
            <div className="field"><label>RG</label>
              <input className="input" value={c.rg ?? ""} onChange={(e) => set("rg", e.target.value)} /></div>
            <div className="field"><label>Órgão emissor</label>
              <input className="input" placeholder="SSP/SP" value={c.orgaoEmissor ?? ""} onChange={(e) => set("orgaoEmissor", e.target.value.toUpperCase())} /></div>
            <div className="field"><label>Data de emissão</label>
              <CampoData value={c.dataEmissaoRg} onChange={(v) => set("dataEmissaoRg", v)} /></div>
            <div className="field"><label>Data de nascimento</label>
              <CampoData value={c.dataNascimento} onChange={(v) => set("dataNascimento", v)} /></div>
            <div className="field"><label>Sexo</label>
              <select className="select" value={c.sexo ?? ""} onChange={(e) => set("sexo", (e.target.value || undefined) as Cliente["sexo"])}>
                <option value="">Não informado</option><option>Feminino</option><option>Masculino</option>
              </select></div>
            <div className="field"><label>Estado civil</label>
              <select className="select" value={c.estadoCivil ?? ""} onChange={(e) => set("estadoCivil", e.target.value)}>
                <option value="">Selecione...</option>
                {ESTADOS_CIVIS.map((x) => <option key={x}>{x}</option>)}
              </select></div>
            <div className="field"><label>Nacionalidade</label>
              <input className="input" value={c.nacionalidade ?? ""} onChange={(e) => set("nacionalidade", e.target.value)} /></div>
            <div className="field span-3"><label>Profissão</label>
              <input className="input" value={c.profissao ?? ""} onChange={(e) => set("profissao", e.target.value)} /></div>
          </div>
        </>
      )}

      <div className="form-section">Endereço</div>
      <div className="form-grid g3">
        <div className="field"><label>CEP {buscandoCep && <span className="muted">— buscando...</span>}</label>
          <input className="input" inputMode="numeric" placeholder="00000-000" value={c.cep ?? ""}
            onChange={(e) => { const v = mCep(e.target.value); set("cep", v); buscarCep(v); }} /></div>
        <div className="field span-2"><label>Rua / Logradouro</label>
          <input className="input" value={c.rua ?? ""} onChange={(e) => set("rua", e.target.value)} /></div>
        <div className="field"><label>Número</label>
          <input className="input" value={c.numero ?? ""} onChange={(e) => set("numero", e.target.value)} /></div>
        <div className="field span-2"><label>Complemento</label>
          <input className="input" placeholder="Apto, bloco, sala..." value={c.complemento ?? ""} onChange={(e) => set("complemento", e.target.value)} /></div>
        <div className="field"><label>Bairro</label>
          <input className="input" value={c.bairro ?? ""} onChange={(e) => set("bairro", e.target.value)} /></div>
        <div className="field"><label>Cidade</label>
          <input className="input" value={c.cidade ?? ""} onChange={(e) => set("cidade", e.target.value)} /></div>
        <div className="field"><label>UF</label>
          <select className="select" value={c.uf ?? ""} onChange={(e) => set("uf", e.target.value)}>
            <option value="">—</option>{UFS.map((u) => <option key={u}>{u}</option>)}
          </select></div>
      </div>
      {pf && <RepresentacaoCliente c={c} set={set} />}

      <div className="form-section">Observações</div>
      <div className="field">
        <textarea className="textarea" rows={4} value={c.observacoes ?? ""} onChange={(e) => set("observacoes", e.target.value)}
          placeholder="Anotações sobre o cliente: histórico do atendimento, pendências, documentos a trazer, combinados..." />
      </div>
      {erro && <div className="error" style={{ marginTop: 12 }}>{erro}</div>}
    </Modal>
  );
}
