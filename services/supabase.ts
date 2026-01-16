
import { createClient } from '@supabase/supabase-js';

// Em produção, estas variáveis devem vir de process.env ou similar
const SUPABASE_URL = 'https://affnrlkacfqjxchlubww.supabase.co';
const SUPABASE_KEY = 'sb_publishable_uc3NgAk9YpxARRLGIPEz4w_Q9q_mXRr';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Helper para converter dados do formato JSONB do banco para o objeto da aplicação
// Assumimos tabelas com colunas: id (text), json_content (jsonb)
export const mapFromSupabase = <T>(data: any[] | null): T[] => {
  if (!data) return [];
  return data.map(item => item.json_content as T);
};

// Helper para preparar dados para upsert no formato JSONB
export const mapToSupabase = <T extends { id: string }>(item: T) => {
  return {
    id: item.id,
    json_content: item
  };
};
