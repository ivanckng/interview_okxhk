export type NewsCategory = 
  | 'regulation' 
  | 'technology' 
  | 'market' 
  | 'security' 
  | 'adoption' 
  | 'defi' 
  | 'nft';

export type NewsPriority = 'high' | 'medium' | 'low';

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  sourceUrl: string;
  publishTime: string;
  category: NewsCategory;
  priority: NewsPriority;
  hotScore: number;
  imageUrl?: string;
  tags: string[];
}

export const newsCategoryLabels: Record<NewsCategory, string> = {
  regulation: 'Regulation',
  technology: 'Technology',
  market: 'Market',
  security: 'Security',
  adoption: 'Adoption',
  defi: 'DeFi',
  nft: 'NFT',
};

export const newsCategoryColors: Record<NewsCategory, string> = {
  regulation: '#ef4444',
  technology: '#3b82f6',
  market: '#10b981',
  security: '#f59e0b',
  adoption: '#8b5cf6',
  defi: '#06b6d4',
  nft: '#ec4899',
};
