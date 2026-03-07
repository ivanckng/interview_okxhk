export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  type?: 'text' | 'price_card' | 'news_card' | 'alert';
  metadata?: {
    cryptoSymbol?: string;
    newsTitle?: string;
    price?: number;
  };
}

export interface SuggestedQuestion {
  id: string;
  text: string;
  category: 'price' | 'news' | 'general' | 'company';
}
