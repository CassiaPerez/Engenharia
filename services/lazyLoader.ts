import { supabase, mapFromSupabase } from './supabase';
import { cacheService } from './cache';

interface LazyLoadOptions {
  pageSize?: number;
  useCache?: boolean;
  cacheTTL?: number;
}

class LazyDataLoader {
  private loadingState: Map<string, boolean> = new Map();
  private readonly DEFAULT_PAGE_SIZE = 500;
  private readonly CACHE_TTL = 10 * 60 * 1000;

  async loadTable<T>(
    tableName: string,
    options: LazyLoadOptions = {}
  ): Promise<T[]> {
    const {
      pageSize = this.DEFAULT_PAGE_SIZE,
      useCache = true,
      cacheTTL = this.CACHE_TTL
    } = options;

    const cacheKey = `lazy:${tableName}:all`;

    if (useCache) {
      const cached = cacheService.get<T[]>(cacheKey);
      if (cached) {
        console.log(`✅ Cache hit for ${tableName}`);
        return cached;
      }
    }

    if (this.loadingState.get(tableName)) {
      console.log(`⏳ Already loading ${tableName}, waiting...`);
      await this.waitForLoad(tableName);
      return cacheService.get<T[]>(cacheKey) || [];
    }

    this.loadingState.set(tableName, true);

    try {
      console.log(`📥 Loading ${tableName}...`);
      const allData: any[] = [];
      let from = 0;
      let hasMore = true;

      while (hasMore) {
        const to = from + pageSize - 1;

        const { data, error, count } = await supabase
          .from(tableName)
          .select('*', { count: 'exact' })
          .range(from, to);

        if (error) {
          console.error(`❌ Error loading ${tableName}:`, error);
          throw error;
        }

        if (data && data.length > 0) {
          allData.push(...data);
          console.log(`📦 ${tableName}: loaded ${allData.length}${count ? `/${count}` : ''} rows`);
        }

        hasMore = data && data.length === pageSize;
        from += pageSize;

        if (!hasMore) break;
      }

      const mapped = mapFromSupabase<T>(allData);

      if (useCache) {
        cacheService.set(cacheKey, mapped, cacheTTL);
      }

      console.log(`✅ ${tableName}: completed (${mapped.length} rows)`);
      return mapped;
    } catch (error) {
      console.error(`❌ Failed to load ${tableName}:`, error);
      throw error;
    } finally {
      this.loadingState.set(tableName, false);
    }
  }

  async loadCriticalData(): Promise<{
    users: any[];
    buildings: any[];
    services: any[];
  }> {
    console.log('🚀 Loading critical data only...');

    const [users, buildings, services] = await Promise.all([
      this.loadTable('users', { pageSize: 100 }),
      this.loadTable('buildings', { pageSize: 100 }),
      this.loadTable('services', { pageSize: 200 })
    ]);

    return { users, buildings, services };
  }

  async loadOnDemand<T>(tableName: string): Promise<T[]> {
    const cacheKey = `lazy:${tableName}:all`;
    const cached = cacheService.get<T[]>(cacheKey);

    if (cached) {
      return cached;
    }

    return this.loadTable<T>(tableName, { pageSize: 500 });
  }

  private async waitForLoad(tableName: string, maxWait = 30000): Promise<void> {
    const start = Date.now();
    while (this.loadingState.get(tableName)) {
      if (Date.now() - start > maxWait) {
        console.warn(`⚠️ Timeout waiting for ${tableName}`);
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  invalidateCache(tableName?: string): void {
    if (tableName) {
      cacheService.invalidatePattern(`^lazy:${tableName}:`);
    } else {
      cacheService.invalidatePattern('^lazy:');
    }
  }

  clearAllCache(): void {
    cacheService.clear();
  }
}

export const lazyLoader = new LazyDataLoader();
