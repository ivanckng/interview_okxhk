import { useState, useEffect } from 'react';
import { TrendingUp, Zap, Globe, Loader2, Package } from 'lucide-react';
import { CopilotHighlight } from '../components/CopilotHighlight';
import { api } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
import { translateHighlightSummary } from '../services/apiTranslation';
import { translateNewsArticles, translateStockIndices, translateCommodities, translateCurrencyRates } from '../services/translation';
import * as cacheService from '../services/cache';
import type { HighlightSummary } from '../services/api';

// 地区股指 Mock 数据（fallback）
const stockIndicesMock = {
  us: [
    { name: "S&P 500", symbol: "^GSPC", value: 6740.02, change: -90.69, change_percent: -1.33, timestamp: "2026-03-09 00:38 EDT" },
    { name: "Dow Jones", symbol: "^DJI", value: 47501.55, change: -453.19, change_percent: -0.95, timestamp: "2026-03-09 00:38 EDT" },
    { name: "Nasdaq", symbol: "^IXIC", value: 22387.68, change: -361.31, change_percent: -1.59, timestamp: "2026-03-09 00:38 EDT" },
  ],
  cn: [
    { name: "Shanghai Composite", symbol: "000001.SS", value: 4077.68, change: -47.37, change_percent: -1.15, timestamp: "2026-03-09 12:38 CST" },
    { name: "Shenzhen Component", symbol: "399001.SZ", value: 13868.86, change: -308.25, change_percent: -2.17, timestamp: "2026-03-09 12:38 CST" },
    { name: "ChiNext", symbol: "399006.SZ", value: 3151.05, change: -80.79, change_percent: -2.5, timestamp: "2026-03-09 12:39 CST" },
  ],
  hk: [
    { name: "Hang Seng", symbol: "^HSI", value: 25101.04, change: -656.25, change_percent: -2.55, timestamp: "2026-03-09 12:39 HKT" },
  ],
  uk: [
    { name: "FTSE 100", symbol: "^FTSE", value: 10284.8, change: -129.14, change_percent: -1.24, timestamp: "2026-03-09 04:39 GMT" },
  ],
  eu: [
    { name: "Euro Stoxx 50", symbol: "^STOXX50E", value: 5000.0, change: -50.0, change_percent: -0.99, timestamp: "2026-03-09 05:39 CET" },
    { name: "DAX", symbol: "^GDAXI", value: 20000.0, change: -200.0, change_percent: -0.99, timestamp: "2026-03-09 05:39 CET" },
    { name: "CAC 40", symbol: "^FCHI", value: 7500.0, change: -75.0, change_percent: -0.99, timestamp: "2026-03-09 05:39 CET" },
  ],
  jp: [
    { name: "Nikkei 225", symbol: "^N225", value: 39000.0, change: -390.0, change_percent: -0.99, timestamp: "2026-03-09 13:39 JST" },
  ],
  kr: [
    { name: "KOSPI", symbol: "^KS11", value: 2600.0, change: -26.0, change_percent: -0.99, timestamp: "2026-03-09 13:39 KST" },
    { name: "KOSDAQ", symbol: "^KQ11", value: 850.0, change: -8.5, change_percent: -0.99, timestamp: "2026-03-09 13:39 KST" },
  ],
};

// 地区配置
const regions = [
  { id: 'us', name: 'United States', flag: '🇺🇸', label: '美国' },
  { id: 'cn', name: 'China', flag: '🇨🇳', label: '中国' },
  { id: 'hk', name: 'Hong Kong', flag: '🇭🇰', label: '香港' },
  { id: 'uk', name: 'United Kingdom', flag: '🇬🇧', label: '英国' },
  { id: 'eu', name: 'European Union', flag: '🇪🇺', label: '欧盟' },
  { id: 'jp', name: 'Japan', flag: '🇯🇵', label: '日本' },
  { id: 'kr', name: 'South Korea', flag: '🇰🇷', label: '韩国' },
];

