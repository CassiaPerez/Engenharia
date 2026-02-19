import { useState, useCallback, useRef } from 'react';
import { supabase, mapFromSupabase } from '../services/supabase';

interface LazyLoadOptions {
  table: string;
  pageSize?: number;
  orderBy?: string;
  orderAsc?: boolean;
}

export const useLazyLoad = <T>({ table, pageSize = 50, orderBy = 'id', orderAsc = false }: LazyLoadOptions) => {
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const offsetRef = useRef(0);
  const cacheRef = useRef(new Map<string, T>());

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return;

    setIsLoading(true);
    try {
      const { data: newData, error } = await supabase
        .from(table)
        .select('*')
        .order(orderBy, { ascending: orderAsc })
        .range(offsetRef.current, offsetRef.current + pageSize - 1);

      if (error) throw error;

      const mappedData = mapFromSupabase<T>(newData || []);

      mappedData.forEach(item => {
        const id = (item as any).id;
        if (id) cacheRef.current.set(id, item);
      });

      setData(prev => [...prev, ...mappedData]);
      offsetRef.current += pageSize;

      if (!newData || newData.length < pageSize) {
        setHasMore(false);
      }
    } catch (error) {
      console.error(`Error loading more ${table}:`, error);
    } finally {
      setIsLoading(false);
    }
  }, [table, pageSize, orderBy, orderAsc, isLoading, hasMore]);

  const reset = useCallback(() => {
    setData([]);
    offsetRef.current = 0;
    setHasMore(true);
    cacheRef.current.clear();
  }, []);

  const getById = useCallback((id: string): T | undefined => {
    return cacheRef.current.get(id);
  }, []);

  return { data, isLoading, hasMore, loadMore, reset, getById };
};
