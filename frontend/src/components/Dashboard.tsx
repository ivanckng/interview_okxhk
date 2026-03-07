import { useState, useMemo } from 'react';
import { Header } from './Header';
import { CryptoSection } from './CryptoSection';
import { cryptoData } from '../data/cryptoData';
import { Search, Filter } from 'lucide-react';

export const Dashboard = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'major' | 'emerging' | 'growing'>('all');

  // Filter cryptos based on search and category
  const filteredCryptos = useMemo(() => {
    return cryptoData.filter(crypto => {
      const matchesSearch = 
        crypto.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        crypto.symbol.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || crypto.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  // Group by category for display
  const majorCryptos = filteredCryptos.filter(c => c.category === 'major');
  const emergingCryptos = filteredCryptos.filter(c => c.category === 'emerging');
  const growingCryptos = filteredCryptos.filter(c => c.category === 'growing');

  return (
    <div className="min-h-screen bg-crypto-dark">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search cryptocurrency..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-crypto-card border border-crypto-border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-crypto-blue transition-colors"
            />
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2 bg-crypto-card border border-crypto-border rounded-xl p-1">
            <Filter size={18} className="text-gray-400 ml-2" />
            {(['all', 'major', 'emerging', 'growing'] as const).map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedCategory === category
                    ? 'bg-crypto-blue text-white'
                    : 'text-gray-400 hover:text-white hover:bg-crypto-border'
                }`}
              >
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Market Overview Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Cryptocurrencies', value: '20+' },
            { label: 'Major Coins', value: '6' },
            { label: 'Emerging', value: '6' },
            { label: 'Growing', value: '8' },
          ].map((stat, index) => (
            <div key={index} className="bg-crypto-card border border-crypto-border rounded-xl p-4">
              <p className="text-gray-400 text-sm">{stat.label}</p>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Crypto Sections */}
        {(selectedCategory === 'all' || selectedCategory === 'major') && majorCryptos.length > 0 && (
          <CryptoSection
            title="Major Cryptocurrencies"
            description="Top-tier digital assets with the largest market capitalization"
            cryptos={majorCryptos}
            icon="major"
          />
        )}

        {(selectedCategory === 'all' || selectedCategory === 'growing') && growingCryptos.length > 0 && (
          <CryptoSection
            title="Growing Cryptocurrencies"
            description="Established projects showing strong momentum and adoption"
            cryptos={growingCryptos}
            icon="growing"
          />
        )}

        {(selectedCategory === 'all' || selectedCategory === 'emerging') && emergingCryptos.length > 0 && (
          <CryptoSection
            title="Emerging Cryptocurrencies"
            description="New and innovative projects with high growth potential"
            cryptos={emergingCryptos}
            icon="emerging"
          />
        )}

        {/* Empty State */}
        {filteredCryptos.length === 0 && (
          <div className="text-center py-20">
            <p className="text-gray-400 text-lg">No cryptocurrencies found matching your search.</p>
            <button
              onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}
              className="mt-4 px-6 py-2 bg-crypto-blue text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-crypto-border mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-gray-500 text-sm">
            Data is for demonstration purposes only. Not financial advice.
          </p>
        </div>
      </footer>
    </div>
  );
};
