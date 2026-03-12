import { type Language } from '../contexts/LanguageContext';
import { apiUrl } from './config';

// 使用后端代理翻译（避免 CORS 问题）
const TRANSLATE_ENDPOINT = apiUrl('/api/translate');
const TRANSLATE_BATCH_ENDPOINT = apiUrl('/api/translate/batch');
const TRANSLATION_STORAGE_KEY = 'crypto_pulse_translation_cache';

// 翻译缓存
const translationCache: Record<string, string> = (() => {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const stored = localStorage.getItem(TRANSLATION_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
})();

function persistTranslationCache(): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(TRANSLATION_STORAGE_KEY, JSON.stringify(translationCache));
  } catch {
    // Ignore quota errors for translation cache.
  }
}

/**
 * 使用后端代理翻译文本（通过 DeepL API）
 */
export async function translateText(
  text: string,
  targetLang: Language
): Promise<string> {
  if (!text) {
    return text;
  }

  // 检查缓存
  const cacheKey = `${text}_${targetLang}`;
  if (translationCache[cacheKey]) {
    return translationCache[cacheKey];
  }

  try {
    const response = await fetch(TRANSLATE_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: text,
        target_lang: targetLang.toUpperCase(),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Translation] API error:', response.status, errorText);
      throw new Error(`Translation API error: ${response.status}`);
    }

    const data = await response.json();
    const translatedText = data.translated_text || text;

    // 缓存结果
    translationCache[cacheKey] = translatedText;
    persistTranslationCache();

    return translatedText;
  } catch (error) {
    console.error('[Translation] Error:', error);
    return text; // 出错时返回原文
  }
}

/**
 * 批量翻译文本数组
 */
export async function translateTexts(
  texts: string[],
  targetLang: Language
): Promise<string[]> {
  if (!texts.length) {
    return texts;
  }

  const results = [...texts];
  const missingEntries: Array<{ index: number; text: string; cacheKey: string }> = [];

  texts.forEach((text, index) => {
    if (!text) {
      return;
    }

    const cacheKey = `${text}_${targetLang}`;
    const cached = translationCache[cacheKey];
    if (cached) {
      results[index] = cached;
      return;
    }

    missingEntries.push({ index, text, cacheKey });
  });

  if (!missingEntries.length) {
    return results;
  }

  try {
    const response = await fetch(TRANSLATE_BATCH_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        texts: missingEntries.map(entry => entry.text),
        target_lang: targetLang.toUpperCase(),
      }),
    });

    if (!response.ok) {
      throw new Error(`Translation batch API error: ${response.status}`);
    }

    const data = await response.json();
    const translatedTexts: string[] = data.translated_texts || missingEntries.map(entry => entry.text);

    missingEntries.forEach((entry, position) => {
      const translated = translatedTexts[position] || entry.text;
      translationCache[entry.cacheKey] = translated;
      results[entry.index] = translated;
    });
    persistTranslationCache();
    return results;
  } catch (error) {
    console.error('[Translation] Batch error:', error);
    for (const entry of missingEntries) {
      results[entry.index] = await translateText(entry.text, targetLang);
    }
  }

  return results;
}

/**
 * 翻译新闻文章
 */
export async function translateNewsArticle(
  article: any,
  targetLang: Language
): Promise<any> {
  if (targetLang === 'en' || !article) {
    return article;
  }

  try {
    const [title, source] = await Promise.all([
      translateText(article.title || '', targetLang),
      translateText(article.source || '', targetLang),
    ]);

    return {
      ...article,
      title,
      source,
    };
  } catch (error) {
    console.error('[Translation] News article error:', error);
    return article;
  }
}

/**
 * 翻译新闻数组
 */
export async function translateNewsArticles(
  articles: any[],
  targetLang: Language
): Promise<any[]> {
  if (targetLang === 'en' || !articles.length) {
    return articles;
  }

  const results = await Promise.all(
    articles.map(article => translateNewsArticle(article, targetLang))
  );

  return results;
}

/**
 * 翻译股指名称
 */
