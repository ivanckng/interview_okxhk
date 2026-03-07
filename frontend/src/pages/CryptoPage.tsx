import { useState, useMemo, useEffect } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { CopilotHighlight } from '../components/CopilotHighlight';
import { api } from '../services/api';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'major' | 'emerging' | 'growing'>('all');
  const [coins, setCoins] = useState<CryptoCoin[]>([]);
  const [globalData, setGlobalData] = useState<any>(null);
  const [highlight, setHighlight] = useState<HighlightSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await api.getCryptoPrices(20);
        setCoins(data.coins);
        setGlobalData(data.global);
        setHighlight(data.highlight);
      } catch (err) {
        console.error('Failed to fetch crypto prices:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    
    // Refresh every 2 minutes
    const interval = setInterval(fetchData, 120000);
    return () => clearInterval(interval);
  }, []);

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
            placeholder="Search cryptocurrencies..."
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
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Global Stats */}
      {globalData && (
        <div className="grid grid-cols-4 gap-3 mb-6">
          <div className="bg-okx-bg-secondary border border-okx-border rounded p-3">
            <p className="text-okx-text-muted text-xs mb-1">Total Market Cap</p>
            <p className="text-xl font-bold text-white font-mono">
              ${(globalData.total_market_cap / 1e12).toFixed(2)}T
            </p>
          </div>
          <div className="bg-okx-bg-secondary border border-okx-border rounded p-3">
            <p className="text-okx-text-muted text-xs mb-1">24h Volume</p>
            <p className="text-xl font-bold text-white font-mono">
              ${(globalData.total_volume / 1e9).toFixed(1)}B
            </p>
          </div>
          <div className="bg-okx-bg-secondary border border-okx-border rounded p-3">
            <p className="text-okx-text-muted text-xs mb-1">24h Change</p>
            <p className={`text-xl font-bold font-mono ${globalData.market_cap_change_24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {globalData.market_cap_change_24h >= 0 ? '+' : ''}{globalData.market_cap_change_24h.toFixed(2)}%
            </p>
          </div>
          <div className="bg-okx-bg-secondary border border-okx-border rounded p-3">
            <p className="text-okx-text-muted text-xs mb-1">Active Coins</p>
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
              <h2 className="text-white font-medium mb-3">Major <span className="text-okx-text-muted text-sm">Top-tier digital assets</span></h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {majorCryptos.map(coin => <CryptoCard key={coin.id} coin={coin} />)}
              </div>
            </div>
          )}
          
          {emergingCryptos.length > 0 && (
            <div className="mb-8">
              <h2 className="text-white font-medium mb-3">Emerging <span className="text-okx-text-muted text-sm">Rising altcoins</span></h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {emergingCryptos.map(coin => <CryptoCard key={coin.id} coin={coin} />)}
              </div>
            </div>
          )}
          
          {growingCryptos.length > 0 && (
            <div className="mb-8">
              <h2 className="text-white font-medium mb-3">Growing <span className="text-okx-text-muted text-sm">New opportunities</span></h2>
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
          No cryptocurrencies found for the selected filters.
        </div>
      )}
    </div>
  );
};
