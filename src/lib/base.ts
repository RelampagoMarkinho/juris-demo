/**
 * Endereço-base do site. No GitHub Pages o sistema fica em https://<usuario>.github.io/<repositorio>/,
 * então arquivos de /public precisam do prefixo "/<repositorio>" (definido no build pelo GitHub Actions).
 */
export const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";
export const caminho = (p: string) => `${BASE}${p}`;
