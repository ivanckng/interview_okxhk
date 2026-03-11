/**
 * LocalStorage 緩存管理服務
 * 
 * 功能：
 * 1. 存儲 API 響應數據到 LocalStorage
 * 2. 支持 TTL (Time To Live) 過期機制
 * 3. 自動清理過期數據
 * 4. 每天早上 7 點後首次訪問自動觸發全局刷新
 */

const CACHE_PREFIX = 'crypto_pulse_cache_';
const LAST_REFRESH_KEY = 'last_global_refresh';
const DAILY_REFRESH_HOUR = 7; // 每天早上 7 點

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
  marketHighlight: { key: 'market_highlight', ttl: 30 * 60 }, // 30 分鐘
  stockIndices: { key: 'stock_indices', ttl: 1 * 60 },     // 1 分鐘 (股價波動快)
  commodities: { key: 'commodities', ttl: 1 * 60 },        // 1 分鐘
  currencies: { key: 'currencies', ttl: 1 * 60 },          // 1 分鐘
  crypto: { key: 'crypto', ttl: 1 * 60 },     // 1 分鐘 (價格波動快)
  cryptoHighlight: { key: 'crypto_highlight', ttl: 30 * 60 }, // 30 分鐘
  company: { key: 'company', ttl: 15 * 60 },  // 15 分鐘
  companyHighlight: { key: 'company_highlight', ttl: 30 * 60 }, // 30 分鐘
  pulse: { key: 'pulse', ttl: 20 * 60 },      // 20 分鐘 (綜合分析頁)
  pulseComprehensive: { key: 'pulse_comprehensive', ttl: 20 * 60 }, // 20 分鐘
  pulseRecommendations: { key: 'pulse_recommendations', ttl: 30 * 60 }, // 30 分鐘
  competitors: { key: 'competitors', ttl: 15 * 60 }, // 15 分鐘
  competitorsHighlight: { key: 'competitors_highlight', ttl: 10 * 60 }, // 10 分鐘 AI 分析
};

/**
 * 獲取存儲鍵名
 */
function getStorageKey(key: string): string {
  return `${CACHE_PREFIX}${key}`;
}

/**
 * 檢查是否已過早上 7 點且尚未刷新
 */
function shouldTriggerDailyRefresh(): boolean {
  const now = new Date();
  const lastRefreshStr = localStorage.getItem(getStorageKey(LAST_REFRESH_KEY));
  
  if (!lastRefreshStr) {
    return true; // 從未有過刷新
  }
  
  const lastRefresh = new Date(parseInt(lastRefreshStr, 10));
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), DAILY_REFRESH_HOUR, 0, 0);
  const lastRefreshDate = new Date(lastRefresh.getFullYear(), lastRefresh.getMonth(), lastRefresh.getDate());
  
  // 如果今天是 7 點後已經刷新過，返回 false
  if (lastRefreshDate.getTime() === today.getTime() && lastRefresh.getTime() >= today.getTime()) {
    return false;
  }
  
  // 如果現在還不到 7 點，返回 false
  if (now.getHours() < DAILY_REFRESH_HOUR) {
    return false;
  }
  
  return true; // 需要刷新
}

/**
 * 更新每日刷新時間戳
 */
function updateLastRefreshTime(): void {
  localStorage.setItem(getStorageKey(LAST_REFRESH_KEY), Date.now().toString());
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
  updateLastRefreshTime();
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
 * 檢查並返回是否需要全局刷新
 * 如果是，會自動觸發後端的全局刷新 API
 */
export async function checkAndTriggerDailyRefresh(): Promise<boolean> {
  if (!shouldTriggerDailyRefresh()) {
    return false;
  }
  
  try {
    console.log('🔄 Triggering daily global refresh...');
    const response = await fetch('http://localhost:8000/api/cache/global-refresh', {
      method: 'POST',
    });
    
    if (response.ok) {
      updateLastRefreshTime();
      console.log('✅ Daily refresh completed');
      return true;
    }
  } catch (error) {
    console.error('❌ Daily refresh failed:', error);
  }
  
  return false;
}

/**
 * 獲取距下次全局刷新的剩餘時間（毫秒）
 */
export function getTimeUntilNextRefresh(): number {
  const now = new Date();
  const nextRefresh = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + (now.getHours() >= DAILY_REFRESH_HOUR ? 1 : 0),
    DAILY_REFRESH_HOUR,
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
