import { useState, useEffect, useCallback, useRef } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { translateText, getCachedTranslation } from '../services/translation';

/**
 * 翻译Hook，用于异步翻译文本
 */
export function useTranslation(text: string): string {
  const { language } = useLanguage();
  const [translatedText, setTranslatedText] = useState(text);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    
    async function doTranslate() {
      if (!text || language === 'en') {
        setTranslatedText(text);
        return;
      }

      // 检查缓存
      const cached = getCachedTranslation(text, language);
      if (cached) {
        setTranslatedText(cached);
        return;
      }

      // 异步翻译
      const result = await translateText(text, language);
      if (isMounted.current) {
        setTranslatedText(result);
      }
    }

    doTranslate();

    return () => {
      isMounted.current = false;
    };
  }, [text, language]);

  return translatedText;
}

/**
 * 批量翻译Hook
 */
export function useTranslations(texts: string[]): string[] {
  const { language } = useLanguage();
  const [translatedTexts, setTranslatedTexts] = useState(texts);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    
    async function doTranslate() {
      if (language === 'en') {
        setTranslatedTexts(texts);
        return;
      }

      // 检查哪些需要翻译
      const toTranslate: string[] = [];
      const indexMap: number[] = [];

      texts.forEach((text, index) => {
        if (text && !getCachedTranslation(text, language)) {
          toTranslate.push(text);
          indexMap.push(index);
        }
      });

      if (toTranslate.length === 0) {
        // 全部有缓存
        setTranslatedTexts(texts.map(t => getCachedTranslation(t, language) || t));
        return;
      }

      // 逐个翻译
      const results = [...texts];
      for (let i = 0; i < toTranslate.length; i++) {
        const translated = await translateText(toTranslate[i], language);
        results[indexMap[i]] = translated;
        
        // 更新状态
        if (isMounted.current) {
          setTranslatedTexts([...results]);
        }
        
        // 延迟避免频率限制
        if (i < toTranslate.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    }

    doTranslate();

    return () => {
      isMounted.current = false;
    };
  }, [texts, language]);

  return translatedTexts;
}

/**
 * 手动翻译函数
 */
export function useTranslate() {
  const { language } = useLanguage();
  const [isTranslating, setIsTranslating] = useState(false);

  const translate = useCallback(async (text: string): Promise<string> => {
    if (!text || language === 'en') {
      return text;
    }

    setIsTranslating(true);
    try {
      const result = await translateText(text, language);
      return result;
    } finally {
      setIsTranslating(false);
    }
  }, [language]);

  return { translate, isTranslating };
}
