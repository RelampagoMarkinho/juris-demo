"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { Modal } from "./Shell";
import { Badge } from "./ui";
import { useAuth } from "./AuthProvider";
import CampoData from "./CampoData";
import { atualizar, excluir, hojeISO, salvar, useColecao } from "@/lib/db";
import { mensagemErro } from "@/lib/firebase";
import { brl, dataBR, type Lancamento } from "@/lib/mock";
import {
  contasDoMes, mesAtual, nomeMes, pagarConta, somarMesesComp, type ContaPagar, type ItemMes,
} from "@/lib/contasPagar";

// "1.234,56" ou "1234,56" ou "1234.56" → 1234.56
const num = (v: string) => Number(v.includes(",") ? v.replace(/\./g, "").replace(",", ".") : v) || 0;
const paraTexto = (v?: number) => (v ? String(v).replace(".", ",") : "");

/** Contas a pagar do mês (despesas fixas e parceladas): o que vence, o que já foi pago e o total. */
export function ContasPagarMes({ lancamentos }: { lancamentos: Lancamento[] }) {
  const { podeFazer, usuario } = useAuth();
  const { dados: contas, carregando, erro } = useColecao<ContaPagar>("contasPagar", { campo: "descricao" });
  const [comp, setComp] = useState(mesAtual());
  const [editando, setEditando] = useState<Partial<ContaPagar> | null>(null);
  const [pagando, setPagando] = useState<ItemMes | null>(null);

  const itens = contasDoMes(contas, lancamentos, comp);
  const total = itens.reduce((s, i) => s + (i.pagamento?.valor ?? i.valorPrevisto), 0);
  const pago = itens.filter((i) => i.pagamento).reduce((s, i) => s + (i.pagamento?.valor ?? 0), 0);
  const exec = async (fn: () => Promise<void>) => { try { await fn(); } catch (e) { alert(mensagemErro(e)); } };

  return (
    <>
      <div className="row-between" style={{ flexWrap: "wrap", gap: 12, marginBottom: 12 }}>
        <div className="mes-nav">
          <button className="icon-btn sm" aria-label="Mês anterior" onClick={() => setComp((c) => somarMesesComp(c, -1))}><ChevronLeft size={16} /></button>
          <strong style={{ textTransform: "capitalize", minWidth: 150, textAlign: "center" }}>{nomeMes(comp)}</strong>
          <button className="icon-btn sm" aria-label="Próximo mês" onClick={() => setComp((c) => somarMesesComp(c, 1))}><ChevronRight size={16} /></button>
          {comp !== mesAtual() && <button className="link" style={{ background: "none", border: 0, fontSize: 12.5 }} onClick={() => setComp(mesAtual())}>voltar ao mês atual</button>}
        </div>
        {podeFazer("financeiro_criar") && (
          <button className="btn btn-primary" onClick={() => setEditando({ tipo: "Fixa", dia: 10, inicio: mesAtual(), ativa: true })}><Plus size={16} /> Nova conta</button>
        )}
      </div>

      <div className="contas-totais">
        <div><span>Total de despesas fixas no mês</span><strong className="num">{brl(total)}</strong></div>
        <div><span>Já pago</span><strong className="num pos">{brl(pago)}</strong></div>
        <div><span>Falta pagar</span><strong className="num neg">{brl(Math.max(0, total - pago))}</strong></div>
      </div>

      <div className="table-wrap">
        <table className="tbl">
          <thead><tr><th>Vencimento</th><th>Conta</th><th>Tipo</th><th>Valor</th><th>Situação</th><th></th></tr></thead>
          <tbody>
            {itens.map((i) => (
              <tr key={i.conta.id} style={i.pagamento ? { opacity: 0.6 } : undefined}>
                <td className="num">{dataBR(i.vencimento)}</td>
                <td>{i.conta.descricao}</td>
                <td>{i.conta.tipo === "Parcelada" ? `Parcela ${i.parcela}/${i.conta.parcelas}` : "Fixa"}</td>
                <td className="num neg">{brl(i.pagamento?.valor ?? i.valorPrevisto)}</td>
                <td>
                  <Badge>{i.situacao}</Badge>
                  {i.pagamento?.pagoEm && <small className="muted" style={{ display: "block" }}>em {dataBR(i.pagamento.pagoEm)}</small>}
                </td>
                <td>
                  <div className="card-actions">
                    {!i.pagamento && podeFazer("financeiro_baixar") && (
                      <button className="btn" style={{ height: 32, padding: "0 12px" }} onClick={() => setPagando(i)}>Pagar</button>
                    )}
                    {i.pagamento && podeFazer("financeiro_excluir") && (
                      <button className="icon-btn sm" title="Desfazer o pagamento" aria-label="Desfazer o pagamento"
                        onClick={() => confirm(`Desfazer o pagamento de "${i.conta.descricao}" em ${nomeMes(comp)}?`) && exec(() => excluir("lancamentos", i.pagamento!.id))}>
                        <RotateCcw size={15} />
                      </button>
                    )}
                    {podeFazer("financeiro_editar") && (
                      <button className="icon-btn sm" title="Editar a conta" aria-label="Editar a conta" onClick={() => setEditando(i.conta)}><Pencil size={15} /></button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {itens.length === 0 && (
              <tr><td colSpan={6} className="empty">{carregando ? "Carregando..." : erro || `Nenhuma conta a pagar em ${nomeMes(comp)}.`}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {editando && <FormConta inicial={editando} onClose={() => setEditando(null)} />}
      {pagando && (
        <PagarConta item={pagando} comp={comp} onClose={() => setPagando(null)}
          onPagar={(valor, data) => pagarConta(pagando, comp, valor, data, usuario?.nome ?? "")} />
      )}
    </>
  );
}

/** Cadastro/edição da conta: fixa (valor mensal) ou parcelada (nº de parcelas e valor da parcela), com o dia do vencimento. */
function FormConta({ inicial, onClose }: { inicial: Partial<ContaPagar>; onClose: () => void }) {
  const { usuario, podeFazer } = useAuth();
  const [c, setC] = useState({
    descricao: inicial.descricao ?? "", tipo: inicial.tipo ?? "Fixa", valor: paraTexto(inicial.valor), dia: String(inicial.dia ?? 10),
    inicio: inicial.inicio ?? mesAtual(), parcelas: String(inicial.parcelas ?? 12),
  });
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const set = (k: keyof typeof c, v: string) => setC((x) => ({ ...x, [k]: v }));
  const novo = !inicial.id;
  const parcelada = c.tipo === "Parcelada";
  const dia = Math.min(31, Math.max(1, Math.floor(Number(c.dia) || 0)));
  const nParc = Math.max(1, Math.floor(Number(c.parcelas) || 0));
  const valido = c.descricao.trim() && num(c.valor) > 0 && Number(c.dia) >= 1 && Number(c.dia) <= 31 && /^\d{4}-\d{2}$/.test(c.inicio);

  const confirmar = async () => {
    setSalvando(true); setErro("");
    try {
      const dados: Omit<ContaPagar, "id"> = {
        descricao: c.descricao.trim(), tipo: c.tipo as ContaPagar["tipo"], valor: num(c.valor), dia, inicio: c.inicio,
        ...(parcelada ? { parcelas: nParc } : {}), ativa: inicial.ativa ?? true, criadoPor: inicial.criadoPor ?? usuario?.nome ?? "",
      };
      if (novo) await salvar("contasPagar", dados);
      else await atualizar("contasPagar", inicial.id!, dados);
      onClose();
    } catch (e) {
      setErro(mensagemErro(e));
      setSalvando(false);
    }
  };

  const encerrar = async () => {
    if (!confirm(`Encerrar "${inicial.descricao}"? Ela continua em ${nomeMes(mesAtual())} e deixa de aparecer nos meses seguintes. Os pagamentos já feitos ficam no Financeiro.`)) return;
    try { await atualizar("contasPagar", inicial.id!, { ativa: false, encerradaEm: mesAtual() }); onClose(); } catch (e) { setErro(mensagemErro(e)); }
  };
  const remover = async () => {
    if (!confirm(`Excluir a conta "${inicial.descricao}"? Ela some de todos os meses; os pagamentos já feitos continuam no Financeiro.`)) return;
    try { await excluir("contasPagar", inicial.id!); onClose(); } catch (e) { setErro(mensagemErro(e)); }
  };

  return (
    <Modal titulo={novo ? "Nova conta a pagar" : "Editar conta a pagar"} sub="Despesa que se repete todo mês" onClose={onClose}
      footer={<>
        {!novo && podeFazer("financeiro_excluir") && (
          <button className="btn btn-danger" style={{ marginRight: "auto" }} onClick={remover}><Trash2 size={15} /> Excluir</button>
        )}
        {!novo && !parcelada && inicial.ativa !== false && <button className="btn" onClick={encerrar}>Encerrar conta</button>}
        <button className="btn" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" disabled={!valido || salvando} onClick={confirmar}>{salvando ? "Salvando..." : "Salvar"}</button>
      </>}>
      <div className="pills" style={{ marginBottom: 16 }}>
        {(["Fixa", "Parcelada"] as const).map((t) => (
          <button key={t} className={`pill ${c.tipo === t ? "active" : ""}`} style={c.tipo === t ? undefined : { background: "var(--surface-2)" }}
            onClick={() => set("tipo", t)}>{t === "Fixa" ? "Conta fixa (todo mês)" : "Parcelada"}</button>
        ))}
      </div>
      <div className="form-grid">
        <div className="field span-2"><label>Descrição</label>
          <input className="input" value={c.descricao} onChange={(e) => set("descricao", e.target.value)} placeholder={parcelada ? "Ex.: Notebook, empréstimo..." : "Ex.: Aluguel, internet, energia..."} autoFocus /></div>
        {parcelada && (
          <div className="field"><label>Quantidade de parcelas</label>
            <input className="input" type="number" min={1} max={360} value={c.parcelas} onChange={(e) => set("parcelas", e.target.value)} /></div>
        )}
        <div className="field"><label>{parcelada ? "Valor da parcela (R$)" : "Valor fixo por mês (R$)"}</label>
          <input className="input" inputMode="decimal" value={c.valor} onChange={(e) => set("valor", e.target.value)} placeholder="0,00" /></div>
        <div className="field"><label>Dia do pagamento</label>
          <input className="input" type="number" min={1} max={31} value={c.dia} onChange={(e) => set("dia", e.target.value)} /></div>
        <div className="field"><label>{parcelada ? "Mês da 1ª parcela" : "A partir de"}</label>
          <input className="input" type="month" value={c.inicio} onChange={(e) => set("inicio", e.target.value)} /></div>
      </div>
      {parcelada && num(c.valor) > 0 && (
        <p className="muted" style={{ fontSize: 13, margin: "12px 0 0" }}>
          {nParc}× de {brl(num(c.valor))} = <b>{brl(nParc * num(c.valor))}</b>, de {nomeMes(c.inicio)} a {nomeMes(somarMesesComp(c.inicio, nParc - 1))}, todo dia {dia}.
        </p>
      )}
      {!parcelada && <p className="muted" style={{ fontSize: 12.5, margin: "12px 0 0" }}>Se o valor mudar em algum mês (ex.: energia), ajuste na hora de pagar.</p>}
      {erro && <div className="error" style={{ marginTop: 12 }}>{erro}</div>}
    </Modal>
  );
}

/** Pagar a conta do mês: confirma o valor (pode ser diferente do previsto) e a data do pagamento. */
function PagarConta({ item, comp, onClose, onPagar }: {
  item: ItemMes; comp: string; onClose: () => void; onPagar: (valor: number, data: string) => Promise<void>;
}) {
  const [valor, setValor] = useState(paraTexto(item.valorPrevisto));
  const [data, setData] = useState(hojeISO());
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const confirmar = async () => {
    setSalvando(true); setErro("");
    try { await onPagar(num(valor), data || hojeISO()); onClose(); } catch (e) { setErro(mensagemErro(e)); setSalvando(false); }
  };
  return (
    <Modal titulo={`Pagar: ${item.conta.descricao}`} sub={`${nomeMes(comp)} · vence em ${dataBR(item.vencimento)}${item.parcela ? ` · parcela ${item.parcela}/${item.conta.parcelas}` : ""}`} onClose={onClose}
      footer={<>
        <button className="btn" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" disabled={num(valor) <= 0 || salvando} onClick={confirmar}>{salvando ? "Salvando..." : "Confirmar pagamento"}</button>
      </>}>
      <div className="form-grid">
        <div className="field"><label>Valor pago (R$)</label>
          <input className="input" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} autoFocus /></div>
        <div className="field"><label>Data do pagamento</label>
          <CampoData value={data} onChange={setData} /></div>
      </div>
      <p className="muted" style={{ fontSize: 12.5, margin: "12px 0 0" }}>O pagamento entra como despesa paga no Financeiro.</p>
      {erro && <div className="error" style={{ marginTop: 12 }}>{erro}</div>}
    </Modal>
  );
}
