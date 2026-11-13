import { deleteApp, getApp, getApps, initializeApp } from "firebase/app";
import { createUserWithEmailAndPassword, getAuth, signOut } from "firebase/auth";
import { getFirestore, initializeFirestore, type Firestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Configuração pública do app web (não é segredo — a proteção fica nas regras do Firestore).
const firebaseConfig = {
  apiKey: "PREENCHER",
  authDomain: "PREENCHER.firebaseapp.com",
  projectId: "PREENCHER",
  storageBucket: "PREENCHER.firebasestorage.app",
  messagingSenderId: "PREENCHER",
  appId: "PREENCHER",
};

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
// ignoreUndefinedProperties: campos opcionais não preenchidos (undefined) são simplesmente omitidos.
function criarFirestore(): Firestore {
  try {
    return initializeFirestore(app, { ignoreUndefinedProperties: true });
  } catch {
    return getFirestore(app); // já inicializado (recarga em desenvolvimento)
  }
}
export const db = criarFirestore();
export const storage = getStorage(app);

/**
 * Cria uma conta no Firebase Auth SEM derrubar a sessão do administrador logado.
 * (createUserWithEmailAndPassword faz login automático; por isso usamos uma instância secundária.)
 */
export async function criarContaAuth(email: string, senha: string): Promise<string> {
  const secundario = initializeApp(firebaseConfig, `criar-${Date.now()}`);
  try {
    const authSec = getAuth(secundario);
    const cred = await createUserWithEmailAndPassword(authSec, email, senha);
    await signOut(authSec);
    return cred.user.uid;
  } finally {
    await deleteApp(secundario);
  }
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
  if (code === "tamanho") return (e as Error).message;
  return ERROS[code] ?? `Erro inesperado${code ? ` (${code})` : ""}.`;
}
