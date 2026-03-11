import { useState, useEffect } from 'react';
import { Search, Loader2, Globe } from 'lucide-react';
import { CopilotHighlight } from '../components/CopilotHighlight';
import { api } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
import { translateHighlightSummary } from '../services/apiTranslation';
import { useCachedAPI } from '../hooks/useCachedAPI';
import * as cacheService from '../services/cache';
import type { HighlightSummary } from '../services/api';

interface CryptoCoin {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  total_volume: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  price_change_percentage_7d: number | null;
  sparkline_in_7d: number[];
}

// Crypto Card Component
const CryptoCard = ({ coin }: { coin: CryptoCoin }) => {
  const priceChange24h = coin.price_change_percentage_24h || 0;
  const priceChange7d = coin.price_change_percentage_7d || 0;

  return (
    <div className="bg-okx-bg-secondary border border-okx-border rounded-lg p-4 hover:border-okx-border-light transition-all">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-black font-bold">
            {coin.symbol[0]}
          </div>
          <div>
            <h3 className="text-white font-medium">{coin.name}</h3>
            <p className="text-okx-text-muted text-xs">{coin.symbol}</p>
          </div>
        </div>
        <span className="text-okx-text-muted text-xs">#{coin.market_cap_rank}</span>
      </div>

      <div className="text-2xl font-bold text-white font-mono mb-2">
        ${coin.current_price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
      </div>

      <div className="flex items-center gap-4 text-sm">
        <span className={priceChange24h >= 0 ? 'text-green-400' : 'text-red-400'}>
          {priceChange24h >= 0 ? '↗' : '↘'} {priceChange24h.toFixed(2)}% 24h
        </span>
        {coin.price_change_percentage_7d && (
          <span className={priceChange7d >= 0 ? 'text-green-400' : 'text-red-400'}>
            {priceChange7d >= 0 ? '+' : ''}{priceChange7d.toFixed(2)}% 7d
          </span>
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-okx-border">
        <div className="flex justify-between text-xs text-okx-text-muted">
          <span>Vol: ${(coin.total_volume / 1e9).toFixed(2)}B</span>
          <span>MCap: ${(coin.market_cap / 1e9).toFixed(2)}B</span>
        </div>
      </div>
    </div>
  );
};

export const CryptoPage = () => {
  const { language } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [analysisLoading, setAnalysisLoading] = useState(true);
  const [highlight, setHighlight] = useState<HighlightSummary | null>(null);

  // 使用緩存 API Hook - 加密貨幣價格（2 分鐘 TTL）
  const {
    data: cryptoData,
    loading: cryptoLoading,
  } = useCachedAPI<{ coins: CryptoCoin[]; global: any; highlight: HighlightSummary }>({
    module: 'crypto',
    ttl: 2 * 60,
    fetcher: async () => {
      return api.getCryptoPrices(20);
    },
  });

  // 初始化时从缓存读取 highlight
  useEffect(() => {
    const cached = cacheService.getCache<HighlightSummary>('cryptoHighlight');
    if (cached) {
      setHighlight(cached);
      setAnalysisLoading(false);
    }
  }, []);

  // ==================== AI 分析 - 15 分钟定时 + 可见性刷新 ====================
  useEffect(() => {
    const fetchAIAnalysis = async (forceRefresh = false) => {
      // 检查前端缓存 (15 分钟)，强制刷新时跳过
      if (!forceRefresh) {
        const cached = cacheService.getCache<HighlightSummary>('cryptoHighlight');
        const cachedAt = cacheService.getCacheTimestamp('cryptoHighlight');
        const now = Date.now();
        const isExpired = !cachedAt || (now - cachedAt) > 900000; // 15 分钟

        if (cached && !isExpired) {
          setHighlight(cached);
          setAnalysisLoading(false);
          console.log('[CryptoPage] Using cached AI analysis');
          return;
        }
      }

      setAnalysisLoading(true);
      try {
        console.log('[Crypto AI] Fetching analysis, language:', language);

        const response = await fetch(`http://localhost:8000/api/crypto/analysis`);
        const data = await response.json();

        const aiAnalysis = data.ai_analysis;
        console.log('[Crypto AI] Raw AI analysis:', aiAnalysis?.market_pulse?.substring(0, 50) + '...');

        if (aiAnalysis && !aiAnalysis.error) {
          // Convert AI analysis to highlight format
          const highlightData = {
            title: language === 'zh' ? '智能 Crypto 专家分析' : 'Smart Crypto Expert Analysis',
            summary: aiAnalysis.market_pulse || 'Analyzing crypto market...',
            trend: aiAnalysis.overall_sentiment || 'neutral',
            highlights: aiAnalysis.key_insights?.slice(0, 3) || [],
            generated_at: new Date().toISOString(),
          };

          // Translate if Chinese and save to cache
          if (language === 'zh' && highlightData.summary) {
            console.log('[Crypto AI] Translating to Chinese...');
            const translated = await translateHighlightSummary(highlightData, 'zh');
            console.log('[Crypto AI] Translated summary:', translated.summary?.substring(0, 50) + '...');
            cacheService.setCache('cryptoHighlight', translated, 900); // 15 分钟
            setHighlight(translated);
          } else {
            cacheService.setCache('cryptoHighlight', highlightData, 900);
            setHighlight(highlightData);
          }
        }
      } catch (err) {
        console.error('Failed to fetch AI analysis:', err);
        // 使用缓存作为 fallback
        const cached = cacheService.getCache<HighlightSummary>('cryptoHighlight');
        if (cached) {
          setHighlight(cached);
        }
      } finally {
        setAnalysisLoading(false);
      }
    };

    // 首次加载
    fetchAIAnalysis();

    // 定时刷新：每 15 分钟
    const interval = setInterval(() => fetchAIAnalysis(false), 900000);

    // 页面可见性检测：切回标签页时刷新
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[CryptoPage] Page visible, refreshing AI analysis');
        fetchAIAnalysis(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [language]);

  const coins = cryptoData?.coins || [];
  const globalData = cryptoData?.global || null;
  const loading = cryptoLoading;

  const filteredCryptos = coins.filter((crypto: CryptoCoin) => {
    const matchesSearch =
      crypto.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      crypto.symbol.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const t = {
    en: {
      title: 'Crypto Prices',
      searchPlaceholder: 'Search by name or symbol...',
      source: 'Source: CoinGecko',
      updated: 'Updated (HKT):',
      noData: 'No cryptocurrencies found.',
      aiAnalysis: 'AI Crypto Analysis',
      analyzing: 'Analysis in progress...',
    },
    zh: {
      title: '加密货币价格',
      searchPlaceholder: '搜索名称或符号...',
      source: '来源：CoinGecko',
      updated: '更新时间 (HKT):',
      noData: '未找到加密货币。',
      aiAnalysis: 'AI 加密货币分析',
      analyzing: '分析进行中...',
    },
  }[language];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* Copilot Highlight - AI Generated */}
      {highlight ? (
        <CopilotHighlight
          title={highlight.title}
          summary={highlight.summary}
          trend={highlight.trend === 'bullish' ? 'up' : highlight.trend === 'bearish' ? 'down' : 'neutral'}
          trendLabel={language === 'zh'
            ? (highlight.trend === 'bullish' ? '看涨' : highlight.trend === 'bearish' ? '看跌' : '中性')
            : (highlight.trend === 'bullish' ? 'Bullish' : highlight.trend === 'bearish' ? 'Bearish' : 'Mixed')}
          keyPoints={highlight.highlights}
        />
      ) : analysisLoading ? (
        <CopilotHighlight
          title={language === 'zh' ? '智能 Crypto 专家分析' : 'Smart Crypto Expert Analysis'}
          summary={language === 'zh' ? '正在分析加密货币市场数据...' : 'Analyzing cryptocurrency market data...'}
          trend="neutral"
          trendLabel={language === 'zh' ? '智能 Crypto 专家分析中' : 'Smart Crypto Expert Analyzing'}
          keyPoints={[]}
        />
      ) : null}

      {/* Global Market Stats - 全球加密货币市场概览 */}
      {globalData && (
        <div className="mt-4 bg-okx-bg-secondary border border-okx-border rounded-lg p-4">
          <h3 className="text-white font-medium mb-3 flex items-center gap-2">
            <Globe className="text-blue-400" size={18} />
            {language === 'zh' ? '全球加密货币市场概览' : 'Global Crypto Market Stats'}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-okx-text-muted mb-1">
                {language === 'zh' ? '总市值' : 'Total Market Cap'}
              </div>
              <div className="text-white font-mono">
                ${globalData.total_market_cap ? (globalData.total_market_cap / 1e12).toFixed(2) + 'T' : 'N/A'}
              </div>
              {globalData.market_cap_change_24h && (
                <div className={`text-xs mt-1 ${globalData.market_cap_change_24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {globalData.market_cap_change_24h >= 0 ? '↗' : '↘'} {Math.abs(globalData.market_cap_change_24h).toFixed(2)}%
                </div>
              )}
            </div>
            <div>
              <div className="text-okx-text-muted mb-1">
                {language === 'zh' ? '24 小时交易量' : '24h Volume'}
              </div>
              <div className="text-white font-mono">
                ${globalData.total_volume ? (globalData.total_volume / 1e9).toFixed(2) + 'B' : 'N/A'}
              </div>
              {globalData.total_volume_change_24h && (
                <div className={`text-xs mt-1 ${globalData.total_volume_change_24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {globalData.total_volume_change_24h >= 0 ? '↗' : '↘'} {Math.abs(globalData.total_volume_change_24h).toFixed(2)}%
                </div>
              )}
            </div>
            <div>
              <div className="text-okx-text-muted mb-1">
                {language === 'zh' ? 'BTC 主导率' : 'BTC Dominance'}
              </div>
              <div className="text-white font-mono">
                {globalData.market_cap_percentage?.btc ? globalData.market_cap_percentage.btc.toFixed(1) + '%' : 'N/A'}
              </div>
              {globalData.btc_dominance_change_24h && (
                <div className={`text-xs mt-1 ${globalData.btc_dominance_change_24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {globalData.btc_dominance_change_24h >= 0 ? '↗' : '↘'} {Math.abs(globalData.btc_dominance_change_24h).toFixed(2)}%
                </div>
              )}
            </div>
            <div>
              <div className="text-okx-text-muted mb-1">
                {language === 'zh' ? 'ETH 主导率' : 'ETH Dominance'}
              </div>
              <div className="text-white font-mono">
                {globalData.market_cap_percentage?.eth ? globalData.market_cap_percentage.eth.toFixed(1) + '%' : 'N/A'}
              </div>
              {globalData.eth_dominance_change_24h && (
                <div className={`text-xs mt-1 ${globalData.eth_dominance_change_24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {globalData.eth_dominance_change_24h >= 0 ? '↗' : '↘'} {Math.abs(globalData.eth_dominance_change_24h).toFixed(2)}%
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Data Source & Update Time */}
      <div className="flex items-center justify-between mb-4 mt-4 text-xs text-okx-text-muted">
        <span>{t.source}</span>
        <span>{t.updated} {new Date().toLocaleString('zh-CN', {
          timeZone: 'Asia/Hong_Kong',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        })}</span>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-okx-text-muted" size={16} />
          <input
            type="text"
            placeholder={t.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-okx-bg-secondary border border-okx-border rounded-lg pl-10 pr-4 py-2 text-white placeholder-okx-text-muted focus:outline-none focus:border-white/30 transition-all"
          />
        </div>
      </div>

      {/* Crypto Grid */}
      {filteredCryptos.length === 0 ? (
        <div className="text-center py-12 text-okx-text-muted">
          {t.noData}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filteredCryptos.map((coin) => (
            <CryptoCard key={coin.id} coin={coin} />
          ))}
        </div>
      )}
    </div>
  );
};
