import { supabase } from './supabase';

// A foto de finalização (oss.completion_image) é gravada como data URL base64
// (~50–300 KB por OS). Ela NÃO vem na listagem de OSs (ver tableColumns.ts):
// carregar centenas de fotos de uma vez estourava o statement timeout (erro 57014).
// Estas funções buscam as fotos só quando elas vão ser exibidas.

const IDS_PER_REQUEST = 100;   // consulta só de ids: leve
const IMAGES_PER_REQUEST = 5;  // ~1 MB por requisição
const PARALLEL_REQUESTS = 3;
const MAX_CACHED_IMAGES = 30;

// id da OS -> foto (null = OS sem foto)
const imageCache = new Map<string, string | null>();

const chunk = <T,>(items: T[], size: number): T[][] => {
  const parts: T[][] = [];
  for (let i = 0; i < items.length; i += size) parts.push(items.slice(i, i + size));
  return parts;
};

const remember = (id: string, image: string | null) => {
  imageCache.delete(id);
  imageCache.set(id, image);
  if (imageCache.size > MAX_CACHED_IMAGES) {
    const oldest = imageCache.keys().next().value;
    if (oldest !== undefined) imageCache.delete(oldest);
  }
};

// Quais das OSs informadas têm foto de finalização (sem baixar as fotos).
export const getOsIdsWithCompletionImage = async (ids: string[]): Promise<Set<string>> => {
  const withImage = new Set<string>();

  for (const part of chunk(Array.from(new Set(ids)), IDS_PER_REQUEST)) {
    const { data, error } = await supabase
      .from('oss')
      .select('id')
      .in('id', part)
      .not('completion_image', 'is', null);

    if (error) throw error;
    (data || []).forEach((row: any) => withImage.add(row.id));
  }

  return withImage;
};

// Fotos de finalização das OSs informadas (id -> data URL). OSs sem foto ficam fora do Map.
export const fetchCompletionImages = async (ids: string[]): Promise<Map<string, string>> => {
  const images = new Map<string, string>();
  const missing: string[] = [];

  for (const id of new Set(ids)) {
    if (imageCache.has(id)) {
      const cached = imageCache.get(id);
      if (cached) images.set(id, cached);
    } else {
      missing.push(id);
    }
  }

  const parts = chunk(missing, IMAGES_PER_REQUEST);

  for (let i = 0; i < parts.length; i += PARALLEL_REQUESTS) {
    await Promise.all(parts.slice(i, i + PARALLEL_REQUESTS).map(async part => {
      const { data, error } = await supabase
        .from('oss')
        .select('id, completion_image')
        .in('id', part);

      if (error) throw error;

      (data || []).forEach((row: any) => {
        if (row.completion_image) images.set(row.id, row.completion_image);
      });
      part.forEach(id => remember(id, images.get(id) ?? null));
    }));
  }

  return images;
};

export const fetchCompletionImage = async (id: string): Promise<string | null> => {
  const images = await fetchCompletionImages([id]);
  return images.get(id) ?? null;
};
