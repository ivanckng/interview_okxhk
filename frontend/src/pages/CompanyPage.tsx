import { useState, useMemo, useEffect } from 'react';
import type { Exchange, AnnouncementType } from '../types/company';
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

// 固定的中英文翻译
const staticTranslations = {
  en: {
    noAnnouncements: 'No announcements found.',
    bybitSource: 'Bybit: Official API',
    binanceSource: 'Binance: RSS Feed',
    bitgetSource: 'Bitget: API',
    updatedAt: 'Updated',
    top: 'TOP',
    filters: {
      company: 'Company:',
      impact: 'Impact:',
      types: 'Type:',
      all: 'All',
      clearTypes: 'Clear',
    },
    impactLevels: {
      critical: 'Critical',
      high: 'High',
      medium: 'Medium',
      low: 'Low',
    },
  },
  zh: {
    noAnnouncements: '暂无公告。',
    bybitSource: 'Bybit: 官方 API',
    binanceSource: 'Binance: RSS Feed',
    bitgetSource: 'Bitget: API',
    updatedAt: '更新于',
    top: '置顶',
    filters: {
      company: '公司：',
      impact: '影响程度：',
      types: '类型：',
      all: '全部',
      clearTypes: '清除',
    },
    impactLevels: {
      critical: '极高',
      high: '高',
      medium: '中',
      low: '低',
    },
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
  const [bybitAnnouncements, setBybitAnnouncements] = useState<ExchangeAnnouncement[]>([]);
  const [bybitUpdateTime, setBybitUpdateTime] = useState<string>('');
  const [binanceAnnouncements, setBinanceAnnouncements] = useState<ExchangeAnnouncement[]>([]);
  const [binanceUpdateTime, setBinanceUpdateTime] = useState<string>('');
  const [bitgetAnnouncements, setBitgetAnnouncements] = useState<ExchangeAnnouncement[]>([]);
  const [bitgetUpdateTime, setBitgetUpdateTime] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [analyzingAI, setAnalyzingAI] = useState(true);
  const [highlight, setHighlight] = useState<{
    title: string;
    summary: string;
    trend: 'up' | 'down' | 'neutral';
    trendLabel: string;
    keyPoints: string[];
  } | null>(null);
  
  // Filter states
  const [selectedCompany, setSelectedCompany] = useState<Exchange | 'all'>('all');
  const [selectedImpact, setSelectedImpact] = useState<'all' | 'critical' | 'high' | 'medium' | 'low'>('all');
  const [selectedTypes, setSelectedTypes] = useState<AnnouncementType[]>([]);

  const t = staticTranslations[language];

  // Fallback highlight data (only shown when AI analysis fails)
  const fallbackHighlight = {
    title: language === 'zh' ? '交易所情报' : 'Exchange Intelligence',
    summary: language === 'zh' ? '暂无分析数据' : 'No analysis data available',
    trend: 'neutral' as const,
    trendLabel: language === 'zh' ? '暂无数据' : 'N/A',
    keyPoints: [],
  };

  // Fetch AI analysis of competitor data (every 10 minutes)
  useEffect(() => {
    const hasData = bybitAnnouncements.length > 0 || binanceAnnouncements.length > 0 || bitgetAnnouncements.length > 0;

    const fetchAIAnalysis = async () => {
      if (!hasData) {
        setAnalyzingAI(false);
        return;
      }

      // Set analyzing state
      setAnalyzingAI(true);

      try {
        const allData = {
          bybit: bybitAnnouncements.slice(0, 10),
          binance: binanceAnnouncements.slice(0, 10),
          bitget: bitgetAnnouncements.slice(0, 10),
          language: language === 'zh' ? 'zh' : 'en',
        };

        const response = await fetch('http://localhost:8000/api/competitors/analysis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(allData),
        });

        if (!response.ok) {
          setAnalyzingAI(false);
          return;
        }

        const data = await response.json();
        let aiAnalysis = data.ai_analysis;

        // Accept valid AI analysis
        if (aiAnalysis && aiAnalysis.summary && aiAnalysis.summary.length > 10 && aiAnalysis.summary !== '暂无竞对数据进行分析') {
          // For English users, translate using DeepL if content is in Chinese
          if (language === 'en' && !/[a-zA-Z]{3,}/.test(aiAnalysis.summary)) {
            try {
              // Translate summary
              const summaryRes = await fetch('http://localhost:8000/api/translate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: aiAnalysis.summary, target_lang: 'EN' }),
              });
              if (summaryRes.ok) {
                const summaryData = await summaryRes.json();
                aiAnalysis.summary = summaryData.translated_text;
              }

              // Translate trend_label
              if (aiAnalysis.trend_label && !/[a-zA-Z]{3,}/.test(aiAnalysis.trend_label)) {
                const labelRes = await fetch('http://localhost:8000/api/translate', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ text: aiAnalysis.trend_label, target_lang: 'EN' }),
                });
                if (labelRes.ok) {
                  const labelData = await labelRes.json();
                  aiAnalysis.trend_label = labelData.translated_text;
                }
              }

              // Translate key_points
              if (aiAnalysis.key_points && aiAnalysis.key_points.length > 0) {
                const translatedPoints = await Promise.all(
                  aiAnalysis.key_points
                    .filter((point: string) => !/[a-zA-Z]{3,}/.test(point))
                    .map(async (point: string) => {
                      const pointRes = await fetch('http://localhost:8000/api/translate', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ text: point, target_lang: 'EN' }),
                      });
                      if (pointRes.ok) {
                        const pointData = await pointRes.json();
                        return pointData.translated_text;
                      }
                      return point;
                    })
                );
                // Merge translated and non-translated points
                let pointIndex = 0;
                aiAnalysis.key_points = aiAnalysis.key_points.map((point: string) => {
                  if (/[a-zA-Z]{3,}/.test(point)) return point;
                  return translatedPoints[pointIndex++] || point;
                });
              }
            } catch (translateErr) {
              console.error('Failed to translate AI analysis:', translateErr);
              // Continue with original Chinese content
            }
          }

          const highlightData = {
            title: language === 'zh' ? 'AI 竞对分析' : 'AI Competitor Analysis',
            summary: aiAnalysis.summary,
            trend: (aiAnalysis.overall_trend === 'bullish' ? 'up' :
                   aiAnalysis.overall_trend === 'bearish' ? 'down' : 'neutral') as 'up' | 'down' | 'neutral',
            trendLabel: aiAnalysis.trend_label || (language === 'zh' ? '分析完成' : 'Analyzed'),
            keyPoints: aiAnalysis.key_points?.slice(0, 4) || [],
          };
          setHighlight(highlightData);
        } else {
          // AI analysis failed, use fallback
          setHighlight(null);
        }
      } catch (err) {
        console.error('Failed to fetch AI analysis:', err);
        setHighlight(null);
      } finally {
        setAnalyzingAI(false);
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

  // Get all announcements sorted by priority
  const allAnnouncements = useMemo(() => {
    const validTypes: AnnouncementType[] = ['new_listing', 'delisting', 'activity', 'product_update', 'maintenance', 'rule_change', 'market'];

    const normalizeType = (type: string): AnnouncementType => {
      if (validTypes.includes(type as AnnouncementType)) {
        return type as AnnouncementType;
      }
      const typeLower = type.toLowerCase();
      if (typeLower.includes('list') && !typeLower.includes('delist')) return 'new_listing';
      if (typeLower.includes('delist') || typeLower.includes('remov')) return 'delisting';
      if (typeLower.includes('activ') || typeLower.includes('campaign') || typeLower.includes('promo')) return 'activity';
      if (typeLower.includes('product') || typeLower.includes('feature') || typeLower.includes('update')) return 'product_update';
      if (typeLower.includes('mainten') || typeLower.includes('system')) return 'maintenance';
      if (typeLower.includes('rule') || typeLower.includes('fee') || typeLower.includes('policy')) return 'rule_change';
      return 'product_update';
    };

    const bybit = bybitAnnouncements.map(a => ({
      id: a.id,
      exchange: 'bybit' as Exchange,
      type: normalizeType(a.type),
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
      tags: a.tags || [],
    }));

    const binance = binanceAnnouncements.map(a => ({
      id: a.id,
      exchange: 'binance' as Exchange,
      type: normalizeType(a.type),
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
      tags: a.tags || [],
    }));

    const bitget = bitgetAnnouncements.map(a => ({
      id: a.id,
      exchange: 'bitget' as Exchange,
      type: normalizeType(a.type),
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
      tags: a.tags || [],
    }));

    let all = [...bybit, ...binance, ...bitget];

    // Apply filters
    if (selectedCompany !== 'all') {
      all = all.filter(a => a.exchange === selectedCompany);
    }
    if (selectedImpact !== 'all') {
      all = all.filter(a => a.impact_level === selectedImpact);
    }
    if (selectedTypes.length > 0) {
      all = all.filter(a => selectedTypes.includes(a.type));
    }

    // Sort: is_top first, then by priority_score, then by date
    return all.sort((a, b) => {
      if (b.is_top !== a.is_top) {
        return (b.is_top ? 1 : 0) - (a.is_top ? 1 : 0);
      }
      const aScore = a.priority_score || 0;
      const bScore = b.priority_score || 0;
      if (bScore !== aScore) {
        return bScore - aScore;
      }
      return new Date(b.publishTime).getTime() - new Date(a.publishTime).getTime();
    });
  }, [bybitAnnouncements, binanceAnnouncements, bitgetAnnouncements, selectedCompany, selectedImpact, selectedTypes]);

  // All announcement types for the type filter
  const allTypes: AnnouncementType[] = ['new_listing', 'delisting', 'activity', 'product_update', 'maintenance', 'rule_change', 'market'];

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
      {analyzingAI ? (
        <CopilotHighlight
          title={language === 'zh' ? 'AI 竞对分析' : 'AI Competitor Analysis'}
          summary={language === 'zh' ? '正在分析竞对动态...' : 'Analyzing competitor data...'}
          trend="neutral"
          trendLabel={language === 'zh' ? '分析中' : 'Analyzing'}
          keyPoints={[]}
        />
      ) : (
        <CopilotHighlight
          {...(highlight || fallbackHighlight)}
        />
      )}

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

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-6 pb-4 border-b border-okx-border">
        {/* Company Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-okx-text-muted">{t.filters.company}</span>
          <button
            onClick={() => setSelectedCompany('all')}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
              selectedCompany === 'all'
                ? 'bg-okx-accent text-black'
                : 'bg-okx-bg-secondary text-okx-text-secondary border border-okx-border hover:text-white'
            }`}
          >
            {t.filters.all}
          </button>
          {exchanges.map((exchange) => (
            <button
              key={exchange.id}
              onClick={() => setSelectedCompany(exchange.id)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                selectedCompany === exchange.id
                  ? 'text-black'
                  : 'bg-okx-bg-secondary text-okx-text-secondary border border-okx-border hover:text-white'
              }`}
              style={selectedCompany === exchange.id ? { backgroundColor: exchange.color } : {}}
            >
              {exchange.name}
            </button>
          ))}
        </div>

        {/* Impact Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-okx-text-muted">{t.filters.impact}</span>
          <button
            onClick={() => setSelectedImpact('all')}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
              selectedImpact === 'all'
                ? 'bg-okx-accent text-black'
                : 'bg-okx-bg-secondary text-okx-text-secondary border border-okx-border hover:text-white'
            }`}
          >
            {t.filters.all}
          </button>
          {(['critical', 'high', 'medium', 'low'] as const).map((impact) => (
            <button
              key={impact}
              onClick={() => setSelectedImpact(impact)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                selectedImpact === impact
                  ? impactConfig[language]?.[impact]?.bg + ' ' + impactConfig[language]?.[impact]?.color
                  : 'bg-okx-bg-secondary text-okx-text-secondary border border-okx-border hover:text-white'
              }`}
            >
              {t.impactLevels[impact]}
            </button>
          ))}
        </div>

        {/* Types Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-okx-text-muted">{t.filters.types}</span>
          {selectedTypes.length > 0 && (
            <button
              onClick={() => setSelectedTypes([])}
              className="px-2 py-1 text-xs text-okx-text-muted hover:text-white transition-colors"
            >
              {t.filters.clearTypes}
            </button>
          )}
          <div className="flex flex-wrap gap-1">
            {allTypes.map((type) => {
              const isSelected = selectedTypes.includes(type);
              return (
                <button
                  key={type}
                  onClick={() => {
                    setSelectedTypes(prev =>
                      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
                    );
                  }}
                  className={`px-2 py-1 rounded text-xs transition-all ${
                    isSelected
                      ? 'bg-okx-accent text-black'
                      : 'bg-okx-bg-secondary text-okx-text-muted border border-okx-border hover:text-white'
                  }`}
                >
                  {getAnnouncementTypeLabel(type, language)}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* List */}
      <div className="space-y-3">
        {allAnnouncements.map((announcement, index) => {
          const exchange = exchanges.find(e => e.id === announcement.exchange)!;
          const impactLevel = announcement.impact_level || 'medium';
          const impactStyle = impactConfig[language]?.[impactLevel] || impactConfig[language]?.['medium'];

          // Use AI-analyzed Chinese title if available
          const displayTitle = language === 'zh' && announcement.title_zh
            ? announcement.title_zh
            : announcement.title;

          return (
            <div
              key={`${announcement.exchange}-${announcement.id}-${announcement.publishTime}-${index}`}
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

        {allAnnouncements.length === 0 && (
          <div className="text-center py-12 text-okx-text-secondary">
            {t.noAnnouncements}
          </div>
        )}
      </div>
    </div>
  );
};
