import { translateText, getCachedTranslation } from './translation';
import type { Language } from '../contexts/LanguageContext';
import type { PulseSummary, PulseRecommendation, TrendPrediction, ProcessedNews, HighlightSummary } from './api';

/**
 * 翻译 PulseSummary 数据
 */
export async function translatePulseSummary(
  data: PulseSummary,
  targetLang: Language
): Promise<PulseSummary> {
  if (targetLang === 'en' || !data) return data;

  // 批量翻译所有文本字段
  const textsToTranslate = [
    data.market_pulse,
    ...data.key_insights,
    data.trend_prediction['7d'],
    data.trend_prediction['30d'],
    ...data.risk_alerts,
    ...data.action_items,
    ...data.hot_sectors,
  ].filter(Boolean);

  const translatedTexts: string[] = [];

  for (const text of textsToTranslate) {
    const cached = getCachedTranslation(text, targetLang);
    if (cached) {
      translatedTexts.push(cached);
    } else {
      try {
        const translated = await translateText(text, targetLang);
        translatedTexts.push(translated);
        // 添加小延迟避免频率限制
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error('[API Translation] Translation error:', error);
        translatedTexts.push(text);
      }
    }
  }

  // 重建对象
  let index = 0;
  return {
    market_pulse: translatedTexts[index++] || data.market_pulse,
    key_insights: data.key_insights.map(() => translatedTexts[index++] || ''),
    trend_prediction: {
      '7d': translatedTexts[index++] || data.trend_prediction['7d'],
      '30d': translatedTexts[index++] || data.trend_prediction['30d'],
    },
    risk_alerts: data.risk_alerts.map(() => translatedTexts[index++] || ''),
    action_items: data.action_items.map(() => translatedTexts[index++] || ''),
    hot_sectors: data.hot_sectors.map(() => translatedTexts[index++] || ''),
    overall_sentiment: data.overall_sentiment,
  };
}

/**
 * 翻译 PulseRecommendation 数组
 */
export async function translatePulseRecommendations(
  recommendations: PulseRecommendation[],
  targetLang: Language
): Promise<PulseRecommendation[]> {
  if (targetLang === 'en' || !recommendations) return recommendations;

  const translated: PulseRecommendation[] = [];

  for (const rec of recommendations) {
    const textsToTranslate = [
      rec.title,
      rec.description,
      ...rec.action_items,
    ].filter(Boolean);

    const translatedTexts: string[] = [];

    for (const text of textsToTranslate) {
      const cached = getCachedTranslation(text, targetLang);
      if (cached) {
        translatedTexts.push(cached);
      } else {
        try {
          const translated = await translateText(text, targetLang);
          translatedTexts.push(translated);
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error('Translation error:', error);
          translatedTexts.push(text);
        }
      }
    }

    let index = 0;
    translated.push({
      ...rec,
      title: translatedTexts[index++] || rec.title,
      description: translatedTexts[index++] || rec.description,
      action_items: rec.action_items.map(() => translatedTexts[index++] || ''),
    });
  }

  return translated;
}

/**
 * 翻译 TrendPrediction 数据
 */
export async function translateTrendPrediction(
  data: TrendPrediction,
  targetLang: Language
): Promise<TrendPrediction> {
  if (targetLang === 'en' || !data) return data;

  const textsToTranslate = [
    data.overall_trend,
    ...data.key_drivers,
    ...Object.values(data.category_trends).map(t => t.trend),
  ].filter(Boolean);

  const translatedTexts: string[] = [];

  for (const text of textsToTranslate) {
    const cached = getCachedTranslation(text, targetLang);
    if (cached) {
      translatedTexts.push(cached);
    } else {
      try {
        const translated = await translateText(text, targetLang);
        translatedTexts.push(translated);
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error('Translation error:', error);
        translatedTexts.push(text);
      }
    }
  }

  // 重建 category_trends
  const translatedCategoryTrends: Record<string, { trend: string; strength: number; sentiment_score: number }> = {};

  // 先处理固定字段
  let index = 0;
  const translatedOverallTrend = translatedTexts[index++] || data.overall_trend;
  const translatedKeyDrivers = data.key_drivers.map(() => translatedTexts[index++] || '');

  // 处理 category trends
  for (const [key, value] of Object.entries(data.category_trends)) {
    translatedCategoryTrends[key] = {
      ...value,
      trend: translatedTexts[index++] || value.trend,
    };
  }

  return {
    ...data,
    overall_trend: translatedOverallTrend,
    category_trends: translatedCategoryTrends,
    key_drivers: translatedKeyDrivers,
  };
}

/**
 * 翻译 ProcessedNews 数组
 */
export async function translateProcessedNews(
  newsList: ProcessedNews[],
  targetLang: Language
): Promise<ProcessedNews[]> {
  if (targetLang === 'en' || !newsList) return newsList;

  const translated: ProcessedNews[] = [];

  for (const news of newsList) {
    const textsToTranslate = [
      news.title,
      news.summary,
      ...news.tags,
      ...news.key_topics,
    ].filter(Boolean);

    const translatedTexts: string[] = [];

    for (const text of textsToTranslate) {
      const cached = getCachedTranslation(text, targetLang);
      if (cached) {
        translatedTexts.push(cached);
      } else {
        try {
          const translated = await translateText(text, targetLang);
          translatedTexts.push(translated);
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error('Translation error:', error);
          translatedTexts.push(text);
        }
      }
    }

    let index = 0;
    translated.push({
      ...news,
      title: translatedTexts[index++] || news.title,
      summary: translatedTexts[index++] || news.summary,
      tags: news.tags.map(() => translatedTexts[index++] || ''),
      key_topics: news.key_topics.map(() => translatedTexts[index++] || ''),
    });
  }

  return translated;
}

/**
 * 翻译 HighlightSummary 数据
 */
export async function translateHighlightSummary(
  data: HighlightSummary,
  targetLang: Language
): Promise<HighlightSummary> {
  if (targetLang === 'en' || !data) return data;

  const textsToTranslate = [
    data.title,
    data.summary,
    ...data.highlights,
  ].filter(Boolean);

  const translatedTexts: string[] = [];

  for (const text of textsToTranslate) {
    const cached = getCachedTranslation(text, targetLang);
    if (cached) {
      translatedTexts.push(cached);
    } else {
      try {
        const translated = await translateText(text, targetLang);
        translatedTexts.push(translated);
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error('Translation error:', error);
        translatedTexts.push(text);
      }
    }
  }

  let index = 0;
  return {
    title: translatedTexts[index++] || data.title,
    summary: translatedTexts[index++] || data.summary,
    highlights: data.highlights.map(() => translatedTexts[index++] || ''),
    trend: data.trend,
    generated_at: data.generated_at,
  };
}
