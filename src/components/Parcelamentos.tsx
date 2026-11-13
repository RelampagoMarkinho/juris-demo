"use client";

import { useMemo, useState } from "react";
import { CalendarClock, CheckCircle2, Plus, RotateCcw, Trash2 } from "lucide-react";
import { Modal } from "./Shell";
import { Badge } from "./ui";
import { useAuth } from "./AuthProvider";
import CampoData from "./CampoData";
import { hojeISO, useColecao } from "@/lib/db";
import { mensagemErro } from "@/lib/firebase";
import { brl, dataBR, type Cliente, type Lancamento } from "@/lib/mock";
import {
  agruparParcelamentos, baixarParcelas, criarParcelamento, estornarParcela, excluirParcelamento, preverParcelas,
  rotuloParcela, somarMeses, statusEfetivo, type Parcelamento,
} from "@/lib/parcelas";

const CATEGORIAS = ["Honorários", "Consultoria", "Custas", "Outros"];

/** Lista dos acordos parcelados (todos, ou só os de um cliente), com progresso até a quitação. */
export function ListaParcelamentos({ lancamentos, cliente, titulo = "Parcelamentos", embutido }: {
  lancamentos: Lancamento[]; cliente?: Pick<Cliente, "id" | "nome">; titulo?: string;
  embutido?: boolean; // dentro de outro quadro (abas do Financeiro): sem moldura nem título
}) {
  const { podeFazer } = useAuth();
  const [novo, setNovo] = useState(false);
  const [abertoId, setAbertoId] = useState<string | null>(null);
  const [verQuitados, setVerQuitados] = useState(false);

  const todos = useMemo(() => agruparParcelamentos(
    cliente ? lancamentos.filter((l) => l.clienteId === cliente.id || l.cliente === cliente.nome) : lancamentos,
  ), [lancamentos, cliente]);
  const lista = todos.filter((p) => verQuitados || !p.quitado);
  const aberto = todos.find((p) => p.id === abertoId);
  const quitados = todos.filter((p) => p.quitado).length;

  return (
    <section className={embutido ? undefined : "card"} style={embutido ? undefined : { marginTop: 16 }}>
      <div className="card-head" style={embutido ? { justifyContent: "flex-end" } : undefined}>
        {!embutido && <h3>{titulo}</h3>}
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {quitados > 0 && (
            <label className="checkbox" style={{ fontSize: 13 }}>
              <input type="checkbox" checked={verQuitados} onChange={(e) => setVerQuitados(e.target.checked)} /> Mostrar quitados ({quitados})
            </label>
          )}
          {podeFazer("financeiro_criar") && <button className="btn btn-primary" onClick={() => setNovo(true)}><Plus size={16} /> Novo parcelamento</button>}
        </div>
      </div>
      <div className="table-wrap">
        <table className="tbl">
          <thead><tr>{!cliente && <th>Cliente</th>}<th>Descrição</th><th>Pagas</th><th>Pago / Total</th><th>Saldo</th><th>Próximo vencimento</th><th>Situação</th></tr></thead>
          <tbody>
            {lista.map((p) => (
              <tr key={p.id} className="click" onClick={() => setAbertoId(p.id)}>
                {!cliente && <td>{p.cliente}</td>}
                <td>{p.descricao}</td>
                <td>
                  <div className="parc-prog"><span style={{ width: `${(p.pago / (p.total || 1)) * 100}%` }} /></div>
                  <small className="muted">{p.pagas} de {p.parcelas.length}</small>
                </td>
                <td className="num">{brl(p.pago)} <span className="muted">/ {brl(p.total)}</span></td>
                <td className="num">{brl(p.saldo)}</td>
                <td className="num">{p.proxima ? `${dataBR(p.proxima.data)} · ${brl(p.proxima.valor)}` : "—"}</td>
                <td>{p.quitado ? <Badge>Quitado</Badge> : p.atrasadas ? <Badge>{`${p.atrasadas} em atraso`}</Badge> : <Badge>Em dia</Badge>}</td>
              </tr>
            ))}
            {lista.length === 0 && (
              <tr><td colSpan={7} className="empty">
                {todos.length ? "Todos os parcelamentos estão quitados." : "Nenhum parcelamento. Use “Novo parcelamento” para dividir um valor em parcelas."}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
      {novo && <NovoParcelamento clienteFixo={cliente} onClose={() => setNovo(false)} />}
      {aberto && <DetalheParcelamento p={aberto} onClose={() => setAbertoId(null)} />}
    </section>
  );
}

/** Cria o acordo: valor total, entrada opcional e N parcelas mensais. */
export function NovoParcelamento({ onClose, clienteFixo }: { onClose: () => void; clienteFixo?: Pick<Cliente, "id" | "nome"> }) {
  const { usuario } = useAuth();
  const { dados: clientes } = useColecao<Cliente>("clientes", { campo: "nome" }, !clienteFixo);
  const [clienteId, setClienteId] = useState(clienteFixo?.id ?? "");
  const [descricao, setDescricao] = useState("Honorários advocatícios");
  const [categoria, setCategoria] = useState("Honorários");
  const [total, setTotal] = useState("");
  const [entrada, setEntrada] = useState("");
  const [dataEntrada, setDataEntrada] = useState(hojeISO());
  const [entradaPaga, setEntradaPaga] = useState(true);
  const [n, setN] = useState("10");
  const [primeiro, setPrimeiro] = useState(somarMeses(hojeISO(), 1));
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  const cliente = clienteFixo ?? clientes.find((c) => c.id === clienteId);
  const vTotal = Number(total.replace(",", ".")) || 0;
  const vEntrada = Number(entrada.replace(",", ".")) || 0;
  const qtd = Math.max(0, Math.min(120, Math.floor(Number(n) || 0)));
  const previa = preverParcelas(vTotal, qtd, primeiro || hojeISO(), vEntrada, dataEntrada || hojeISO());
  const valido = !!cliente && vTotal > 0 && vEntrada < vTotal && qtd >= 1 && !!primeiro && !!descricao.trim();

  const confirmar = async () => {
    if (!cliente) return;
    setSalvando(true); setErro("");
    try {
      await criarParcelamento({
        descricao: descricao.trim(), cliente: cliente.nome, clienteId: cliente.id, categoria, parcelas: previa,
        criadoPor: usuario?.nome ?? "", entradaPaga,
      });
      onClose();
    } catch (e) {
      setErro(mensagemErro(e));
      setSalvando(false);
    }
  };

  return (
    <Modal wide titulo="Novo parcelamento" sub="Divide o valor em parcelas mensais; cada parcela entra no Financeiro como receita a receber" onClose={onClose}
      footer={<>
        <button className="btn" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" disabled={!valido || salvando} onClick={confirmar}>{salvando ? "Salvando..." : `Criar ${previa.length} lançamento(s)`}</button>
      </>}>
      <div className="form-grid">
        {!clienteFixo && (
          <div className="field span-2"><label>Cliente</label>
            <select className="select" value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
              <option value="">Selecione...</option>
              {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select></div>
        )}
        <div className="field"><label>Descrição</label>
          <input className="input" value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex.: Honorários — ação previdenciária" /></div>
        <div className="field"><label>Categoria</label>
          <select className="select" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
            {CATEGORIAS.map((c) => <option key={c}>{c}</option>)}
          </select></div>
        <div className="field"><label>Valor total (R$)</label>
          <input className="input" inputMode="decimal" value={total} onChange={(e) => setTotal(e.target.value)} placeholder="0,00" autoFocus /></div>
        <div className="field"><label>Número de parcelas</label>
          <input className="input" type="number" min={1} max={120} value={n} onChange={(e) => setN(e.target.value)} /></div>
        <div className="field"><label>Entrada (R$, opcional)</label>
          <input className="input" inputMode="decimal" value={entrada} onChange={(e) => setEntrada(e.target.value)} placeholder="0,00" /></div>
        <div className="field"><label>Data da entrada</label>
          <CampoData value={dataEntrada} onChange={setDataEntrada} /></div>
        {vEntrada > 0 && (
          <label className="checkbox span-2" style={{ fontSize: 13.5 }}>
            <input type="checkbox" checked={entradaPaga} onChange={(e) => setEntradaPaga(e.target.checked)} /> A entrada já foi paga
          </label>
        )}
        <div className="field"><label>Vencimento da 1ª parcela</label>
          <CampoData value={primeiro} onChange={setPrimeiro} /></div>
        <div className="field"><label>Demais parcelas</label>
          <input className="input" disabled value={primeiro ? `Todo dia ${Number(primeiro.slice(8))} de cada mês` : ""} /></div>
      </div>

      {previa.length > 0 && vTotal > 0 && (
        <>
          <h4 style={{ margin: "16px 0 8px", fontWeight: 600 }}>Prévia das parcelas</h4>
          <div className="table-wrap" style={{ maxHeight: 260, overflow: "auto" }}>
            <table className="tbl">
              <thead><tr><th>Parcela</th><th>Vencimento</th><th>Valor</th></tr></thead>
              <tbody>
                {previa.map((p) => (
                  <tr key={p.numero}><td>{p.entrada ? `Entrada${entradaPaga ? " (paga)" : ""}` : `${p.numero}/${qtd}`}</td>
                    <td className="num">{dataBR(p.vencimento)}</td><td className="num">{brl(p.valor)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {vEntrada >= vTotal && vTotal > 0 && <div className="error" style={{ marginTop: 12 }}>A entrada precisa ser menor que o valor total.</div>}
      {erro && <div className="error" style={{ marginTop: 12 }}>{erro}</div>}
    </Modal>
  );
}

/** Parcelas de um acordo: dar baixa (uma ou todas), desfazer baixa e excluir o acordo. */
function DetalheParcelamento({ p, onClose }: { p: Parcelamento; onClose: () => void }) {
  const { podeFazer } = useAuth();
  const [dataPgto, setDataPgto] = useState(hojeISO());
  const [erro, setErro] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const podeBaixar = podeFazer("financeiro_baixar");

  const exec = async (fn: () => Promise<void>) => {
    setErro(""); setOcupado(true);
    try { await fn(); } catch (e) { setErro(mensagemErro(e)); } finally { setOcupado(false); }
  };
  const abertas = p.parcelas.filter((l) => l.status !== "Pago");

  return (
    <Modal wide titulo={p.descricao} sub={`${p.cliente} · ${p.pagas} de ${p.parcelas.length} pagas`} onClose={onClose}
      footer={<>
        {podeFazer("financeiro_excluir") && (
          <button className="btn btn-danger" style={{ marginRight: "auto" }} disabled={ocupado}
            onClick={() => confirm(`Excluir o parcelamento inteiro (${p.parcelas.length} lançamentos, inclusive os já pagos)?`) && exec(async () => { await excluirParcelamento(p); onClose(); })}>
            <Trash2 size={15} /> Excluir parcelamento
          </button>
        )}
        <button className="btn btn-primary" onClick={onClose}>Fechar</button>
      </>}>
      <div className="kv">
        <div><span>Total</span><strong>{brl(p.total)}</strong></div>
        <div><span>Pago</span><strong className="pos">{brl(p.pago)}</strong></div>
        <div><span>Saldo devedor</span><strong className={p.saldo ? "neg" : ""}>{brl(p.saldo)}</strong></div>
        <div><span>Situação</span><strong>{p.quitado ? "Quitado" : p.atrasadas ? `${p.atrasadas} parcela(s) em atraso` : "Em dia"}</strong></div>
      </div>
      <div className="parc-prog grande"><span style={{ width: `${(p.pago / (p.total || 1)) * 100}%` }} /></div>

      {podeBaixar && abertas.length > 0 && (
        <div className="row-between" style={{ gap: 10, flexWrap: "wrap", margin: "14px 0" }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <CalendarClock size={16} /> <span style={{ fontSize: 13.5 }}>Data do pagamento:</span>
            <CampoData style={{ width: 130, height: 36 }} value={dataPgto} onChange={setDataPgto} />
          </div>
          <button className="btn" disabled={ocupado}
            onClick={() => confirm(`Dar baixa em todas as ${abertas.length} parcela(s) em aberto (${brl(p.saldo)}) e quitar o acordo?`) && exec(() => baixarParcelas(abertas.map((l) => l.id), dataPgto || hojeISO()))}>
            <CheckCircle2 size={15} /> Quitar saldo ({brl(p.saldo)})
          </button>
        </div>
      )}

      <div className="table-wrap">
        <table className="tbl">
          <thead><tr><th>Parcela</th><th>Vencimento</th><th>Valor</th><th>Situação</th><th>Pago em</th><th></th></tr></thead>
          <tbody>
            {p.parcelas.map((l) => {
              const st = statusEfetivo(l);
              return (
                <tr key={l.id}>
                  <td>{rotuloParcela(l)}</td>
                  <td className="num">{dataBR(l.data)}</td>
                  <td className="num">{brl(l.valor)}</td>
                  <td><Badge>{st}</Badge></td>
                  <td className="num">{l.status === "Pago" && l.pagoEm ? dataBR(l.pagoEm) : "—"}</td>
                  <td>
                    {podeBaixar && (l.status === "Pago" ? (
                      <button className="icon-btn sm" title="Desfazer a baixa" aria-label="Desfazer a baixa" disabled={ocupado}
                        onClick={() => confirm(`Desfazer o pagamento de ${rotuloParcela(l)}?`) && exec(() => estornarParcela(l.id))}><RotateCcw size={15} /></button>
                    ) : (
                      <button className="btn" style={{ height: 30, padding: "0 12px" }} disabled={ocupado}
                        onClick={() => exec(() => baixarParcelas([l.id], dataPgto || hojeISO()))}>Baixar</button>
                    ))}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {erro && <div className="error" style={{ marginTop: 12 }}>{erro}</div>}
    </Modal>
  );
}
