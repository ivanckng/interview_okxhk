import { useState, useMemo, useEffect } from 'react';
import type { Exchange, AnnouncementType, Announcement } from '../types/company';
import { CopilotHighlight } from '../components/CopilotHighlight';
import { useLanguage } from '../contexts/LanguageContext';

import {
  exchanges,
  getAnnouncementTypeLabel,
  getAnnouncementTypeColor,
  formatRelativeTime
} from '../data/companyData';
import {
  ExternalLink,
  Loader2,
} from 'lucide-react';

// 影响程度配置（AI分析结果）
const impactConfig = {
  en: {
    critical: { color: 'text-red-400', bg: 'bg-red-500/10', label: 'Critical' },
    high: { color: 'text-orange-400', bg: 'bg-orange-500/10', label: 'High' },
    medium: { color: 'text-yellow-400', bg: 'bg-yellow-500/10', label: 'Medium' },
    low: { color: 'text-gray-400', bg: 'bg-gray-500/10', label: 'Low' },
  },
  zh: {
    critical: { color: 'text-red-400', bg: 'bg-red-500/10', label: '极高' },
    high: { color: 'text-orange-400', bg: 'bg-orange-500/10', label: '高' },
    medium: { color: 'text-yellow-400', bg: 'bg-yellow-500/10', label: '中' },
    low: { color: 'text-gray-400', bg: 'bg-gray-500/10', label: '低' },
  },
};

const announcementTypes: AnnouncementType[] = ['new_listing', 'delisting', 'activity', 'product_update', 'maintenance', 'rule_change'];

// 固定的中英文翻译
const staticTranslations = {
  en: {
    exchangeFilter: 'Exchange:',
    allExchanges: 'All',
    typeFilter: 'Type:',
    allTypes: 'All',
    noAnnouncements: 'No announcements found for the selected filters.',
    copilotTitle: 'Exchange Intelligence',
    copilotSummary: "Binance leads with aggressive new listings and Launchpool rewards. ByBit focuses on derivatives innovation with Copy Trading 2.0. Bitget expands Launchpad offerings. Competition intensifies for retail users.",
    copilotTrendLabel: 'Active',
    copilotKeyPoints: ['New Listings', 'Zero-Fee Promo', 'Copy Trading 2.0', 'Launchpad Wars'],
    bybitSource: 'Bybit: Official API',
    binanceSource: 'Binance: RSS Feed',
    bitgetSource: 'Bitget: API',
    updatedAt: 'Updated',
    top: 'TOP',
  },
  zh: {
    exchangeFilter: '交易所：',
    allExchanges: '全部',
    typeFilter: '类型：',
    allTypes: '全部',
    noAnnouncements: '暂无符合筛选条件的公告。',
    copilotTitle: '交易所情报',
    copilotSummary: '币安以激进的新币上线和 Launchpool 奖励领先。ByBit 专注于衍生品创新，推出 Copy Trading 2.0。Bitget 扩展 Launchpad 产品。零售用户竞争加剧。',
    copilotTrendLabel: '活跃',
    copilotKeyPoints: ['新币上线', '零手续费促销', '跟单交易 2.0', 'Launchpad 竞争'],
    bybitSource: 'Bybit: 官方API',
    binanceSource: 'Binance: RSS Feed',
    bitgetSource: 'Bitget: API',
    updatedAt: '更新于',
    top: '置顶',
  },
};

interface ExchangeAnnouncement {
  id: string;
  title: string;
  title_zh?: string;
  description?: string;
  summary_zh?: string;
  type: AnnouncementType;
  url: string;
  publish_time: string;
  importance?: 'high' | 'medium' | 'low';
  impact_level?: 'critical' | 'high' | 'medium' | 'low';
  exchange: string;
  is_top?: boolean;
  priority_score?: number;
  okx_action?: string;
  tags?: string[];
}

