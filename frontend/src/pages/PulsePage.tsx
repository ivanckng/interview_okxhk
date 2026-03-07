import { Newspaper, BarChart3, Building2, Bitcoin, TrendingUp, AlertTriangle, Sparkles, ChevronRight } from 'lucide-react';
import { useState, useEffect } from 'react';

const modules = [
  {
    title: 'News',
    icon: Newspaper,
    color: '#00c087',
    summary: 'SEC approves Bitcoin ETF options. EU MiCA fully effective. Regulatory clarity improving.',
    trend: 'up',
  },
  {
    title: 'Markets',
    icon: BarChart3,
    color: '#2e9fff',
    summary: 'Fear & Greed at 78. BTC dominance 54.2%. Altcoin season indicators emerging.',
    trend: 'up',
  },
  {
    title: 'Company',
    icon: Building2,
    color: '#f0a93c',
    summary: 'Binance leads with BERA listing. ByBit zero-fee MOVE trading. Competition intensifies.',
    trend: 'up',
  },
  {
    title: 'Crypto',
    icon: Bitcoin,
    color: '#8b5cf6',
    summary: 'Major coins up 2-5%. SOL, SUI, APT leading. DeFi TVL climbing steadily.',
    trend: 'up',
  },
];

const predictions = [
  { timeframe: '7 Days', prediction: 'Bitcoin tests $95K resistance. Profit-taking likely. Consolidation expected.', confidence: 72 },
  { timeframe: '30 Days', prediction: 'Q1 institutional allocations drive BTC to $100K+. Altcoin season begins.', confidence: 65 },
  { timeframe: '90 Days', prediction: 'Regulatory clarity brings TradFi. Crypto market cap exceeds $4T.', confidence: 58 },
];

const competitors: { exchange: string; alert: string; impact: 'high' | 'medium' | 'low' }[] = [
  { exchange: 'Binance', alert: 'Zero-fee campaign for new listings. Capturing retail flow.', impact: 'high' },
  { exchange: 'ByBit', alert: 'Copy Trading 2.0 with risk tools. Targeting retail traders.', impact: 'medium' },
  { exchange: 'Bitget', alert: 'Launchpad participation increasing. Lowering staking requirements.', impact: 'medium' },
];

// Marquee/Ticker Component
const ModuleTicker = () => {
  const [isPaused, setIsPaused] = useState(false);

  return (
    <div className="relative overflow-hidden py-2">
      <div 
        className={`flex gap-4 ${isPaused ? '' : 'animate-marquee'}`}
        style={{
          animation: isPaused ? 'none' : 'marquee 30s linear infinite',
        }}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {/* Duplicate modules for seamless loop */}
        {[...modules, ...modules].map((module, idx) => {
          const Icon = module.icon;
          return (
            <div
              key={idx}
              className="flex-shrink-0 w-[280px] bg-okx-bg-secondary rounded-lg p-4 cursor-pointer group"
              style={{ 
                boxShadow: '0 0 0 1px rgba(255,255,255,0.25), 0 0 20px rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)'
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded flex items-center justify-center" style={{ backgroundColor: module.color + '20' }}>
                  <Icon size={16} style={{ color: module.color }} />
                </div>
                <span className="text-white font-medium">{module.title}</span>
                <ChevronRight size={14} className="text-okx-text-muted ml-auto group-hover:text-white transition-colors" />
              </div>
              <p className="text-okx-text-secondary text-xs line-clamp-2">{module.summary}</p>
            </div>
          );
        })}
      </div>
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
};

export const PulsePage = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div>
      {/* Daily Market Pulse - OKX Style with glow */}
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
            <div className="flex items-center gap-3 mb-2">
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
            <p className="text-okx-text-secondary text-sm leading-relaxed">
              Market sentiment is <span className="text-okx-up font-medium">bullish</span> with Bitcoin breaking $90K resistance. 
              Institutional adoption accelerates with new ETF approvals. Exchange competition intensifies. 
              <span className="text-okx-down font-medium"> Macro headwinds</span> remain as Fed maintains hawkish stance.
            </p>
            <div className="flex items-center gap-6 mt-3 text-xs">
              <span className="text-okx-text-muted">Sources: <span className="text-white">24</span></span>
              <span className="text-okx-text-muted">Confidence: <span className="text-white">87%</span></span>
              <span className="text-okx-text-muted">Updated: <span className="text-white">Just now</span></span>
            </div>
          </div>
        </div>
      </div>

      {/* Module Intelligence - Horizontal Scrolling Ticker */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white font-medium">Module Intelligence</h2>
          <span className="text-okx-text-muted text-xs">Hover to pause</span>
        </div>
        <ModuleTicker />
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Forward Predictions */}
        <div className="bg-okx-bg-secondary border border-okx-border rounded-lg">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-okx-border">
            <TrendingUp size={16} className="text-okx-accent" />
            <h2 className="text-white font-medium text-sm">Forward Predictions</h2>
          </div>
          <div className="divide-y divide-okx-border">
            {predictions.map((pred) => (
              <div key={pred.timeframe} className="px-4 py-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-okx-text-muted text-xs">{pred.timeframe}</span>
                  <span 
                    className="text-xs font-mono"
                    style={{ color: pred.confidence > 70 ? '#00c087' : pred.confidence > 50 ? '#f0a93c' : '#ff4d4f' }}
                  >
                    {pred.confidence}% confidence
                  </span>
                </div>
                <p className="text-white text-sm">{pred.prediction}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Competitive Landscape */}
        <div className="bg-okx-bg-secondary border border-okx-border rounded-lg">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-okx-border">
            <AlertTriangle size={16} className="text-okx-warning" />
            <h2 className="text-white font-medium text-sm">Competitive Landscape</h2>
          </div>
          <div className="divide-y divide-okx-border">
            {competitors.map((comp) => {
              const impactColors = {
                high: 'text-okx-down bg-okx-down/10 border-okx-down/30',
                medium: 'text-okx-warning bg-okx-warning/10 border-okx-warning/30',
                low: 'text-okx-text-secondary bg-okx-text-secondary/10 border-okx-text-secondary/30',
              };
              return (
                <div key={comp.exchange} className="px-4 py-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-white text-sm font-medium">{comp.exchange}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${impactColors[comp.impact]}`}>
                      {comp.impact.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-okx-text-secondary text-xs">{comp.alert}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
