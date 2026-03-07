import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';

export type Language = 'zh' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (text: string) => string;
  isTranslating: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// 简单的缓存机制
const translationCache: Record<string, Record<string, string>> = {
  zh: {},
  en: {}
};

// 本地存储键
const STORAGE_KEY = 'preferred-language';

export function LanguageProvider({ children }: { children: ReactNode }) {
  // 从localStorage读取语言偏好，默认英文
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY) as Language;
      if (saved && (saved === 'zh' || saved === 'en')) {
        return saved;
      }
    }
    return 'en';
  });
  
  const [isTranslating, setIsTranslating] = useState(false);

  // 保存到localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, language);
    }
  }, [language]);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
  }, []);

  // 翻译函数
  const t = useCallback((text: string): string => {
    if (!text) return '';
    
    // 如果当前是英文，直接返回原文
    if (language === 'en') {
      return text;
    }

    // 检查缓存
    if (translationCache[language][text]) {
      return translationCache[language][text];
    }

    // 返回原文（异步翻译会在组件中处理）
    return text;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isTranslating }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
