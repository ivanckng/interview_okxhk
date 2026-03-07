import type { Announcement, ExchangeConfig, Exchange, AnnouncementType } from '../types/company';

export const exchanges: ExchangeConfig[] = [
  { id: 'binance', name: 'Binance', color: '#f0b90b', logo: 'B' },
  { id: 'bybit', name: 'ByBit', color: '#00b897', logo: 'BB' },
  { id: 'bitget', name: 'Bitget', color: '#00a2ff', logo: 'BG' },
];

const announcementTypeConfig: Record<AnnouncementType, { label: string; color: string }> = {
  new_listing: { label: 'New Listing', color: '#10b981' },
  delisting: { label: 'Delisting', color: '#ef4444' },
  activity: { label: 'Activity', color: '#8b5cf6' },
  product_update: { label: 'Product', color: '#3b82f6' },
  maintenance: { label: 'Maintenance', color: '#f59e0b' },
  rule_change: { label: 'Rule Change', color: '#6b7280' },
};

export const getAnnouncementTypeLabel = (type: AnnouncementType): string => {
  return announcementTypeConfig[type].label;
};

export const getAnnouncementTypeColor = (type: AnnouncementType): string => {
  return announcementTypeConfig[type].color;
};

// Generate mock data with recent timestamps
const generateTimestamp = (hoursAgo: number): string => {
  const date = new Date();
  date.setHours(date.getHours() - hoursAgo);
  return date.toISOString();
};

