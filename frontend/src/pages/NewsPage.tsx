import { useState, useMemo } from 'react';
import type { NewsCategory, NewsPriority } from '../types/news';
import { 
  newsCategoryLabels, 
  newsCategoryColors 
} from '../types/news';
import { 
  getSortedNews,
  getTrendingNews,
  formatRelativeTime 
} from '../data/newsData';
import { 
  ExternalLink,
  Flame
} from 'lucide-react';
import { CopilotHighlight } from '../components/CopilotHighlight';

const priorityConfig = {
  high: { color: 'text-okx-down', bg: 'bg-okx-down/10' },
  medium: { color: 'text-okx-warning', bg: 'bg-okx-warning/10' },
  low: { color: 'text-okx-text-muted', bg: 'bg-okx-text-muted/10' },
};

const categories: NewsCategory[] = ['regulation', 'technology', 'market', 'security', 'adoption', 'defi', 'nft'];

export const NewsPage = () => {
  const [selectedCategory, setSelectedCategory] = useState<NewsCategory | 'all'>('all');
  const [selectedPriority] = useState<NewsPriority | 'all'>('all');

  const filteredNews = useMemo(() => {
    let filtered = getSortedNews();

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(n => n.category === selectedCategory);
    }

    if (selectedPriority !== 'all') {
      filtered = filtered.filter(n => n.priority === selectedPriority);
    }

    return filtered;
  }, [selectedCategory, selectedPriority]);

  const trending = getTrendingNews().slice(0, 3);

  return (
    <div>
      {/* Copilot Highlight */}
      <CopilotHighlight
        title="News Intelligence"
        summary="Regulatory developments dominate headlines with SEC approving Bitcoin ETF options. EU MiCA implementation provides clarity. Institutional adoption accelerates as major firms announce crypto initiatives."
        trend="up"
        trendLabel="Bullish"
        keyPoints={['ETF Options Approved', 'MiCA Live', 'Institutional Inflows', 'Regulatory Clarity']}
      />

      {/* Header */}
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-white">News Feed</h1>
      </div>

      {/* Trending */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Flame className="text-okx-warning" size={16} />
          <span className="text-sm font-medium text-white">Trending</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {trending.map((news) => (
            <div 
              key={news.id}
              className="bg-okx-bg-secondary border border-okx-border rounded-lg p-4 hover:border-okx-border-light transition-all cursor-pointer group"
              onClick={() => window.open(news.sourceUrl, '_blank')}
            >
              <div className="flex items-start justify-between mb-2">
                <span 
                  className="text-xs px-2 py-0.5 rounded"
                  style={{ 
                    backgroundColor: newsCategoryColors[news.category] + '20',
                    color: newsCategoryColors[news.category]
                  }}
                >
                  {newsCategoryLabels[news.category]}
                </span>
                <span className="text-okx-accent text-xs font-mono">{news.hotScore}</span>
              </div>
              <h3 className="text-white text-sm font-medium line-clamp-2 group-hover:text-okx-accent transition-colors">{news.title}</h3>
              <div className="flex items-center gap-2 mt-2 text-xs text-okx-text-muted">
                <span>{news.source}</span>
                <span>•</span>
                <span>{formatRelativeTime(news.publishTime)}</span>
              </div>
            </div>
          ))}
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
            {newsCategoryLabels[category]}
          </button>
        ))}
      </div>

      {/* News List */}
      <div className="space-y-3">
        {filteredNews.map((news) => {
          const priorityStyle = priorityConfig[news.priority];

          return (
            <div
              key={news.id}
              className="bg-okx-bg-secondary border border-okx-border rounded-lg p-4 hover:border-okx-border-light transition-all"
            >
              <div className="flex items-start gap-4">
                <div 
                  className="w-10 h-10 rounded flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: newsCategoryColors[news.category] + '15' }}
                >
                  <span 
                    className="text-sm font-bold"
                    style={{ color: newsCategoryColors[news.category] }}
                  >
                    {newsCategoryLabels[news.category][0]}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span 
                      className="text-xs px-2 py-0.5 rounded"
                      style={{ 
                        backgroundColor: newsCategoryColors[news.category] + '20',
                        color: newsCategoryColors[news.category]
                      }}
                    >
                      {newsCategoryLabels[news.category]}
                    </span>
                    
                    <span className={`text-xs px-2 py-0.5 rounded ${priorityStyle.bg} ${priorityStyle.color}`}>
                      {news.priority.toUpperCase()}
                    </span>

                    {news.hotScore >= 80 && (
                      <span className="text-xs px-2 py-0.5 rounded bg-okx-warning/10 text-okx-warning">
                        HOT
                      </span>
                    )}

                    <span className="text-okx-text-muted text-xs">
                      {formatRelativeTime(news.publishTime)}
                    </span>
                  </div>

                  <h3 className="text-white font-medium mb-1">{news.title}</h3>
                  <p className="text-okx-text-secondary text-sm mb-3">{news.summary}</p>

                  <div className="flex items-center justify-between">
                    <span className="text-okx-text-muted text-xs">{news.source}</span>
                    <a
                      href={news.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-okx-accent text-xs hover:underline flex items-center gap-1"
                    >
                      Read more
                      <ExternalLink size={12} />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {filteredNews.length === 0 && (
          <div className="text-center py-12 text-okx-text-secondary">
            No news found
          </div>
        )}
      </div>
    </div>
  );
};
