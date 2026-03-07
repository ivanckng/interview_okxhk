export interface MacroIndicator {
  id: string;
  name: string;
  symbol: string;
  value: number;
  change: number;
  changePercent: number;
  unit: string;
  lastUpdated: string;
  category: 'inflation' | 'rates' | 'employment' | 'growth' | 'activity' | 'trade' | 'equity' | 'forex' | 'volatility' | 'commodity';
  description: string;
}

export interface EconomicEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  timezone: string;
  country: string;
  impact: 'high' | 'medium' | 'low';
  forecast?: string;
  previous?: string;
  actual?: string;
}

export interface CryptoMarketData {
  totalCap: string;
  btcDominance: string;
  ethDominance: string;
  fearGreed: number;
  trend: 'bullish' | 'bearish' | 'neutral';
}
