// Versão de demonstração: sem Firebase. Banco, login e arquivos ficam no próprio navegador
// (ver src/lib/local). As funções abaixo mantêm os mesmos nomes usados pelo resto do sistema.
import { criarConta, getAuth } from "./local/auth";
import { getFirestore } from "./local/firestore";
import { getStorage } from "./local/storage";

export const auth = getAuth();
export const db = getFirestore();
export const storage = getStorage();

/** Cria a conta de outro usuário SEM trocar a sessão do administrador logado. */
export async function criarContaAuth(email: string, senha: string): Promise<string> {
  return (await criarConta(email, senha, false)).user.uid;
}

const ERROS: Record<string, string> = {
  "auth/invalid-credential": "E-mail ou senha incorretos.",
  "auth/wrong-password": "E-mail ou senha incorretos.",
  "auth/user-not-found": "E-mail ou senha incorretos.",
  "auth/invalid-email": "E-mail inválido.",
  "auth/email-already-in-use": "Já existe uma conta com este e-mail.",
  "auth/weak-password": "A senha deve ter ao menos 6 caracteres.",
  "auth/too-many-requests": "Muitas tentativas. Aguarde alguns minutos e tente novamente.",
  "auth/network-request-failed": "Sem conexão com a internet.",
  "auth/requires-recent-login": "Por segurança, informe sua senha atual novamente.",
  "auth/operation-not-allowed": "Login por e-mail/senha não está ativado no Firebase Authentication.",
  "auth/user-disabled": "Esta conta foi desativada.",
  "permission-denied": "Você não tem permissão para esta ação.",
  "storage/unauthorized": "Sem permissão para acessar os arquivos (verifique as regras do Storage).",
  "storage/object-not-found": "Arquivo não encontrado no armazenamento.",
  "storage/quota-exceeded": "Limite de armazenamento atingido.",
  "storage/canceled": "Envio cancelado.",
  "storage/unknown": "Erro no armazenamento. Verifique se o Firebase Storage está ativado no projeto.",
  "storage/bucket-not-found": "O armazenamento de arquivos (Firebase Storage) ainda não foi ativado no projeto.",
  "storage/project-not-found": "O armazenamento de arquivos (Firebase Storage) ainda não foi ativado no projeto.",
  "storage/retry-limit-exceeded": "Não foi possível enviar o arquivo. Verifique a internet ou se o Firebase Storage está ativado.",
};

export function mensagemErro(e: unknown): string {
  const code = (e as { code?: string })?.code ?? "";
  if (code === "tamanho" || code === "demo" || code === "not-found") return (e as Error).message;
  return ERROS[code] ?? `Erro inesperado${code ? ` (${code})` : ""}.`;
}
