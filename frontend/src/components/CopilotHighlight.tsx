import { Sparkles, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface CopilotHighlightProps {
  title?: string;
  summary: string;
  trend: 'up' | 'down' | 'neutral';
  trendLabel: string;
  keyPoints: string[];
}

const trendConfig = {
  up: { icon: TrendingUp, color: 'text-okx-up', bg: 'bg-okx-up/10', border: 'border-okx-up/30' },
  down: { icon: TrendingDown, color: 'text-okx-down', bg: 'bg-okx-down/10', border: 'border-okx-down/30' },
  neutral: { icon: Minus, color: 'text-okx-text-secondary', bg: 'bg-okx-text-secondary/10', border: 'border-okx-text-secondary/30' },
};

export const CopilotHighlight = ({ title, summary, trend, trendLabel, keyPoints }: CopilotHighlightProps) => {
  const TrendIcon = trendConfig[trend].icon;
  const trendColor = trendConfig[trend].color;
  const trendBg = trendConfig[trend].bg;
  const trendBorder = trendConfig[trend].border;

  return (
    <div
      className="relative rounded-lg p-4 mb-6 overflow-hidden"
      style={{
        boxShadow: '0 0 0 1px rgba(255,255,255,0.2), 0 0 20px rgba(255,255,255,0.08)',
        border: '1px solid rgba(255,255,255,0.15)',
        background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)'
      }}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center flex-shrink-0">
          <Sparkles className="text-black" size={20} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            {title && <h2 className="text-white font-semibold">{title}</h2>}
            <span className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${trendBg} ${trendColor} ${trendBorder}`}>
              <TrendIcon size={12} />
              {trendLabel}
            </span>
          </div>
          <p className="text-okx-text-secondary text-sm mb-3">{summary}</p>
          <div className="flex flex-wrap gap-2">
            {keyPoints.map((point, idx) => (
              <span
                key={idx}
                className="text-xs bg-okx-bg-secondary border border-okx-border text-okx-text-secondary px-2 py-1 rounded"
              >
                {point}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
