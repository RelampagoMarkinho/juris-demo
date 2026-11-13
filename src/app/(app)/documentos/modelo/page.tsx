"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import EditorModelo from "@/components/editor/EditorModelo";
import { useColecao } from "@/lib/db";
import { ehModeloEditor } from "@/lib/documento";
import type { Modelo } from "@/lib/mock";

// Versão estática (GitHub Pages): o modelo vem no endereço como ?id=... (ou ?id=novo)
export default function PaginaEditorModelo() {
  return <Suspense fallback={<div className="card empty">Carregando...</div>}><EditorDaUrl /></Suspense>;
}

function EditorDaUrl() {
  const id = useSearchParams().get("id") ?? "novo";
  const { podeFazer } = useAuth();
  const { dados: modelos, carregando } = useColecao<Modelo>("modelos");
  const podeEditar = podeFazer("documentos_modelos");

  if (!podeEditar) {
    return <div className="card empty">Seu perfil não tem permissão para criar ou editar modelos. <Link className="link" href="/documentos">Voltar</Link></div>;
  }
  if (id === "novo") return <EditorModelo key="novo" modelo={null} />;
  if (carregando) return <div className="card empty">Carregando...</div>;

  const modelo = modelos.find((m) => m.id === id);
  if (!modelo) return <div className="card empty">Modelo não encontrado. <Link className="link" href="/documentos">Voltar</Link></div>;
  if (!ehModeloEditor(modelo)) {
    return <div className="card empty">Este é um modelo antigo em Word e não pode ser aberto no editor. Crie um novo modelo. <Link className="link" href="/documentos">Voltar</Link></div>;
  }
  return <EditorModelo key={modelo.id} modelo={modelo} />;
}
