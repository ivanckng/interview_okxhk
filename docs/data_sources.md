# Crypto Pulse Dashboard - Data Sources

## Overview
This document outlines all data sources used by the Crypto Pulse Dashboard.

---

## News Data (Crypto Industry News)

### Primary Source: BWEnews (方程式新闻)
- **Type**: WebSocket + RSS
- **URL**: 
  - WebSocket: `wss://bwenews-api.bwe-ws.com/ws`
  - RSS: `https://rss-public.bwe-ws.com/`
- **Coverage**: Chinese crypto news, exchange announcements, regulatory updates
- **Update Frequency**: Real-time (WebSocket), Every 30 min (RSS poll)
- **Cost**: Free
- **Documentation**: https://telegra.ph/BWEnews-API-documentation-06-19

### AI Processing
- **DeepSeek Agent**: Processes raw news for classification, priority, sentiment analysis
- **Qwen Agent**: Generates strategic summaries for OKX business operations

---

## Market Data (Macro Economics)

### Comprehensive Global Coverage
The dashboard aggregates data from multiple sources for maximum country coverage:

#### 1. World Bank Open Data (Primary Source)
- **Coverage**: 200+ countries and territories
- **URL**: https://data.worldbank.org/
- **Data Points**:
  - GDP Growth (annual %)
  - GDP (current US$)
  - Inflation, consumer prices (annual %)
  - Unemployment, total (% of labor force)
  - Population, total
  - Trade (% of GDP)
  - FDI net inflows (% of GDP)
  - Exports/Imports (% of GDP)
  - GNI per capita (Atlas method)
- **Update Frequency**: Annual (mostly), some quarterly
- **Cost**: Free, no API key required
- **Documentation**: https://datahelpdesk.worldbank.org/

#### 2. FRED API (US Focus)
- **Provider**: Federal Reserve Bank of St. Louis
- **Coverage**: United States
- **URL**: https://api.stlouisfed.org/fred
- **Data Points**:
  - GDP Growth Rate (quarterly)
  - CPI YoY (monthly)
  - PPI YoY (monthly)
  - Unemployment Rate (monthly)
  - Federal Funds Rate (daily)
- **Update Frequency**: Real-time to monthly
- **Cost**: Free (requires API key)
- **Get API Key**: https://fred.stlouisfed.org/docs/api/api_key.html

#### 3. OECD Data API
- **Coverage**: 38 member countries + key partners
- **URL**: https://data.oecd.org/
- **Data Points**:
  - Quarterly GDP Growth
  - CPI Inflation
  - Unemployment Rate
  - Trade Balance
  - Industrial Production
- **Update Frequency**: Monthly to quarterly
- **Cost**: Free
- **Countries**: US, UK, EU, Japan, Korea, Australia, Canada, etc.

#### 4. Trading Economics API
- **Coverage**: 196 countries
- **URL**: https://tradingeconomics.com/api
- **Data Points**:
  - Economic Calendar (upcoming events)
  - Historical Indicators
  - Consensus Forecasts
  - Actual vs Forecast vs Previous
- **Update Frequency**: Real-time for calendar
- **Cost**: Free tier (250 requests/month)
- **Get API Key**: https://tradingeconomics.com/api

---

## Cryptocurrency Price Data

### Primary Source: CoinGecko API
- **URL**: https://api.coingecko.com/api/v3
- **Data Points**:
  - Real-time prices for 10,000+ cryptocurrencies
  - Market capitalization
  - 24h/7d price changes
  - Trading volume
  - 7-day sparkline charts
  - Global market metrics (total market cap, dominance)
- **Update Frequency**: Real-time (cached 2 minutes)
- **Cost**: Free tier available (limited requests), Paid plans for higher volume
- **Get API Key**: https://www.coingecko.com/en/api/pricing

### Data Provided
| Endpoint | Data |
|----------|------|
| `/coins/markets` | Top coins by market cap with price, volume, changes |
| `/global` | Global market cap, volume, BTC dominance |
| `/coins/{id}` | Detailed coin information |

---

## Exchange Announcements (Company Data)

### Planned Integrations

