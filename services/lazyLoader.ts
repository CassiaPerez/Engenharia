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
  private readonly DEFAULT_PAGE_SIZE = 500;
  private readonly CACHE_TTL = 5 * 60 * 1000;
  private readonly MAX_RETRIES = 2;

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
        const columns = getTableColumns(tableName, false);

        const fetchPage = () => {
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

          return query;
        };

        // Timeout (57014) ou queda de rede costumam ser momentâneos: tenta de novo antes de desistir.
        let { data, error } = await fetchPage();
        for (let attempt = 1; error && attempt <= this.MAX_RETRIES; attempt++) {
          console.warn(`⚠️ Retrying ${tableName} rows ${from}-${to} (attempt ${attempt}):`, error.message);
          await new Promise(resolve => setTimeout(resolve, attempt * 1000));
          ({ data, error } = await fetchPage());
        }

        if (error) {
          console.error(`❌ Error loading ${tableName}:`, error);
          throw error;
        }

        if (data && data.length > 0) {
          allData.push(...data);
          console.log(`📦 ${tableName}: loaded ${allData.length} rows`);
        }

        hasMore = !!(data && data.length === pageSize);
        from += pageSize;

        if (!hasMore) break;
      }

      const mapped = mapFromSupabase<T>(allData);
      const normalized = this.normalizeTableData(tableName, mapped, false);

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

    return this.loadTable<T>(tableName);
  }

  private normalizeTableData<T>(tableName: string, data: T[], isFull: boolean): T[] {
    if (tableName === 'oss') {
      return data.map((item: any) => {
        // Reconstruct costItems from persisted manual_material_items / manual_service_items
        const matItems: any[] = Array.isArray(item.manualMaterialItems) ? item.manualMaterialItems : [];
        const srvItems: any[] = Array.isArray(item.manualServiceItems) ? item.manualServiceItems : [];
        const costItems = [
          ...matItems.map((i: any) => ({ id: i.id || Math.random().toString(36).substr(2,9), type: 'MATERIAL', description: i.description || '', amount: Number(i.value) || 0 })),
          ...srvItems.map((i: any) => ({ id: i.id || Math.random().toString(36).substr(2,9), type: 'SERVICE', description: i.description || '', amount: Number(i.value) || 0 })),
        ];
        return ({
        ...item,
        costItems,

        // IMPORTANTE: mesmo na listagem leve, manter arrays vazios
        // para a UI não quebrar ao calcular custo/horas.
        services: Array.isArray(item.services) ? item.services : [],
        materials: Array.isArray(item.materials) ? item.materials : [],

        ...(isFull
          ? {
              executorWorkLogs: Array.isArray(item.executorWorkLogs) ? item.executorWorkLogs : [],
              executorStates:
                item.executorStates && typeof item.executorStates === 'object'
                  ? item.executorStates
                  : {},
              pauseHistory: Array.isArray(item.pauseHistory) ? item.pauseHistory : [],
              manualMaterialItems: Array.isArray(item.manualMaterialItems)
                ? item.manualMaterialItems
                : [],
              manualServiceItems: Array.isArray(item.manualServiceItems)
                ? item.manualServiceItems
                : []
            }
          : {
              executorWorkLogs: [],
              executorStates:
                item.executorStates && typeof item.executorStates === 'object'
                  ? item.executorStates
                  : {},
              pauseHistory: Array.isArray(item.pauseHistory) ? item.pauseHistory : [],
              manualMaterialItems: Array.isArray(item.manualMaterialItems)
                ? item.manualMaterialItems
                : [],
              manualServiceItems: Array.isArray(item.manualServiceItems)
                ? item.manualServiceItems
                : []
            })
        });
      });
    }

    if (tableName === 'projects') {
      return data.map((item: any) => ({
        ...item,
        plannedServices: Array.isArray(item.plannedServices) ? item.plannedServices : [],
        plannedMaterials: Array.isArray(item.plannedMaterials) ? item.plannedMaterials : [],
        auditLogs: Array.isArray(item.auditLogs) ? item.auditLogs : [],
        postponementHistory: Array.isArray(item.postponementHistory) ? item.postponementHistory : [],
        manualMaterialItems: Array.isArray(item.manualMaterialItems)
          ? item.manualMaterialItems
          : [],
        manualServiceItems: Array.isArray(item.manualServiceItems)
          ? item.manualServiceItems
          : []
      }));
    }

    if (tableName === 'materials') {
      return data.map((item: any) => ({
        ...item,
        stockLocations: Array.isArray(item.stockLocations) ? item.stockLocations : []
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

    const columns = getTableColumns(tableName, true);

    const { data, error } = await supabase
      .from(tableName)
      .select(columns)
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
    const normalized = this.normalizeTableData(tableName, mapped, true);
    return normalized[0] || null;
  }
}

export const lazyLoader = new LazyDataLoader();