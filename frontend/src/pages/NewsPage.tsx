import { useState, useEffect, useMemo } from 'react';
import type { NewsCategory, NewsPriority } from '../types/news';
import { 
  newsCategoryLabels, 
  newsCategoryColors 
} from '../types/news';
import { 
  ExternalLink,
  Flame,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { CopilotHighlight } from '../components/CopilotHighlight';
import { api, formatRelativeTime, getTrendColor } from '../services/api';
import type { ProcessedNews, HighlightSummary } from '../services/api';

const priorityConfig = {
  high: { color: 'text-red-400', bg: 'bg-red-500/10' },
  medium: { color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  low: { color: 'text-gray-400', bg: 'bg-gray-500/10' },
};

const categories: NewsCategory[] = ['regulation', 'technology', 'market', 'security', 'adoption', 'defi', 'nft'];

export const NewsPage = () => {
  const [selectedCategory, setSelectedCategory] = useState<NewsCategory | 'all'>('all');
  const [selectedPriority] = useState<NewsPriority | 'all'>('all');
  const [news, setNews] = useState<ProcessedNews[]>([]);
  const [trending, setTrending] = useState<ProcessedNews[]>([]);
  const [highlight, setHighlight] = useState<HighlightSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch data from API
  const fetchData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);
    
    try {
      const [newsData, trendingData, highlightData] = await Promise.all([
        api.getNews({ limit: 50 }),
        api.getTrendingNews(3),
        api.getNewsHighlight(),
      ]);
      
      setNews(newsData);
      setTrending(trendingData);
      setHighlight(highlightData);
    } catch (err) {
      console.error('Failed to fetch news:', err);
      setError('Failed to load news. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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
    fetchData();
    
    // Auto refresh every 5 minutes
    const interval = setInterval(() => fetchData(false), 300000);
    return () => clearInterval(interval);
  }, []);

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
        <h1 className="text-xl font-semibold text-white">News Feed</h1>
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
                    {newsCategoryLabels[news.category as NewsCategory]}
                  </span>
                  <span className="text-white text-xs font-mono">{news.hot_score}</span>
                </div>
                <h3 className="text-white text-sm font-medium line-clamp-2 group-hover:text-white/80 transition-colors">{news.title}</h3>
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
            {newsCategoryLabels[category]}
          </button>
        ))}
      </div>

      {/* News List */}
      <div className="space-y-3">
        {filteredNews.length === 0 ? (
          <div className="text-center py-12 text-okx-text-muted">
            No news found for the selected filters.
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
                      {newsCategoryLabels[news.category as NewsCategory]?.[0] || '?'}
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
                        {newsCategoryLabels[news.category as NewsCategory]}
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

                    <h3 className="text-white font-medium mb-1">{news.title}</h3>
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
