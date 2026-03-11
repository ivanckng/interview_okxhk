import { useState, useMemo, useEffect } from 'react';
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
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'major' | 'emerging' | 'growing'>('all');
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

  // 初始化時從緩存讀取 highlight
  useEffect(() => {
    const cached = cacheService.getCache<HighlightSummary>('cryptoHighlight');
    if (cached) {
      setHighlight(cached);
    }
  }, []);

  // Fetch AI analysis data (every 10 minutes)
  useEffect(() => {
    const fetchAIAnalysis = async () => {
      setAnalysisLoading(true);
      try {
        const response = await fetch(`http://localhost:8000/api/crypto/analysis`);
        const data = await response.json();

        const aiAnalysis = data.ai_analysis;
        if (aiAnalysis && !aiAnalysis.error) {
          // Convert AI analysis to highlight format
          const highlightData = {
            title: 'AI Crypto Analysis',
            summary: aiAnalysis.market_pulse || 'Analyzing crypto market...',
            trend: aiAnalysis.overall_sentiment || 'neutral',
            highlights: aiAnalysis.key_insights?.slice(0, 3) || [],
            generated_at: new Date().toISOString(),
          };

          // Translate if Chinese and save to cache
          if (language === 'zh' && highlightData.summary) {
            const translated = await translateHighlightSummary(highlightData, 'zh');
            cacheService.setCache('cryptoHighlight', translated);
            setHighlight(translated);
          } else {
            cacheService.setCache('cryptoHighlight', highlightData);
            setHighlight(highlightData);
          }
        }
      } catch (err) {
        console.error('Failed to fetch AI analysis:', err);
      } finally {
        setAnalysisLoading(false);
      }
    };

    // Initial fetch
    fetchAIAnalysis();

    // Refresh every 10 minutes (600000 ms)
    const interval = setInterval(fetchAIAnalysis, 600000);

    return () => clearInterval(interval);
  }, [language]);

  const coins = cryptoData?.coins || [];
  const globalData = cryptoData?.global || null;
  const loading = cryptoLoading;

  const filteredCryptos = useMemo(() => {
    return coins.filter(crypto => {
      const matchesSearch = 
        crypto.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        crypto.symbol.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [searchQuery, coins]);

  // Categorize coins based on market cap rank
  const categorizedCryptos = useMemo(() => {
    if (selectedCategory === 'all') return filteredCryptos;
    
    return filteredCryptos.filter(coin => {
      if (selectedCategory === 'major') return coin.market_cap_rank <= 10;
      if (selectedCategory === 'emerging') return coin.market_cap_rank > 10 && coin.market_cap_rank <= 50;
      if (selectedCategory === 'growing') {
        return coin.price_change_percentage_24h && coin.price_change_percentage_24h > 10;
      }
      return true;
    });
  }, [filteredCryptos, selectedCategory]);

  const t = {
    en: {
      title: 'Crypto Prices',
      searchPlaceholder: 'Search by name or symbol...',
      source: 'Source: CoinGecko',
      updated: 'Updated (HKT):',
      categories: {
        all: 'All',
        major: 'Major (Top 10)',
        emerging: 'Emerging (11-50)',
        growing: 'Growing (>10% 24h)',
      },
      noData: 'No cryptocurrencies found.',
      aiAnalysis: 'AI Crypto Analysis',
      analyzing: 'Analysis in progress...',
    },
    zh: {
      title: '加密货币价格',
      searchPlaceholder: '搜索名称或符号...',
      source: '来源：CoinGecko',
      updated: '更新时间 (HKT):',
      categories: {
        all: '全部',
        major: '主流 (前 10)',
        emerging: '新兴 (11-50)',
        growing: '增长 (>10% 24h)',
      },
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
          trendLabel={highlight.trend === 'bullish' ? 'Bullish' : highlight.trend === 'bearish' ? 'Bearish' : 'Mixed'}
          keyPoints={highlight.highlights}
        />
      ) : analysisLoading ? (
        <div className="bg-okx-bg-secondary border border-okx-border rounded-lg p-5 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center flex-shrink-0">
              <Loader2 className="text-black animate-spin" size={24} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-xl font-semibold text-white">{t.aiAnalysis}</h1>
                <span className="text-okx-text-muted text-xs">
                  {t.analyzing}
                </span>
              </div>
              <p className="text-okx-text-secondary text-sm">
                {language === 'zh' ? '正在分析加密货币市场数据...' : 'Analyzing cryptocurrency market data...'}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {/* Data Source & Update Time */}
      <div className="flex items-center justify-between mb-3 text-xs text-okx-text-muted">
        <span>{t.source}</span>
        <span>{t.updated} {new Date().toLocaleString('zh-CN', {
          timeZone: 'Asia/Hong_Kong',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        })}</span>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-okx-text-muted" size={16} />
          <input
            type="text"
            placeholder={t.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-okx-bg-secondary border border-okx-border rounded-lg pl-10 pr-4 py-2 text-white placeholder-okx-text-muted focus:outline-none focus:border-white/30 transition-all"
          />
        </div>
        <div className="flex gap-2">
          {(Object.keys(t.categories) as Array<keyof typeof t.categories>).map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-3 py-2 rounded text-xs font-medium transition-all ${
                selectedCategory === category
                  ? 'bg-white text-black'
                  : 'bg-okx-bg-secondary text-okx-text-secondary hover:text-white border border-okx-border'
              }`}
            >
              {t.categories[category]}
            </button>
          ))}
        </div>
      </div>

      {/* Crypto Grid */}
      {categorizedCryptos.length === 0 ? (
        <div className="text-center py-12 text-okx-text-muted">
          {t.noData}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {categorizedCryptos.map((coin) => (
            <CryptoCard key={coin.id} coin={coin} />
          ))}
        </div>
      )}

      {/* Global Market Stats */}
      {globalData && (
        <div className="mt-6 bg-okx-bg-secondary border border-okx-border rounded-lg p-4">
          <h3 className="text-white font-medium mb-3 flex items-center gap-2">
            <Globe className="text-blue-400" size={18} />
            Global Crypto Market Stats
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-okx-text-muted mb-1">Total Market Cap</div>
              <div className="text-white font-mono">
                ${globalData.total_market_cap ? (globalData.total_market_cap / 1e12).toFixed(2) + 'T' : 'N/A'}
              </div>
            </div>
            <div>
              <div className="text-okx-text-muted mb-1">24h Volume</div>
              <div className="text-white font-mono">
                ${globalData.total_volume ? (globalData.total_volume / 1e9).toFixed(2) + 'B' : 'N/A'}
              </div>
            </div>
            <div>
              <div className="text-okx-text-muted mb-1">BTC Dominance</div>
              <div className="text-white font-mono">
                {globalData.market_cap_percentage?.btc ? globalData.market_cap_percentage.btc.toFixed(1) + '%' : 'N/A'}
              </div>
            </div>
            <div>
              <div className="text-okx-text-muted mb-1">ETH Dominance</div>
              <div className="text-white font-mono">
                {globalData.market_cap_percentage?.eth ? globalData.market_cap_percentage.eth.toFixed(1) + '%' : 'N/A'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
