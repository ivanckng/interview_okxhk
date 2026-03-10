export type Exchange = 'binance' | 'bybit' | 'bitget';

export type AnnouncementType =
  | 'new_listing'
  | 'delisting'
  | 'activity'
  | 'product_update'
  | 'maintenance'
  | 'rule_change'
  | 'market';

export interface Announcement {
  id: string;
  exchange: Exchange;
  type: AnnouncementType;
  title: string;
  url: string;
  publishTime: string;
  importance: 'high' | 'medium' | 'low';
  description?: string;
  // AI analysis fields
  is_top?: boolean;
  impact_level?: 'critical' | 'high' | 'medium' | 'low';
  title_zh?: string;
  summary_zh?: string;
  isReal?: boolean;
  priority_score?: number;
  okx_action?: string;
}

export interface ExchangeConfig {
  id: Exchange;
  name: string;
  color: string;
  logo: string;
}