#### Binance
- **Source**: Official WebSocket + REST API
- **Data**: New listings, delistings, product updates
- **URL**: https://www.binance.com/en/support/announcement

#### ByBit
- **Source**: REST API
- **Endpoint**: `GET /v5/announcements/index`
- **Documentation**: https://bybit-exchange.github.io/docs/v5/announcement

#### Bitget
- **Source**: Web scraping (no official API)
- **URL**: https://www.bitget.com/support

---

## Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Data Sources                             │
├─────────────────────────────────────────────────────────────────┤
│  News          │  Market Data    │  Crypto Prices │  Exchange   │
│  BWEnews       │  FRED API       │  CoinGecko     │  APIs       │
└───────┬────────┴────────┬────────┴────────┬───────┴──────┬──────┘
        │                 │                 │              │
        ▼                 ▼                 ▼              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    AI Processing Layer                           │
├─────────────────────────────────────────────────────────────────┤
│  DeepSeek Agent  │  Qwen Agent                                  │
│  - News classification, priority, sentiment                    │
│  - Market highlights generation                                │
│  - OKX business-focused analysis                               │
└───────┬────────────────────────────────┬────────────────────────┘
        │                                │
        ▼                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Backend API (FastAPI)                       │
├─────────────────────────────────────────────────────────────────┤
│  /api/news              │  Real-time processed news              │
│  /api/highlights/news   │  AI-generated news summary             │
│  /api/pulse/summary     │  Qwen strategic analysis               │
│  /api/market/data       │  Macro economic indicators             │
│  /api/crypto/prices     │  Live cryptocurrency prices            │
└─────────────────────────────────────────────────────────────────┘
```

---

## API Keys Required

Create a `.env` file in the `backend/` directory:

```bash
# DeepSeek AI (Required for news processing)
DEEPSEEK_API_KEY=your_deepseek_api_key

# Qwen AI (Required for Pulse analysis)
QWEN_API_KEY=your_qwen_api_key

# FRED API (Optional - for US economic data)
FRED_API_KEY=your_fred_api_key

# CoinGecko API (Optional - higher rate limits)
COINGECKO_API_KEY=your_coingecko_api_key

# Financial Modeling Prep (Optional - for economic calendar)
FMP_API_KEY=your_fmp_api_key
```

---

## Fallback Data

When APIs are unavailable or API keys are not configured:
- **News**: Uses cached data or empty state
- **Market Data**: Uses placeholder/mock data with "Fallback data" label
- **Crypto Prices**: Uses cached data or mock prices with note

All fallback data is clearly marked in the UI.

---

## Data Update Frequencies

| Data Type | Source | Update Frequency | Cache TTL |
|-----------|--------|------------------|-----------|
| News | BWEnews | Real-time + 30min poll | 30 min |
| News Highlights | DeepSeek | On-demand | 30 min |
| Pulse Summary | Qwen | On-demand | 20 min |
| US Economic Data | FRED | Daily | 60 min |
| Crypto Prices | CoinGecko | Real-time | 2 min |
| Global Market | CoinGecko | Real-time | 2 min |

---

## Cost Summary

| Source | Free Tier | Paid Plans | Current Usage |
|--------|-----------|------------|---------------|
| BWEnews | Unlimited | - | Free |
| DeepSeek API | 500M tokens | $0.27/M tokens | Free tier |
| Qwen API | 1M tokens | Varies | Free tier |
| **World Bank** | **Unlimited** | - | **Free** |
| **OECD** | **Unlimited** | - | **Free** |
| FRED API | 120 requests/day | Unlimited | Free tier |
| Trading Economics | 250 requests/month | $29+/month | Free tier |
| CoinGecko | 10-30 calls/min | $129+/month | Free tier |

### Coverage Summary

| Region | Countries | Primary Source | Status |
|--------|-----------|----------------|--------|
| Americas | US, CA, BR, MX | FRED + World Bank | ✅ Live |
| Europe | EU, UK, DE, FR | World Bank + OECD | ✅ Live |
| Asia Pacific | CN, HK, JP, KR, SG, AU, IN | World Bank | ✅ Live |
| **Total** | **15 countries** | **Multi-source** | **✅ Live** |

---

*Last Updated: March 2025*
