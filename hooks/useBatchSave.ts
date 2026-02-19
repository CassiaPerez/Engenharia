import { useRef, useCallback } from 'react';
import { supabase, mapToSupabase } from '../services/supabase';

interface BatchOperation {
  table: string;
  operation: 'insert' | 'upsert' | 'update' | 'delete';
  data: any;
  id?: string;
}

export const useBatchSave = (debounceMs: number = 1000) => {
  const batchQueue = useRef<Map<string, BatchOperation>>(new Map());
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isProcessing = useRef(false);

  const processBatch = useCallback(async () => {
    if (isProcessing.current || batchQueue.current.size === 0) return;

    isProcessing.current = true;
    const operations = Array.from(batchQueue.current.values());
    batchQueue.current.clear();

    const groupedByTable = operations.reduce((acc, op) => {
      if (!acc[op.table]) acc[op.table] = [];
      acc[op.table].push(op);
      return acc;
    }, {} as Record<string, BatchOperation[]>);

    try {
      await Promise.all(
        Object.entries(groupedByTable).map(async ([table, ops]) => {
          const upserts = ops.filter(o => o.operation === 'upsert').map(o => mapToSupabase(o.data));
          const inserts = ops.filter(o => o.operation === 'insert').map(o => mapToSupabase(o.data));
          const deletes = ops.filter(o => o.operation === 'delete').map(o => o.id);

          if (upserts.length > 0) {
            const { error } = await supabase.from(table).upsert(upserts);
            if (error) console.error(`Batch upsert error for ${table}:`, error);
          }

          if (inserts.length > 0) {
            const { error } = await supabase.from(table).insert(inserts);
            if (error) console.error(`Batch insert error for ${table}:`, error);
          }

          if (deletes.length > 0) {
            const { error } = await supabase.from(table).delete().in('id', deletes);
            if (error) console.error(`Batch delete error for ${table}:`, error);
          }
        })
      );
    } catch (e) {
      console.error('Batch processing error:', e);
    } finally {
      isProcessing.current = false;
    }
  }, []);

  const queueOperation = useCallback(
    (table: string, operation: 'insert' | 'upsert' | 'update' | 'delete', data: any, id?: string) => {
      const key = `${table}-${id || data.id || Math.random()}`;
      batchQueue.current.set(key, { table, operation, data, id });

      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        processBatch();
      }, debounceMs);
    },
    [debounceMs, processBatch]
  );

  const flush = useCallback(async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    await processBatch();
  }, [processBatch]);

  return { queueOperation, flush };
};
