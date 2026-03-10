import { Bitcoin, RefreshCw, Clock } from 'lucide-react';
import { useState, useEffect } from 'react';

export const Header = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

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
              <p className="text-gray-400 text-xs">实时市场情报</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4">
            {/* Last Updated */}
            <div className="hidden sm:flex items-center gap-2 text-gray-400 text-sm">
              <Clock size={16} />
              <span>{currentTime.toLocaleTimeString('en-US')}</span>
            </div>

            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              className="flex items-center gap-2 px-4 py-2 bg-crypto-dark hover:bg-crypto-border border border-crypto-border rounded-lg text-white text-sm transition-colors"
            >
              <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">刷新</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
