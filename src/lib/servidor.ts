// Utilitários usados apenas nas rotas do servidor (app/api/*).

import { createRemoteJWKSet, jwtVerify } from "jose";

export const PROJETO = "PREENCHER"; // ID do projeto Firebase da demonstração

const CHAVES_FIREBASE = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"),
);

export const texto = (msg: string, status: number) =>
  new Response(msg, { status, headers: { "Content-Type": "text/plain; charset=utf-8" } });

/** Confere o login do Firebase enviado pelo navegador. Retorna uma resposta de erro, ou null se estiver tudo certo. */
export async function exigirLogin(req: Request): Promise<Response | null> {
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!bearer) return texto("Faça login novamente.", 401);
  try {
    await jwtVerify(bearer, CHAVES_FIREBASE, { issuer: `https://securetoken.google.com/${PROJETO}`, audience: PROJETO });
    return null;
  } catch {
    return texto("Sessão expirada. Faça login novamente.", 401);
  }
}
