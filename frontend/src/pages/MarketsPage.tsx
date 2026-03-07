import { useState, useEffect } from 'react';
import { TrendingUp, Building2, Package, Loader2 } from 'lucide-react';
import { CopilotHighlight } from '../components/CopilotHighlight';
import { api } from '../services/api';
import type { HighlightSummary } from '../services/api';

// Region definitions with flags
const regions = [
  { id: 'us', name: 'United States', flag: '🇺🇸' },
  { id: 'cn', name: 'China', flag: '🇨🇳' },
  { id: 'hk', name: 'Hong Kong', flag: '🇭🇰' },
  { id: 'eu', name: 'European Union', flag: '🇪🇺' },
  { id: 'uk', name: 'United Kingdom', flag: '🇬🇧' },
  { id: 'sg', name: 'Singapore', flag: '🇸🇬' },
  { id: 'jp', name: 'Japan', flag: '🇯🇵' },
  { id: 'kr', name: 'South Korea', flag: '🇰🇷' },
];

interface CountryData {
  country_id: string;
  country_name: string;
  timestamp: string;
  data_sources_used: string[];
  indicators: {
    gdp_growth?: number;
    inflation_cpi?: number;
    inflation_ppi?: number;
    unemployment?: number;
    interest_rate?: number;
    fed_rate?: number;
    gdp_current?: number;
  };
}

// Format number with decimals
const formatNumber = (value: number | undefined, decimals: number = 2) => {
  if (value === undefined || value === null) return 'N/A';
  return value.toFixed(decimals);
};

// Format date from ISO string
const formatDate = (isoString: string) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
};

// Key Indicator Card Component
const KeyIndicatorCard = ({ 
  title, 
  value, 
  unit, 
  date,
  change 
}: { 
  title: string; 
  value: string; 
  unit: string;
  date?: string;
  change?: number;
}) => (
  <div className="bg-okx-bg-secondary border border-okx-border rounded-lg p-4 hover:border-okx-border-light transition-all">
    <div className="flex items-start justify-between mb-1">
      <span className="text-okx-text-muted text-[10px] uppercase tracking-wider">{title}</span>
      {change !== undefined && (
        <span className={`text-[10px] font-mono ${change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {change >= 0 ? '+' : ''}{change.toFixed(1)}%
        </span>
      )}
    </div>
    <div className="text-2xl font-bold text-white font-mono">
      {value}
      <span className="text-sm text-okx-text-muted ml-1">{unit}</span>
    </div>
    {date && (
      <p className="text-okx-text-muted text-[10px] mt-1">As of {date}</p>
    )}
  </div>
);

// Section Card Component
const SectionCard = ({ 
  title, 
  icon: Icon, 
  children 
}: { 
  title: string; 
  icon: any; 
  children: React.ReactNode;
}) => (
  <div className="bg-okx-bg-secondary border border-okx-border rounded-lg">
    <div className="flex items-center gap-2 px-4 py-3 border-b border-okx-border">
      <Icon size={16} className="text-okx-text-muted" />
      <h3 className="text-white font-medium text-sm">{title}</h3>
    </div>
    <div className="divide-y divide-okx-border">
      {children}
    </div>
  </div>
);

export const MarketsPage = () => {
  const [selectedRegion, setSelectedRegion] = useState<string>('us');
  const [countryData, setCountryData] = useState<CountryData | null>(null);
  const [countriesData, setCountriesData] = useState<Record<string, CountryData>>({});
  const [highlight, setHighlight] = useState<HighlightSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  // Fetch all countries data on mount
  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      try {
        // Fetch global data with all countries
        const globalData = await api.getMarketData();
        if (globalData.data?.regions) {
          setCountriesData(globalData.data.regions);
          setHighlight(globalData.highlight);
          setLastUpdated(globalData.data?.timestamp || '');
        }
      } catch (err) {
        console.error('Failed to fetch market data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAllData();
  }, []);

  // Update selected country data when region changes
  useEffect(() => {
    if (countriesData[selectedRegion]) {
      setCountryData(countriesData[selectedRegion]);
    }
  }, [selectedRegion, countriesData]);

  const region = regions.find(r => r.id === selectedRegion);
  const indicators = countryData?.indicators || {};
  const dataDate = countryData?.timestamp ? formatDate(countryData.timestamp) : '';

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

      {/* Header */}
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-white">{region?.name}</h1>
        <p className="text-okx-text-muted text-xs">
          Key economic indicators & market data
          {lastUpdated && ` • Updated ${formatDate(lastUpdated)}`}
        </p>
      </div>

      {/* Region Selector */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
        {regions.map((r) => (
          <button
            key={r.id}
            onClick={() => setSelectedRegion(r.id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              selectedRegion === r.id
                ? 'bg-white text-black'
                : 'bg-okx-bg-secondary text-okx-text-secondary border border-okx-border hover:text-white'
            }`}
          >
            <span>{r.flag}</span>
            <span className="hidden sm:inline">{r.name}</span>
          </button>
        ))}
      </div>

      {/* 4 Key Indicators */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <KeyIndicatorCard 
          title="GDP Growth YoY" 
          value={formatNumber(indicators.gdp_growth)} 
          unit="%"
          date={dataDate}
        />
        <KeyIndicatorCard 
          title="CPI YoY" 
          value={formatNumber(indicators.inflation_cpi)} 
          unit="%"
          date={dataDate}
        />
        <KeyIndicatorCard 
          title="PPI YoY" 
          value={formatNumber(indicators.inflation_ppi)} 
          unit="%"
          date={dataDate}
        />
        <KeyIndicatorCard 
          title="Unemployment Rate" 
          value={formatNumber(indicators.unemployment)} 
          unit="%"
          date={dataDate}
        />
      </div>

      {/* Data Source */}
      {countryData?.data_sources_used && countryData.data_sources_used.length > 0 && (
        <div className="mb-4 text-xs text-okx-text-muted">
          Data sources: {countryData.data_sources_used.join(', ')}
        </div>
      )}

      {/* Three Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Economic Indicators */}
        <SectionCard title="Economic Indicators" icon={Building2}>
          <div className="px-4 py-3">
            <div className="flex justify-between items-center">
              <span className="text-white text-sm">Interest Rate</span>
              <span className="text-white font-mono">
                {formatNumber(indicators.interest_rate || indicators.fed_rate)}%
              </span>
            </div>
          </div>
          <div className="px-4 py-3">
            <div className="flex justify-between items-center">
              <span className="text-white text-sm">GDP Current</span>
              <span className="text-white font-mono">
                {indicators.gdp_current ? `$${(indicators.gdp_current / 1e12).toFixed(2)}T` : 'N/A'}
              </span>
            </div>
          </div>
        </SectionCard>

        {/* Stock Indices - Placeholder */}
        <SectionCard title="Stock Indices" icon={TrendingUp}>
          <div className="px-4 py-6 text-center text-okx-text-muted text-sm">
            Stock indices data coming soon
          </div>
        </SectionCard>

        {/* Commodities - Placeholder */}
        <SectionCard title="Commodities" icon={Package}>
          <div className="px-4 py-6 text-center text-okx-text-muted text-sm">
            Commodities data coming soon
          </div>
        </SectionCard>
      </div>
    </div>
  );
};
