import type { CryptoData } from '../types/crypto';
import { SparklineChart } from './SparklineChart';
import { formatPrice, formatNumber } from '../data/cryptoData';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface CryptoCardProps {
  crypto: CryptoData;
}

export const CryptoCard = ({ crypto }: CryptoCardProps) => {
  const isPositive24h = crypto.priceChange24h >= 0;
  const isPositive7d = crypto.priceChange7d >= 0;

  return (
    <div className="bg-okx-bg-secondary border border-okx-border rounded-lg p-4 hover:border-okx-border-light transition-all">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-black font-bold text-lg">
            {crypto.icon}
          </div>
          <div>
            <h3 className="font-medium text-white">{crypto.name}</h3>
            <span className="text-okx-text-secondary text-sm">{crypto.symbol}</span>
          </div>
        </div>
        <span className="text-xs text-okx-text-muted font-mono">#{crypto.rank}</span>
      </div>

      <div className="mb-3">
        <div className="text-xl font-bold text-white font-mono">
          ${formatPrice(crypto.price)}
        </div>
      </div>

      <div className="flex items-center gap-4 mb-3">
        <div className={`flex items-center gap-1 text-sm font-mono ${isPositive24h ? 'text-okx-up' : 'text-okx-down'}`}>
          {isPositive24h ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          <span>{isPositive24h ? '+' : ''}{crypto.priceChange24h.toFixed(2)}%</span>
          <span className="text-okx-text-muted text-xs ml-1">24h</span>
        </div>
        <div className={`flex items-center gap-1 text-sm font-mono ${isPositive7d ? 'text-okx-up' : 'text-okx-down'}`}>
          <span>{isPositive7d ? '+' : ''}{crypto.priceChange7d.toFixed(2)}%</span>
          <span className="text-okx-text-muted text-xs ml-1">7d</span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-okx-border">
        <SparklineChart 
          data={crypto.sparklineData} 
          width={90} 
          height={32} 
          isPositive={isPositive7d} 
        />
        <div className="text-right text-xs text-okx-text-secondary">
          <div>Vol <span className="text-white font-mono">{formatNumber(crypto.volume24h)}</span></div>
        </div>
      </div>
    </div>
  );
};
