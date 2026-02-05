import { createClient } from '@supabase/supabase-js';

// Credenciais fornecidas para conexão com Supabase
// Em produção, utilize variáveis de ambiente como import.meta.env.VITE_SUPABASE_URL
const SUPABASE_URL = 'https://affnrlkacfqjxchlubww.supabase.co';
const SUPABASE_KEY = 'sb_publishable_uc3NgAk9YpxARRLGIPEz4w_Q9q_mXRr';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Helper para converter dados do formato JSONB do banco para o objeto da aplicação
// Assumimos tabelas com colunas: id (text/uuid), json_content (jsonb)
//
// IMPORTANTE:
// Sempre use o ID REAL da linha (coluna `id`) como fonte de verdade.
// Isso evita o bug clássico: json_content.id != id (linha), que faz o delete "não achar" o registro.
export const mapFromSupabase = <T extends { id: string }>(data: any[] | null): T[] => {
  if (!data) return [];
  return data.map((row) => ({
    ...(row.json_content as T),
    id: row.id, // força consistência entre app e banco
  }));
};

// Helper para preparar dados para upsert no formato JSONB
// Mantém o `id` tanto na coluna quanto dentro do JSON (por conveniência),
// mas o app SEMPRE deve tratar `row.id` como fonte de verdade.
export const mapToSupabase = <T extends { id: string }>(item: T) => {
  return {
    id: item.id,
    json_content: { ...item, id: item.id },
  };
};