// 静态文本翻译
const staticTranslations = {
  en: {
    aiSummary: 'AI Market Summary',
    economyIndicators: 'Economy Indicators',
    breakingNews: 'Breaking News',
    stockIndices: 'Stock Indices',
    lastUpdate: 'Last updated',
    noData: 'No relevant macro news available',
    indicators: {
      gdpAnnual: 'GDP Annual',
      gdpQuarterly: 'GDP Quarterly',
      cpi: 'CPI Monthly',
      ppi: 'PPI Monthly',
      unemployment: 'Unemployment Rate Monthly',
    },
    countries: {
      us: 'United States',
      cn: 'China',
    },
  },
  zh: {
    aiSummary: 'AI 市场总结',
    economyIndicators: '经济指标',
    breakingNews: '突发新闻',
    stockIndices: '地区股指',
    lastUpdate: '最后更新',
    noData: '暂无相关宏观新闻',
    indicators: {
      gdpAnnual: '年度 GDP',
      gdpQuarterly: '季度 GDP',
      cpi: '月度 CPI',
      ppi: '月度 PPI',
      unemployment: '月度失业率',
    },
    countries: {
      us: '美国',
      cn: '中国',
    },
  },
};

// 经济指标 Mock 数据
const economyIndicatorsMock = {
  us: {
    gdp_annual: { value: 2.8, year: 2025, unit: '%' },
    gdp_quarterly: { value: 3.1, year: 2026, quarter: 'Q4', unit: '%' },
    cpi: { value: 3.2, year: 2026, month: 'Feb', unit: '%' },
    ppi: { value: 2.1, year: 2026, month: 'Feb', unit: '%' },
    unemployment: { value: 3.7, year: 2026, month: 'Feb', unit: '%' },
  },
  cn: {
    gdp_annual: { value: 5.2, year: 2025, unit: '%' },
    gdp_quarterly: { value: 5.4, year: 2026, quarter: 'Q4', unit: '%' },
    cpi: { value: 0.8, year: 2026, month: 'Feb', unit: '%' },
    ppi: { value: -1.2, year: 2026, month: 'Feb', unit: '%' },
    unemployment: { value: 5.1, year: 2026, month: 'Feb', unit: '%' },
  },
};

// 经济指标卡片
const IndicatorCard = ({ 
  label, 
  value, 
  period,
  unit,
  rawValue,
  isUnemployment = false,
  isChinaGDP = false,
  isGDP = false,
  lang = 'en'
}: { 
  label: string; 
  value: number; 
  period: string;
  unit: string;
  rawValue?: number | null;
  isUnemployment?: boolean;
  isChinaGDP?: boolean;
  isGDP?: boolean;
  lang?: 'en' | 'zh';
}) => {
  // Format value - no "+" for unemployment
  const formatValue = (val: number) => {
    if (isUnemployment) {
      return `${val.toFixed(1)}${unit}`;
    }
    return `${val > 0 ? '+' : ''}${val.toFixed(1)}${unit}`;
  };

  // GDP labels based on language (capitalized)
  const realLabel = lang === 'zh' ? '实际' : 'Real';
  const nominalLabel = lang === 'zh' ? '名义' : 'Nominal';

  return (
    <div className="bg-okx-bg-secondary border border-okx-border rounded-lg p-3">
      <div className="text-okx-text-muted text-[10px] mb-1">{label}</div>
      <div className="text-lg font-bold text-white font-mono mb-1">
        {formatValue(value)}
        {isGDP && <span className="text-[10px] text-okx-text-muted ml-1">({realLabel})</span>}
      </div>
      {rawValue && (
        <div className="text-okx-text-muted text-[10px] mb-1">
          GDP: {isChinaGDP ? '¥' : '$'}{rawValue.toLocaleString()}T <span className="text-[9px]">({nominalLabel})</span>
        </div>
      )}
      <div className="text-okx-text-muted text-[10px]">{period}</div>
    </div>
  );
};

