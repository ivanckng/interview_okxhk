export interface CryptoData {
  id: string;
  symbol: string;
  name: string;
  icon: string;
  price: number;
  priceChange24h: number;
  priceChange7d: number;
  marketCap: number;
  volume24h: number;
  sparklineData: number[];
  category: 'major' | 'emerging' | 'growing';
  rank: number;
}

export interface CategoryConfig {
  id: string;
  title: string;
  description: string;
  filter: (crypto: CryptoData) => boolean;
}