export async function translateIndexName(
  name: string,
  targetLang: Language
): Promise<string> {
  if (targetLang === 'en' || !name) {
    return name;
  }

  // 常见股指的固定翻译
  const indexTranslations: Record<string, string> = {
    'S&P 500': '标普 500',
    'Dow Jones': '道琼斯',
    'Nasdaq': '纳斯达克',
    'Shanghai Composite': '上证指数',
    'Shenzhen Component': '深证成指',
    'ChiNext': '创业板指',
    'Hang Seng': '恒生指数',
    'FTSE 100': '富时 100',
    'Euro Stoxx 50': '欧洲斯托克 50',
    'DAX': '德国 DAX',
    'CAC 40': '法国 CAC40',
    'Nikkei 225': '日经 225',
    'KOSPI': '韩国综指',
    'KOSDAQ': '韩国科斯达克',
  };

  if (indexTranslations[name]) {
    return indexTranslations[name];
  }

  // 其他名称使用 DeepL 翻译
  return await translateText(name, targetLang);
}

/**
 * 翻译股指数据
 */
export async function translateStockIndices(
  indices: any[],
  targetLang: Language
): Promise<any[]> {
  if (targetLang === 'en' || !indices.length) {
    return indices;
  }

  const results = await Promise.all(
    indices.map(async (index) => {
      const translatedName = await translateIndexName(index.name, targetLang);
      return {
        ...index,
        name: translatedName,
      };
    })
  );

  return results;
}

/**
 * 翻译商品名称
 */
export async function translateCommodityName(
  name: string,
  targetLang: Language
): Promise<string> {
  if (targetLang === 'en' || !name) {
    return name;
  }

  // 常见商品的固定翻译
  const commodityTranslations: Record<string, string> = {
    'Crude Oil': '纽约期油',
    'Gold': '金价',
    'Silver': '银价',
    'Natural Gas': '天然气',
    'Copper': '铜',
  };

  if (commodityTranslations[name]) {
    return commodityTranslations[name];
  }

  return await translateText(name, targetLang);
}

/**
 * 翻译商品数据
 */
export async function translateCommodities(
  commodities: any[],
  targetLang: Language
): Promise<any[]> {
  if (targetLang === 'en' || !commodities.length) {
    return commodities;
  }

  const results = await Promise.all(
    commodities.map(async (commodity) => {
      const translatedName = await translateCommodityName(commodity.name, targetLang);
      return {
        ...commodity,
        name: translatedName,
      };
    })
  );

  return results;
}

/**
 * 翻译货币对名称
 */
export async function translateCurrencyPair(
  name: string,
  targetLang: Language
): Promise<string> {
  if (targetLang === 'en' || !name) {
    return name;
  }

  // 常见货币对的固定翻译
  const currencyTranslations: Record<string, string> = {
    'USD/HKD': '美元/港元',
    'HKD/CNY': '港元/人民币',
    'GBP/HKD': '英镑/港元',
    'EUR/HKD': '欧元/港元',
    'JPY/HKD': '日元/港元',
  };

  if (currencyTranslations[name]) {
    return currencyTranslations[name];
  }

  return await translateText(name, targetLang);
}

/**
 * 翻译汇率数据
 */
export async function translateCurrencyRates(
  currencies: any[],
  targetLang: Language
): Promise<any[]> {
  if (targetLang === 'en' || !currencies.length) {
    return currencies;
  }

  const results = await Promise.all(
    currencies.map(async (currency) => {
      const translatedName = await translateCurrencyPair(currency.name, targetLang);
      return {
        ...currency,
        name: translatedName,
      };
    })
  );

  return results;
}

/**
 * 获取缓存的翻译
 */
export function getCachedTranslation(text: string, targetLang: Language): string | undefined {
  return translationCache[`${text}_${targetLang}`];
}

/**
 * 清除翻译缓存
 */
export function clearTranslationCache(): void {
  Object.keys(translationCache).forEach(key => {
    delete translationCache[key];
  });
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TRANSLATION_STORAGE_KEY);
  }
}
