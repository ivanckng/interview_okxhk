import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { NewsCategory, NewsPriority } from '../types/news';
import {
  newsCategoryColors
} from '../types/news';
import {
  ExternalLink,
  Flame,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { CopilotHighlight } from '../components/CopilotHighlight';
import { api, formatRelativeTime } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
import { translateProcessedNews, translateHighlightSummary } from '../services/apiTranslation';
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
  const [news, setNews] = useState<ProcessedNews[]>([]);
  const [trending, setTrending] = useState<ProcessedNews[]>([]);
  const [highlight, setHighlight] = useState<HighlightSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const initialLoaded = useRef(false);

  // Fetch data from API
  const fetchData = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);

    try {
      const [newsData, trendingData, highlightData] = await Promise.all([
        api.getNews({ limit: 50 }),
        api.getTrendingNews(3),
        api.getNewsHighlight(),
      ]);

      // 如果是中文，翻译数据
      if (language === 'zh') {
        const [translatedNews, translatedTrending, translatedHighlight] = await Promise.all([
          translateProcessedNews(newsData, 'zh'),
          translateProcessedNews(trendingData, 'zh'),
          translateHighlightSummary(highlightData, 'zh'),
        ]);
        setNews(translatedNews);
        setTrending(translatedTrending);
        setHighlight(translatedHighlight);
      } else {
        setNews(newsData);
        setTrending(trendingData);
        setHighlight(highlightData);
      }
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to fetch news:', err);
      setError('Failed to load news. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [language]);

  // Refresh news from backend
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await api.refreshNews();
      // Wait a bit for processing then fetch
      setTimeout(() => fetchData(false), 3000);
    } catch (err) {
      console.error('Failed to refresh:', err);
    } finally {
      setRefreshing(false);
    }
  };

  // Initial load
  useEffect(() => {
    if (initialLoaded.current) return;
    initialLoaded.current = true;
    
    fetchData();

    // Auto refresh every 5 minutes
    const interval = setInterval(() => fetchData(false), 300000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // 语言变化时重新获取/翻译数据
  useEffect(() => {
    // Skip initial render (language is already handled by initial load)
    // Only refetch when language changes after initial load
    fetchData(false);
  }, [language]);

  // Fetch AI analysis of news data (every 10 minutes)
  useEffect(() => {
    const fetchAIAnalysis = async () => {
      if (news.length === 0) return;
      
      try {
        const response = await fetch('http://localhost:8000/api/news/analysis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ news }),
        });
        const data = await response.json();
        
        const aiAnalysis = data.ai_analysis;
        if (aiAnalysis && !aiAnalysis.error) {
          // Convert AI analysis to highlight format
          const highlightData = {
            title: aiAnalysis.market_pulse ? 'AI News Analysis' : 'News Summary',
            summary: aiAnalysis.market_pulse || 'Analyzing news data...',
            trend: aiAnalysis.overall_sentiment || 'neutral',
            highlights: aiAnalysis.action_items?.slice(0, 3) || aiAnalysis.key_insights?.slice(0, 3) || [],
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
        console.error('Failed to fetch AI news analysis:', err);
      }
    };
    
    // Initial fetch
    fetchAIAnalysis();
    
    // Refresh every 10 minutes (600000 ms)
    const interval = setInterval(fetchAIAnalysis, 600000);
    return () => clearInterval(interval);
  }, [news, language]);

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

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-red-400">{error}</p>
        <button 
          onClick={() => fetchData()}
          className="px-4 py-2 bg-white text-black rounded hover:bg-gray-200 transition-colors"
        >
          Retry
        </button>
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
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold text-white">{language === 'zh' ? '热点新闻' : 'News Feed'}</h1>
          <div className="flex items-center gap-2 mt-1 text-xs text-okx-text-muted">
            <span>{language === 'zh' ? '来源: BWEnews' : 'Source: BWEnews'}</span>
            <span>•</span>
            <span>{language === 'zh' ? '自动刷新: 5分钟' : 'Auto-refresh: 5 min'}</span>
            {lastUpdated && (
              <>
                <span>•</span>
                <span>{language === 'zh' ? '更新于: ' : 'Updated: '}{formatRelativeTime(lastUpdated.toISOString())}</span>
              </>
            )}
          </div>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-3 py-1.5 bg-okx-bg-secondary border border-okx-border rounded text-xs text-white hover:border-white/30 transition-all disabled:opacity-50"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Trending */}
      {trending.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Flame className="text-yellow-400" size={16} />
            <span className="text-sm font-medium text-white">Trending</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {trending.map((news) => (
              <div 
                key={news.id}
                className="bg-okx-bg-secondary border border-okx-border rounded-lg p-4 hover:border-okx-border-light transition-all cursor-pointer group"
                onClick={() => news.source_url && window.open(news.source_url, '_blank')}
              >
                <div className="flex items-start justify-between mb-2">
                  <span
                    className="text-xs px-2 py-0.5 rounded"
                    style={{
                      backgroundColor: newsCategoryColors[news.category as NewsCategory] + '20',
                      color: newsCategoryColors[news.category as NewsCategory]
                    }}
                  >
                    {categoryLabelMap[news.category as NewsCategory]}
                  </span>
                  <span className="text-white text-xs font-mono">{news.hot_score}</span>
                </div>
                <h3 className="text-white text-sm font-medium line-clamp-2 group-hover:text-white/80 transition-colors">{cleanHtml(news.title)}</h3>
                <div className="flex items-center gap-2 mt-2 text-xs text-okx-text-muted">
                  <span>{news.source}</span>
                  <span>•</span>
                  <span>{formatRelativeTime(news.publish_time)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