// Breaking News 卡片
const BreakingNewsCard = ({ news }: { news: { id: string; title: string; source: string; time: string; impact: string; region: string; category: string; link?: string; crypto_impact_rank?: number } }) => {
  const impactColors = {
    high: 'bg-red-500/20 text-red-400 border-red-500/30',
    medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    low: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  };

  const categoryLabel = news.category.charAt(0).toUpperCase() + news.category.slice(1);
  const categoryColor = 'bg-white/10 text-white border-white/20';

  return (
    <a
      href={news.link || '#'}
      target="_blank"
      rel="noopener noreferrer"
      className="bg-okx-bg-secondary border border-okx-border rounded-lg p-3 hover:border-okx-border-light transition-all block group"
    >
      <div className="flex items-center gap-2 mb-2">
        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${categoryColor}`}>
          {categoryLabel}
        </span>
        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${impactColors[news.impact as keyof typeof impactColors]}`}>
          {news.impact.toUpperCase()}
        </span>
        {news.crypto_impact_rank && (
          <span className="text-[10px] text-white bg-white/10 rounded px-1.5 py-0.5">
            #{news.crypto_impact_rank} Crypto Impact
          </span>
        )}
      </div>
      <h3 className="text-white text-xs font-medium mb-2 line-clamp-2 group-hover:text-white/80 transition-colors">
        {news.title}
      </h3>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-sm">{regions.find(r => r.id === news.region)?.flag}</span>
          <span className="text-okx-text-muted text-[10px]">{news.source}</span>
        </div>
        <span className="text-okx-text-muted text-[10px]">{news.time}</span>
      </div>
      <div className="mt-2 flex items-center gap-1 text-[10px] text-okx-accent">
        <span>Read more</span>
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </a>
  );
};

