import { supabase, mapFromSupabase, mapToSupabase } from './supabase';
import { cacheService } from './cache';

interface QueryOptions {
  useCache?: boolean;
  cacheTTL?: number;
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderAsc?: boolean;
}

class OptimizedSupabaseService {
  private pendingBatch: Map<string, Array<{ operation: 'upsert' | 'insert' | 'delete'; data: any }>>;
  private batchTimeout: NodeJS.Timeout | null;
  private readonly BATCH_DELAY = 500;

  constructor() {
    this.pendingBatch = new Map();
    this.batchTimeout = null;
  }

  async query<T>(
    table: string,
    options: QueryOptions = {}
  ): Promise<T[]> {
    const {
      useCache = true,
      cacheTTL = 5 * 60 * 1000,
      limit,
      offset,
      orderBy = 'id',
      orderAsc = false
    } = options;

    const cacheKey = `${table}:${JSON.stringify(options)}`;

    if (useCache && cacheService.has(cacheKey)) {
      const cached = cacheService.get<T[]>(cacheKey);
      if (cached) return cached;
    }

    try {
      let query = supabase.from(table).select('id, json_content');

      if (orderBy) {
        query = query.order(orderBy, { ascending: orderAsc });
      }

      if (limit !== undefined) {
        if (offset !== undefined) {
          query = query.range(offset, offset + limit - 1);
        } else {
          query = query.limit(limit);
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      const mapped = mapFromSupabase<T>(data || []);

      if (useCache) {
        cacheService.set(cacheKey, mapped, cacheTTL);
      }

      return mapped;
    } catch (error) {
      console.error(`Error querying ${table}:`, error);
      return [];
    }
  }

  async save<T>(table: string, data: T, operation: 'upsert' | 'insert' = 'upsert'): Promise<void> {
    if (!this.pendingBatch.has(table)) {
      this.pendingBatch.set(table, []);
    }

    this.pendingBatch.get(table)!.push({ operation, data });

    cacheService.invalidatePattern(`^${table}:`);

    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
    }

    this.batchTimeout = setTimeout(() => {
      this.flushBatch();
    }, this.BATCH_DELAY);
  }

  async delete(table: string, id: string): Promise<void> {
    if (!this.pendingBatch.has(table)) {
      this.pendingBatch.set(table, []);
    }

    this.pendingBatch.get(table)!.push({ operation: 'delete', data: { id } });

    cacheService.invalidatePattern(`^${table}:`);

    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
    }

    this.batchTimeout = setTimeout(() => {
      this.flushBatch();
    }, this.BATCH_DELAY);
  }

  async flushBatch(): Promise<void> {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }

    const tables = Array.from(this.pendingBatch.keys());

    await Promise.all(
      tables.map(async table => {
        const operations = this.pendingBatch.get(table) || [];
        if (operations.length === 0) return;

        const upserts = operations.filter(op => op.operation === 'upsert').map(op => mapToSupabase(op.data));
        const inserts = operations.filter(op => op.operation === 'insert').map(op => mapToSupabase(op.data));
        const deletes = operations.filter(op => op.operation === 'delete').map(op => op.data.id);

        try {
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
        } catch (e) {
          console.error(`Batch operation error for ${table}:`, e);
        }

        this.pendingBatch.delete(table);
      })
    );
  }

  clearCache(pattern?: string): void {
    if (pattern) {
      cacheService.invalidatePattern(pattern);
    } else {
      cacheService.clear();
    }
  }
}

export const optimizedSupabase = new OptimizedSupabaseService();
