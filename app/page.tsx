// app/page.tsx

import React from "react";
import LeadsClientComponent from "@/components/LeadsClientComponent";
import { supabase } from "../supabaseClient";

// Tipos partilhados pela aplicação
export type QualificationStatus = 'Quente' | 'Frio' | 'Morno' | 'Venda' | 'Novo';

export type Lead = {
  id: number;
  created_at: string;
  name?: string;
  phone?: string;
  email?: string; // Adicionando o campo email que pode ser útil
  gclid?: string;
  utm_source?: string;
  utm_campaign?: string;
  utm_medium?: string;
  utm_term?: string;
  utm_content?: string;
  qualification_status?: QualificationStatus;
  origem?: string;
  comment?: string;
};

// 1. DEFINIÇÃO CENTRALIZADA E EXPORTADA DO TIPO SortConfig
// Desta forma, qualquer componente pode importá-lo como única fonte da verdade.
export type SortConfig = {
  column: keyof Lead;
  direction: "asc" | "desc";
};

export const qualificationColors: { [key in QualificationStatus]: string } = {
  'Novo': "border-slate-300 bg-slate-50 text-slate-600 hover:bg-slate-100",
  'Quente': "border-red-300 bg-red-50 text-red-600 hover:bg-red-100",
  'Frio': "border-blue-300 bg-blue-50 text-blue-600 hover:bg-blue-100",
  'Morno': "border-orange-300 bg-orange-50 text-orange-600 hover:bg-orange-100",
  'Venda': "border-green-300 bg-green-50 text-green-600 hover:bg-green-100",
};

export default async function Page() {
  
  const { data: initialLeads, error } = await supabase
    .from('leads')
    .select('*') // Simplificado para buscar todas as colunas
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Erro ao buscar dados no servidor:", error);
    return <LeadsClientComponent initialLeads={[]} serverError={error.message} />;
  }

  return <LeadsClientComponent initialLeads={initialLeads ?? []} />;
}