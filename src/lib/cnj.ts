// Número único de processo (CNJ): NNNNNNN-DD.AAAA.J.TR.OOOO
//   J  = segmento do Judiciário (8 = Estadual, 5 = Trabalho, 4 = Federal, 6 = Eleitoral...)
//   TR = tribunal dentro do segmento (na Justiça Estadual, o código da UF)
// Com isso descobrimos em qual tribunal consultar a API pública do CNJ (DataJud).

const UFS_TJ: Record<string, string> = {
  "01": "ac", "02": "al", "03": "ap", "04": "am", "05": "ba", "06": "ce", "07": "dft", "08": "es", "09": "go",
  "10": "ma", "11": "mt", "12": "ms", "13": "mg", "14": "pa", "15": "pb", "16": "pr", "17": "pe", "18": "pi",
  "19": "rj", "20": "rn", "21": "rs", "22": "ro", "23": "rr", "24": "sc", "25": "se", "26": "sp", "27": "to",
};
const TJM: Record<string, string> = { "13": "tjmmg", "21": "tjmrs", "26": "tjmsp" };

export const somenteDigitos = (v: string) => v.replace(/\D/g, "");

/** Aplica a máscara 0000000-00.0000.0.00.0000 enquanto digita. */
export function mascaraCnj(v: string) {
  const d = somenteDigitos(v).slice(0, 20);
  const partes = [d.slice(0, 7), d.slice(7, 9), d.slice(9, 13), d.slice(13, 14), d.slice(14, 16), d.slice(16, 20)];
  let s = partes[0];
  if (d.length > 7) s += "-" + partes[1];
  if (d.length > 9) s += "." + partes[2];
  if (d.length > 13) s += "." + partes[3];
  if (d.length > 14) s += "." + partes[4];
  if (d.length > 16) s += "." + partes[5];
  return s;
}

/** Confere o dígito verificador do número CNJ (módulo 97). */
export function cnjValido(numero: string) {
  const d = somenteDigitos(numero);
  if (d.length !== 20) return false;
  const n = d.slice(0, 7), dv = d.slice(7, 9), resto = d.slice(9);
  const r = BigInt(n + resto + dv) % BigInt(97);
  return r === BigInt(1);
}

export type TribunalCnj = { alias: string; sigla: string };

/** Identifica o tribunal (endpoint da API DataJud) pelo número CNJ. */
export function tribunalDoCnj(numero: string): TribunalCnj | null {
  const d = somenteDigitos(numero);
  if (d.length !== 20) return null;
  const j = d[13], tr = d.slice(14, 16);
  switch (j) {
    case "8": { const uf = UFS_TJ[tr]; return uf ? { alias: `tj${uf}`, sigla: `TJ${uf.toUpperCase()}` } : null; }
    case "5": { const n = Number(tr); return n >= 1 && n <= 24 ? { alias: `trt${n}`, sigla: `TRT${n}` } : null; }
    case "4": { const n = Number(tr); return n >= 1 && n <= 6 ? { alias: `trf${n}`, sigla: `TRF${n}` } : null; }
    case "6": { const uf = UFS_TJ[tr]; return uf ? { alias: `tre-${uf === "dft" ? "df" : uf}`, sigla: `TRE-${(uf === "dft" ? "df" : uf).toUpperCase()}` } : null; }
    case "9": { const t = TJM[tr]; return t ? { alias: t, sigla: t.toUpperCase() } : null; }
    case "3": return { alias: "stj", sigla: "STJ" };
    default: return null;
  }
}

/** Dados normalizados que o sistema guarda de cada consulta ao tribunal. */
export type DadosTribunal = {
  sigla: string;
  numero: string;
  classe: string;
  assuntos: string[];
  orgao: string;
  graus: string[];
  sistema: string;
  formato: string;
  dataAjuizamento: string;     // AAAA-MM-DD
  ultimaAtualizacao: string;   // ISO
  movimentos: { data: string; hora: string; descricao: string; grau: string }[];
};
