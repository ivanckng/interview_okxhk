import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { Bitcoin, Building2, RefreshCw, Clock, Newspaper, BarChart3, Sparkles, Globe } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { ChatBot } from './ChatBot';
import { useLanguage, type Language } from '../contexts/LanguageContext';
import { TranslatableText } from './TranslatableText';

export const Layout = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const location = useLocation();
  const { language, setLanguage } = useLanguage();
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

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('preferred-language', lang);
    setShowLangMenu(false);
    window.location.reload();
  };

  const languageLabel = language === 'zh' ? '简体中文' : 'English';

  const navItems = [
    { path: '/', labelKey: 'Pulse', icon: Sparkles },
    { path: '/news', labelKey: 'News', icon: Newspaper },
    { path: '/markets', labelKey: 'Markets', icon: BarChart3 },
    { path: '/company', labelKey: 'Company', icon: Building2 },
    { path: '/crypto', labelKey: 'Crypto', icon: Bitcoin },
  ];

  return (
    <div className="min-h-screen bg-black">
      {/* Header - OKX Style */}
      <header className="bg-black border-b border-okx-border sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white rounded flex items-center justify-center">
                <Bitcoin className="text-black" size={20} />
              </div>
              <span className="text-white font-semibold text-lg tracking-tight hidden sm:block">Crypto</span>
              <span className="text-okx-text-muted text-lg hidden sm:block">Pulse</span>
            </div>

            {/* Navigation - OKX Style */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path || 
                  (item.path !== '/' && location.pathname.startsWith(item.path));
                
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive: navActive }) =>
                      `flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-all border-b-2 ${
                        (navActive || isActive)
                          ? 'text-white border-white'
                          : 'text-okx-text-secondary border-transparent hover:text-white'
                      }`
                    }
                  >
                    <Icon size={16} />
                    <span><TranslatableText>{item.labelKey}</TranslatableText></span>
                  </NavLink>
                );
              })}
            </nav>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-1.5 text-okx-text-muted text-xs">
                <Clock size={12} />
                <span className="font-mono">{currentTime.toLocaleString('en-HK', { 
                  year: 'numeric', 
                  month: '2-digit', 
                  day: '2-digit',
                  hour: '2-digit', 
                  minute: '2-digit',
                  hour12: false 
                })} HKT</span>
              </div>

              {/* Language Selector */}
              <div className="relative" ref={langMenuRef}>
                <button
                  onClick={() => setShowLangMenu(!showLangMenu)}
                  className="flex items-center gap-1.5 px-2 py-1 text-xs text-okx-text-secondary hover:text-white transition-colors border border-okx-border rounded hover:border-okx-border-light"
                >
                  <Globe size={12} />
                  <span>{languageLabel}</span>
                </button>

                {showLangMenu && (
                  <div className="absolute right-0 mt-1 w-32 bg-okx-bg-secondary border border-okx-border rounded-lg shadow-xl z-50">
                    <button
                      onClick={() => handleLanguageChange('en')}
                      className={`w-full px-3 py-2 text-left text-xs transition-colors hover:bg-okx-border rounded-t-lg ${
                        language === 'en' ? 'text-white bg-white/10' : 'text-okx-text-secondary'
                      }`}
                    >
                      English
                    </button>
                    <button
                      onClick={() => handleLanguageChange('zh')}
                      className={`w-full px-3 py-2 text-left text-xs transition-colors hover:bg-okx-border rounded-b-lg ${
                        language === 'zh' ? 'text-white bg-white/10' : 'text-okx-text-secondary'
                      }`}
                    >
                      简体中文
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={handleRefresh}
                className="p-2 text-okx-text-secondary hover:text-white transition-colors"
              >
                <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          <nav className="flex md:hidden items-center gap-1 pb-2 overflow-x-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path || 
                (item.path !== '/' && location.pathname.startsWith(item.path));
              
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive: navActive }) =>
                    `flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium whitespace-nowrap transition-all ${
                      (navActive || isActive)
                        ? 'text-white bg-white/10'
                        : 'text-okx-text-secondary hover:text-white'
                    }`
                  }
                >
                  <Icon size={14} />
                  <span><TranslatableText>{item.labelKey}</TranslatableText></span>
                </NavLink>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-okx-border mt-auto bg-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-okx-text-muted text-xs text-center">
            <TranslatableText>Data is for demonstration purposes only</TranslatableText>
          </p>
        </div>
      </footer>

      {/* Chat Bot */}
      <ChatBot />
    </div>
  );
};
