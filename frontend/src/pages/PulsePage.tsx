import { useState, useEffect } from 'react';
import { TrendingUp, AlertTriangle, Sparkles, Loader2 } from 'lucide-react';
import { api } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
import {
  translatePulseSummary,
  translatePulseRecommendations,
  translateTrendPrediction,
  translateProcessedNews,
} from '../services/apiTranslation';
import * as cacheService from '../services/cache';
import type { PulseSummary, PulseRecommendation, TrendPrediction, ProcessedNews } from '../services/api';


export const PulsePage = () => {
  const { language } = useLanguage();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [pulseSummary, setPulseSummary] = useState<PulseSummary | null>(null);
  const [recommendations, setRecommendations] = useState<PulseRecommendation[]>([]);
  const [trends, setTrends] = useState<TrendPrediction | null>(null);
  const [latestNews, setLatestNews] = useState<ProcessedNews[]>([]);
  const [loading, setLoading] = useState(true);
  const [analysisLoading, setAnalysisLoading] = useState(true);

  // ==================== Pulse 综合数据获取 ====================
  const fetchPulseData = async (forceRefresh = false) => {
    // 检查缓存是否过期 (20 分钟)，强制刷新时跳过
    if (!forceRefresh) {
      const cached = cacheService.getCache<any>('pulseComprehensive');
      const cachedAt = cacheService.getCacheTimestamp('pulseComprehensive');
      const now = Date.now();
      const isExpired = !cachedAt || (now - cachedAt) > 1200000; // 20 分钟

      if (cached && !isExpired) {
        const analysis = cached.comprehensive_analysis;
        setPulseSummary({
          market_pulse: analysis.market_pulse,
          key_insights: analysis.key_insights,
          hot_sectors: analysis.hot_sectors,
          overall_sentiment: analysis.overall_sentiment,
          trend_prediction: analysis.trend_prediction,
          action_items: analysis.action_items,
          risk_alerts: analysis.risk_alerts,
        });
        // 同时设置推荐数据（如果缓存存在）
        const cachedRecs = cacheService.getCache<{ recommendations: PulseRecommendation[] }>('pulseRecommendations');
        console.log('[PulsePage] Cache hit - Recommendations:', cachedRecs?.recommendations?.length || 0, 'items');
        if (cachedRecs) {
          setRecommendations(cachedRecs.recommendations || []);
        }
        setAnalysisLoading(false);
        setLoading(false);
        console.log('[PulsePage] Using cached comprehensive analysis');
        return;
      }
    }

    setAnalysisLoading(true);
    setLoading(true);

    try {
      console.log('[Pulse AI] Fetching comprehensive analysis, language:', language);

      // Fetch comprehensive analysis from all 4 pages
      const comprehensiveRes = await fetch(`http://localhost:8000/api/pulse/comprehensive?language=${language}`);
      let comprehensiveData = null;
      if (comprehensiveRes.ok) {
        comprehensiveData = await comprehensiveRes.json();
      }

      // Fetch trending news
      const newsData = await api.getTrendingNews(5);
      let translatedNews = newsData;
      if (language === 'zh') {
        translatedNews = await translateProcessedNews(newsData, 'zh');
      }

      // Use comprehensive analysis if available
      if (comprehensiveData?.comprehensive_analysis) {
        console.log('[Pulse AI] Received comprehensive analysis');
        const analysis = comprehensiveData.comprehensive_analysis;
        let summaryData = {
          market_pulse: analysis.market_pulse,
          key_insights: analysis.key_insights,
          hot_sectors: analysis.hot_sectors,
          overall_sentiment: analysis.overall_sentiment,
          trend_prediction: analysis.trend_prediction,
          action_items: analysis.action_items,
          risk_alerts: analysis.risk_alerts,
        };

        // 翻译并保存 Pulse Summary
        if (language === 'zh') {
          summaryData = await translatePulseSummary(summaryData, 'zh');
        }
        setPulseSummary(summaryData);
        cacheService.setCache('pulse', summaryData, 1200); // 20 分钟

        // 保存综合分析到缓存
        cacheService.setCache('pulseComprehensive', comprehensiveData, 1200); // 20 分钟

        // Fetch recommendations separately
        const recData = await api.getPulseRecommendations();
        console.log('[Pulse AI] Recommendations from API:', recData);
        let translatedRecs = recData.recommendations;
        if (language === 'zh') {
          translatedRecs = await translatePulseRecommendations(recData.recommendations, 'zh');
        }
        console.log('[Pulse AI] Setting recommendations:', translatedRecs?.length || 0, 'items');
        setRecommendations(translatedRecs);
        cacheService.setCache('pulseRecommendations', { recommendations: translatedRecs }, 1800); // 30 分钟

        // Use comprehensive trends - set null as we're using the summary directly
        setTrends(null);
      } else {
        console.log('[Pulse AI] Comprehensive analysis not available, using fallback');
        // Fallback to individual APIs
        const [summaryData, recData, trendsData] = await Promise.all([
          api.getPulseSummary(),
          api.getPulseRecommendations(),
          api.getPulseTrends('7d'),
        ]);

        if (language === 'zh') {
          const [translatedSummary, translatedRecs, translatedTrends] = await Promise.all([
            translatePulseSummary(summaryData, 'zh'),
            translatePulseRecommendations(recData.recommendations, 'zh'),
            translateTrendPrediction(trendsData, 'zh'),
          ]);
          setPulseSummary(translatedSummary);
          setRecommendations(translatedRecs);
          setTrends(translatedTrends);
          cacheService.setCache('pulse', translatedSummary, 1200);
          cacheService.setCache('pulseRecommendations', { recommendations: translatedRecs }, 1800);
        } else {
          setPulseSummary(summaryData);
          setRecommendations(recData.recommendations);
          setTrends(trendsData);
          cacheService.setCache('pulse', summaryData, 1200);
          cacheService.setCache('pulseRecommendations', { recommendations: recData.recommendations }, 1800);
        }
      }

      setLatestNews(translatedNews);
    } catch (err) {
      console.error('Failed to fetch pulse data:', err);
      // 使用缓存作为 fallback
      const cached = cacheService.getCache<any>('pulseComprehensive');
      const cachedRecs = cacheService.getCache<{ recommendations: PulseRecommendation[] }>('pulseRecommendations');
      if (cached?.comprehensive_analysis) {
        const analysis = cached.comprehensive_analysis;
        setPulseSummary({
          market_pulse: analysis.market_pulse,
          key_insights: analysis.key_insights,
          hot_sectors: analysis.hot_sectors,
          overall_sentiment: analysis.overall_sentiment,
          trend_prediction: analysis.trend_prediction,
          action_items: analysis.action_items,
          risk_alerts: analysis.risk_alerts,
        });
      }
      // 同时恢复推荐数据
      if (cachedRecs) {
        setRecommendations(cachedRecs.recommendations || []);
      }
    } finally {
      setLoading(false);
      setAnalysisLoading(false);
    }
  };

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // ==================== 首次加载和定时刷新 ====================
  useEffect(() => {
    // 首次加载
    fetchPulseData();

    // 定时刷新：每 20 分钟
    const interval = setInterval(() => fetchPulseData(false), 1200000);

    // 页面可见性检测：切回标签页时检查缓存，过期才刷新
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[PulsePage] Page visible, checking cache for comprehensive analysis');
        fetchPulseData(false); // 优先走缓存，缓存过期才请求 API
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // 初始化时从缓存读取数据（仅用于秒开体验），然后检查是否需要刷新
  useEffect(() => {
    const cachedSummary = cacheService.getCache<PulseSummary>('pulse');
    const cachedRecs = cacheService.getCache<{ recommendations: PulseRecommendation[] }>('pulseRecommendations');
    const cachedComprehensive = cacheService.getCache<any>('pulseComprehensive');
    
    console.log('[PulsePage] Cache check - Recommendations:', cachedRecs?.recommendations?.length || 0, 'items');
    console.log('[PulsePage] Cache check - Comprehensive:', !!cachedComprehensive?.comprehensive_analysis);
    
    // 先显示缓存数据（秒开体验）
    if (cachedComprehensive?.comprehensive_analysis) {
      const analysis = cachedComprehensive.comprehensive_analysis;
      setPulseSummary({
        market_pulse: analysis.market_pulse,
        key_insights: analysis.key_insights,
        hot_sectors: analysis.hot_sectors,
        overall_sentiment: analysis.overall_sentiment,
        trend_prediction: analysis.trend_prediction,
        action_items: analysis.action_items,
        risk_alerts: analysis.risk_alerts,
      });
      if (cachedRecs) {
        setRecommendations(cachedRecs.recommendations || []);
      }
      // 有缓存时先不显示 loading，背景检查是否需要更新
      setLoading(false);
      setAnalysisLoading(false);
      console.log('[PulsePage] Loaded cached data for instant display');
    } else {
      // 无缓存，显示 loading
      if (cachedSummary) setPulseSummary(cachedSummary);
      if (cachedRecs) setRecommendations(cachedRecs.recommendations || []);
    }
    
    // 始终触发 fetchPulseData 来检查缓存是否过期并获取最新数据
    fetchPulseData();
  }, []);

  // 语言变化时重新获取数据
  useEffect(() => {
    fetchPulseData(false);
  }, [language]);

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
            </div>

            {pulseSummary ? (
              <>
                <p className="text-okx-text-secondary text-sm leading-relaxed">
                  {pulseSummary.market_pulse}
                </p>

                {/* Key Insights */}
                {pulseSummary.key_insights.length > 0 ? (
                  <div className="mt-3 space-y-1">
                    {pulseSummary.key_insights.map((insight, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <span className="text-white">•</span>
                        <span className="text-okx-text-secondary text-sm">{insight}</span>
                      </div>
                    ))}
                  </div>
                ) : analysisLoading ? (
                  <div className="mt-3 text-okx-text-muted text-sm flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {language === 'zh' ? '关键洞察分析中...' : 'Key insights analyzing...'}
                  </div>
                ) : null}

                {/* Hot Sectors */}
                {pulseSummary.hot_sectors.length > 0 ? (
                  <div className="flex items-center gap-2 mt-3">
                    <span className="text-okx-text-muted text-xs">Hot Sectors:</span>
                    {pulseSummary.hot_sectors.map((sector) => (
                      <span key={sector} className="text-xs px-2 py-0.5 rounded bg-white/10 text-white">
                        {sector}
                      </span>
                    ))}
                  </div>
                ) : analysisLoading ? (
                  <div className="flex items-center gap-2 mt-3 text-okx-text-muted text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {language === 'zh' ? '热门板块分析中...' : 'Hot sectors analyzing...'}
                  </div>
                ) : null}

                {/* Sources */}
                <div className="flex items-center gap-6 mt-3 text-xs">
                  <span className="text-okx-text-muted">Sources: <span className="text-white">{latestNews.length + 20}</span></span>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2 text-okx-text-secondary text-sm">
                <Loader2 className="w-5 h-5 animate-spin" />
                {language === 'zh' ? '市场数据分析中...' : 'Analyzing market data...'}
              </div>
            )}
          </div>
        </div>
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
                  {pulseSummary.trend_prediction['7d'] ? (
                    <p className="text-white text-sm">{pulseSummary.trend_prediction['7d']}</p>
                  ) : analysisLoading ? (
                    <div className="flex items-center gap-2 text-okx-text-muted text-sm">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {language === 'zh' ? '7 天预测分析中...' : '7-day prediction analyzing...'}
                    </div>
                  ) : null}
                </div>
                <div className="px-4 py-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-okx-text-muted text-xs">30 Days</span>
                  </div>
                  {pulseSummary.trend_prediction['30d'] ? (
                    <p className="text-white text-sm">{pulseSummary.trend_prediction['30d']}</p>
                  ) : analysisLoading ? (
                    <div className="flex items-center gap-2 text-okx-text-muted text-sm">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {language === 'zh' ? '30 天预测分析中...' : '30-day prediction analyzing...'}
                    </div>
                  ) : null}
                </div>
              </>
            ) : (
              <div className="px-4 py-6 text-center text-okx-text-muted text-sm flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                {language === 'zh' ? '预测分析中...' : 'Predictions analyzing...'}
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
            ) : analysisLoading ? (
              <div className="px-4 py-6 text-center text-okx-text-muted text-sm flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                {language === 'zh' ? 'AI 推荐分析中...' : 'AI recommendations analyzing...'}
              </div>
            ) : (
              <div className="px-4 py-6 text-center text-okx-text-muted text-sm">
                {language === 'zh' ? '暂无 AI 推荐' : 'No AI recommendations available'}
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
