import { useState } from 'react';
import { 
  regions, 
  keyIndicators,
  otherEconomicIndicators,
  stockIndices,
  commodities,
  regionEvents,
  getChangeColor,
  type Region 
} from '../data/marketData';
import { 
  Calendar,
  TrendingUp,
  Building2,
  Package
} from 'lucide-react';
import { CopilotHighlight } from '../components/CopilotHighlight';

const impactConfig = {
  high: { color: 'text-okx-down', bg: 'bg-okx-down/10', border: 'border-okx-down/30' },
  medium: { color: 'text-okx-warning', bg: 'bg-okx-warning/10', border: 'border-okx-warning/30' },
  low: { color: 'text-okx-text-secondary', bg: 'bg-okx-text-secondary/10', border: 'border-okx-text-secondary/30' },
};

// Card component for key indicators
const KeyIndicatorCard = ({ indicator }: { indicator: any }) => (
  <div className="bg-okx-bg-secondary border border-okx-border rounded-lg p-4 hover:border-okx-border-light transition-all">
    <div className="flex items-start justify-between mb-1">
      <span className="text-okx-text-muted text-[10px] uppercase tracking-wider">{indicator.name}</span>
      <span 
        className="text-[10px] font-mono"
        style={{ color: getChangeColor(indicator.change) }}
      >
        {indicator.change > 0 ? '+' : ''}{indicator.changePercent.toFixed(1)}%
      </span>
    </div>
    <div className="text-2xl font-bold text-white font-mono">
      {indicator.value.toFixed(indicator.value < 10 ? 2 : 1)}
      <span className="text-sm text-okx-text-muted ml-1">{indicator.unit}</span>
    </div>
    <p className="text-okx-text-muted text-[10px] mt-1 truncate">{indicator.description}</p>
  </div>
);

// Table component for indicator list
const IndicatorTable = ({ 
  title, 
  icon: Icon, 
  indicators 
}: { 
  title: string; 
  icon: any; 
  indicators: any[];
}) => (
  <div className="bg-okx-bg-secondary border border-okx-border rounded-lg">
    <div className="flex items-center gap-2 px-4 py-3 border-b border-okx-border">
      <Icon size={16} className="text-okx-text-muted" />
      <h3 className="text-white font-medium text-sm">{title}</h3>
    </div>
    <div className="divide-y divide-okx-border">
      {indicators.map((indicator) => (
        <div key={indicator.id} className="flex items-center justify-between px-4 py-3 hover:bg-okx-bg-hover transition-colors">
          <div>
            <div className="text-white text-sm">{indicator.name}</div>
            <div className="text-okx-text-muted text-xs">{indicator.description}</div>
          </div>
          <div className="text-right">
            <div className="text-white font-mono font-medium">
              {indicator.category === 'equity' 
                ? indicator.value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
                : indicator.value.toFixed(indicator.value < 10 ? 2 : 1)
              }
              <span className="text-okx-text-muted text-sm ml-1">{indicator.unit}</span>
            </div>
            <div 
              className="text-xs font-mono"
              style={{ color: getChangeColor(indicator.change) }}
            >
              {indicator.change > 0 ? '+' : ''}{indicator.changePercent.toFixed(2)}%
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const MarketsPage = () => {
  const [selectedRegion, setSelectedRegion] = useState<Region>('us');

  const keyInds = keyIndicators[selectedRegion];
  const otherInds = otherEconomicIndicators[selectedRegion];
  const indices = stockIndices[selectedRegion];
  const events = regionEvents[selectedRegion];
  const region = regions.find(r => r.id === selectedRegion)!;

  return (
    <div>
      {/* Copilot Highlight */}
      <CopilotHighlight
        title="Markets Intelligence"
        summary="US inflation cooling supports risk assets. Fed maintains hawkish stance but markets price in cuts. Asian markets show mixed signals with China PMI below 50. Dollar strength moderates."
        trend="neutral"
        trendLabel="Mixed"
        keyPoints={['CPI Cooling', 'Fed Holds', 'China PMI < 50', 'Dollar Stable']}
      />

      {/* Header */}
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-white">{region.name}</h1>
        <p className="text-okx-text-muted text-xs">Key economic indicators & market data</p>
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
        {keyInds.map((indicator) => (
          <KeyIndicatorCard key={indicator.id} indicator={indicator} />
        ))}
      </div>

      {/* Three Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Other Economic Indicators */}
        <IndicatorTable 
          title="Economic Indicators" 
          icon={Building2} 
          indicators={otherInds}
        />

        {/* Middle: Stock Indices */}
        <IndicatorTable 
          title="Stock Indices" 
          icon={TrendingUp} 
          indicators={indices}
        />

        {/* Right: Commodities */}
        <div className="space-y-4">
          <IndicatorTable 
            title="Commodities" 
            icon={Package} 
            indicators={commodities}
          />

          {/* Upcoming Events */}
          <div className="bg-okx-bg-secondary border border-okx-border rounded-lg">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-okx-border">
              <Calendar size={16} className="text-okx-text-muted" />
              <h3 className="text-white font-medium text-sm">Upcoming Events</h3>
            </div>
            <div className="divide-y divide-okx-border">
              {events.slice(0, 3).map((event) => {
                const impactStyle = impactConfig[event.impact];
                return (
                  <div key={event.id} className="px-4 py-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${impactStyle.bg} ${impactStyle.color} ${impactStyle.border}`}>
                        {event.impact.toUpperCase()}
                      </span>
                      <span className="text-white text-sm">{event.title}</span>
                    </div>
                    <div className="text-okx-text-muted text-xs">
                      {event.date} {event.time} {event.timezone}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
