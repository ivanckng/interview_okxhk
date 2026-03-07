export type Exchange = 'binance' | 'bybit' | 'bitget';

export type AnnouncementType = 
  | 'new_listing' 
  | 'delisting' 
  | 'activity' 
  | 'product_update' 
  | 'maintenance' 
  | 'rule_change';

export interface Announcement {
  id: string;
  exchange: Exchange;
  type: AnnouncementType;
  title: string;
  url: string;
  publishTime: string;
  importance: 'high' | 'medium' | 'low';
  description?: string;
}

export interface ExchangeConfig {
  id: Exchange;
  name: string;
  color: string;
  logo: string;
}