// 股指卡片
const IndexCard = ({ index }: { index: { name: string; symbol: string; value: number; change: number; change_percent: number; timestamp: string } }) => (
  <div className="bg-okx-bg-secondary border border-okx-border rounded-lg p-3 hover:border-okx-border-light transition-all">
    <div className="flex items-center justify-between mb-2">
      <span className="text-white text-sm font-medium">{index.name}</span>
      <span className="text-okx-text-muted text-[10px]">{index.symbol}</span>
    </div>
    <div className="text-lg font-bold text-white font-mono mb-1">
      {index.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    </div>
    <div className={`text-xs font-medium mb-1 ${index.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
      {index.change >= 0 ? '↗' : '↘'} {Math.abs(index.change).toFixed(2)} ({index.change_percent >= 0 ? '+' : ''}{index.change_percent.toFixed(2)}%)
    </div>
    <div className="text-okx-text-muted text-[9px]">
      {index.timestamp}
    </div>
  </div>
);

export const MarketsPage = () => {
  const { language } = useLanguage();
  const [highlight, setHighlight] = useState<HighlightSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [analysisLoading, setAnalysisLoading] = useState(true);
  const [selectedRegion, setSelectedRegion] = useState<string>('us');
  const [breakingNews, setBreakingNews] = useState<any[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [economyData, setEconomyData] = useState<{ us: any; cn: any }>({ us: null, cn: null });
  const [economyLoading, setEconomyLoading] = useState(false);
  const [stockIndices, setStockIndices] = useState<Record<string, any[]>>({});
  const [indicesLoading, setIndicesLoading] = useState(false);
  const [commodities, setCommodities] = useState<any[]>([]);
  const [commoditiesLoading, setCommoditiesLoading] = useState(false);
  const [currencies, setCurrencies] = useState<any[]>([]);
  const [currenciesLoading, setCurrenciesLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // 初始化时从缓存读取所有可用数据
  useEffect(() => {
    // 读取 AI 分析缓存
    const cachedHighlight = cacheService.getCache<HighlightSummary>('marketHighlight');
    if (cachedHighlight) {
      setHighlight(cachedHighlight);
      setAnalysisLoading(false);
      setLoading(false);
    }

    // 读取新闻缓存
    const cachedNews = cacheService.getCache<any[]>('breakingNews');
    if (cachedNews) {
      setBreakingNews(cachedNews);
      setNewsLoading(false);
    }
  }, []);

  const t = staticTranslations[language];

  // ==================== AI 分析 - 10 分钟定时 + 可见性刷新 ====================
  useEffect(() => {
    const fetchAIAnalysis = async (forceRefresh = false) => {
      setAnalysisLoading(true);
      try {
        // 检查前端缓存 (10 分钟)，强制刷新时跳过
        if (!forceRefresh) {
          const cached = cacheService.getCache<HighlightSummary>('marketHighlight');
          const cachedAt = cacheService.getCacheTimestamp('marketHighlight');
          const now = Date.now();
          const isExpired = !cachedAt || (now - cachedAt) > 600000; // 10 分钟

          if (cached && !isExpired) {
            setHighlight(cached);
            setAnalysisLoading(false);
            setLoading(false);
            console.log('[MarketsPage] Using cached AI analysis');
            return;
          }
        }

        // 从后端获取
        const response = await fetch(`http://localhost:8000/api/markets/analysis`);
        const data = await response.json();

        console.log('[MarketsPage] AI Analysis response:', data);

        const aiAnalysis = data.ai_analysis;
        if (aiAnalysis && !aiAnalysis.error) {
          // Convert AI analysis to highlight format
          const highlightData = {
            title: '智能经济学家分析',
            summary: aiAnalysis.market_pulse || 'Analyzing market data...',
            trend: aiAnalysis.overall_sentiment || 'neutral',
            highlights: aiAnalysis.key_insights?.slice(0, 3) || [],
            generated_at: new Date().toISOString(),
          };

          console.log('[MarketsPage] Highlight data:', highlightData);

          // Translate if Chinese and save to cache
          if (language === 'zh' && highlightData.summary) {
            try {
              const translated = await translateHighlightSummary(highlightData, 'zh');
              console.log('[MarketsPage] Translated highlight:', translated);
              cacheService.setCache('marketHighlight', translated, 600); // 10 分钟
              setHighlight(translated);
            } catch (translateErr) {
              console.error('[MarketsPage] Translation failed, using original:', translateErr);
              cacheService.setCache('marketHighlight', highlightData, 600);
              setHighlight(highlightData);
            }
          } else {
            cacheService.setCache('marketHighlight', highlightData, 600);
            setHighlight(highlightData);
          }
        } else {
          console.warn('[MarketsPage] No AI analysis or error in response:', aiAnalysis);
        }
      } catch (err) {
        console.error('[MarketsPage] Failed to fetch AI analysis:', err);
        // 使用缓存数据作为 fallback
        const cached = cacheService.getCache<HighlightSummary>('marketHighlight');
        if (cached) {
          setHighlight(cached);
        }
      } finally {
        setAnalysisLoading(false);
        setLoading(false);
      }
    };

    // 首次加载
    fetchAIAnalysis();

    // 定时刷新：每 10 分钟
    const interval = setInterval(() => fetchAIAnalysis(false), 600000);

    // 页面可见性检测：切回标签页时刷新
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[MarketsPage] Page visible, refreshing AI analysis');
        fetchAIAnalysis(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [language]);

  // ==================== 突发新闻 - 30 分钟缓存 + 可见性刷新 ====================
  useEffect(() => {
    const fetchBreakingNews = async (forceRefresh = false) => {
      // 检查前端缓存 (30 分钟)，强制刷新时跳过
      if (!forceRefresh) {
        const cached = cacheService.getCache<any[]>('breakingNews');
        const cachedAt = cacheService.getCacheTimestamp('breakingNews');
        const now = Date.now();
        const isExpired = !cachedAt || (now - cachedAt) > 1800000; // 30 分钟

        if (cached && !isExpired) {
          setBreakingNews(cached);
          setNewsLoading(false);
          console.log('[MarketsPage] Using cached breaking news');
          return;
        }
      }

      try {
        const response = await fetch(`http://localhost:8000/api/news/breaking`);
        const data = await response.json();

        let articles = data.articles || [];

        // Translate if Chinese
        if (language === 'zh' && articles.length > 0) {
          articles = await translateNewsArticles(articles, 'zh');
        }

        // Cache for 30 minutes
        cacheService.setCache('breakingNews', articles, 1800);
        setBreakingNews(articles);
      } catch (err) {
        console.error('Failed to fetch breaking news:', err);
      } finally {
        setNewsLoading(false);
      }
    };

    // 首次加载
    fetchBreakingNews();

    // 页面可见性检测：切回标签页时刷新
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[MarketsPage] Page visible, refreshing news');
        fetchBreakingNews(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [language]);

  // Fetch economy indicators
  useEffect(() => {
    const fetchEconomyData = async () => {
      setEconomyLoading(true);
      try {
        const [usResponse, cnResponse] = await Promise.all([
          fetch(`http://localhost:8000/api/economy/us`),
          fetch(`http://localhost:8000/api/economy/cn`),
        ]);
        
        const usData = await usResponse.json();
        const cnData = await cnResponse.json();
        
        setEconomyData({ us: usData, cn: cnData });
      } catch (err) {
        console.error('Failed to fetch economy data:', err);
        // Fallback to mock data
        setEconomyData({ 
          us: { indicators: economyIndicatorsMock.us }, 
          cn: { indicators: economyIndicatorsMock.cn } 
        });
      } finally {
        setEconomyLoading(false);
      }
    };
    fetchEconomyData();
  }, []);

  // ==================== 股指 - 1 分钟刷新，5 分钟前端缓存 ====================
  useEffect(() => {
    const fetchIndices = async () => {
      // 检查前端缓存 (5 分钟)
      const cached = cacheService.getCache<Record<string, any[]>>('stockIndices');
      const cachedAt = cacheService.getCacheTimestamp('stockIndices');
      const now = Date.now();
      const isExpired = !cachedAt || (now - cachedAt) > 300000; // 5 分钟

      if (cached && !isExpired) {
        setStockIndices(cached);
        setIndicesLoading(false);
        console.log('[MarketsPage] Using cached stock indices');
        return;
      }

      setIndicesLoading(true);
      try {
        const response = await fetch(`http://localhost:8000/api/market/indices`);
        const data = await response.json();

        let regions = data.regions || {};

        // Translate if Chinese
        if (language === 'zh') {
          const translatedRegions: Record<string, any[]> = {};
          for (const [region, indices] of Object.entries(regions)) {
            translatedRegions[region] = await translateStockIndices(indices as any[], 'zh');
          }
          regions = translatedRegions;
        }

        // Cache for 5 minutes
        cacheService.setCache('stockIndices', regions, 300);
        setStockIndices(regions);
      } catch (err) {
        console.error('Failed to fetch stock indices:', err);
        // Fallback to mock data
        setStockIndices(stockIndicesMock);
      } finally {
        setIndicesLoading(false);
      }
    };

    fetchIndices();

    // Refresh every 1 minute (60000 ms)
    const interval = setInterval(fetchIndices, 60000);

    return () => clearInterval(interval);
  }, [language]);

  // ==================== 大宗商品 - 1 分钟刷新，5 分钟前端缓存 ====================
  useEffect(() => {
    const fetchCommodities = async () => {
      // 检查前端缓存 (5 分钟)
      const cached = cacheService.getCache<any[]>('commodities');
      const cachedAt = cacheService.getCacheTimestamp('commodities');
      const now = Date.now();
      const isExpired = !cachedAt || (now - cachedAt) > 300000; // 5 分钟

      if (cached && !isExpired) {
        setCommodities(cached);
        setCommoditiesLoading(false);
        console.log('[MarketsPage] Using cached commodities');
        return;
      }

      setCommoditiesLoading(true);
      try {
        const response = await fetch(`http://localhost:8000/api/market/commodities`);
        const data = await response.json();

        let commodities = data.commodities || [];

        // Translate if Chinese
        if (language === 'zh' && commodities.length > 0) {
          commodities = await translateCommodities(commodities, 'zh');
        }

        // Cache for 5 minutes
        cacheService.setCache('commodities', commodities, 300);
        setCommodities(commodities);
      } catch (err) {
        console.error('Failed to fetch commodities:', err);
      } finally {
        setCommoditiesLoading(false);
      }
    };

    fetchCommodities();

    // Refresh every 1 minute (60000 ms)
    const interval = setInterval(fetchCommodities, 60000);

    return () => clearInterval(interval);
  }, [language]);

  // ==================== 外汇汇率 - 1 分钟刷新，5 分钟前端缓存 ====================
  useEffect(() => {
    const fetchCurrencies = async () => {
      // 检查前端缓存 (5 分钟)
      const cached = cacheService.getCache<any[]>('currencies');
      const cachedAt = cacheService.getCacheTimestamp('currencies');
      const now = Date.now();
      const isExpired = !cachedAt || (now - cachedAt) > 300000; // 5 分钟

      if (cached && !isExpired) {
        setCurrencies(cached);
        setCurrenciesLoading(false);
        console.log('[MarketsPage] Using cached currency rates');
        return;
      }

      setCurrenciesLoading(true);
      try {
        const response = await fetch(`http://localhost:8000/api/market/currency`);
        const data = await response.json();

        let currencies = data.currencies || [];

        // Translate if Chinese
        if (language === 'zh' && currencies.length > 0) {
          currencies = await translateCurrencyRates(currencies, 'zh');
        }

        // Cache for 5 minutes
        cacheService.setCache('currencies', currencies, 300);
        setCurrencies(currencies);
      } catch (err) {
        console.error('Failed to fetch currency rates:', err);
      } finally {
        setCurrenciesLoading(false);
      }
    };

    fetchCurrencies();

    // Refresh every 1 minute (60000 ms)
    const interval = setInterval(fetchCurrencies, 60000);

    return () => clearInterval(interval);
  }, [language]);

  if (loading || newsLoading || economyLoading || indicesLoading || commoditiesLoading || currenciesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  const currentIndices = stockIndices[selectedRegion] || stockIndicesMock[selectedRegion as keyof typeof stockIndicesMock] || [];
  const indicators = t.indicators;
  const countries = t.countries;

  // Helper to format indicator data
  const getIndicatorData = (country: 'us' | 'cn', key: 'gdp_annual' | 'gdp_quarterly' | 'cpi' | 'ppi' | 'unemployment') => {
    const data = economyData[country]?.indicators?.[key];
    if (!data) return economyIndicatorsMock[country][key];
    return data;
  };

  return (
    <div className="space-y-6">
      {/* Module 1: AI Market Summary */}
      <section>
        {highlight ? (
          <CopilotHighlight
            title={highlight.title}
            summary={highlight.summary}
            trend={highlight.trend === 'bullish' ? 'up' : highlight.trend === 'bearish' ? 'down' : 'neutral'}
            trendLabel={highlight.trend === 'bullish' ? 'Bullish' : highlight.trend === 'bearish' ? 'Bearish' : 'Mixed'}
            keyPoints={highlight.highlights}
          />
        ) : analysisLoading ? (
          <div className="bg-okx-bg-secondary border border-okx-border rounded-lg p-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center flex-shrink-0">
                <Loader2 className="text-black animate-spin" size={24} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-okx-text-muted text-xs">
                    {language === 'zh' ? '智能经济学家分析中...' : 'Smart Economist Analyzing...'}
                  </span>
                </div>
                <p className="text-okx-text-secondary text-sm">
                  {language === 'zh' ? '正在分析宏观经济数据，请稍候...' : 'Analyzing macroeconomic data, please wait...'}
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </section>

      {/* Module 2: Economy Indicators */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Globe size={18} className="text-green-400" />
            <h2 className="text-white font-medium text-sm">{t.economyIndicators}</h2>
          </div>
          <div className="text-okx-text-muted text-[10px]">
            {language === 'zh' ? '每日上午 9 点更新' : 'Updates daily at 9:00 AM'}
          </div>
        </div>

        {/* United States */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">🇺🇸</span>
              <h3 className="text-white font-medium text-sm">{countries.us}</h3>
            </div>
            <span className="text-[10px] text-okx-text-muted">FRED</span>
          </div>
          <div className="grid grid-cols-5 gap-3">
            <IndicatorCard
              label={indicators.gdpAnnual}
              value={getIndicatorData('us', 'gdp_annual').value}
              period={getIndicatorData('us', 'gdp_annual').period}
              unit={getIndicatorData('us', 'gdp_annual').unit}
              rawValue={getIndicatorData('us', 'gdp_annual').raw_value}
              isGDP={true}
              lang={language}
            />
            <IndicatorCard
              label={indicators.gdpQuarterly}
              value={getIndicatorData('us', 'gdp_quarterly').value}
              period={getIndicatorData('us', 'gdp_quarterly').period}
              unit={getIndicatorData('us', 'gdp_quarterly').unit}
              rawValue={getIndicatorData('us', 'gdp_quarterly').raw_value}
              isGDP={true}
              lang={language}
            />
            <IndicatorCard
              label={indicators.cpi}
              value={getIndicatorData('us', 'cpi').value}
              period={getIndicatorData('us', 'cpi').period}
              unit={getIndicatorData('us', 'cpi').unit}
              lang={language}
            />
            <IndicatorCard
              label={indicators.ppi}
              value={getIndicatorData('us', 'ppi').value}
              period={getIndicatorData('us', 'ppi').period}
              unit={getIndicatorData('us', 'ppi').unit}
              lang={language}
            />
            <IndicatorCard
              label={indicators.unemployment}
              value={getIndicatorData('us', 'unemployment').value}
              period={getIndicatorData('us', 'unemployment').period}
              unit={getIndicatorData('us', 'unemployment').unit}
              isUnemployment={true}
              lang={language}
            />
          </div>
        </div>

        {/* China */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">🇨🇳</span>
              <h3 className="text-white font-medium text-sm">{countries.cn}</h3>
            </div>
            <span className="text-[10px] text-okx-text-muted">Tushare</span>
          </div>
          <div className="grid grid-cols-5 gap-3">
            <IndicatorCard
              label={indicators.gdpAnnual}
              value={getIndicatorData('cn', 'gdp_annual').value}
              period={getIndicatorData('cn', 'gdp_annual').period}
              unit={getIndicatorData('cn', 'gdp_annual').unit}
              rawValue={getIndicatorData('cn', 'gdp_annual').raw_value}
              isGDP={true}
              isChinaGDP={true}
              lang={language}
            />
            <IndicatorCard
              label={indicators.gdpQuarterly}
              value={getIndicatorData('cn', 'gdp_quarterly').value}
              period={`${getIndicatorData('cn', 'gdp_quarterly').year} ${getIndicatorData('cn', 'gdp_quarterly').quarter?.startsWith('Q') ? getIndicatorData('cn', 'gdp_quarterly').quarter : 'Q' + getIndicatorData('cn', 'gdp_quarterly').quarter}`}
              unit={getIndicatorData('cn', 'gdp_quarterly').unit}
              rawValue={getIndicatorData('cn', 'gdp_quarterly').raw_value}
              isGDP={true}
              isChinaGDP={true}
              lang={language}
            />
            <IndicatorCard
              label={indicators.cpi}
              value={getIndicatorData('cn', 'cpi').value}
              period={getIndicatorData('cn', 'cpi').period}
              unit={getIndicatorData('cn', 'cpi').unit}
              lang={language}
            />
            <IndicatorCard
              label={indicators.ppi}
              value={getIndicatorData('cn', 'ppi').value}
              period={getIndicatorData('cn', 'ppi').period}
              unit={getIndicatorData('cn', 'ppi').unit}
              lang={language}
            />
            <IndicatorCard
              label={indicators.unemployment}
              value={getIndicatorData('cn', 'unemployment').value}
              period={getIndicatorData('cn', 'unemployment').period}
              unit={getIndicatorData('cn', 'unemployment').unit}
              isUnemployment={true}
              lang={language}
            />
          </div>
        </div>
      </section>

      {/* Module 3: Breaking News */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Zap size={18} className="text-yellow-400" />
            <h2 className="text-white font-medium text-sm">{t.breakingNews}</h2>
          </div>
          <div className="flex items-center gap-3 text-xs text-okx-text-muted">
            <span className="px-2 py-0.5 bg-white/10 rounded text-white/80">GNews</span>
            {lastUpdated && (
              <span>
                {language === 'zh' ? '更新于' : 'Updated'}: {lastUpdated.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
        </div>

        {/* News Grid - 1 row x 4 columns (or fewer if less news) */}
        {breakingNews.length > 0 ? (
          <div className="grid grid-cols-4 gap-3">
            {breakingNews.map((news) => (
              <BreakingNewsCard key={news.id} news={news} />
            ))}
          </div>
        ) : newsLoading ? (
          <div className="text-center py-12 text-okx-text-muted flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            {language === 'zh' ? '突发新闻分析中...' : 'Breaking news analyzing...'}
          </div>
        ) : (
          <div className="text-center py-12 text-okx-text-muted">
            {t.noData}
          </div>
        )}
      </section>

      {/* Module 4: Regional Stock Indices */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Globe size={18} className="text-blue-400" />
            <h2 className="text-white font-medium text-sm">{t.stockIndices}</h2>
          </div>
          <div className="text-okx-text-muted text-[10px]">
            {language === 'zh' ? '每 1 分钟更新' : 'Updates every 1 min'}
          </div>
        </div>

        {/* Region Selector */}
        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
          {regions.map((region) => (
            <button
              key={region.id}
              onClick={() => setSelectedRegion(region.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                selectedRegion === region.id
                  ? 'bg-white text-black'
                  : 'bg-okx-bg-secondary text-okx-text-secondary border border-okx-border hover:text-white'
              }`}
            >
              <span className="text-lg">{region.flag}</span>
              <span>{language === 'zh' ? region.label : region.name}</span>
            </button>
          ))}
        </div>

        {/* Stock Indices Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {currentIndices.length > 0 ? (
            currentIndices.map((index) => (
              <IndexCard key={index.symbol} index={index} />
            ))
          ) : (
            <div className="col-span-full text-center py-12 text-okx-text-muted">
              {language === 'zh' ? '暂无相关股指数据' : 'No stock indices data available'}
            </div>
          )}
        </div>

        {/* Data Source Info */}
        <div className="mt-4 bg-okx-bg-secondary border border-okx-border rounded-lg p-4">
          <div className="flex items-center gap-2 text-okx-text-muted text-xs">
            <span>💡</span>
            <span>
              {language === 'zh' 
                ? '实时股指数据来自 Yahoo Finance，每 1 分钟刷新' 
                : 'Real-time stock indices data from Yahoo Finance, updates every 1 minute'}
            </span>
          </div>
        </div>
      </section>

      {/* Module 5: Commodities */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Package size={18} className="text-yellow-400" />
            <h2 className="text-white font-medium text-sm">{language === 'zh' ? '大宗商品' : 'Commodities'}</h2>
          </div>
          <div className="text-okx-text-muted text-[10px]">
            {language === 'zh' ? '每 1 分钟更新' : 'Updates every 1 min'}
          </div>
        </div>

        {/* Commodities Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {commodities.length > 0 ? (
            commodities.map((commodity) => (
              <IndexCard key={commodity.symbol} index={commodity} />
            ))
          ) : (
            <div className="col-span-full text-center py-12 text-okx-text-muted">
              {language === 'zh' ? '暂无相关大宗商品数据' : 'No commodities data available'}
            </div>
          )}
        </div>

        {/* Data Source Info */}
        <div className="mt-4 bg-okx-bg-secondary border border-okx-border rounded-lg p-4">
          <div className="flex items-center gap-2 text-okx-text-muted text-xs">
            <span>💡</span>
            <span>
              {language === 'zh' 
                ? '实时商品数据来自 Yahoo Finance，每 1 分钟刷新' 
                : 'Real-time commodities data from Yahoo Finance, updates every 1 minute'}
            </span>
          </div>
        </div>
      </section>

      {/* Module 6: Currency Rates */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Globe size={18} className="text-green-400" />
            <h2 className="text-white font-medium text-sm">{language === 'zh' ? '外汇' : 'Currency Rates'}</h2>
          </div>
          <div className="text-okx-text-muted text-[10px]">
            {language === 'zh' ? '每 1 分钟更新' : 'Updates every 1 min'}
          </div>
        </div>

        {/* Currency Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {currencies.length > 0 ? (
            currencies.map((currency) => (
              <div key={currency.symbol} className="bg-okx-bg-secondary border border-okx-border rounded-lg p-3">
                <div className="text-okx-text-muted text-[10px] mb-1">{currency.name}</div>
                <div className="text-lg font-bold text-white font-mono mb-1">
                  {currency.value.toFixed(4)}
                </div>
                <div className={`text-xs font-medium ${currency.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {currency.change >= 0 ? '↗' : '↘'} {currency.change.toFixed(4)} ({currency.change_percent >= 0 ? '+' : ''}{currency.change_percent.toFixed(2)}%)
                </div>
                <div className="text-okx-text-muted text-[9px] mt-1">
                  1 {currency.name.split('/')[0]} = {currency.value.toFixed(4)} {currency.quote_currency}
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-12 text-okx-text-muted">
              {language === 'zh' ? '暂无相关汇率数据' : 'No currency rates data available'}
            </div>
          )}
        </div>

        {/* Data Source Info */}
        <div className="mt-4 bg-okx-bg-secondary border border-okx-border rounded-lg p-4">
          <div className="flex items-center gap-2 text-okx-text-muted text-xs">
            <span>💡</span>
            <span>
              {language === 'zh' 
                ? '实时汇率数据来自 Yahoo Finance，每 1 分钟刷新（CNY 以人民币计价，其他以港元计价）' 
                : 'Real-time currency data from Yahoo Finance, updates every 1 minute (CNY quoted in CNY, others in HKD)'}
            </span>
          </div>
        </div>
      </section>
    </div>
  );
};
