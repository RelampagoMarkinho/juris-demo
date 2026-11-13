// Cálculo de aniversários (clientes, corretores e colaboradores).

export type TipoPessoa = "Cliente" | "Corretor" | "Colaborador";

export type Aniversariante = {
  id: string;
  nome: string;
  tipo: TipoPessoa;
  dias: number;      // 0 = hoje
  data: string;      // dd/mm do aniversário
  idade: number;     // idade que vai completar
  telefone?: string;
  link?: string;     // página da pessoa no sistema
};

const hoje0 = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };

/** Data do aniversário num ano (29/02 vira 28/02 em anos não bissextos). */
function aniversarioNoAno(mes: number, dia: number, ano: number) {
  const d = new Date(ano, mes - 1, dia);
  return d.getMonth() === mes - 1 ? d : new Date(ano, mes - 1, 28);
}

/** Dias até o próximo aniversário e idade que a pessoa vai completar. */
export function proximoAniversario(nascimento?: string): { dias: number; idade: number; data: string } | null {
  if (!nascimento || !/^\d{4}-\d{2}-\d{2}$/.test(nascimento)) return null;
  const [a, m, d] = nascimento.split("-").map(Number);
  const hoje = hoje0();
  let prox = aniversarioNoAno(m, d, hoje.getFullYear());
  if (prox < hoje) prox = aniversarioNoAno(m, d, hoje.getFullYear() + 1);
  const dias = Math.round((prox.getTime() - hoje.getTime()) / 86400000);
  return { dias, idade: prox.getFullYear() - a, data: `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}` };
}

/** Idade atual (anos completos). */
export function idade(nascimento: string) {
  const p = proximoAniversario(nascimento);
  if (!p) return 0;
  return p.dias === 0 ? p.idade : p.idade - 1;
}

/** Pessoas que fazem aniversário de hoje até `antecedencia` dias, do mais próximo ao mais distante. */
export function aniversariantes(
  pessoas: { id: string; nome: string; tipo: TipoPessoa; dataNascimento?: string; telefone?: string; link?: string }[],
  antecedencia = 3,
): Aniversariante[] {
  const lista: Aniversariante[] = [];
  for (const p of pessoas) {
    const a = proximoAniversario(p.dataNascimento);
    if (a && a.dias <= antecedencia) lista.push({ id: p.id, nome: p.nome, tipo: p.tipo, telefone: p.telefone, link: p.link, ...a });
  }
  return lista.sort((x, y) => x.dias - y.dias || x.nome.localeCompare(y.nome));
}

/** Link do WhatsApp com mensagem de parabéns (telefone brasileiro). */
export function linkParabens(telefone: string | undefined, nome: string) {
  const dig = (telefone ?? "").replace(/\D/g, "");
  if (dig.length < 10) return null;
  const numero = dig.startsWith("55") ? dig : `55${dig}`;
  const msg = `Olá, ${nome.split(" ")[0]}! A equipe do escritório deseja um feliz aniversário! 🎉`;
  return `https://wa.me/${numero}?text=${encodeURIComponent(msg)}`;
}
