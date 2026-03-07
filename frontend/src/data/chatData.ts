import type { SuggestedQuestion } from '../types/chat';

export const suggestedQuestions: SuggestedQuestion[] = [
  { id: '1', text: "What's the current Bitcoin price?", category: 'price' },
  { id: '2', text: "Show me trending news today", category: 'news' },
  { id: '3', text: "Any new listings on Binance?", category: 'company' },
  { id: '4', text: "How's the crypto market today?", category: 'general' },
  { id: '5', text: "What are the top gainers?", category: 'price' },
  { id: '6', text: "Latest regulatory news?", category: 'news' },
];

export const generateAIResponse = (userMessage: string): string => {
  const lowerMsg = userMessage.toLowerCase();
  
  // Price related
  if (lowerMsg.includes('bitcoin') || lowerMsg.includes('btc')) {
    return "Bitcoin is currently trading at **$87,432.51**, up **2.34%** in the last 24 hours. The trend looks bullish with strong support at $85,000.";
  }
  
  if (lowerMsg.includes('ethereum') || lowerMsg.includes('eth')) {
    return "Ethereum is at **$2,256.78**, down **1.23%** today. However, it's up **3.45%** this week showing overall positive momentum.";
  }
  
  if (lowerMsg.includes('price') || lowerMsg.includes('market')) {
    return "The crypto market is looking bullish today! Bitcoin is leading with +2.34%, while altcoins like SOL (+5.67%) and SUI (+8.92%) are showing strong gains. Check the Crypto tab for detailed prices.";
  }
  
  // News related
  if (lowerMsg.includes('news') || lowerMsg.includes('trending')) {
    return "The hottest news today is **SEC Approving Bitcoin Spot ETF Options Trading** - this is a major milestone for crypto adoption! Also trending: EU MiCA regulation is now fully implemented. Check the News tab for more.";
  }
  
  if (lowerMsg.includes('regulation') || lowerMsg.includes('sec')) {
    return "Latest regulatory updates:\n\n1. **SEC approves Bitcoin ETF options** - Major win for institutional adoption\n2. **EU MiCA fully implemented** - Comprehensive framework across all EU states\n3. **Singapore updates licensing** - New consumer protection requirements\n\nOverall sentiment: **Positive** 🟢";
  }
  
  // Company related
  if (lowerMsg.includes('binance') || lowerMsg.includes('listing')) {
    return "**Binance** just announced:\n\n• New listing: **BERA (Berachain)** - Trading pairs: BERA/USDT, BERA/BTC\n• Launchpool: Stake BNB to earn **SUI** rewards\n• New DOGE perpetual contracts with USDC margin\n\nThese are significant developments!";
  }
  
  if (lowerMsg.includes('bybit')) {
    return "**ByBit** latest updates:\n\n• Listed **MOVE (Movement)** with zero trading fees for 7 days\n• Trade SEI to win from 100,000 USDT prize pool\n• Copy Trading 2.0 launched with enhanced risk tools\n\nActive promotions running! 🚀";
  }
  
  if (lowerMsg.includes('company') || lowerMsg.includes('exchange')) {
    return "All three major exchanges have been active:\n\n**Binance**: BERA listing + SUI launchpool\n**ByBit**: MOVE listing + trading competitions\n**Bitget**: SEI trading competition + SUI launchpad\n\nCheck the Company tab for full details!";
  }
  
  // Gainers/Losers
  if (lowerMsg.includes('gainer') || lowerMsg.includes('top')) {
    return "**Top Gainers (24h):**\n\n1. **MOVE** +15.67% 🚀\n2. **SEI** +12.34%\n3. **STARK** +11.23%\n4. **SUI** +8.92%\n5. **RNDR** +8.90%\n\nEmerging altcoins are leading the rally!";
  }
  
  // Fear & Greed / Market sentiment
  if (lowerMsg.includes('fear') || lowerMsg.includes('greed') || lowerMsg.includes('sentiment')) {
    return "Current **Fear & Greed Index: 78** (Extreme Greed) 📈\n\nThis indicates strong bullish sentiment in the market. Historically, extreme greed can signal a potential correction, but momentum could continue. The index is based on volatility, market momentum, social media, and dominance.";
  }
  
  // Default response
  const defaultResponses = [
    "I'm your crypto assistant! I can help you with:\n\n• **Prices** - Ask about any cryptocurrency\n• **News** - Latest industry updates\n• **Company** - Exchange announcements\n• **Market** - Overall sentiment and trends\n\nWhat would you like to know?",
    
    "I can provide real-time insights from the dashboard. Try asking about:\n\n• Bitcoin or Ethereum price\n• Latest regulatory news\n• New exchange listings\n• Market sentiment\n\nWhat interests you?",
    
    "Great question! Based on the current dashboard data, I can tell you that the market is showing **bullish momentum** today.\n\nWould you like specific information about prices, news, or exchange activities?",
  ];
  
  return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
};

export const formatTime = (timestamp: string): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
};
