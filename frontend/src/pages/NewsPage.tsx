import { useState, useEffect, useMemo } from 'react';
import type { NewsCategory, NewsPriority } from '../types/news';
import {
  newsCategoryColors
} from '../types/news';
import {
  ExternalLink,
  Loader2
} from 'lucide-react';
import { CopilotHighlight } from '../components/CopilotHighlight';
import { api, formatRelativeTime } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
import { translateHighlightSummary } from '../services/apiTranslation';
import { useCachedAPI } from '../hooks/useCachedAPI';
import * as cacheService from '../services/cache';
import type { ProcessedNews, HighlightSummary } from '../services/api';

const priorityConfig = {
  high: { color: 'text-red-400', bg: 'bg-red-500/10' },
  medium: { color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  low: { color: 'text-gray-400', bg: 'bg-gray-500/10' },
};

// Helper to clean HTML tags, separators and deduplicate bilingual text
const cleanHtml = (text: string): string => {
  if (!text) return '';
  
  // First, replace <br/> with newline to help split
  let cleaned = text.replace(/<br\s*\/?>/gi, '\n');
  
  // Remove HTML tags
  cleaned = cleaned.replace(/<[^>]+>/g, '');
  
  // Split by common separators used in bilingual content
  // BWENEWS uses patterns like: English content<br/>方程式新闻: Chinese content
  const parts = cleaned.split(/\n/).map(p => p.trim()).filter(p => p.length > 0);
  
  // Find the main content (usually first meaningful line)
  // Skip lines that are just separators, URLs, or dates
  let mainContent = '';
  for (const part of parts) {
    // Skip separator lines
    if (/^[\-—\s]+$/.test(part)) continue;
    // Skip date-only lines (YYYY-MM-DD format)
    if (/^\d{4}-\d{2}-\d{2}/.test(part)) continue;
    // Skip URL-only lines
    if (/^https?:\/\//.test(part)) continue;
    // Skip empty promotional lines
    if (part.includes('订阅我们的') && part.length < 50) continue;
    if (part.includes('Subscribe to our') && part.length < 50) continue;
    
    // This looks like the main content
    if (part.length > mainContent.length) {
      mainContent = part;
    }
  }
  
  // If no main content found, use first non-empty line
  if (!mainContent && parts.length > 0) {
    mainContent = parts[0];
  }
  
  // Clean up remaining issues
  return mainContent
    .replace(/-{10,}/g, '')  // Remove long dashes
    .replace(/\s+/g, ' ')    // Normalize whitespace
    .trim();
};

const categories: NewsCategory[] = ['regulation', 'technology', 'market', 'security', 'adoption', 'defi', 'nft'];

export const NewsPage = () => {
  const { language } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState<NewsCategory | 'all'>('all');
  const [selectedPriority] = useState<NewsPriority | 'all'>('all');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(true);
  const [highlight, setHighlight] = useState<HighlightSummary | null>(null);

  // 使用緩存 API Hook
  const {
    data: cachedNews,
    loading: newsLoading,
    refresh: refreshNews,
  } = useCachedAPI<ProcessedNews[]>({
    module: 'news',
    fetcher: async () => {
      const data = await api.getNews({ limit: 50 });
      return data;
    },
    onDataUpdate: () => setLastUpdated(new Date()),
  });

  // 合併狀態
  const loading = newsLoading;
  const news = cachedNews || [];

  useEffect(() => {
    if (!newsLoading && cachedNews && cachedNews.length === 0) {
      console.log('[NewsPage] Empty cached news detected, forcing refresh');
      refreshNews();
    }
  }, [newsLoading, cachedNews, refreshNews]);

  // ==================== 新闻数据 - 每 5 分钟自动刷新 ====================
  useEffect(() => {
    // 首次加载后，设置定时刷新
    const interval = setInterval(() => {
      console.log('[NewsPage] Auto-refreshing news data...');
      refreshNews();
    }, 300000); // 5 分钟

    return () => clearInterval(interval);
  }, [refreshNews]);

  // 初始化時從緩存讀取 highlight
  useEffect(() => {
    const cached = cacheService.getCache<HighlightSummary>('newsHighlight');
    if (cached) {
      setHighlight(cached);
    }
  }, []);

  // ==================== AI 分析 - 10 分钟定时刷新 + 可见性刷新 ====================
  useEffect(() => {
    const fetchAIAnalysis = async (forceRefresh = false) => {
      // 使用 cachedNews 而不是 news
      if (!cachedNews || cachedNews.length === 0) return;

      // 检查前端缓存 (10 分钟)，强制刷新时跳过
      if (!forceRefresh) {
        const cached = cacheService.getCache<HighlightSummary>('newsHighlight');
        const cachedAt = cacheService.getCacheTimestamp('newsHighlight');
        const now = Date.now();
        const isExpired = !cachedAt || (now - cachedAt) > 600000; // 10 分钟

        if (cached && !isExpired) {
          setHighlight(cached);
          setAnalysisLoading(false);
          console.log('[NewsPage] Using cached AI analysis');
          return;
        }
      }

      setAnalysisLoading(true);
      try {
        console.log('[News AI] Fetching analysis with', cachedNews.length, 'news items, language:', language);

        const response = await fetch('http://localhost:8000/api/news/analysis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ news: cachedNews }),
        });
        const data = await response.json();

        const aiAnalysis = data.ai_analysis;
        console.log('[News AI] Raw AI analysis:', aiAnalysis?.market_pulse?.substring(0, 50) + '...');

        if (aiAnalysis && !aiAnalysis.error) {
          // Convert AI analysis to highlight format
          const highlightData = {
            title: '智能行业专家分析',
            summary: aiAnalysis.market_pulse || 'Analyzing news data...',
            trend: aiAnalysis.overall_sentiment || 'neutral',
            highlights: aiAnalysis.action_items?.slice(0, 3) || aiAnalysis.key_insights?.slice(0, 3) || [],
            generated_at: new Date().toISOString(),
          };

          // Translate if Chinese and save to cache
          if (language === 'zh' && highlightData.summary) {
            console.log('[News AI] Translating to Chinese...');
            const translated = await translateHighlightSummary(highlightData, 'zh');
            console.log('[News AI] Translated summary:', translated.summary?.substring(0, 50) + '...');
            // Save to cache and update state
            cacheService.setCache('newsHighlight', translated, 600); // 10 分钟
            setHighlight(translated);
          } else {
            cacheService.setCache('newsHighlight', highlightData, 600);
            setHighlight(highlightData);
          }
        }
      } catch (err) {
        console.error('Failed to fetch AI news analysis:', err);
        // 使用缓存作为 fallback
        const cached = cacheService.getCache<HighlightSummary>('newsHighlight');
        if (cached) {
          setHighlight(cached);
        }
      } finally {
        setAnalysisLoading(false);
      }
    };

    // 首次加载
    fetchAIAnalysis();

    // 定时刷新：每 10 分钟
    const interval = setInterval(() => fetchAIAnalysis(false), 600000);

    // 页面可见性检测：切回标签页时检查缓存，过期才刷新
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[NewsPage] Page visible, checking cache for AI analysis');
        fetchAIAnalysis(false); // 优先走缓存，缓存过期才请求 API
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [cachedNews, language]);

  // 类别标签中英文映射
  const categoryLabelMap: Record<NewsCategory, string> = {
    regulation: language === 'zh' ? '监管' : 'Regulation',
    technology: language === 'zh' ? '技术' : 'Technology',
    market: language === 'zh' ? '市场' : 'Market',
    security: language === 'zh' ? '安全' : 'Security',
    adoption: language === 'zh' ? '采用' : 'Adoption',
    defi: language === 'zh' ? 'DeFi' : 'DeFi',
    nft: language === 'zh' ? 'NFT' : 'NFT',
  };

  const filteredNews = useMemo(() => {
    let filtered = [...news];

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(n => n.category === selectedCategory);
    }

    if (selectedPriority !== 'all') {
      filtered = filtered.filter(n => n.priority === selectedPriority);
    }

    return filtered;
  }, [news, selectedCategory, selectedPriority]);

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
                <span className="text-okx-text-muted text-xs">
                  {language === 'zh' ? '智能行业专家分析中...' : 'Smart Industry Expert Analyzing...'}
                </span>
              </div>
              <p className="text-okx-text-secondary text-sm">
                {language === 'zh' ? '正在分析行业新闻数据，请稍候...' : 'Analyzing industry news, please wait...'}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {/* Source Info */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-xs text-okx-text-muted">
            <span>{language === 'zh' ? '来源: BWEnews' : 'Source: BWEnews'}</span>
            {lastUpdated && (
              <>
                <span>•</span>
                <span>{language === 'zh' ? '更新于: ' : 'Updated: '}{formatRelativeTime(lastUpdated.toISOString())}</span>
              </>
            )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4 pb-4 border-b border-okx-border">
        <span className="text-sm text-okx-text-muted mr-2">Filter:</span>
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
            selectedCategory === 'all'
              ? 'bg-white text-black'
              : 'bg-okx-bg-secondary text-okx-text-secondary hover:text-white border border-okx-border'
          }`}
        >
          All
        </button>
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
              selectedCategory === category
                ? 'text-black'
                : 'bg-okx-bg-secondary text-okx-text-secondary hover:text-white border border-okx-border'
            }`}
            style={selectedCategory === category ? {
              backgroundColor: newsCategoryColors[category]
            } : {}}
          >
            {categoryLabelMap[category]}
          </button>
        ))}
      </div>

      {/* News List */}
      <div className="space-y-3">
        {filteredNews.length === 0 ? (
          <div className="text-center py-12 text-okx-text-muted">
            {language === 'zh' ? '暂无符合筛选条件的新闻' : 'No news found for the selected filters.'}
          </div>
        ) : (
          filteredNews.map((news) => {
            const priorityStyle = priorityConfig[news.priority as keyof typeof priorityConfig] || priorityConfig.low;

            return (
              <div
                key={news.id}
                className="bg-okx-bg-secondary border border-okx-border rounded-lg p-4 hover:border-okx-border-light transition-all"
              >
                <div className="flex items-start gap-4">
                  <div
                    className="w-10 h-10 rounded flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: newsCategoryColors[news.category as NewsCategory] + '15' }}
                  >
                    <span
                      className="text-sm font-bold"
                      style={{ color: newsCategoryColors[news.category as NewsCategory] }}
                    >
                      {categoryLabelMap[news.category as NewsCategory]?.[0] || '?'}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span
                        className="text-xs px-2 py-0.5 rounded"
                        style={{
                          backgroundColor: newsCategoryColors[news.category as NewsCategory] + '20',
                          color: newsCategoryColors[news.category as NewsCategory]
                        }}
                      >
                        {categoryLabelMap[news.category as NewsCategory]}
                      </span>
                      
                      <span className={`text-xs px-2 py-0.5 rounded ${priorityStyle.bg} ${priorityStyle.color}`}>
                        {news.priority.toUpperCase()}
                      </span>

                      {news.hot_score >= 80 && (
                        <span className="text-xs px-2 py-0.5 rounded bg-yellow-500/10 text-yellow-400">
                          HOT
                        </span>
                      )}

                      {news.sentiment && (
                        <span className={`text-xs ${
                          news.sentiment === 'positive' ? 'text-green-400' : 
                          news.sentiment === 'negative' ? 'text-red-400' : 'text-gray-400'
                        }`}>
                          {news.sentiment}
                        </span>
                      )}

                      <span className="text-okx-text-muted text-xs">
                        {formatRelativeTime(news.publish_time)}
                      </span>
                    </div>

                    <h3 className="text-white font-medium mb-1">{cleanHtml(news.title)}</h3>
                    <p className="text-okx-text-secondary text-sm mb-3">{news.summary}</p>

                    {news.tags.length > 0 && (
                      <div className="flex items-center gap-2 mb-3">
                        {news.tags.slice(0, 4).map((tag) => (
                          <span key={tag} className="text-xs text-okx-text-muted bg-okx-bg rounded px-2 py-0.5">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-okx-text-muted text-xs">{news.source}</span>
                      {news.source_url && (
                        <a
                          href={news.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-white text-xs hover:underline flex items-center gap-1"
                        >
                          Read more
                          <ExternalLink size={12} />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
