import { useState, useMemo } from 'react';
import type { Exchange, AnnouncementType } from '../types/company';
import { CopilotHighlight } from '../components/CopilotHighlight';
import { 
  exchanges, 
  getSortedAnnouncements, 
  getAnnouncementsByExchange,
  getAnnouncementTypeLabel,
  getAnnouncementTypeColor,
  formatRelativeTime 
} from '../data/companyData';
import { 
  ExternalLink, 
} from 'lucide-react';

const importanceConfig = {
  high: { color: 'text-okx-down', bg: 'bg-okx-down/10' },
  medium: { color: 'text-okx-warning', bg: 'bg-okx-warning/10' },
  low: { color: 'text-okx-text-muted', bg: 'bg-okx-text-muted/10' },
};

const announcementTypes: AnnouncementType[] = ['new_listing', 'delisting', 'activity', 'product_update', 'maintenance', 'rule_change'];

export const CompanyPage = () => {
  const [selectedExchange, setSelectedExchange] = useState<Exchange | 'all'>('all');
  const [selectedType, setSelectedType] = useState<AnnouncementType | 'all'>('all');

  const filteredAnnouncements = useMemo(() => {
    let filtered = selectedExchange === 'all' 
      ? getSortedAnnouncements() 
      : getAnnouncementsByExchange(selectedExchange);

    if (selectedType !== 'all') {
      filtered = filtered.filter(a => a.type === selectedType);
    }

    return filtered;
  }, [selectedExchange, selectedType]);

  return (
    <div>
      {/* Copilot Highlight */}
      <CopilotHighlight
        title="Exchange Intelligence"
        summary="Binance leads with aggressive new listings and Launchpool rewards. ByBit focuses on derivatives innovation with Copy Trading 2.0. Bitget expands Launchpad offerings. Competition intensifies for retail users."
        trend="up"
        trendLabel="Active"
        keyPoints={['New Listings', 'Zero-Fee Promo', 'Copy Trading 2.0', 'Launchpad Wars']}
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {exchanges.map((exchange) => {
          const count = getAnnouncementsByExchange(exchange.id).length;
          return (
            <div key={exchange.id} className="bg-okx-bg-secondary border border-okx-border rounded p-3">
              <div className="flex items-center gap-2 mb-2">
                <div 
                  className="w-6 h-6 rounded text-white text-xs font-bold flex items-center justify-center"
                  style={{ backgroundColor: exchange.color }}
                >
                  {exchange.logo}
                </div>
                <span className="text-okx-text-muted text-xs">{exchange.name}</span>
              </div>
              <p className="text-xl font-bold text-white font-mono">{count}</p>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4 pb-4 border-b border-okx-border">
        <span className="text-sm text-okx-text-muted mr-2">Exchange:</span>
        <button
          onClick={() => setSelectedExchange('all')}
          className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
            selectedExchange === 'all'
              ? 'bg-okx-accent text-black'
              : 'bg-okx-bg-secondary text-okx-text-secondary border border-okx-border hover:text-white'
          }`}
        >
          All
        </button>
        {exchanges.map((exchange) => (
          <button
            key={exchange.id}
            onClick={() => setSelectedExchange(exchange.id)}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
              selectedExchange === exchange.id
                ? 'text-black'
                : 'bg-okx-bg-secondary text-okx-text-secondary border border-okx-border hover:text-white'
            }`}
            style={selectedExchange === exchange.id ? { backgroundColor: exchange.color } : {}}
          >
            {exchange.name}
          </button>
        ))}
      </div>

      {/* Type Filter */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <span className="text-sm text-okx-text-muted mr-2">Type:</span>
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value as AnnouncementType | 'all')}
          className="bg-okx-bg-secondary border border-okx-border rounded px-3 py-1.5 text-white text-xs focus:outline-none focus:border-okx-accent"
        >
          <option value="all">All Types</option>
          {announcementTypes.map((type) => (
            <option key={type} value={type}>
              {getAnnouncementTypeLabel(type)}
            </option>
          ))}
        </select>
      </div>

      {/* List */}
      <div className="space-y-3">
        {filteredAnnouncements.map((announcement) => {
          const exchange = exchanges.find(e => e.id === announcement.exchange)!;
          const importanceStyle = importanceConfig[announcement.importance];

          return (
            <div
              key={announcement.id}
              className="bg-okx-bg-secondary border border-okx-border rounded-lg p-4 hover:border-okx-border-light transition-all"
            >
              <div className="flex items-start gap-3">
                <div 
                  className="w-8 h-8 rounded flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  style={{ backgroundColor: exchange.color }}
                >
                  {exchange.logo}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span 
                      className="text-xs px-2 py-0.5 rounded"
                      style={{ 
                        backgroundColor: getAnnouncementTypeColor(announcement.type) + '20',
                        color: getAnnouncementTypeColor(announcement.type)
                      }}
                    >
                      {getAnnouncementTypeLabel(announcement.type)}
                    </span>
                    
                    <span className={`text-xs px-2 py-0.5 rounded ${importanceStyle.bg} ${importanceStyle.color}`}>
                      {announcement.importance.toUpperCase()}
                    </span>

                    <span className="text-okx-text-muted text-xs">
                      {formatRelativeTime(announcement.publishTime)}
                    </span>
                  </div>

                  <h3 className="text-white text-sm font-medium mb-1">{announcement.title}</h3>
                  
                  {announcement.description && (
                    <p className="text-okx-text-secondary text-xs mb-2">{announcement.description}</p>
                  )}

                  <a
                    href={announcement.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-okx-accent text-xs hover:underline inline-flex items-center gap-1"
                  >
                    {exchange.name}
                    <ExternalLink size={10} />
                  </a>
                </div>
              </div>
            </div>
          );
        })}

        {filteredAnnouncements.length === 0 && (
          <div className="text-center py-12 text-okx-text-secondary">
            No announcements found
          </div>
        )}
      </div>
    </div>
  );
};
