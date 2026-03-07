import type { NewsItem } from '../types/news';

const generateTimestamp = (hoursAgo: number): string => {
  const date = new Date();
  date.setHours(date.getHours() - hoursAgo);
  return date.toISOString();
};

export const newsData: NewsItem[] = [
  // High Priority - Regulation
  {
    id: 'news-001',
    title: 'SEC Approves First Bitcoin Spot ETF Options Trading',
    summary: 'The U.S. Securities and Exchange Commission has approved options trading on spot Bitcoin ETFs, marking a significant milestone for cryptocurrency adoption in traditional finance.',
    source: 'CoinDesk',
    sourceUrl: 'https://coindesk.com',
    publishTime: generateTimestamp(2),
    category: 'regulation',
    priority: 'high',
    hotScore: 98,
    tags: ['ETF', 'SEC', 'Bitcoin', 'TradFi'],
  },
  {
    id: 'news-002',
    title: 'EU MiCA Regulation Full Implementation Begins',
    summary: 'The Markets in Crypto-Assets Regulation is now fully effective across all EU member states, establishing comprehensive frameworks for crypto asset service providers.',
    source: 'The Block',
    sourceUrl: 'https://theblock.co',
    publishTime: generateTimestamp(4),
    category: 'regulation',
    priority: 'high',
    hotScore: 92,
    tags: ['MiCA', 'EU', 'Compliance'],
  },

  // High Priority - Market
  {
    id: 'news-003',
    title: 'Bitcoin Surges Past $90,000 as Institutional Demand Soars',
    summary: 'Bitcoin reached a new all-time high above $90,000 driven by unprecedented institutional inflows and corporate treasury adoption.',
    source: 'CoinTelegraph',
    sourceUrl: 'https://cointelegraph.com',
    publishTime: generateTimestamp(1),
    category: 'market',
    priority: 'high',
    hotScore: 95,
    tags: ['Bitcoin', 'ATH', 'Institutional'],
  },
  {
    id: 'news-004',
    title: 'Ethereum Network Activity Hits Record High as Layer 2 Adoption Accelerates',
    summary: 'Daily active addresses on Ethereum mainnet and L2s combined exceeded 10 million for the first time, driven by DeFi and gaming applications.',
    source: 'Decrypt',
    sourceUrl: 'https://decrypt.co',
    publishTime: generateTimestamp(3),
    category: 'market',
    priority: 'high',
    hotScore: 88,
    tags: ['Ethereum', 'L2', 'DeFi'],
  },

  // Technology
  {
    id: 'news-005',
    title: 'Solana Announces Firedancer Mainnet Launch Date',
    summary: 'Jump Crypto\'s Firedancer validator client will go live on Solana mainnet next month, promising 10x throughput improvement.',
    source: 'CoinDesk',
    sourceUrl: 'https://coindesk.com',
    publishTime: generateTimestamp(5),
    category: 'technology',
    priority: 'high',
    hotScore: 85,
    tags: ['Solana', 'Firedancer', 'Validator'],
  },
  {
    id: 'news-006',
    title: 'Ethereum Pectra Upgrade Testnet Successfully Deployed',
    summary: 'The highly anticipated Pectra upgrade has been successfully activated on the Holesky testnet, bringing Verkle trees and EOF.',
    source: 'EthHub',
    sourceUrl: 'https://ethhub.io',
    publishTime: generateTimestamp(6),
    category: 'technology',
    priority: 'medium',
    hotScore: 76,
    tags: ['Ethereum', 'Upgrade', 'Pectra'],
  },
  {
    id: 'news-007',
    title: 'Sui Introduces Parallel Execution Engine Update',
    summary: 'Sui Network\'s Mysticeti upgrade reduces consensus latency to under 400ms, making it one of the fastest Layer 1 blockchains.',
    source: 'The Block',
    sourceUrl: 'https://theblock.co',
    publishTime: generateTimestamp(8),
    category: 'technology',
    priority: 'medium',
    hotScore: 72,
    tags: ['Sui', 'Consensus', 'Performance'],
  },

  // DeFi
  {
    id: 'news-008',
    title: 'Aave V4 Protocol Design Proposed with Unified Liquidity Layer',
    summary: 'The Aave team has proposed a major protocol upgrade featuring cross-chain liquidity and enhanced capital efficiency.',
    source: 'DeFi Llama',
    sourceUrl: 'https://defillama.com',
    publishTime: generateTimestamp(7),
    category: 'defi',
    priority: 'medium',
    hotScore: 74,
    tags: ['Aave', 'DeFi', 'Upgrade'],
  },
  {
    id: 'news-009',
    title: 'Uniswap v4 Launch Attracts $500M TVL in First Week',
    summary: 'The latest version of Uniswap\'s DEX protocol has seen massive adoption with custom hooks driving innovation in AMM design.',
    source: 'CoinTelegraph',
    sourceUrl: 'https://cointelegraph.com',
    publishTime: generateTimestamp(10),
    category: 'defi',
    priority: 'medium',
    hotScore: 78,
    tags: ['Uniswap', 'DEX', 'TVL'],
  },

  // Security
  {
    id: 'news-010',
    title: 'Major DeFi Protocol Suffers $20M Exploit Through Flash Loan Attack',
    summary: 'A sophisticated flash loan attack targeting a price oracle manipulation has resulted in significant losses. Security firms are investigating.',
    source: 'Rekt News',
    sourceUrl: 'https://rekt.news',
    publishTime: generateTimestamp(12),
    category: 'security',
    priority: 'high',
    hotScore: 82,
    tags: ['Exploit', 'Flash Loan', 'Security'],
  },
  {
    id: 'news-011',
    title: 'CertiK Identifies Critical Vulnerability in Popular Wallet Software',
    summary: 'Security audit firm CertiK has disclosed a critical vulnerability affecting multiple wallet providers. Users urged to update immediately.',
    source: 'CertiK',
    sourceUrl: 'https://certik.com',
    publishTime: generateTimestamp(15),
    category: 'security',
    priority: 'high',
    hotScore: 80,
    tags: ['Security', 'Wallet', 'Vulnerability'],
  },

  // Adoption
  {
    id: 'news-012',
    title: 'PayPal Expands Crypto Services to 20 New Markets',
    summary: 'PayPal\'s cryptocurrency buy, sell, and hold features are now available in additional countries across Latin America and Asia.',
    source: 'CoinDesk',
    sourceUrl: 'https://coindesk.com',
    publishTime: generateTimestamp(9),
    category: 'adoption',
    priority: 'medium',
    hotScore: 75,
    tags: ['PayPal', 'Adoption', 'Payments'],
  },
  {
    id: 'news-013',
    title: 'Nike\'s .Swoosh Platform Hits 2 Million Users',
    summary: 'Nike\'s Web3 platform for digital collectibles has reached a significant milestone, with major brand partnerships announced.',
    source: 'Decrypt',
    sourceUrl: 'https://decrypt.co',
    publishTime: generateTimestamp(14),
    category: 'adoption',
    priority: 'low',
    hotScore: 58,
    tags: ['Nike', 'NFT', 'Brands'],
  },

  // NFT
  {
    id: 'news-014',
    title: 'Pudgy Penguins Floor Price Reaches New ATH',
    summary: 'The popular NFT collection has seen renewed interest following major licensing deals and toy line expansion in retail stores.',
    source: 'NFT Now',
    sourceUrl: 'https://nftnow.com',
    publishTime: generateTimestamp(11),
    category: 'nft',
    priority: 'low',
    hotScore: 55,
    tags: ['NFT', 'Pudgy Penguins', 'Collectibles'],
  },
  {
    id: 'news-015',
    title: 'Magic Eden Crosses $5B in Lifetime Trading Volume',
    summary: 'The multi-chain NFT marketplace continues to dominate with strong performance across Solana, Bitcoin, and Ethereum.',
    source: 'The Block',
    sourceUrl: 'https://theblock.co',
    publishTime: generateTimestamp(16),
    category: 'nft',
    priority: 'low',
    hotScore: 52,
    tags: ['NFT', 'Marketplace', 'Magic Eden'],
  },

  // More Regulation
  {
    id: 'news-016',
    title: 'Singapore Updates Crypto Licensing Framework',
    summary: 'MAS introduces new requirements for digital payment token service providers focusing on consumer protection and stablecoin regulation.',
    source: 'CoinTelegraph',
    sourceUrl: 'https://cointelegraph.com',
    publishTime: generateTimestamp(18),
    category: 'regulation',
    priority: 'medium',
    hotScore: 68,
    tags: ['Singapore', 'MAS', 'Licensing'],
  },
  {
    id: 'news-017',
    title: 'UK FCA Approves First Crypto ETP for Retail Investors',
    summary: 'The Financial Conduct Authority has granted approval for exchange-traded products tracking cryptocurrency indices.',
    source: 'The Block',
    sourceUrl: 'https://theblock.co',
    publishTime: generateTimestamp(20),
    category: 'regulation',
    priority: 'medium',
    hotScore: 70,
    tags: ['UK', 'FCA', 'ETP'],
  },

  // Market Updates
  {
    id: 'news-018',
    title: 'Crypto Market Cap Surpasses $3 Trillion Again',
    summary: 'The total cryptocurrency market capitalization has reclaimed the $3 trillion milestone driven by broad-based altcoin rally.',
    source: 'CoinGecko',
    sourceUrl: 'https://coingecko.com',
    publishTime: generateTimestamp(13),
    category: 'market',
    priority: 'medium',
    hotScore: 73,
    tags: ['Market Cap', 'Altcoins', 'Bull Run'],
  },
  {
    id: 'news-019',
    title: 'Stablecoin Market Cap Reaches New All-Time High',
    summary: 'The total value of stablecoins in circulation has exceeded $170 billion, with USDT and USDC leading the growth.',
    source: 'DeFi Llama',
    sourceUrl: 'https://defillama.com',
    publishTime: generateTimestamp(22),
    category: 'market',
    priority: 'low',
    hotScore: 60,
    tags: ['Stablecoins', 'USDT', 'USDC'],
  },

  // More Technology
  {
    id: 'news-020',
    title: 'Celestia Data Availability Layer Sees 500% Growth',
    summary: 'Celestia\'s modular blockchain network has experienced explosive growth in data blob submissions from rollup chains.',
    source: 'CoinDesk',
    sourceUrl: 'https://coindesk.com',
    publishTime: generateTimestamp(24),
    category: 'technology',
    priority: 'low',
    hotScore: 56,
    tags: ['Celestia', 'Modular', 'DA'],
  },
];

export const getSortedNews = (): NewsItem[] => {
  return [...newsData].sort(
    (a, b) => new Date(b.publishTime).getTime() - new Date(a.publishTime).getTime()
  );
};

export const getNewsByCategory = (category: string): NewsItem[] => {
  if (category === 'all') return getSortedNews();
  return getSortedNews().filter(n => n.category === category);
};

export const getTrendingNews = (): NewsItem[] => {
  return getSortedNews()
    .filter(n => n.hotScore >= 80)
    .sort((a, b) => b.hotScore - a.hotScore)
    .slice(0, 5);
};

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
