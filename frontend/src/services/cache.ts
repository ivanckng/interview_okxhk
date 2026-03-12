/**
 * LocalStorage 緩存管理服務
 * 
 * 功能：
 * 1. 存儲 API 響應數據到 LocalStorage
 * 2. 支持 TTL (Time To Live) 過期機制
 * 3. 自動清理過期數據
 * 4. 生產環境由後端調度預熱，前端只管理本地展示緩存
 */

const CACHE_PREFIX = 'crypto_pulse_cache_';

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // 秒
  expiresAt: number;
}

export interface CacheStats {
  totalKeys: number;
  totalSize: number; // bytes
  expiredKeys: number;
}

export interface ModuleConfig {
  key: string;
  ttl: number; // 秒
}

// 各模塊的默認 TTL 配置
export const MODULE_CONFIGS: Record<string, ModuleConfig> = {
  news: { key: 'news', ttl: 30 * 60 },        // 30 分鐘
  newsHighlight: { key: 'news_highlight', ttl: 60 * 60 }, // 1 小時
  breakingNews: { key: 'breaking_news', ttl: 30 * 60 },   // 30 分鐘 (GNews 配額限制)
  market: { key: 'market', ttl: 10 * 60 },    // 10 分鐘
  marketHighlight: { key: 'market_highlight_v2', ttl: 30 * 60 }, // 30 分鐘
  stockIndices: { key: 'stock_indices', ttl: 5 * 60 },     // 5 分鐘
  commodities: { key: 'commodities', ttl: 5 * 60 },        // 5 分鐘
  currencies: { key: 'currencies', ttl: 5 * 60 },          // 5 分鐘
  crypto: { key: 'crypto', ttl: 5 * 60 },     // 5 分鐘
  cryptoHighlight: { key: 'crypto_highlight', ttl: 30 * 60 }, // 30 分鐘
  company: { key: 'company', ttl: 15 * 60 },  // 15 分鐘
  companyHighlight: { key: 'company_highlight', ttl: 30 * 60 }, // 30 分鐘
  pulse: { key: 'pulse', ttl: 20 * 60 },      // 20 分鐘 (綜合分析頁)
  pulseComprehensive: { key: 'pulse_comprehensive', ttl: 20 * 60 }, // 20 分鐘
  pulseRecommendations: { key: 'pulse_recommendations', ttl: 30 * 60 }, // 30 分鐘
  competitors: { key: 'competitors', ttl: 15 * 60 }, // 15 分鐘
  competitorsHighlight: { key: 'competitors_highlight', ttl: 10 * 60 }, // 10 分鐘 AI 分析
  bybitAnnouncements: { key: 'bybit_announcements', ttl: 10 * 60 }, // 10 分鐘
  binanceAnnouncements: { key: 'binance_announcements', ttl: 10 * 60 }, // 10 分鐘
  bitgetAnnouncements: { key: 'bitget_announcements', ttl: 10 * 60 }, // 10 分鐘
};

/**
 * 獲取存儲鍵名
 */
function getStorageKey(key: string): string {
  return `${CACHE_PREFIX}${key}`;
}

/**
 * 获取缓存的时间戳
 */
export function getCacheTimestamp(module: string): number | null {
  const config = MODULE_CONFIGS[module];
  if (!config) return null;

  try {
    const key = getStorageKey(config.key);
    const stored = localStorage.getItem(key);

    if (!stored) return null;

    const entry: CacheEntry<any> = JSON.parse(stored);
    return entry.timestamp;
  } catch (error) {
    return null;
  }
}

/**
 * Check whether a cache entry is older than any dependency cache entry.
 */
export function isCacheBehind(module: string, dependencies: string[]): boolean {
  const moduleTimestamp = getCacheTimestamp(module);
  if (!moduleTimestamp) {
    return true;
  }

  return dependencies.some((dependency) => {
    const dependencyTimestamp = getCacheTimestamp(dependency);
    return dependencyTimestamp !== null && dependencyTimestamp > moduleTimestamp;
  });
}

/**
 * 檢查緩存是否有效
 */
function isValidCache<T>(entry: CacheEntry<T> | null): boolean {
  if (!entry) return false;
  if (Date.now() > entry.expiresAt) return false;
  return true;
}

/**
 * 從 LocalStorage 獲取數據
 */
