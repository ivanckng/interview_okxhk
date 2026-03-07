import { useEffect, useState, useRef } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { translateText, getCachedTranslation } from '../services/translation';

interface TranslatableTextProps {
  children: string;
  className?: string;
}

/**
 * 自动翻译文本组件
 * 使用DeepL API实时翻译
 */
export function TranslatableText({ children, className = '' }: TranslatableTextProps) {
  const { language } = useLanguage();
  const [translatedText, setTranslatedText] = useState(children);
  const [isLoading, setIsLoading] = useState(false);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    
    async function translate() {
      // 英文直接返回原文
      if (language === 'en' || !children) {
        setTranslatedText(children);
        return;
      }

      // 检查缓存
      const cached = getCachedTranslation(children, language);
      if (cached) {
        setTranslatedText(cached);
        return;
      }

      // 显示加载状态
      setIsLoading(true);
      
      try {
        const result = await translateText(children, language);
        if (isMounted.current) {
          setTranslatedText(result);
        }
      } catch (error) {
        console.error('Translation error:', error);
        if (isMounted.current) {
          setTranslatedText(children);
        }
      } finally {
        if (isMounted.current) {
          setIsLoading(false);
        }
      }
    }

    translate();

    return () => {
      isMounted.current = false;
    };
  }, [children, language]);

  return (
    <span className={`${className} ${isLoading ? 'opacity-70' : ''}`}>
      {translatedText}
    </span>
  );
}

/**
 * 批量翻译组件（用于列表）
 */
export function useTranslatableTexts(texts: string[]): string[] {
  const { language } = useLanguage();
  const [translatedTexts, setTranslatedTexts] = useState<string[]>(texts);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    
    async function translateAll() {
      if (language === 'en') {
        setTranslatedTexts(texts);
        return;
      }

      const results: string[] = [];
      
      for (const text of texts) {
        if (!text) {
          results.push('');
          continue;
        }

        // 检查缓存
        const cached = getCachedTranslation(text, language);
        if (cached) {
          results.push(cached);
          continue;
        }

        try {
          const result = await translateText(text, language);
          results.push(result);
          // 延迟避免频率限制
          await new Promise(resolve => setTimeout(resolve, 150));
        } catch (error) {
          results.push(text);
        }

        // 更新中间结果
        if (isMounted.current) {
          setTranslatedTexts([...results, ...texts.slice(results.length)]);
        }
      }

      if (isMounted.current) {
        setTranslatedTexts(results);
      }
    }

    translateAll();

    return () => {
      isMounted.current = false;
    };
  }, [texts, language]);

  return translatedTexts;
}
