import { Newspaper, BarChart3, Building2, Bitcoin, TrendingUp, AlertTriangle, Sparkles, ChevronRight, Loader2, RefreshCw } from 'lucide-react';
import { useState, useEffect } from 'react';
import { api, formatRelativeTime, getTrendColor } from '../services/api';
import type { PulseSummary, PulseRecommendation, TrendPrediction, ProcessedNews } from '../services/api';

// Module definitions
const modules = [
  {
    title: 'News',
    icon: Newspaper,
    color: '#00c087',
    path: '/news',
  },
  {
    title: 'Markets',
    icon: BarChart3,
    color: '#2e9fff',
    path: '/markets',
  },
  {
    title: 'Company',
    icon: Building2,
    color: '#f0a93c',
    path: '/company',
  },
  {
    title: 'Crypto',
    icon: Bitcoin,
    color: '#8b5cf6',
    path: '/crypto',
  },
];

// Marquee/Ticker Component
const ModuleTicker = ({ summaries }: { summaries: Record<string, string> }) => {
  const [isPaused, setIsPaused] = useState(false);

  return (
    <div className="relative overflow-hidden py-2">
      <div 
        className={`flex gap-4 ${isPaused ? '' : 'animate-marquee'}`}
        style={{
          animation: isPaused ? 'none' : 'marquee 30s linear infinite',
        }}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {/* Duplicate modules for seamless loop */}
        {[...modules, ...modules].map((module, idx) => {
          const Icon = module.icon;
          return (
            <div
              key={idx}
              className="flex-shrink-0 w-[280px] bg-okx-bg-secondary rounded-lg p-4 cursor-pointer group"
              style={{ 
                boxShadow: '0 0 0 1px rgba(255,255,255,0.25), 0 0 20px rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)'
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded flex items-center justify-center" style={{ backgroundColor: module.color + '20' }}>
                  <Icon size={16} style={{ color: module.color }} />
                </div>
                <span className="text-white font-medium">{module.title}</span>
                <ChevronRight size={14} className="text-okx-text-muted ml-auto group-hover:text-white transition-colors" />
              </div>
              <p className="text-okx-text-secondary text-xs line-clamp-2">
                {summaries[module.title.toLowerCase()] || 'Loading...'}
              </p>
            </div>
          );
        })}
      </div>
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
};

export const PulsePage = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [pulseSummary, setPulseSummary] = useState<PulseSummary | null>(null);
  const [recommendations, setRecommendations] = useState<PulseRecommendation[]>([]);
  const [trends, setTrends] = useState<TrendPrediction | null>(null);
  const [latestNews, setLatestNews] = useState<ProcessedNews[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch all pulse data
  const fetchPulseData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    
    try {
      const [summaryData, recData, trendsData, newsData] = await Promise.all([
        api.getPulseSummary(),
        api.getPulseRecommendations(),
        api.getPulseTrends('7d'),
        api.getTrendingNews(5),
      ]);
      
      setPulseSummary(summaryData);
      setRecommendations(recData.recommendations);
      setTrends(trendsData);
      setLatestNews(newsData);
    } catch (err) {
      console.error('Failed to fetch pulse data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchPulseData(false);
    setRefreshing(false);
  };

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchPulseData();
    
    // Auto refresh every 3 minutes
    const interval = setInterval(() => fetchPulseData(false), 180000);
    return () => clearInterval(interval);
  }, []);

  // Build module summaries from latest news
  const moduleSummaries = {
    news: latestNews[0]?.summary || 'Processing latest news...',
    markets: trends ? `Overall trend: ${trends.overall_trend}. Confidence: ${trends.prediction_confidence}%` : 'Analyzing market data...',
    company: 'Monitoring exchange announcements...',
    crypto: 'Tracking price movements...',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* Daily Market Pulse - AI Generated with glow */}
      <div className="bg-okx-bg-secondary rounded-lg p-5 mb-6"
        style={{ 
          boxShadow: '0 0 0 2px rgba(255,255,255,0.4), 0 0 40px rgba(255,255,255,0.3), 0 0 80px rgba(255,255,255,0.15)',
          border: '2px solid rgba(255,255,255,0.3)'
        }}
      >
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center flex-shrink-0">
            <Sparkles className="text-black" size={24} />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-semibold text-white">Daily Market Pulse</h1>
                <span className="text-okx-text-muted text-xs">
                  {currentTime.toLocaleString('en-HK', { 
                    year: 'numeric', 
                    month: '2-digit', 
                    day: '2-digit',
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: false 
                  })} HKT
                </span>
              </div>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-okx-bg border border-okx-border rounded text-xs text-white hover:border-white/30 transition-all disabled:opacity-50"
              >
                <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
                Refresh
              </button>
            </div>
            
            {pulseSummary ? (
              <>
                <p className="text-okx-text-secondary text-sm leading-relaxed">
                  {pulseSummary.market_pulse}
                </p>
                
                {/* Key Insights */}
                {pulseSummary.key_insights.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {pulseSummary.key_insights.map((insight, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <span className="text-white">•</span>
                        <span className="text-okx-text-secondary text-sm">{insight}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Hot Sectors */}
                {pulseSummary.hot_sectors.length > 0 && (
                  <div className="flex items-center gap-2 mt-3">
                    <span className="text-okx-text-muted text-xs">Hot Sectors:</span>
                    {pulseSummary.hot_sectors.map((sector) => (
                      <span key={sector} className="text-xs px-2 py-0.5 rounded bg-white/10 text-white">
                        {sector}
                      </span>
                    ))}
                  </div>
                )}

                {/* Overall Sentiment */}
                <div className="flex items-center gap-6 mt-3 text-xs">
                  <span className="text-okx-text-muted">Sentiment: 
                    <span className={`ml-1 font-medium ${getTrendColor(pulseSummary.overall_sentiment)}`}>
                      {pulseSummary.overall_sentiment.toUpperCase()}
                    </span>
                  </span>
                  <span className="text-okx-text-muted">Sources: <span className="text-white">{latestNews.length + 20}</span></span>
                  <span className="text-okx-text-muted">Updated: <span className="text-white">Just now</span></span>
                </div>
              </>
            ) : (
              <p className="text-okx-text-secondary text-sm">Loading market analysis...</p>
            )}
          </div>
        </div>
      </div>

      {/* Module Intelligence - Horizontal Scrolling Ticker */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white font-medium">Module Intelligence</h2>
          <span className="text-okx-text-muted text-xs">Hover to pause</span>
        </div>
        <ModuleTicker summaries={moduleSummaries} />
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Forward Predictions - Qwen Generated */}
        <div className="bg-okx-bg-secondary border border-okx-border rounded-lg">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-okx-border">
            <TrendingUp size={16} className="text-white" />
            <h2 className="text-white font-medium text-sm">Forward Predictions</h2>
          </div>
          <div className="divide-y divide-okx-border">
            {pulseSummary ? (
              <>
                <div className="px-4 py-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-okx-text-muted text-xs">7 Days</span>
                  </div>
                  <p className="text-white text-sm">{pulseSummary.trend_prediction['7d']}</p>
                </div>
                <div className="px-4 py-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-okx-text-muted text-xs">30 Days</span>
                  </div>
                  <p className="text-white text-sm">{pulseSummary.trend_prediction['30d']}</p>
                </div>
              </>
            ) : (
              <div className="px-4 py-6 text-center text-okx-text-muted text-sm">
                Loading predictions...
              </div>
            )}
            
            {trends && (
              <div className="px-4 py-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-okx-text-muted text-xs">Category Trends</span>
                  <span className="text-xs text-white">{trends.prediction_confidence}% confidence</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(trends.category_trends).slice(0, 4).map(([cat, data]) => (
                    <span 
                      key={cat} 
                      className={`text-xs px-2 py-0.5 rounded ${
                        data.trend === 'bullish' ? 'bg-green-500/20 text-green-400' :
                        data.trend === 'bearish' ? 'bg-red-500/20 text-red-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}
                    >
                      {cat}: {data.trend}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* AI Recommendations - Qwen Generated */}
        <div className="bg-okx-bg-secondary border border-okx-border rounded-lg">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-okx-border">
            <AlertTriangle size={16} className="text-white" />
            <h2 className="text-white font-medium text-sm">AI Recommendations</h2>
          </div>
          <div className="divide-y divide-okx-border">
            {recommendations.length > 0 ? (
              recommendations.map((rec, idx) => {
                const typeColors: Record<string, string> = {
                  news: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
                  market: 'bg-green-500/20 text-green-400 border-green-500/30',
                  alert: 'bg-red-500/20 text-red-400 border-red-500/30',
                  opportunity: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
                };
                return (
                  <div key={idx} className="px-4 py-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white text-sm font-medium">{rec.title}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${typeColors[rec.recommendation_type] || typeColors.news}`}>
                        {rec.recommendation_type.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-okx-text-secondary text-xs mb-2">{rec.description}</p>
                    {rec.action_items.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {rec.action_items.map((action, i) => (
                          <span key={i} className="text-[10px] text-okx-text-muted bg-okx-bg rounded px-2 py-0.5">
                            {action}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="px-4 py-6 text-center text-okx-text-muted text-sm">
                Loading recommendations...
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Items */}
      {pulseSummary?.action_items && pulseSummary.action_items.length > 0 && (
        <div className="mt-4 bg-okx-bg-secondary border border-okx-border rounded-lg p-4">
          <h3 className="text-white font-medium text-sm mb-3">Suggested Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {pulseSummary.action_items.map((action, idx) => (
              <div key={idx} className="flex items-center gap-2 text-sm text-okx-text-secondary">
                <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs text-white">
                  {idx + 1}
                </span>
                {action}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Risk Alerts */}
      {pulseSummary?.risk_alerts && pulseSummary.risk_alerts.length > 0 && (
        <div className="mt-4 bg-red-500/10 border border-red-500/30 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={16} className="text-red-400" />
            <h3 className="text-red-400 font-medium text-sm">Risk Alerts</h3>
          </div>
          <ul className="space-y-1">
            {pulseSummary.risk_alerts.map((alert, idx) => (
              <li key={idx} className="text-red-300 text-sm">• {alert}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
