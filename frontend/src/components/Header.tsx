import { Bitcoin, RefreshCw, Clock, Globe } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

export const Header = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const { language, setLanguage, t } = useLanguage();
  const langMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 点击外部关闭语言菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (langMenuRef.current && !langMenuRef.current.contains(event.target as Node)) {
        setShowLangMenu(false);
      }
    };

    if (showLangMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showLangMenu]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const handleLanguageChange = (lang: 'zh' | 'en') => {
    setLanguage(lang);
    localStorage.setItem('preferred-language', lang);
    setShowLangMenu(false);
    // 刷新页面以应用翻译
    window.location.reload();
  };

  const languageLabel = language === 'zh' ? '简体中文' : 'English';

  return (
    <header className="bg-crypto-card border-b border-crypto-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-yellow-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
              <Bitcoin className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Crypto <span className="text-gray-400">Pulse</span></h1>
              <p className="text-gray-400 text-xs">{t('Real-time Market Intelligence')}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4">
            {/* Last Updated */}
            <div className="hidden sm:flex items-center gap-2 text-gray-400 text-sm">
              <Clock size={16} />
              <span>{currentTime.toLocaleTimeString('en-US')}</span>
            </div>

            {/* Language Selector */}
            <div className="relative" ref={langMenuRef}>
              <button
                onClick={() => setShowLangMenu(!showLangMenu)}
                className="flex items-center gap-2 px-3 py-2 bg-crypto-dark hover:bg-crypto-border border border-crypto-border rounded-lg text-white text-sm transition-colors"
              >
                <Globe size={16} />
                <span>{languageLabel}</span>
              </button>

              {showLangMenu && (
                <div className="absolute right-0 mt-2 w-40 bg-crypto-card border border-crypto-border rounded-lg shadow-xl z-50">
                  <button
                    onClick={() => handleLanguageChange('en')}
                    className={`w-full px-4 py-2 text-left text-sm transition-colors hover:bg-crypto-dark rounded-t-lg ${
                      language === 'en' ? 'text-orange-500' : 'text-white'
                    }`}
                  >
                    English
                  </button>
                  <button
                    onClick={() => handleLanguageChange('zh')}
                    className={`w-full px-4 py-2 text-left text-sm transition-colors hover:bg-crypto-dark rounded-b-lg ${
                      language === 'zh' ? 'text-orange-500' : 'text-white'
                    }`}
                  >
                    简体中文
                  </button>
                </div>
              )}
            </div>

            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              className="flex items-center gap-2 px-4 py-2 bg-crypto-dark hover:bg-crypto-border border border-crypto-border rounded-lg text-white text-sm transition-colors"
            >
              <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">{t('Refresh')}</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
