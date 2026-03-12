/**
 * API Service for Crypto Pulse Backend
 */
import { API_BASE_URL } from './config';

// Types
export interface ProcessedNews {
  id: string;
  title: string;
  summary: string;
  source: string;
  source_url?: string;
  publish_time: string;
  category: string;
  priority: string;
  hot_score: number;
  tags: string[];
  sentiment?: string;
  key_topics: string[];
  processed_at: string;
}

export interface HighlightSummary {
  title: string;
  summary: string;
  trend: 'bullish' | 'bearish' | 'mixed' | 'neutral';
  highlights: string[];
  generated_at: string;
}

export interface PulseSummary {
  market_pulse: string;
  key_insights: string[];
  trend_prediction: {
    '7d': string;
    '30d': string;
  };
  risk_alerts: string[];
  action_items: string[];
  hot_sectors: string[];
  overall_sentiment: string;
}

export interface PulseRecommendation {
  recommendation_type: string;
  title: string;
  description: string;
  confidence: number;
  related_items: string[];
  action_items: string[];
}

export interface TrendPrediction {
  timeframe: string;
  overall_trend: string;
  category_trends: Record<string, {
    trend: string;
    strength: number;
    sentiment_score: number;
  }>;
  prediction_confidence: number;
  key_drivers: string[];
}

// API Client
class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async fetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // Health Check
  async healthCheck() {
    return this.fetch<{ status: string; services: Record<string, boolean> }>('/health');
  }

  // News APIs
  async getNews(params?: { category?: string; priority?: string; limit?: number }): Promise<ProcessedNews[]> {
    const queryParams = new URLSearchParams();
    if (params?.category) queryParams.set('category', params.category);
    if (params?.priority) queryParams.set('priority', params.priority);
    if (params?.limit) queryParams.set('limit', params.limit.toString());
    
    const query = queryParams.toString();
    return this.fetch<ProcessedNews[]>(`/api/news${query ? `?${query}` : ''}`);
  }

  async getTrendingNews(limit: number = 10): Promise<ProcessedNews[]> {
    return this.fetch<ProcessedNews[]>(`/api/news/trending?limit=${limit}`);
  }

  async refreshNews(): Promise<{ message: string; processed: number; timestamp: string }> {
    return this.fetch('/api/news/refresh', { method: 'POST' });
  }

  // Highlight APIs
  async getNewsHighlight(): Promise<HighlightSummary> {
    return this.fetch<HighlightSummary>('/api/highlights/news');
  }

  async getMarketsHighlight(): Promise<HighlightSummary> {
    return this.fetch<HighlightSummary>('/api/highlights/markets');
  }

  async getCompanyHighlight(): Promise<HighlightSummary> {
    return this.fetch<HighlightSummary>('/api/highlights/company');
  }

  async getCryptoHighlight(): Promise<HighlightSummary> {
    return this.fetch<HighlightSummary>('/api/highlights/crypto');
  }

  // Pulse APIs (Qwen Agent)
  async getPulseSummary(): Promise<PulseSummary> {
    return this.fetch<PulseSummary>('/api/pulse/summary');
  }

  async getPulseRecommendations(): Promise<{ recommendations: PulseRecommendation[] }> {
    return this.fetch<{ recommendations: PulseRecommendation[] }>('/api/pulse/recommendations');
  }

  async getPulseTrends(timeframe: string = '7d'): Promise<TrendPrediction> {
    return this.fetch<TrendPrediction>(`/api/pulse/trends?timeframe=${timeframe}`);
  }

  // Market Data APIs
  async getMarketData(): Promise<{ data: any; highlight: HighlightSummary; sources: string[]; coverage: string; last_updated?: string }> {
    return this.fetch('/api/market/data');
  }

  async getMarketCountries(): Promise<{ countries: string[]; total: number; sources: string[] }> {
    return this.fetch('/api/market/countries');
  }

  async getCountryMarketData(countryId: string): Promise<any> {
    return this.fetch(`/api/market/country/${countryId}`);
  }

  async getEconomicCalendar(): Promise<{ events: any[] }> {
    return this.fetch('/api/market/economic-calendar');
  }

  async getCountryIndices(countryId: string): Promise<{ country_id: string; country_name: string; timestamp: string; indices: any[] }> {
    return this.fetch(`/api/market/indices/${countryId}`);
  }

  async getAllIndices(): Promise<{ timestamp: string; indices_by_country: Record<string, any[]> }> {
    return this.fetch('/api/market/indices');
  }

  async getCommodities(): Promise<{ timestamp: string; commodities: Record<string, any> }> {
    return this.fetch('/api/market/commodities');
  }

  // Crypto Price APIs
  async getCryptoPrices(limit: number = 20): Promise<{ coins: any[]; global: any; highlight: HighlightSummary }> {
    return this.fetch(`/api/crypto/prices?limit=${limit}`);
  }

  async getCoinDetail(coinId: string): Promise<any> {
    return this.fetch(`/api/crypto/coin/${coinId}`);
  }
}

export const api = new ApiClient(API_BASE_URL);

// Helper to format relative time
export function formatRelativeTime(timestamp: string): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Helper to get category color
export function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    regulation: 'text-orange-400',
    technology: 'text-blue-400',
    market: 'text-green-400',
    security: 'text-red-400',
    adoption: 'text-purple-400',
    defi: 'text-cyan-400',
    nft: 'text-pink-400',
  };
  return colors[category] || 'text-gray-400';
}

// Helper to get priority styles
export function getPriorityStyles(priority: string): { bg: string; text: string } {
  switch (priority) {
    case 'high':
      return { bg: 'bg-red-500/20', text: 'text-red-400' };
    case 'medium':
      return { bg: 'bg-yellow-500/20', text: 'text-yellow-400' };
    case 'low':
      return { bg: 'bg-gray-500/20', text: 'text-gray-400' };
    default:
      return { bg: 'bg-gray-500/20', text: 'text-gray-400' };
  }
}

// Helper to get trend color
export function getTrendColor(trend: string): string {
  switch (trend) {
    case 'bullish':
      return 'text-green-400';
    case 'bearish':
      return 'text-red-400';
    case 'mixed':
      return 'text-yellow-400';
    default:
      return 'text-gray-400';
  }
}