export function getCache<T>(module: string): T | null {
  const config = MODULE_CONFIGS[module];
  if (!config) {
    console.warn(`Unknown module: ${module}`);
    return null;
  }
  
  try {
    const key = getStorageKey(config.key);
    const stored = localStorage.getItem(key);
    
    if (!stored) {
      return null;
    }
    
    const entry: CacheEntry<T> = JSON.parse(stored);
    
    if (!isValidCache(entry)) {
      // 過期數據，刪除
      localStorage.removeItem(key);
      return null;
    }
    
    return entry.data;
  } catch (error) {
    console.error(`Error reading cache for ${module}:`, error);
    return null;
  }
}

/**
 * 將數據存儲到 LocalStorage
 */
export function setCache<T>(module: string, data: T, customTtl?: number): void {
  const config = MODULE_CONFIGS[module];
  if (!config) {
    console.warn(`Unknown module: ${module}`);
    return;
  }
  
  try {
    const ttl = customTtl !== undefined ? customTtl : config.ttl;
    const now = Date.now();
    
    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      ttl,
      expiresAt: now + (ttl * 1000),
    };
    
    const key = getStorageKey(config.key);
    localStorage.setItem(key, JSON.stringify(entry));
  } catch (error) {
    console.error(`Error writing cache for ${module}:`, error);
    
    // 如果存儲失敗（可能是空間不足），嘗試清理過期數據後重試
    cleanupExpired();
    try {
      const ttl = customTtl !== undefined ? customTtl : config.ttl;
      const now = Date.now();
      const entry: CacheEntry<T> = {
        data,
        timestamp: now,
        ttl,
        expiresAt: now + (ttl * 1000),
      };
      const key = getStorageKey(config.key);
      localStorage.setItem(key, JSON.stringify(entry));
    } catch (retryError) {
      console.error(`Failed to cache ${module} after cleanup:`, retryError);
    }
  }
}

/**
 * 刪除指定模塊的緩存
 */
export function deleteCache(module: string): void {
  const config = MODULE_CONFIGS[module];
  if (!config) {
    return;
  }
  
  const key = getStorageKey(config.key);
  localStorage.removeItem(key);
}

/**
 * 清空所有緩存
 */
export function clearAllCache(): void {
  const keysToRemove: string[] = [];
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(CACHE_PREFIX)) {
      keysToRemove.push(key);
    }
  }
  
  keysToRemove.forEach(key => localStorage.removeItem(key));
}

/**
 * 清理所有過期數據
 */
export function cleanupExpired(): number {
  let removedCount = 0;
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith(CACHE_PREFIX)) continue;
    
    try {
      const stored = localStorage.getItem(key);
      if (!stored) continue;
      
      const entry: CacheEntry<any> = JSON.parse(stored);
      
      if (Date.now() > entry.expiresAt) {
        localStorage.removeItem(key);
        removedCount++;
      }
    } catch (error) {
      // 無效數據，刪除
      localStorage.removeItem(key);
      removedCount++;
    }
  }
  
  return removedCount;
}

/**
 * 獲取緩存統計信息
 */
export function getCacheStats(): CacheStats {
  let totalKeys = 0;
  let totalSize = 0;
  let expiredKeys = 0;
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith(CACHE_PREFIX)) continue;
    
    totalKeys++;
    
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        totalSize += stored.length;
        
        const entry: CacheEntry<any> = JSON.parse(stored);
        if (Date.now() > entry.expiresAt) {
          expiredKeys++;
        }
      }
    } catch (error) {
      expiredKeys++;
    }
  }
  
  return {
    totalKeys,
    totalSize,
    expiredKeys,
  };
}

/**
 * 雲端部署由 Cloud Scheduler 管理全局刷新，前端不再主動觸發
 */
export async function checkAndTriggerDailyRefresh(): Promise<boolean> {
  return false;
}

/**
 * 獲取距下次建議雲端刷新的剩餘時間（毫秒）
 */
export function getTimeUntilNextRefresh(): number {
  const now = new Date();
  const dailyRefreshHour = 7;
  const nextRefresh = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + (now.getHours() >= dailyRefreshHour ? 1 : 0),
    dailyRefreshHour,
    0,
    0
  );
  
  return nextRefresh.getTime() - now.getTime();
}

/**
 * 格式化剩餘時間為可讀字符串
 */
export function formatTimeUntilRefresh(): string {
  const ms = getTimeUntilNextRefresh();
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 24) {
    return '明天早上 7:00';
  } else if (hours > 0) {
    return `${hours}小時${minutes}分鐘後`;
  } else if (minutes > 0) {
    return `${minutes}分鐘後`;
  } else {
    return '即將刷新';
  }
}