export const announcements: Announcement[] = [
  // Binance Announcements
  {
    id: 'bin-001',
    exchange: 'binance',
    type: 'new_listing',
    title: 'Binance Will List BERA (Berachain)',
    url: 'https://www.binance.com/en/support/announcement/',
    publishTime: generateTimestamp(2),
    importance: 'high',
    description: 'Binance will list BERA with trading pairs BERA/USDT, BERA/BTC available.',
  },
  {
    id: 'bin-002',
    exchange: 'binance',
    type: 'activity',
    title: 'Launchpool: Stake BNB to Earn SUI Rewards',
    url: 'https://www.binance.com/en/support/announcement/',
    publishTime: generateTimestamp(5),
    importance: 'high',
    description: 'Stake your BNB to earn SUI tokens. 50,000,000 SUI in total rewards.',
  },
  {
    id: 'bin-003',
    exchange: 'binance',
    type: 'product_update',
    title: 'Binance Futures Will Launch USDC-Margined DOGE Perpetual Contracts',
    url: 'https://www.binance.com/en/support/announcement/',
    publishTime: generateTimestamp(8),
    importance: 'medium',
    description: 'New DOGEUSDC perpetual contract with up to 75x leverage.',
  },
  {
    id: 'bin-004',
    exchange: 'binance',
    type: 'delisting',
    title: 'Binance Will Delist Several Spot Trading Pairs',
    url: 'https://www.binance.com/en/support/announcement/',
    publishTime: generateTimestamp(12),
    importance: 'high',
    description: 'Trading pairs being removed: LTC/BUSD, ADA/BUSD on 2025-03-15.',
  },
  {
    id: 'bin-005',
    exchange: 'binance',
    type: 'maintenance',
    title: 'Scheduled System Upgrade',
    url: 'https://www.binance.com/en/support/announcement/',
    publishTime: generateTimestamp(18),
    importance: 'medium',
    description: 'System upgrade scheduled for 2025-03-10 02:00 UTC. Trading will be suspended.',
  },
  {
    id: 'bin-006',
    exchange: 'binance',
    type: 'rule_change',
    title: 'Updated Margin Trading Rules',
    url: 'https://www.binance.com/en/support/announcement/',
    publishTime: generateTimestamp(24),
    importance: 'low',
    description: 'New margin requirements for isolated margin accounts effective immediately.',
  },

  // ByBit Announcements
  {
    id: 'byb-001',
    exchange: 'bybit',
    type: 'new_listing',
    title: 'ByBit Lists MOVE (Movement) on Spot Market',
    url: 'https://announcements.bybit.com/',
    publishTime: generateTimestamp(1),
    importance: 'high',
    description: 'MOVE/USDT spot trading now available with zero trading fees for 7 days.',
  },
  {
    id: 'byb-002',
    exchange: 'bybit',
    type: 'activity',
    title: 'Trade SEI and Win from 100,000 USDT Prize Pool',
    url: 'https://announcements.bybit.com/',
    publishTime: generateTimestamp(4),
    importance: 'medium',
    description: 'Trade SEI perpetual contracts to qualify for rewards.',
  },
  {
    id: 'byb-003',
    exchange: 'bybit',
    type: 'product_update',
    title: 'Copy Trading 2.0 Launch',
    url: 'https://announcements.bybit.com/',
    publishTime: generateTimestamp(7),
    importance: 'medium',
    description: 'Enhanced copy trading with risk management tools and leaderboards.',
  },
  {
    id: 'byb-004',
    exchange: 'bybit',
    type: 'new_listing',
    title: 'TIA (Celestia) Now Available for Options Trading',
    url: 'https://announcements.bybit.com/',
    publishTime: generateTimestamp(10),
    importance: 'medium',
    description: 'TIA options with weekly and monthly expiries now live.',
  },
  {
    id: 'byb-005',
    exchange: 'bybit',
    type: 'maintenance',
    title: 'Spot Trading System Maintenance',
    url: 'https://announcements.bybit.com/',
    publishTime: generateTimestamp(16),
    importance: 'low',
    description: 'Brief maintenance window for spot order matching engine.',
  },
  {
    id: 'byb-006',
    exchange: 'bybit',
    type: 'activity',
    title: 'APT Staking: Earn Up to 15% APY',
    url: 'https://announcements.bybit.com/',
    publishTime: generateTimestamp(20),
    importance: 'medium',
    description: 'Limited-time staking event for Aptos holders.',
  },

  // Bitget Announcements
  {
    id: 'bit-001',
    exchange: 'bitget',
    type: 'new_listing',
    title: 'Bitget Lists SEI with Trading Competition',
    url: 'https://www.bitget.com/support/',
    publishTime: generateTimestamp(3),
    importance: 'high',
    description: 'SEI/USDT trading live. Top 100 traders share 50,000 USDT.',
  },
  {
    id: 'bit-002',
    exchange: 'bitget',
    type: 'activity',
    title: 'SUI Launchpad: Subscribe with BGB',
    url: 'https://www.bitget.com/support/',
    publishTime: generateTimestamp(6),
    importance: 'high',
    description: 'Bitget Launchpad new project - commit BGB to participate.',
  },
  {
    id: 'bit-003',
    exchange: 'bitget',
    type: 'product_update',
    title: 'Grid Trading Now Supports 50+ Trading Pairs',
    url: 'https://www.bitget.com/support/',
    publishTime: generateTimestamp(9),
    importance: 'low',
    description: 'Expanded grid trading support including RNDR, INJ, and more.',
  },
  {
    id: 'bit-004',
    exchange: 'bitget',
    type: 'new_listing',
    title: 'APT/USDT Perpetual Contract Live',
    url: 'https://www.bitget.com/support/',
    publishTime: generateTimestamp(11),
    importance: 'medium',
    description: 'Trade APT perpetual with up to 50x leverage.',
  },
  {
    id: 'bit-005',
    exchange: 'bitget',
    type: 'rule_change',
    title: 'Updated KYC Requirements',
    url: 'https://www.bitget.com/support/',
    publishTime: generateTimestamp(15),
    importance: 'medium',
    description: 'Enhanced KYC verification required for withdrawals over 10,000 USDT.',
  },
  {
    id: 'bit-006',
    exchange: 'bitget',
    type: 'activity',
    title: 'Referral Program: Earn 40% Commission',
    url: 'https://www.bitget.com/support/',
    publishTime: generateTimestamp(22),
    importance: 'low',
    description: 'Invite friends and earn up to 40% trading fee commission.',
  },
];

// Sort by publish time (newest first)
export const getSortedAnnouncements = (): Announcement[] => {
  return [...announcements].sort(
    (a, b) => new Date(b.publishTime).getTime() - new Date(a.publishTime).getTime()
  );
};

export const getAnnouncementsByExchange = (exchange: Exchange): Announcement[] => {
  return getSortedAnnouncements().filter(a => a.exchange === exchange);
};

// Format relative time
export const formatRelativeTime = (timestamp: string): string => {
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
};
