import { supabase, mapFromSupabase } from './supabase';
import { cacheService } from './cache';
import { getTableColumns } from './tableColumns';

interface LazyLoadOptions {
  pageSize?: number;
  useCache?: boolean;
  cacheTTL?: number;
}

class LazyDataLoader {
  private loadingState: Map<string, boolean> = new Map();
  private readonly DEFAULT_PAGE_SIZE = 1000;
  private readonly CACHE_TTL = 5 * 60 * 1000;

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

        const columns = getTableColumns(tableName);

        let query = supabase
          .from(tableName)
          .select(columns)
          .range(from, to);

        if (tableName === 'oss') {
          query = query.order('open_date', { ascending: false, nullsFirst: false });
        } else if (tableName === 'materials') {
          query = query.order('code', { ascending: true });
        } else if (tableName === 'projects') {
          query = query.order('code', { ascending: true });
        }

        const { data, error } = await query;

        if (error) {
          console.error(`❌ Error loading ${tableName}:`, error);
          throw error;
        }

        if (data && data.length > 0) {
          allData.push(...data);
          console.log(`📦 ${tableName}: loaded ${allData.length} rows`);
        }

        hasMore = data && data.length === pageSize;
        from += pageSize;

        if (!hasMore) break;
      }

      const mapped = mapFromSupabase<T>(allData);

      // Add default values for missing fields based on table type
      const normalized = this.normalizeTableData(tableName, mapped);

      if (useCache) {
        cacheService.set(cacheKey, normalized, cacheTTL);
      }

      console.log(`✅ ${tableName}: completed (${normalized.length} rows)`);
      return normalized;
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

  private normalizeTableData<T>(tableName: string, data: T[]): T[] {
    if (tableName === 'oss') {
      return data.map((item: any) => ({
        ...item,
        services: item.services || [],
        materials: item.materials || [],
        executorWorkLogs: item.executorWorkLogs || [],
        executorStates: item.executorStates || {},
        pauseHistory: item.pauseHistory || [],
        manualMaterialItems: item.manualMaterialItems || [],
        manualServiceItems: item.manualServiceItems || []
      }));
    }

    if (tableName === 'projects') {
      return data.map((item: any) => ({
        ...item,
        plannedServices: item.plannedServices || [],
        plannedMaterials: item.plannedMaterials || [],
        auditLogs: item.auditLogs || [],
        postponementHistory: item.postponementHistory || [],
        manualMaterialItems: item.manualMaterialItems || [],
        manualServiceItems: item.manualServiceItems || []
      }));
    }

    if (tableName === 'materials') {
      return data.map((item: any) => ({
        ...item,
        stockLocations: item.stockLocations || []
      }));
    }

    return data;
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
      console.log(`🗑️ Cache invalidated for: ${tableName}`);
    } else {
      cacheService.invalidatePattern('^lazy:');
      console.log('🗑️ All lazy cache invalidated');
    }
  }

  async reloadTable<T>(tableName: string): Promise<T[]> {
    console.log(`🔄 Reloading ${tableName}...`);
    this.invalidateCache(tableName);
    return this.loadTable<T>(tableName);
  }

  clearAllCache(): void {
    cacheService.clear();
    console.log('🗑️ All cache cleared');
  }

  async loadSingleRecord<T>(tableName: string, id: string): Promise<T | null> {
    console.log(`📄 Loading single ${tableName} record: ${id}`);

    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error(`❌ Error loading ${tableName} ${id}:`, error);
      throw error;
    }

    if (!data) {
      return null;
    }

    const mapped = mapFromSupabase<T>([data]);
    return mapped[0] || null;
  }
}

export const lazyLoader = new LazyDataLoader();
