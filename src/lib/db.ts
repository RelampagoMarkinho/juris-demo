"use client";

import { useEffect, useState } from "react";
import {
  addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import { mensagemErro } from "./firebase";

export type Colecao = "clientes" | "corretores" | "processos" | "lancamentos" | "documentos" | "usuarios" | "modelos" | "contasPagar";

/** Escuta uma coleção em tempo real. `habilitado=false` evita consultas sem permissão. */
export function useColecao<T extends { id: string }>(nome: Colecao, ordem?: { campo: string; desc?: boolean }, habilitado = true) {
  const [dados, setDados] = useState<T[]>([]);
  const [carregando, setCarregando] = useState(habilitado);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (!habilitado) {
      setDados([]);
      setCarregando(false);
      return;
    }
    setCarregando(true);
    const ref = collection(db, nome);
    const q = ordem ? query(ref, orderBy(ordem.campo, ordem.desc ? "desc" : "asc")) : ref;
    return onSnapshot(
      q,
      (snap) => {
        setDados(snap.docs.map((d) => ({ ...(d.data() as Omit<T, "id">), id: d.id }) as T));
        setCarregando(false);
        setErro("");
      },
      (e) => {
        setErro(mensagemErro(e));
        setCarregando(false);
      },
    );
  }, [nome, ordem?.campo, ordem?.desc, habilitado]); // eslint-disable-line react-hooks/exhaustive-deps

  return { dados, carregando, erro };
}

const semId = <T extends object>(obj: T) => {
  const { id: _id, ...resto } = obj as T & { id?: string };
  return resto;
};

/** Cria (sem id) ou atualiza (com id) um documento. */
export async function salvar<T extends object>(nome: Colecao, obj: T & { id?: string }) {
  if (obj.id) {
    await updateDoc(doc(db, nome, obj.id), { ...semId(obj), atualizadoEm: serverTimestamp() });
    return obj.id;
  }
  const ref = await addDoc(collection(db, nome), { ...semId(obj), criadoEm: serverTimestamp() });
  return ref.id;
}

export async function definir<T extends object>(nome: Colecao, id: string, obj: T) {
  await setDoc(doc(db, nome, id), { ...semId(obj), criadoEm: serverTimestamp() });
}

export async function atualizar(nome: Colecao, id: string, campos: Record<string, unknown>) {
  await updateDoc(doc(db, nome, id), { ...campos, atualizadoEm: serverTimestamp() });
}

export async function excluir(nome: Colecao, id: string) {
  await deleteDoc(doc(db, nome, id));
}

export const hojeISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
