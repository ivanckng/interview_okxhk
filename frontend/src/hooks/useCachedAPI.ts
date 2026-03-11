/**
 * useCachedAPI Hook
 * 
 * 自動化管理 API 請求和 LocalStorage 緩存
 * - 頁面加載時優先讀取緩存（秒開）
 * - 背景異步檢查並更新過期數據
 * - 支持手動刷新
 * - 每天早上 7 點自動觸發全局刷新
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import * as cacheService from '../services/cache';

export interface UseCachedAPIOptions<T> {
  /** 模塊名稱（用於緩存配置） */
  module: string;
  /** 自定義 TTL（秒），不傳則使用模塊默認值 */
  ttl?: number;
  /** 是否啟用自動刷新（當緩存過期時） */
  enableAutoRefresh?: boolean;
  /** 自定義獲取數據函數 */
  fetcher: () => Promise<T>;
  /** 數據過期回調 */
  onExpired?: () => void;
  /** 數據更新回調 */
  onDataUpdate?: (data: T) => void;
}

export interface UseCachedAPIResult<T> {
  /** 當前數據（優先返回緩存） */
  data: T | null;
  /** 是否正在加載 */
  loading: boolean;
  /** 是否正在刷新（背景更新） */
  refreshing: boolean;
  /** 錯誤信息 */
  error: Error | null;
  /** 手動刷新數據 */
  refresh: () => Promise<void>;
  /** 緩存是否有效 */
  isCached: boolean;
  /** 緩存過期時間 */
  expiresAt: Date | null;
  /** 緩存統計 */
  cacheStats: { timestamp: number; age: number; ttl: number } | null;
}

/**
 * 自定義 Hook：帶緩存的 API 請求
 */
