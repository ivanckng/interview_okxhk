import { useState, useMemo, useEffect } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { CopilotHighlight } from '../components/CopilotHighlight';
import { api } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
import { translateHighlightSummary } from '../services/apiTranslation';
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
  const [coins, setCoins] = useState<CryptoCoin[]>([]);
  const [globalData, setGlobalData] = useState<any>(null);
  const [highlight, setHighlight] = useState<HighlightSummary | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch AI analysis data (every 10 minutes)
  useEffect(() => {
    const fetchAIAnalysis = async () => {
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
          
          // Translate if Chinese
          if (language === 'zh' && highlightData.summary) {
            const translated = await translateHighlightSummary(highlightData, 'zh');
            setHighlight(translated);
          } else {
            setHighlight(highlightData);
          }
        }
      } catch (err) {
        console.error('Failed to fetch AI analysis:', err);
      }
    };
    
    // Initial fetch
    fetchAIAnalysis();
    
    // Refresh every 10 minutes (600000 ms)
    const interval = setInterval(fetchAIAnalysis, 600000);
    
    return () => clearInterval(interval);
  }, [language]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('[Crypto] Fetching data...');
        const data = await api.getCryptoPrices(20);
        console.log('[Crypto] Data fetched:', data.coins?.length, 'coins');
        setCoins(data.coins);
        setGlobalData(data.global);

        // 如果是中文，翻译 highlight
        if (language === 'zh' && data.highlight) {
          const translatedHighlight = await translateHighlightSummary(data.highlight, 'zh');
          setHighlight(translatedHighlight);
        } else {
          setHighlight(data.highlight);
        }
      } catch (err) {
        console.error('Failed to fetch crypto prices:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();

    // Refresh every 5 minutes (300000 ms)
    const interval = setInterval(fetchData, 300000);
    return () => clearInterval(interval);
  }, [language]);

  const filteredCryptos = useMemo(() => {
    return coins.filter(crypto => {
      const matchesSearch = 
        crypto.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        crypto.symbol.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [searchQuery, coins]);

  // Categorize coins based on market cap rank
  const majorCryptos = filteredCryptos.filter(c => c.market_cap_rank <= 6);
  const emergingCryptos = filteredCryptos.filter(c => c.market_cap_rank > 6 && c.market_cap_rank <= 12);
  const growingCryptos = filteredCryptos.filter(c => c.market_cap_rank > 12);

  const displayedCryptos = selectedCategory === 'all' 
    ? filteredCryptos 
    : selectedCategory === 'major' 
      ? majorCryptos 
      : selectedCategory === 'emerging' 
        ? emergingCryptos 
        : growingCryptos;

  // 静态文本翻译
  const staticTranslations = {
    en: {
      searchPlaceholder: 'Search cryptocurrencies...',
      categories: { all: 'All', major: 'Major', emerging: 'Emerging', growing: 'Growing' },
      marketCap: 'Market Cap',
      volume: 'Volume',
      dominance: 'Dominance',
      majorTitle: 'Major',
      majorDesc: 'Top-tier digital assets',
      emergingTitle: 'Emerging',
      emergingDesc: 'Rising altcoins',
      growingTitle: 'Growing',
      growingDesc: 'New opportunities',
      noResults: 'No cryptocurrencies found for the selected filters.',
    },
    zh: {
      searchPlaceholder: '搜索加密货币...',
      categories: { all: '全部', major: '主流币', emerging: '新兴币', growing: '增长币' },
      marketCap: '总市值',
      volume: '交易量',
      dominance: '占比',
      majorTitle: '主流币',
      majorDesc: '顶级数字资产',
      emergingTitle: '新兴币',
      emergingDesc: '崛起的山寨币',
      growingTitle: '增长币',
      growingDesc: '新机会',
      noResults: '暂无符合筛选条件的加密货币。',
    },
  };

  const t = staticTranslations[language];

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
      {highlight && (
        <CopilotHighlight
          title={highlight.title}
          summary={highlight.summary}
          trend={highlight.trend === 'bullish' ? 'up' : highlight.trend === 'bearish' ? 'down' : 'neutral'}
          trendLabel={highlight.trend === 'bullish' ? 'Bullish' : highlight.trend === 'bearish' ? 'Bearish' : 'Mixed'}
          keyPoints={highlight.highlights}
        />
      )}

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-okx-text-muted" size={16} />
          <input
            type="text"
            placeholder={t.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-okx-bg-secondary border border-okx-border rounded text-white placeholder-okx-text-muted text-sm focus:outline-none focus:border-white/50 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2">
          {(['all', 'major', 'emerging', 'growing'] as const).map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-3 py-2 rounded text-sm font-medium transition-all ${
                selectedCategory === category
                  ? 'bg-white text-black'
                  : 'bg-okx-bg-secondary text-okx-text-secondary border border-okx-border hover:text-white'
              }`}
            >
              {t.categories[category]}
            </button>
          ))}
        </div>
      </div>

      {/* Global Stats */}
      {globalData && (
        <div className="grid grid-cols-4 gap-3 mb-6">
          <div className="bg-okx-bg-secondary border border-okx-border rounded p-3">
            <p className="text-okx-text-muted text-xs mb-1">{t.marketCap}</p>
            <p className="text-xl font-bold text-white font-mono">
              ${(globalData.total_market_cap as number / 1e12).toFixed(2)}T
            </p>
          </div>
          <div className="bg-okx-bg-secondary border border-okx-border rounded p-3">
            <p className="text-okx-text-muted text-xs mb-1">{t.volume}</p>
            <p className="text-xl font-bold text-white font-mono">
              ${(globalData.total_volume / 1e9).toFixed(1)}B
            </p>
          </div>
          <div className="bg-okx-bg-secondary border border-okx-border rounded p-3">
            <p className="text-okx-text-muted text-xs mb-1">24h {t.marketCap}</p>
            <p className={`text-xl font-bold font-mono ${globalData.market_cap_change_24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {globalData.market_cap_change_24h >= 0 ? '+' : ''}{globalData.market_cap_change_24h.toFixed(2)}%
            </p>
          </div>
          <div className="bg-okx-bg-secondary border border-okx-border rounded p-3">
            <p className="text-okx-text-muted text-xs mb-1">{t.dominance}</p>
            <p className="text-xl font-bold text-white font-mono">
              {globalData.active_cryptocurrencies?.toLocaleString() || 'N/A'}
            </p>
          </div>
        </div>
      )}

      {/* Crypto Grid */}
      {selectedCategory === 'all' ? (
        <>
          {majorCryptos.length > 0 && (
            <div className="mb-8">
              <h2 className="text-white font-medium mb-3">{t.majorTitle} <span className="text-okx-text-muted text-sm">{t.majorDesc}</span></h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {majorCryptos.map(coin => <CryptoCard key={coin.id} coin={coin} />)}
              </div>
            </div>
          )}

          {emergingCryptos.length > 0 && (
            <div className="mb-8">
              <h2 className="text-white font-medium mb-3">{t.emergingTitle} <span className="text-okx-text-muted text-sm">{t.emergingDesc}</span></h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {emergingCryptos.map(coin => <CryptoCard key={coin.id} coin={coin} />)}
              </div>
            </div>
          )}

          {growingCryptos.length > 0 && (
            <div className="mb-8">
              <h2 className="text-white font-medium mb-3">{t.growingTitle} <span className="text-okx-text-muted text-sm">{t.growingDesc}</span></h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {growingCryptos.map(coin => <CryptoCard key={coin.id} coin={coin} />)}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {displayedCryptos.map(coin => <CryptoCard key={coin.id} coin={coin} />)}
        </div>
      )}

      {displayedCryptos.length === 0 && (
        <div className="text-center py-12 text-okx-text-muted">
          {t.noResults}
        </div>
      )}
    </div>
  );
};
