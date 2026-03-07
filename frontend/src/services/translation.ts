import { type Language } from '../contexts/LanguageContext';

const DEEPL_API_KEY = '920de657-7d74-4b67-9f1f-55e691bab855:fx';
const DEEPL_API_URL = 'https://api-free.deepl.com/v2/translate';

// 翻译缓存
const translationCache: Record<string, string> = {};

/**
 * 使用 DeepL API 翻译文本
 */
export async function translateText(
  text: string,
  targetLang: Language
): Promise<string> {
  if (!text || targetLang === 'en') {
    return text;
  }

  // 检查缓存
  const cacheKey = `${text}_${targetLang}`;
  if (translationCache[cacheKey]) {
    return translationCache[cacheKey];
  }

  try {
    const response = await fetch(DEEPL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        auth_key: DEEPL_API_KEY,
        text: text,
        target_lang: targetLang.toUpperCase(),
        source_lang: 'EN',
      }),
    });

    if (!response.ok) {
      throw new Error(`DeepL API error: ${response.status}`);
    }

    const data = await response.json();
    const translatedText = data.translations?.[0]?.text || text;

    // 缓存结果
    translationCache[cacheKey] = translatedText;

    return translatedText;
  } catch (error) {
    console.error('Translation error:', error);
    return text; // 出错时返回原文
  }
}

/**
 * 批量翻译文本
 */
export async function translateBatch(
  texts: string[],
  targetLang: Language
): Promise<string[]> {
  if (targetLang === 'en') {
    return texts;
  }

  // 去重
  const uniqueTexts = [...new Set(texts.filter(Boolean))];
  
  // 检查缓存
  const uncachedTexts = uniqueTexts.filter(text => !translationCache[`${text}_${targetLang}`]);
  
  if (uncachedTexts.length === 0) {
    return texts.map(text => translationCache[`${text}_${targetLang}`] || text);
  }

  try {
    // DeepL 免费版有请求频率限制，这里逐个翻译
    const translatedMap: Record<string, string> = {};
    
    for (const text of uncachedTexts) {
      const translated = await translateText(text, targetLang);
      translatedMap[text] = translated;
      // 添加小延迟避免频率限制
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return texts.map(text => translatedMap[text] || translationCache[`${text}_${targetLang}`] || text);
  } catch (error) {
    console.error('Batch translation error:', error);
    return texts;
  }
}

/**
 * 清除翻译缓存
 */
export function clearTranslationCache(): void {
  Object.keys(translationCache).forEach(key => {
    delete translationCache[key];
  });
}

/**
 * 获取缓存的翻译
 */
export function getCachedTranslation(text: string, targetLang: Language): string | undefined {
  return translationCache[`${text}_${targetLang}`];
}