export const CompanyPage = () => {
  const { language } = useLanguage();
  const [selectedExchange, setSelectedExchange] = useState<Exchange | 'all'>('all');
  const [selectedType, setSelectedType] = useState<AnnouncementType | 'all'>('all');
  const [bybitAnnouncements, setBybitAnnouncements] = useState<ExchangeAnnouncement[]>([]);
  const [bybitUpdateTime, setBybitUpdateTime] = useState<string>('');
  const [binanceAnnouncements, setBinanceAnnouncements] = useState<ExchangeAnnouncement[]>([]);
  const [binanceUpdateTime, setBinanceUpdateTime] = useState<string>('');
  const [bitgetAnnouncements, setBitgetAnnouncements] = useState<ExchangeAnnouncement[]>([]);
  const [bitgetUpdateTime, setBitgetUpdateTime] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [highlight, setHighlight] = useState<{
    title: string;
    summary: string;
    trend: 'up' | 'down' | 'neutral';
    trendLabel: string;
    keyPoints: string[];
  } | null>(null);

  const t = staticTranslations[language];
  
  // Fallback highlight data
  const fallbackHighlight = {
    title: t.copilotTitle,
    summary: t.copilotSummary,
    trend: 'up' as const,
    trendLabel: t.copilotTrendLabel,
    keyPoints: t.copilotKeyPoints,
  };

  // Fetch AI analysis of competitor data (every 10 minutes)
  useEffect(() => {
    const hasData = bybitAnnouncements.length > 0 || binanceAnnouncements.length > 0 || bitgetAnnouncements.length > 0;
    
    const fetchAIAnalysis = async () => {
      if (!hasData) return;
      
      try {
        const allData = {
          bybit: bybitAnnouncements.slice(0, 10),
          binance: binanceAnnouncements.slice(0, 10),
          bitget: bitgetAnnouncements.slice(0, 10),
        };
        
        const response = await fetch('http://localhost:8000/api/competitors/analysis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(allData),
        });
        
        if (!response.ok) return;
        
        const data = await response.json();
        const aiAnalysis = data.ai_analysis;
        
        // Accept valid AI analysis (including fallback summary)
        if (aiAnalysis && aiAnalysis.summary && aiAnalysis.summary.length > 10) {
          const highlightData = {
            title: language === 'zh' ? 'AI 竞对分析' : 'AI Competitor Analysis',
            summary: aiAnalysis.summary,
            trend: (aiAnalysis.overall_trend === 'bullish' ? 'up' : 
                   aiAnalysis.overall_trend === 'bearish' ? 'down' : 'neutral') as 'up' | 'down' | 'neutral',
            trendLabel: aiAnalysis.trend_label || (language === 'zh' ? '分析完成' : 'Analyzed'),
            keyPoints: aiAnalysis.key_points?.slice(0, 4) || [],
          };
          setHighlight(highlightData);
        }
      } catch (err) {
        // Keep fallback on error
      }
    };
    
    // Initial fetch with delay to ensure data is loaded
    const timeoutId = setTimeout(fetchAIAnalysis, 2000);
    
    // Refresh every 10 minutes
    const interval = setInterval(fetchAIAnalysis, 600000);
    return () => {
      clearTimeout(timeoutId);
      clearInterval(interval);
    };
  }, [language, bybitAnnouncements, binanceAnnouncements, bitgetAnnouncements]);

  // Fetch Bybit and Binance real announcements
  useEffect(() => {
    const fetchBybitData = async () => {
      try {
        let locale = language === 'zh' ? 'zh-CN' : 'en-US';
        let response = await fetch(`http://localhost:8000/api/exchanges/bybit/announcements?locale=${locale}&limit=20`);
        let data = await response.json();
        
        // If zh-CN returns empty, fallback to en-US
        if ((!data.announcements || data.announcements.length === 0) && locale === 'zh-CN') {
          response = await fetch(`http://localhost:8000/api/exchanges/bybit/announcements?locale=en-US&limit=20`);
          data = await response.json();
        }
        
        if (data.announcements) {
          setBybitAnnouncements(data.announcements);
          setBybitUpdateTime(data.last_updated);
        }
      } catch (err) {
        console.error('Failed to fetch Bybit announcements:', err);
      }
    };

    const fetchBinanceData = async () => {
      try {
        const response = await fetch(`http://localhost:8000/api/exchanges/binance/announcements?limit=20`);
        const data = await response.json();
        
        if (data.announcements) {
          setBinanceAnnouncements(data.announcements);
          setBinanceUpdateTime(data.last_updated);
        }
      } catch (err) {
        console.error('Failed to fetch Binance announcements:', err);
      }
    };

    const fetchBitgetData = async () => {
      try {
        let lang = language === 'zh' ? 'zh_CN' : 'en_US';
        const response = await fetch(`http://localhost:8000/api/exchanges/bitget/announcements?language=${lang}&limit=10`);
        const data = await response.json();
        
        if (data.announcements) {
          setBitgetAnnouncements(data.announcements);
          setBitgetUpdateTime(data.last_updated);
        }
      } catch (err) {
        console.error('Failed to fetch Bitget announcements:', err);
      }
    };

    // Fetch all data independently (don't block UI on single failure)
    const loadAll = () => {
      setLoading(true);
      Promise.all([
        fetchBybitData(),
        fetchBinanceData(),
        fetchBitgetData()
      ]).finally(() => {
        setLoading(false);
      });
    };
    
    loadAll();
    
    // Refresh every 10 minutes
    const interval = setInterval(loadAll, 600000);
    return () => clearInterval(interval);
  }, [language]);

  // Transform all announcements into unified format
  const allAnnouncements: Announcement[] = useMemo(() => {
    const bybit = bybitAnnouncements.map(a => ({
      id: a.id,
      exchange: 'bybit' as Exchange,
      type: a.type,
      title: a.title,
      description: a.description,
      url: a.url,
      publishTime: a.publish_time,
      importance: a.importance || 'medium',
      impact_level: a.impact_level,
      title_zh: a.title_zh,
      summary_zh: a.summary_zh,
      isReal: true,
      is_top: a.is_top,
      priority_score: a.priority_score,
    }));
    
    const binance = binanceAnnouncements.map(a => ({
      id: a.id,
      exchange: 'binance' as Exchange,
      type: a.type,
      title: a.title,
      description: a.description,
      url: a.url,
      publishTime: a.publish_time,
      importance: a.importance || 'medium',
      impact_level: a.impact_level,
      title_zh: a.title_zh,
      summary_zh: a.summary_zh,
      isReal: true,
      is_top: a.is_top,
      priority_score: a.priority_score,
    }));
    
    const bitget = bitgetAnnouncements.map(a => ({
      id: a.id,
      exchange: 'bitget' as Exchange,
      type: a.type,
      title: a.title,
      description: a.description,
      url: a.url,
      publishTime: a.publish_time,
      importance: a.importance || 'medium',
      impact_level: a.impact_level,
      title_zh: a.title_zh,
      summary_zh: a.summary_zh,
      isReal: true,
      is_top: a.is_top,
      priority_score: a.priority_score,
    }));
    
    return [...bybit, ...binance, ...bitget];
  }, [bybitAnnouncements, binanceAnnouncements, bitgetAnnouncements]);

  // Filter and sort announcements
  const filteredAnnouncements = useMemo(() => {
    // Filter
    let result = allAnnouncements.filter(a => {
      if (selectedExchange !== 'all' && a.exchange !== selectedExchange) return false;
      if (selectedType !== 'all' && a.type !== selectedType) return false;
      return true;
    });

    // Sort: TOP first, then by priority_score, then by date
    return [...result].sort((a, b) => {
      if (b.is_top !== a.is_top) return (b.is_top ? 1 : 0) - (a.is_top ? 1 : 0);
      if ((b.priority_score || 0) !== (a.priority_score || 0)) {
        return (b.priority_score || 0) - (a.priority_score || 0);
      }
      return new Date(b.publishTime).getTime() - new Date(a.publishTime).getTime();
    });
  }, [selectedExchange, selectedType, allAnnouncements]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* Copilot Highlight */}
      <CopilotHighlight
        {...(highlight || fallbackHighlight)}
      />

      {/* Data Source Info */}
      <div className="flex items-center justify-between mb-4 text-xs text-okx-text-muted flex-wrap gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
            {t.binanceSource}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            {t.bybitSource}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            {t.bitgetSource}
          </span>
        </div>
        {(bybitUpdateTime || binanceUpdateTime || bitgetUpdateTime) && (
          <span>{t.updatedAt}: {bybitUpdateTime || binanceUpdateTime || bitgetUpdateTime}</span>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {exchanges.map((exchange) => {
          // Always show total count for each exchange (represents data availability)
          const count = allAnnouncements.filter(a => a.exchange === exchange.id).length;
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
        <span className="text-sm text-okx-text-muted mr-2">{t.exchangeFilter}</span>
        <button
          onClick={() => setSelectedExchange('all')}
          className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
            selectedExchange === 'all'
              ? 'bg-okx-accent text-black'
              : 'bg-okx-bg-secondary text-okx-text-secondary border border-okx-border hover:text-white'
          }`}
        >
          {t.allExchanges}
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
        <span className="text-sm text-okx-text-muted mr-2">{t.typeFilter}</span>
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value as AnnouncementType | 'all')}
          className="bg-okx-bg-secondary border border-okx-border rounded px-3 py-1.5 text-white text-xs focus:outline-none focus:border-okx-accent"
        >
          <option value="all">{t.allTypes}</option>
          {announcementTypes.map((type) => (
            <option key={type} value={type}>
              {getAnnouncementTypeLabel(type, language)}
            </option>
          ))}
        </select>
      </div>

      {/* List - debug: rendering {filteredAnnouncements.length} items */}
      <div className="space-y-3">
        {filteredAnnouncements.map((announcement) => {
          const exchange = exchanges.find(e => e.id === announcement.exchange)!;
          const impactLevel = announcement.impact_level || 'medium';
          const impactStyle = impactConfig[language]?.[impactLevel] || impactConfig[language]?.['medium'];
          
          // Use AI-analyzed Chinese title/summary if available
          const displayTitle = language === 'zh' && announcement.title_zh 
            ? announcement.title_zh 
            : announcement.title;
          const displaySummary = language === 'zh' && announcement.summary_zh
            ? announcement.summary_zh
            : announcement.description;

          return (
            <div
              key={`${announcement.exchange}-${announcement.id}-${announcement.publishTime}`}
              className={`bg-okx-bg-secondary border rounded-lg p-4 hover:border-okx-border-light transition-all ${
                announcement.is_top ? 'border-red-500/30' : 'border-okx-border'
              }`}
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
                    {/* Type tag */}
                    {announcement.type && (
                      <span
                        className="text-xs px-2 py-0.5 rounded"
                        style={{
                          backgroundColor: getAnnouncementTypeColor(announcement.type) + '20',
                          color: getAnnouncementTypeColor(announcement.type)
                        }}
                      >
                        {getAnnouncementTypeLabel(announcement.type, language)}
                      </span>
                    )}

                    {/* Impact level tag (AI analyzed) */}
                    {announcement.impact_level && (
                      <span className={`text-xs px-2 py-0.5 rounded ${impactStyle.bg} ${impactStyle.color}`}>
                        {impactStyle.label}
                      </span>
                    )}

                    {/* TOP priority indicator */}
                    {announcement.is_top && (
                      <span className="text-xs px-2 py-0.5 rounded bg-red-500/10 text-red-400 font-medium">
                        {t.top}
                      </span>
                    )}

                    <span className="text-okx-text-muted text-xs">
                      {formatRelativeTime(announcement.publishTime)}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-white text-sm font-medium mb-1">{displayTitle}</h3>

                  {/* AI Summary */}
                  {displaySummary && (
                    <p className="text-okx-text-secondary text-xs mb-2">{displaySummary}</p>
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
            {t.noAnnouncements}
          </div>
        )}
      </div>
    </div>
  );
};