export function useCachedAPI<T>({
  module,
  ttl,
  enableAutoRefresh = true,
  fetcher,
  onExpired,
  onDataUpdate,
}: UseCachedAPIOptions<T>): UseCachedAPIResult<T> {
  // 先檢查是否有緩存，如果有則初始 loading 為 false
  const hasCache = typeof window !== 'undefined' ? cacheService.getCache<T>(module) !== null : false;
  
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!hasCache);  // 有緩存時初始不顯示加載
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isCached, setIsCached] = useState(hasCache);
  const [cacheStats, setCacheStats] = useState<{ timestamp: number; age: number; ttl: number } | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);

  // 用於避免重複請求
  const abortControllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  /**
   * 從緩存或 API 獲取數據
   */
  const fetchData = useCallback(async (showLoading = true, isBackgroundRefresh = false) => {
    if (!mountedRef.current) return;

    // 如果不是背景刷新，取消之前的請求
    if (!isBackgroundRefresh && abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    if (!isBackgroundRefresh) {
      abortControllerRef.current = abortController;
    }

    try {
      if (showLoading && !isBackgroundRefresh) {
        setLoading(true);
      }
      
      if (isBackgroundRefresh) {
        setRefreshing(true);
      }

      setError(null);

      // 1. 先嘗試從緩存讀取
      const cachedData = cacheService.getCache<T>(module);
      
      if (cachedData !== null) {
        if (!mountedRef.current) return;
        
        setData(cachedData);
        setIsCached(true);
        
        // 計算緩存統計
        const config = cacheService.MODULE_CONFIGS[module];
        if (config) {
          const stored = localStorage.getItem(`crypto_pulse_cache_${config.key}`);
          if (stored) {
            const entry = JSON.parse(stored);
            const now = Date.now();
            setCacheStats({
              timestamp: entry.timestamp,
              age: Math.floor((now - entry.timestamp) / 1000),
              ttl: entry.ttl,
            });
            setExpiresAt(new Date(entry.expiresAt));
          }
        }

        // 如果緩存有效，不請求 API
        if (!isBackgroundRefresh) {
          setLoading(false);
        }
        setRefreshing(false);

        // 背景檢查是否需要更新
        if (enableAutoRefresh && config) {
          const stored = localStorage.getItem(`crypto_pulse_cache_${config.key}`);
          if (stored) {
            const entry = JSON.parse(stored);
            const now = Date.now();
            const remainingTtl = (entry.expiresAt - now) / 1000;
            
            // 如果剩餘 TTL 少於 20%，背景刷新
            if (remainingTtl < config.ttl * 0.2 && remainingTtl > 0) {
              console.log(`🔄 Background refreshing ${module} (TTL remaining: ${Math.floor(remainingTtl)}s)`);
              await refreshData(true);
              return;
            }
            
            // 如果已過期，觸發回調並刷新
            if (remainingTtl <= 0) {
              onExpired?.();
              await refreshData(true);
              return;
            }
          }
        }
        
        return; // 有緩存，直接返回
      }

      // 2. 沒有緩存，請求 API
      const freshData = await fetcher();
      
      if (!mountedRef.current) return;

      // 存儲到緩存
      cacheService.setCache(module, freshData, ttl);
      
      setData(freshData);
      setIsCached(false);
      setLoading(false);
      setRefreshing(false);
      
      // 更新緩存統計
      const config = cacheService.MODULE_CONFIGS[module];
      if (config) {
        const stored = localStorage.getItem(`crypto_pulse_cache_${config.key}`);
        if (stored) {
          const entry = JSON.parse(stored);
          setCacheStats({
            timestamp: entry.timestamp,
            age: 0,
            ttl: entry.ttl,
          });
          setExpiresAt(new Date(entry.expiresAt));
        }
      }

      onDataUpdate?.(freshData);
      
    } catch (err) {
      if (!mountedRef.current) return;
      
      const error = err instanceof Error ? err : new Error('Failed to fetch data');
      setError(error);
      setLoading(false);
      setRefreshing(false);
      
      // 如果有緩存但刷新失敗，使用舊緩存
      const cachedData = cacheService.getCache<T>(module);
      if (cachedData !== null) {
        setData(cachedData);
        setIsCached(true);
      }
    } finally {
      if (!isBackgroundRefresh && abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }
    }
  }, [module, ttl, enableAutoRefresh, fetcher, onExpired, onDataUpdate]);

  /**
   * 刷新數據（強制從 API 獲取）
   */
  const refreshData = useCallback(async (isBackground = false) => {
    await fetchData(false, isBackground);
  }, [fetchData]);

  /**
   * 初始化：頁面加載時獲取數據
   */
  useEffect(() => {
    mountedRef.current = true;
    
    // 先同步加載緩存數據
    const cachedData = cacheService.getCache<T>(module);
    if (cachedData !== null) {
      setData(cachedData);
      setIsCached(true);
      setLoading(false);
      
      // 計算緩存統計
      const config = cacheService.MODULE_CONFIGS[module];
      if (config) {
        const stored = localStorage.getItem(`crypto_pulse_cache_${config.key}`);
        if (stored) {
          const entry = JSON.parse(stored);
          const now = Date.now();
          setCacheStats({
            timestamp: entry.timestamp,
            age: Math.floor((now - entry.timestamp) / 1000),
            ttl: entry.ttl,
          });
          setExpiresAt(new Date(entry.expiresAt));
        }
      }
    }
    
    // 異步檢查並獲取新鮮數據
    fetchData(true);

    return () => {
      mountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [module]);

  return {
    data,
    loading,
    refreshing,
    error,
    refresh: () => refreshData(false),
    isCached,
    expiresAt,
    cacheStats,
  };
}

/**
 * Hook: 每日全局刷新檢查
 * 在 App 層級使用，每天早上 7 點後首次訪問自動觸發全局刷新
 */
export function useDailyRefresh() {
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [nextRefreshIn, setNextRefreshIn] = useState<string>('');

  useEffect(() => {
    // 檢查並觸發每日刷新
    cacheService.checkAndTriggerDailyRefresh().then((triggered) => {
      if (triggered) {
        console.log('✅ Daily global refresh triggered');
      }
    });

    // 更新倒計時
    const updateCountdown = () => {
      setNextRefreshIn(cacheService.formatTimeUntilRefresh());
      const lastRefreshStr = localStorage.getItem('crypto_pulse_cache_last_global_refresh');
      if (lastRefreshStr) {
        setLastRefresh(new Date(parseInt(lastRefreshStr, 10)));
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000); // 每分鐘更新

    return () => clearInterval(interval);
  }, []);

  return {
    lastRefresh,
    nextRefreshIn,
    triggerRefresh: () => cacheService.checkAndTriggerDailyRefresh(),
  };
}
