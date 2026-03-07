import { useState, useMemo } from 'react';
import { CryptoSection } from '../components/CryptoSection';
import { cryptoData } from '../data/cryptoData';
import { Search } from 'lucide-react';
import { CopilotHighlight } from '../components/CopilotHighlight';

export const CryptoPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'major' | 'emerging' | 'growing'>('all');

  const filteredCryptos = useMemo(() => {
    return cryptoData.filter(crypto => {
      const matchesSearch = 
        crypto.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        crypto.symbol.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || crypto.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  const majorCryptos = filteredCryptos.filter(c => c.category === 'major');
  const emergingCryptos = filteredCryptos.filter(c => c.category === 'emerging');
  const growingCryptos = filteredCryptos.filter(c => c.category === 'growing');

  return (
    <div>
      {/* Copilot Highlight */}
      <CopilotHighlight
        title="Crypto Market Pulse"
        summary="Bitcoin breaks $87K resistance with strong institutional inflows. Layer-1 altcoins (SOL, SUI, APT) leading gains. DeFi TVL climbing. Meme coin momentum cooling. Market breadth improving."
        trend="up"
        trendLabel="Bullish"
        keyPoints={['BTC $87K+', 'L1s Leading', 'DeFi Revival', 'ETF Inflows']}
      />

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-okx-text-muted" size={16} />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-okx-bg-secondary border border-okx-border rounded text-white placeholder-okx-text-muted text-sm focus:outline-none focus:border-okx-accent transition-colors"
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

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total', value: '20+' },
          { label: 'Major', value: '6' },
          { label: 'Emerging', value: '6' },
          { label: 'Growing', value: '8' },
        ].map((stat, index) => (
          <div key={index} className="bg-okx-bg-secondary border border-okx-border rounded p-3">
            <p className="text-okx-text-muted text-xs mb-1">{stat.label}</p>
            <p className="text-xl font-bold text-white font-mono">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Sections */}
      {(selectedCategory === 'all' || selectedCategory === 'major') && majorCryptos.length > 0 && (
        <CryptoSection
          title="Major"
          description="Top-tier digital assets"
          cryptos={majorCryptos}
          icon="major"
        />
      )}

      {(selectedCategory === 'all' || selectedCategory === 'growing') && growingCryptos.length > 0 && (
        <CryptoSection
          title="Growing"
          description="Projects with momentum"
          cryptos={growingCryptos}
          icon="growing"
        />
      )}

      {(selectedCategory === 'all' || selectedCategory === 'emerging') && emergingCryptos.length > 0 && (
        <CryptoSection
          title="Emerging"
          description="High growth potential"
          cryptos={emergingCryptos}
          icon="emerging"
        />
      )}

      {filteredCryptos.length === 0 && (
        <div className="text-center py-20 text-okx-text-secondary">
          No cryptocurrencies found
        </div>
      )}
    </div>
  );
};
