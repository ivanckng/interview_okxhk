"""
Crypto Pulse Dashboard - FastAPI Backend
AI Agents Dashboard with DeepSeek, Qwen, and Gemini
"""
import os
import asyncio
from contextlib import asynccontextmanager
from datetime import datetime
from typing import List, Optional, Dict, Any

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import httpx

from models.schemas import (
    ProcessedNews, HighlightSummary, ChatRequest, ChatResponse,
    TrendDirection
)

# DeepL 翻译请求模型
class TranslateRequest(BaseModel):
    text: str
    target_lang: str = "ZH"  # ZH 为中文，EN 为英文


# 新闻分析请求模型
class NewsAnalysisRequest(BaseModel):
    news: List[Dict[str, Any]]

# Load environment variables from backend directory
env_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(env_path)

from utils.cache import get_news_cache, get_highlight_cache, get_market_cache
from utils.scheduler import init_scheduler, get_scheduler
from agents.deepseek_agent import get_deepseek_agent
from agents.qwen_agent import get_qwen_agent
from data_sources.bwenews import get_bwenews_client
from data_sources.crypto_prices import get_crypto_price_client
from data_sources.comprehensive_market import get_comprehensive_market_client
from data_sources.gnews import get_gnews_client
from data_sources.fred import get_fred_client
from data_sources.tushare import get_tushare_client
from data_sources.yfinance_data import get_yahoo_finance_client
from data_sources.bybit_announcements import get_bybit_client
from data_sources.binance_announcements import get_binance_client
from data_sources.bitget_announcements import get_bitget_client
from agents.news_agent import get_deepseek_markets_agent, get_deepseek_crypto_agent
from agents.markets_agent import get_markets_aggregator
from agents.crypto_agent import get_crypto_aggregator
from agents.news_analysis_agent import get_deepseek_news_analysis_agent
from agents.competitor_agent import get_competitor_agent
from agents.pulse_agent import get_pulse_agent

# Global state
processed_news: List[ProcessedNews] = []


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler"""
    # Startup
    print("🚀 Starting Crypto Pulse Backend...")
    
    # Reload env vars to ensure they're loaded
    load_dotenv(env_path, override=True)
    
    # Check API keys
    deepseek_key = os.getenv("DEEPSEEK_API_KEY")
    if deepseek_key:
        print("✅ DeepSeek API Key configured")
    else:
        print("⚠️ DeepSeek API Key not found (set DEEPSEEK_API_KEY env var)")
    
    qwen_key = os.getenv("QWEN_API_KEY")
    if qwen_key:
        print("✅ Qwen API Key configured")
    else:
        print("⚠️ Qwen API Key not found (optional)")
    
    gemini_key = os.getenv("GEMINI_API_KEY")
    if gemini_key:
        print("✅ Gemini API Key configured")
    else:
        print("⚠️ Gemini API Key not found (optional)")
    
    # Load cached news
    news_cache = get_news_cache()
    cached = news_cache.get("processed_news")
    if cached:
        global processed_news
        processed_news = [ProcessedNews(**item) for item in cached]
        print(f"✅ Loaded {len(processed_news)} news from cache")

    # Initialize scheduler with daily 7 AM refresh
    scheduler = init_scheduler(refresh_hour=7)
    # Register news refresh callback
    scheduler.register_refresh_callback(_fetch_and_process_news)

    yield
    
    # Shutdown
    print("🛑 Shutting down...")
    # Shutdown scheduler
    get_scheduler().shutdown()
    # Persist cache
    news_cache.persist()
    get_highlight_cache().persist()
    get_market_cache().persist()
    print("✅ Cache saved")


# Create FastAPI app
app = FastAPI(
    title="Crypto Pulse API",
    description="AI-powered Crypto Intelligence Dashboard Backend",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==================== Health Check ====================

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "name": "Crypto Pulse API",
        "version": "1.0.0",
        "status": "running",
        "timestamp": datetime.utcnow()
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    scheduler = get_scheduler()
    return {
        "status": "healthy",
        "services": {
            "deepseek": bool(os.getenv("DEEPSEEK_API_KEY")),
            "qwen": bool(os.getenv("QWEN_API_KEY")),
            "gemini": bool(os.getenv("GEMINI_API_KEY"))
        },
        "cache_stats": {
            "news": get_news_cache().get_stats(),
            "highlights": get_highlight_cache().get_stats(),
            "market": get_market_cache().get_stats()
        },
        "scheduler": {
            "last_refresh": scheduler.get_last_refresh().isoformat() if scheduler.get_last_refresh() else None,
            "next_refresh": "Daily at 7:00 AM"
        }
    }


# ==================== Cache Management API ====================

@app.post("/api/cache/global-refresh")
async def global_refresh_cache():
    """
    Manually trigger global cache refresh
    This clears all caches and refreshes data from all sources
    """
    scheduler = get_scheduler()
    await scheduler.global_refresh()
    
    return {
        "message": "Global cache refresh completed",
        "last_refresh": scheduler.get_last_refresh().isoformat() if scheduler.get_last_refresh() else None,
        "cache_stats": {
            "news": get_news_cache().get_stats(),
            "highlights": get_highlight_cache().get_stats(),
            "market": get_market_cache().get_stats()
        }
    }


@app.get("/api/cache/status")
async def get_cache_status():
    """
    Get cache status and statistics
    """
    scheduler = get_scheduler()
    return {
        "last_refresh": scheduler.get_last_refresh().isoformat() if scheduler.get_last_refresh() else None,
        "next_scheduled_refresh": "Daily at 7:00 AM",
        "cache_stats": {
            "news": get_news_cache().get_stats(),
            "highlights": get_highlight_cache().get_stats(),
            "market": get_market_cache().get_stats()
        }
    }


# ==================== News API ====================

@app.get("/api/news", response_model=List[ProcessedNews])
async def get_news(
    category: Optional[str] = None,
    priority: Optional[str] = None,
    limit: int = 50
):
    """
    Get processed news with optional filtering
    """
    global processed_news
    
    result = processed_news
    
    if category:
        result = [n for n in result if n.category.value == category]
    
    if priority:
        result = [n for n in result if n.priority.value == priority]
    
    # Sort by publish time (newest first)
    result = sorted(result, key=lambda x: x.publish_time, reverse=True)
    
    return result[:limit]


@app.get("/api/news/trending", response_model=List[ProcessedNews])
async def get_trending_news(limit: int = 10):
    """Get trending news (high hot score)"""
    global processed_news
    
    trending = [n for n in processed_news if n.hot_score >= 70]
    trending = sorted(trending, key=lambda x: x.hot_score, reverse=True)
    
    return trending[:limit]


@app.post("/api/news/refresh")
async def refresh_news():
    """
    Manually trigger news refresh from BWEnews RSS
    """
    await _fetch_and_process_news()
    return {"message": "News refresh completed", "processed": len(processed_news), "timestamp": datetime.utcnow()}


async def _fetch_and_process_news():
    """Background task to fetch and process news"""
    global processed_news
    
    try:
        # Fetch from BWEnews RSS
        bwe_client = get_bwenews_client()
        raw_news = await bwe_client.fetch_rss()
        
        if not raw_news:
            print("⚠️ No news fetched from BWEnews")
            return
        
        # Process with DeepSeek
        agent = get_deepseek_agent()
        processed = await agent.batch_process_news(raw_news)
        
        # Merge with existing (deduplicate by id)
        existing_ids = {n.id for n in processed_news}
        new_items = [p for p in processed if p.id not in existing_ids]
        
        # Use slice assignment to modify list in-place
        processed_news[:] = new_items + processed_news
        # Keep only last 200 items
        if len(processed_news) > 200:
            processed_news[:] = processed_news[:200]
        
        # Update cache
        news_cache = get_news_cache()
        news_cache.set("processed_news", [n.model_dump() for n in processed_news])
        
        print(f"✅ Processed {len(new_items)} new news items")
        
    except Exception as e:
        print(f"❌ Error in news refresh: {e}")


# ==================== Highlights API ====================

@app.get("/api/highlights/news", response_model=HighlightSummary)
async def get_news_highlight():
    """Get AI-generated highlight for News page"""
    cache = get_highlight_cache()
    cached = cache.get("news_highlight")
    
    # Always regenerate if we have news data but cached is empty/default
    global processed_news
    has_real_news = len(processed_news) > 0
    is_cached_default = cached and cached.get("title") == "No Recent News"
    
    if cached and not is_cached_default:
        return HighlightSummary(**cached)
    
    # Generate new highlight
    print(f"📝 Generating news highlight for {len(processed_news)} news items...")
    agent = get_deepseek_agent()
    highlight = await agent.generate_news_highlight(processed_news)
    
    # Cache for 30 minutes
    cache.set("news_highlight", highlight.model_dump(), ttl=1800)
    print(f"✅ Highlight generated: {highlight.title}")
    
    return highlight


@app.get("/api/highlights/markets", response_model=HighlightSummary)
async def get_markets_highlight():
    """Get AI-generated highlight for Markets page"""
    cache = get_highlight_cache()
    cached = cache.get("markets_highlight")
    
    if cached:
        return HighlightSummary(**cached)
    
    # TODO: Fetch real market data
    market_data = {
        "status": "placeholder",
        "note": "Connect to FRED API or other market data sources"
    }
    
    agent = get_deepseek_agent()
    highlight = await agent.generate_market_highlight(market_data)
    
    cache.set("markets_highlight", highlight.model_dump(), ttl=1800)
    
    return highlight


@app.get("/api/highlights/company", response_model=HighlightSummary)
async def get_company_highlight():
    """Get AI-generated highlight for Company page"""
    cache = get_highlight_cache()
    cached = cache.get("company_highlight")
    
    if cached:
        return HighlightSummary(**cached)
    
    # TODO: Fetch real exchange announcements
    announcements = []
    
    agent = get_deepseek_agent()
    highlight = await agent.generate_company_highlight(announcements)
    
    cache.set("company_highlight", highlight.model_dump(), ttl=1800)
    
    return highlight


@app.get("/api/highlights/crypto", response_model=HighlightSummary)
async def get_crypto_highlight():
    """Get AI-generated highlight for Crypto page"""
    cache = get_highlight_cache()
    cached = cache.get("crypto_highlight")
    
    if cached:
        return HighlightSummary(**cached)
    
    # TODO: Fetch real price data
    price_data = []
    
    agent = get_deepseek_agent()
    highlight = await agent.generate_crypto_highlight(price_data)
    
    cache.set("crypto_highlight", highlight.model_dump(), ttl=1800)
    
    return highlight


# ==================== Chat API (Qwen) ====================

@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Chat with Qwen Agent - OKX Professional Crypto Copilot
    With comprehensive data from all 4 pages (using cached data)
    """
    try:
        agent = get_qwen_agent()
        global processed_news

        # ========== Fetch comprehensive data from CACHE (not API calls) ==========

        # 1. News data - from memory cache
        news_data = {
            "news": processed_news[:20],
            "trending": [n for n in processed_news if n.hot_score >= 70][:5],
            "highlight": get_highlight_cache().get("news_highlight") or {},
        }
        news_summary = ""
        if news_data["highlight"]:
            news_summary = news_data["highlight"].get("summary", "暂无新闻摘要")[:300]
            news_trend = news_data["highlight"].get("trend", "neutral")
        else:
            news_trend = "neutral"

        # 2. Markets data - from cache (no API call)
        markets_data = {"ai_analysis": {}, "markets_data": {}}
        cached_market = get_market_cache().get("comprehensive_market_data")
        if cached_market:
            markets_data["ai_analysis"] = cached_market.get("ai_analysis", {})
            markets_data["markets_data"] = cached_market.get("data", {})

        # 3. Competitors data - from cache or fetch fresh
        competitors_data = {"announcements": [], "ai_analysis": {}}
        cached_competitors = get_highlight_cache().get("competitors_analysis")
        if cached_competitors:
            competitors_data["ai_analysis"] = cached_competitors
            competitors_data["announcements"] = cached_competitors.get("announcements", [])

        # 4. Crypto data - from cache (no API call)
        crypto_data = {"coins": [], "global": {}, "ai_analysis": {}}
        cached_crypto_prices = get_market_cache().get("crypto_prices_20")
        if cached_crypto_prices:
            crypto_data["coins"] = cached_crypto_prices.get("coins", [])
            crypto_data["global"] = cached_crypto_prices.get("global", {})
            crypto_data["highlight"] = cached_crypto_prices.get("highlight", {})
        
        cached_crypto_analysis = get_highlight_cache().get("crypto_highlight")
        if cached_crypto_analysis:
            crypto_data["ai_analysis"] = {"market_pulse": cached_crypto_analysis.get("summary", "")}

        # ========== Prepare data context for Qwen ==========
        
        # Format news titles
        news_titles = ""
        if news_data["news"]:
            titles = []
            for n in news_data["news"][:10]:
                priority = n.priority.value if hasattr(n.priority, 'value') else str(n.priority)
                title = n.title[:60] if hasattr(n, 'title') else str(n)[:60]
                titles.append(f"  - [{priority.upper()}] {title}")
            news_titles = "\n".join(titles)

        # Format markets summary
        markets_pulse = markets_data["ai_analysis"].get("market_pulse", "暂无宏观分析")[:200]
        markets_insights = markets_data["ai_analysis"].get("key_insights", [])[:2]
        
        # Format economy indicators
        economy_indicators = markets_data.get("markets_data", {}).get("economy_indicators", {})
        economy_summary = []
        for country, indicators in economy_indicators.items():
            if isinstance(indicators, dict):
                gdp = indicators.get("gdp_annual", {})
                cpi = indicators.get("cpi", {})
                if gdp.get("value"):
                    economy_summary.append(f"• {country.upper()} GDP: {gdp.get('value')}%")
                if cpi.get("value"):
                    economy_summary.append(f"• {country.upper()} CPI: {cpi.get('value')}%")
        economy_text = "\n".join(economy_summary[:5]) if economy_summary else "暂无经济指标数据"

        # Format competitors summary
        comp_announcements = competitors_data["announcements"]
        binance_count = len([a for a in comp_announcements if a.get("exchange") == "binance"])
        bybit_count = len([a for a in comp_announcements if a.get("exchange") == "bybit"])
        bitget_count = len([a for a in comp_announcements if a.get("exchange") == "bitget"])
        comp_summary = competitors_data["ai_analysis"].get("summary", "暂无竞对分析")[:200] if competitors_data["ai_analysis"] else "暂无竞对分析"

        # Format crypto summary
        crypto_pulse = crypto_data["ai_analysis"].get("market_pulse", "暂无加密分析")[:200]
        btc_price = None
        eth_price = None
        if crypto_data["coins"]:
            for coin in crypto_data["coins"]:
                if isinstance(coin, dict):
                    if coin.get("symbol", "").upper() == "BTC":
                        btc_price = coin.get("current_price") or coin.get("price")
                    elif coin.get("symbol", "").upper() == "ETH":
                        eth_price = coin.get("current_price") or coin.get("price")

        # ========== Build System Prompt with Data Context ==========
        
        system_prompt = """# OKX Crypto Pulse - Professional Assistant

## Your Identity
You are the **OKX Crypto Pulse Intelligent Assistant**, a professional AI helper integrated into the OKX Crypto Pulse dashboard.

## Core Principles
1. **Be Honest**: If you don't have access to specific data, say so clearly
2. **Be Accurate**: Use the real data provided below when answering
3. **Be Professional**: Keep responses concise (2-4 sentences) and informative
4. **Guide Users**: Direct users to relevant tabs for more details

## Current Available Data
You have access to the following REAL-TIME data from the OKX Crypto Pulse dashboard:
"""

        # Add data context to system prompt
        data_context = f"""

### 📰 News Data (热点新闻)
- News count: {len(news_data['news'])} articles
- Trending: {len(news_data['trending'])} hot stories
- Trend: {news_trend}
- AI Summary: {news_summary}
- Top Headlines:
{news_titles}

### 📊 Markets Data (宏观市场)
- Market Pulse: {markets_pulse}
- Key Insights: {', '.join(markets_insights) if markets_insights else '暂无'}
- Economic Indicators:
{economy_text}

### 🏢 Competitors Data (竞对动向)
- Binance: {binance_count} announcements
- Bybit: {bybit_count} announcements  
- Bitget: {bitget_count} announcements
- AI Analysis: {comp_summary}

### ₿ Crypto Data (加密货币)
- Coins tracked: {len(crypto_data['coins'])}
- BTC Price: ${btc_price} (if available)
- ETH Price: ${eth_price} (if available)
- Market Pulse: {crypto_pulse}

"""

        system_prompt += data_context

        # Add page-specific context
        if request.page_context:
            page_contexts = {
                "news": "User is on News page - focus on news analysis and regulatory developments.",
                "markets": "User is on Markets page - focus on macroeconomic indicators and correlations.",
                "company": "User is on Company page - focus on competitor analysis and OKX positioning.",
                "crypto": "User is on Crypto page - focus on prices, market cap, and sentiment.",
                "pulse": "User is on Pulse page - provide holistic cross-dimensional insights.",
                "general": "User asking general questions - provide balanced comprehensive responses."
            }
            context = page_contexts.get(request.page_context, "")
            if context:
                system_prompt += f"\n## Current Context\n{context}"

        system_prompt += """

## Response Guidelines
- Use the data above to answer questions accurately
- If asked about something not in the data, say: "I don't have access to that information. Please check the relevant tab."
- Never fabricate prices, news, or data
- Be honest about limitations
"""

        # Initialize messages array
        messages = []
        messages.append({"role": "system", "content": system_prompt})

        # Add conversation context
        for ctx in request.context or []:
            messages.append({"role": ctx.role, "content": ctx.content})

        # Add current message
        messages.append({"role": "user", "content": request.message})

        # Call Qwen API
        response = await agent._call_api(messages, temperature=0.5)

        # Generate contextual suggested questions
        suggested = [
            "What's driving the current market trend?",
            "Any major regulatory developments?",
            "How are competitors responding?"
        ]

        return ChatResponse(
            message=response,
            suggested_questions=suggested
        )

    except Exception as e:
        print(f"❌ Chat error: {e}")
        return ChatResponse(
            message="I apologize, but I'm experiencing technical difficulties. Please try again.",
            suggested_questions=[
                "What data sources does Crypto Pulse use?",
                "How often is the data updated?",
                "What can you help me with?"
            ]
        )


# ==================== Market Data API ====================

@app.get("/api/market/data")
async def get_market_data():
    """
    Get comprehensive global macro market data

    Economic Data:
    - US: FRED (Federal Reserve Economic Data)
    - China: Tushare
    - Others: Fallback data
    - Cache: 24 hours

    Financial Data (Stock Indices, Commodities, Currency):
    - Source: Yahoo Finance
    - Cache: 1 minute
    - Update frequency: Every 1 minute
    """
    cache = get_market_cache()
    cached = cache.get("comprehensive_market_data")

    if cached:
        return cached

    # Fetch comprehensive global data
    client = get_comprehensive_market_client()
    data = await client.get_global_summary()

    # Generate highlights
    agent = get_deepseek_agent()
    highlight = await agent.generate_market_highlight(data)

    result = {
        "data": data,
        "highlight": highlight.model_dump(),
        "sources": ["FRED", "Tushare", "Yahoo Finance"],
        "data_details": {
            "economic_data": {
                "source": "FRED (US), Tushare (CN), Fallback (Others)",
                "cache_ttl": "24 hours",
                "update_frequency": "Daily"
            },
            "financial_data": {
                "source": "Yahoo Finance (https://finance.yahoo.com/)",
                "cache_ttl": "1 minute",
                "update_frequency": "Every 1 minute"
            }
        },
        "coverage": f"{data['coverage']['total_countries']} countries",
        "last_updated": data['timestamp']
    }

    # Cache for 1 minute (matches financial data frequency)
    cache.set("comprehensive_market_data", result, ttl=60)

    return result


@app.get("/api/market/countries")
async def get_market_countries():
    """
    Get list of supported countries for market data
    """
    client = get_comprehensive_market_client()
    return {
        "countries": list(client.COUNTRY_CONFIG.keys()),
        "total": len(client.COUNTRY_CONFIG),
        "sources": ["FRED", "Tushare", "Yahoo Finance"]
    }


@app.get("/api/market/country/{country_id}")
async def get_country_market_data(country_id: str):
    """
    Get detailed market data for specific country

    Economic Data Source:
    - US: FRED (Federal Reserve Economic Data)
    - CN: Tushare
    - Others: Fallback data
    
    Financial Data Source: Yahoo Finance
    
    Economic Data Cache: 24 hours
    Financial Data Cache: 1 minute
    """
    cache = get_market_cache()
    cache_key = f"country_data_{country_id}"
    cached = cache.get(cache_key)

    if cached:
        return cached

    client = get_comprehensive_market_client()
    data = await client.get_country_data(country_id)

    # Cache for 1 minute (matches financial data update frequency)
    cache.set(cache_key, data, ttl=60)

    return data


@app.get("/api/market/economic-calendar")
async def get_economic_calendar():
    """
    Get upcoming economic events
    """
    # Placeholder - would integrate with FMP or similar
    return {
        "events": [
            {
                "date": "2024-03-12",
                "time": "08:30 EST",
                "country": "US",
                "event": "CPI Release",
                "impact": "high",
                "forecast": "3.1%",
                "previous": "3.2%"
            },
            {
                "date": "2024-03-13",
                "time": "14:00 EST",
                "country": "US",
                "event": "Fed Interest Rate Decision",
                "impact": "high",
                "forecast": "5.50%",
                "previous": "5.50%"
            }
        ]
    }


@app.get("/api/market/indices")
async def get_stock_indices_api(region: str = None):
    """
    Get real-time stock indices from Yahoo Finance
    Updates every 1 minute
    - region: optional filter (us, cn, hk, uk, eu, jp, kr)
    """
    # Import the sync function directly
    from data_sources.yfinance_data import get_stock_indices as yf_indices
    
    # Run sync function in thread pool
    import asyncio
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(None, yf_indices, region)
    
    return result


@app.get("/api/market/commodities")
async def get_commodities_api():
    """
    Get commodities data (Crude Oil, Gold) from Yahoo Finance
    Updates every 1 minute
    """
    # Import the sync function directly
    from data_sources.yfinance_data import get_commodities as yf_commodities
    
    # Run sync function in thread pool
    import asyncio
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(None, yf_commodities)
    
    return result


@app.get("/api/market/currency")
async def get_currency_rates_api():
    """
    Get currency exchange rates from Yahoo Finance
    Updates every 1 minute
    """
    # Import the sync function directly
    from data_sources.yfinance_data import get_currency_rates as yf_currency
    
    # Run sync function in thread pool
    import asyncio
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(None, yf_currency)
    
    return result


@app.get("/api/markets/analysis")
async def get_markets_analysis():
    """
    Get AI analysis of all markets data
    Updates every 10 minutes
    """
    aggregator = get_markets_aggregator()
    analyst = get_deepseek_markets_agent()
    
    # Get aggregated data
    markets_data = await aggregator.aggregate_all_data()
    
    # Get AI analysis
    analysis = await analyst.analyze_markets(markets_data)
    
    return {
        "markets_data": markets_data,
        "ai_analysis": analysis.get("analysis", {}),
        "last_updated": analysis.get("cached_at", ""),
        "refresh_interval": "10 minutes",
    }


@app.get("/api/crypto/analysis")
async def get_crypto_analysis():
    """
    Get AI analysis of crypto market data
    Updates every 10 minutes
    """
    aggregator = get_crypto_aggregator()
    analyst = get_deepseek_crypto_agent()
    
    # Get aggregated data
    crypto_data = await aggregator.aggregate_all_data()
    
    # Get AI analysis
    analysis = await analyst.analyze_crypto(crypto_data)
    
    return {
        "crypto_data": crypto_data,
        "ai_analysis": analysis.get("analysis", {}),
        "last_updated": analysis.get("cached_at", ""),
        "refresh_interval": "10 minutes",
    }


@app.post("/api/news/analysis")
async def get_news_analysis(request: NewsAnalysisRequest):
    """
    Get AI analysis of news data
    Similar to markets/analysis and crypto/analysis
    Updates every 10 minutes
    """
    analyst = get_deepseek_news_analysis_agent()
    
    # Get AI analysis
    analysis = await analyst.analyze_news(request.news)
    
    return {
        "news_data": request.news,
        "ai_analysis": analysis.get("analysis", {}),
        "last_updated": analysis.get("cached_at", ""),
        "refresh_interval": "10 minutes",
    }


class CompetitorsAnalysisRequest(BaseModel):
    bybit: List[Dict] = []
    binance: List[Dict] = []
    bitget: List[Dict] = []
    language: str = "zh"  # zh or en


@app.post("/api/competitors/analysis")
async def get_competitors_analysis(request: CompetitorsAnalysisRequest):
    """
    Get AI analysis of all competitor exchange announcements
    Updates every 10 minutes
    """
    try:
        agent = get_competitor_agent()

        # Analyze each exchange's announcements
        all_analyzed = []

        if request.bybit:
            bybit_analyzed = await agent.analyze_bybit_announcements(request.bybit)
            all_analyzed.extend(bybit_analyzed)

        if request.binance:
            binance_analyzed = await agent.analyze_binance_announcements(request.binance)
            all_analyzed.extend(binance_analyzed)

        if request.bitget:
            bitget_analyzed = await agent.analyze_bitget_announcements(request.bitget)
            all_analyzed.extend(bitget_analyzed)

        # Generate overall competitor analysis summary
        summary = await agent.generate_competitor_summary(all_analyzed, language=request.language)

        return {
            "ai_analysis": summary,
            "analyzed_count": len(all_analyzed),
            "last_updated": datetime.utcnow().isoformat(),
            "refresh_interval": "10 minutes",
        }
    except Exception as e:
        print(f"Error in competitors analysis: {e}")
        return {
            "ai_analysis": {
                "summary": "Analyzing competitor data...",
                "overall_trend": "neutral",
                "trend_label": "Analyzing",
                "key_points": []
            },
            "error": str(e),
            "last_updated": datetime.utcnow().isoformat(),
        }


# ==================== Crypto Price API ====================

@app.get("/api/crypto/prices")
async def get_crypto_prices(limit: int = 20):
    """
    Get cryptocurrency prices
    """
    cache = get_market_cache()
    cache_key = f"crypto_prices_{limit}"
    cached = cache.get(cache_key)
    
    if cached:
        return cached
    
    # Fetch fresh data
    client = get_crypto_price_client()
    prices = await client.get_top_coins(limit)
    global_data = await client.get_global_data()
    
    # Generate highlights
    agent = get_deepseek_agent()
    highlight = await agent.generate_crypto_highlight(prices[:10])
    
    result = {
        "coins": prices,
        "global": global_data,
        "highlight": highlight.model_dump()
    }
    
    # Cache for 2 minutes
    cache.set(cache_key, result, ttl=120)
    
    return result


@app.get("/api/crypto/coin/{coin_id}")
async def get_coin_detail(coin_id: str):
    """
    Get detailed information about a specific cryptocurrency
    """
    client = get_crypto_price_client()
    details = await client.get_coin_details(coin_id)
    
    if not details:
        raise HTTPException(status_code=404, detail="Coin not found")
    
    return details


# ==================== WebSocket for Real-time ====================

@app.websocket("/ws/news")
async def websocket_news(websocket):
    """
    WebSocket endpoint for real-time news
    """
    await websocket.accept()
    print("🔌 Client connected to news WebSocket")
    
    try:
        while True:
            # Send current news list periodically
            global processed_news
            data = {
                "type": "news_update",
                "count": len(processed_news),
                "timestamp": datetime.utcnow().isoformat()
            }
            await websocket.send_json(data)
            await asyncio.sleep(30)  # Update every 30 seconds
    except Exception as e:
        print(f"⚠️ WebSocket error: {e}")
    finally:
        print("🔌 Client disconnected from news WebSocket")


# ==================== Startup Tasks ====================

# ==================== Pulse API (Qwen Agent) ====================

@app.get("/api/pulse/summary")
async def get_pulse_summary():
    """
    Get Pulse page comprehensive summary from Qwen Agent
    """
    global processed_news
    
    cache = get_highlight_cache()
    cached = cache.get("pulse_summary")
    
    if cached:
        return cached
    
    # Generate new summary using Qwen
    agent = get_qwen_agent()
    summary = await agent.generate_pulse_summary(processed_news)
    
    # Cache for 30 minutes
    cache.set("pulse_summary", summary, ttl=1800)
    
    return summary


@app.get("/api/pulse/recommendations")
async def get_pulse_recommendations():
    """
    Get personalized recommendations for Pulse page
    """
    global processed_news
    
    cache = get_highlight_cache()
    cached = cache.get("pulse_recommendations")
    
    if cached:
        return {"recommendations": cached}
    
    # Generate recommendations using Qwen
    agent = get_qwen_agent()
    recommendations = await agent.generate_recommendations(processed_news)
    
    # Convert to dict for JSON serialization
    result = [r.model_dump() for r in recommendations]
    
    # Cache for 30 minutes
    cache.set("pulse_recommendations", result, ttl=1800)
    
    return {"recommendations": result}


@app.get("/api/pulse/trends")
async def get_pulse_trends(timeframe: str = "7d"):
    """
    Get trend predictions from Qwen Agent
    """
    global processed_news

    agent = get_qwen_agent()
    trends = await agent.predict_trends(processed_news, timeframe)

    return trends


@app.get("/api/pulse/comprehensive")
async def get_pulse_comprehensive(language: str = "zh"):
    """
    Get comprehensive analysis from all four pages with Redis caching
    Cache TTL: 15 minutes
    """
    from utils.redis_cache import cache_get, cache_set
    
    # Try cache first
    cache_key = f"pulse_comprehensive_{language}"
    cached = cache_get(cache_key)
    if cached:
        print(f"✅ Redis cache hit: {cache_key}")
        return cached

    try:
        # Collect data from all four pages
        news_data = {
            "news": processed_news[:20],
            "trending": [n for n in processed_news if n.hot_score >= 70][:5],
            "highlight": get_highlight_cache().get("news_highlight") or {},
        }

        # Markets data - use existing analysis endpoint
        markets_data = {"data": {}, "highlight": {}, "ai_analysis": {}, "markets_data": {}}
        try:
            # Get AI analysis from existing endpoint which contains economy_indicators
            async with httpx.AsyncClient(timeout=60.0) as client:
                resp = await client.get("http://localhost:8000/api/markets/analysis", timeout=60.0)
                if resp.is_success:
                    markets_analysis_data = resp.json()
                    markets_data["_raw_response"] = markets_analysis_data
                    markets_data["ai_analysis"] = markets_analysis_data.get("ai_analysis", {})
                    markets_data["markets_data"] = markets_analysis_data.get("markets_data", {})
                    markets_data["highlight"] = markets_analysis_data.get("markets_data", {}).get("highlight", {})
        except Exception as e:
            print(f"Error fetching markets data: {e}")

        # Competitors data
        competitors_data = {"announcements": [], "ai_analysis": {}}
        try:
            bybit_client = get_bybit_client()
            binance_client = get_binance_client()
            bitget_client = get_bitget_client()
            competitor_agent = get_competitor_agent()

            bybit_ann = bybit_client.get_announcements(locale="en-US", limit=10)
            binance_ann = binance_client.get_announcements(limit=10)
            bitget_ann = bitget_client.get_announcements(language="en_US", limit=10)

            competitors_data["announcements"] = bybit_ann + binance_ann + bitget_ann

            # Get AI analysis
            competitors_data["ai_analysis"] = await competitor_agent.generate_competitor_summary(
                competitors_data["announcements"], language=language
            )
        except Exception as e:
            print(f"Error fetching competitors data: {e}")

        # Crypto data - use existing analysis endpoint
        crypto_data = {"coins": [], "global": {}, "highlight": {}, "ai_analysis": {}}
        try:
            crypto_client = get_crypto_price_client()
            crypto_prices = await crypto_client.get_top_coins(20)
            crypto_global = await crypto_client.get_global_data()
            crypto_data["coins"] = crypto_prices
            crypto_data["global"] = crypto_global
            crypto_data["highlight"] = get_highlight_cache().get("crypto_highlight") or {}

            # Get AI analysis from existing endpoint
            async with httpx.AsyncClient() as client:
                resp = await client.get("http://localhost:8000/api/crypto/analysis", timeout=30)
                if resp.is_success:
                    crypto_analysis_data = resp.json()
                    crypto_data["ai_analysis"] = crypto_analysis_data.get("ai_analysis", {})
        except Exception as e:
            print(f"Error fetching crypto data: {e}")

        # Generate comprehensive analysis using Pulse Agent
        pulse_agent = get_pulse_agent()
        comprehensive_analysis = await pulse_agent.generate_comprehensive_analysis(
            news_data=news_data,
            markets_data=markets_data,
            competitors_data=competitors_data,
            crypto_data=crypto_data,
            language=language
        )

        result = {
            "comprehensive_analysis": comprehensive_analysis,
            "data_sources": {
                "news_count": len(news_data["news"]),
                "markets_indicators": len(markets_data.get("data", {}).get("indicators", [])),
                "competitors_announcements": len(competitors_data["announcements"]),
                "crypto_coins": len(crypto_data["coins"]),
            },
            "last_updated": datetime.utcnow().isoformat(),
        }

        # Save to Redis (15 minutes TTL)
        cache_set(cache_key, result, 900)

        return result

    except Exception as e:
        print(f"Error in comprehensive pulse analysis: {e}")
        # Return fallback analysis
        pulse_agent = get_pulse_agent()
        return {
            "comprehensive_analysis": pulse_agent._fallback_analysis(language),
            "error": str(e),
            "last_updated": datetime.utcnow().isoformat(),
        }


async def scheduled_news_refresh():
    """Background task to refresh news every 30 minutes"""
    while True:
        await asyncio.sleep(1800)  # 30 minutes
        await _fetch_and_process_news()


@app.on_event("startup")
async def start_background_tasks():
    """Start background tasks"""
    asyncio.create_task(scheduled_news_refresh())


@app.post("/api/translate")
async def translate_text(request: TranslateRequest):
    """
    Translate text using DeepL API (proxy to avoid CORS issues)
    """
    deepl_api_key = os.getenv("DEEPL_API_KEY", "920de657-7d74-4b67-9f1f-55e691bab855:fx")
    
    # 如果目标是英文，直接返回原文
    if request.target_lang.upper() == "EN":
        return {"translated_text": request.text}
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api-free.deepl.com/v2/translate",
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"DeepL-Auth-Key {deepl_api_key}"
                },
                json={
                    "text": [request.text],
                    "target_lang": request.target_lang.upper(),
                    "source_lang": "EN"
                },
                timeout=30.0
            )
            
            if response.status_code != 200:
                raise HTTPException(status_code=response.status_code, detail=f"DeepL API error: {response.text}")
            
            data = response.json()
            translated_text = data.get("translations", [{}])[0].get("text", request.text)
            
            return {"translated_text": translated_text}

    except httpx.RequestError as e:
        raise HTTPException(status_code=503, detail=f"Translation service unavailable: {str(e)}")


@app.get("/api/news/breaking")
async def get_breaking_news():
    """
    Get breaking news from GNews.io
    World news in Chinese
    
    Fallback: Returns empty array if API is unavailable
    """
    gnews = get_gnews_client()
    result = await gnews.get_breaking_news(category="world", lang="zh", country="cn", max_results=10)
    
    # If API fails, return empty articles with status
    if result.get("status") == "error" or not result.get("articles"):
        print("⚠️ GNews API unavailable, returning empty articles")
        return {
            "status": "unavailable",
            "message": "News service temporarily unavailable",
            "articles": [],
            "source": "GNews.io"
        }
    
    return result


@app.get("/api/news/{category}")
async def get_news_by_category(category: str):
    """
    Get news by category: breaking, politics, business, technology
    """
    newsdata = get_newsdata_client()
    result = await newsdata.get_news(category)
    return result


@app.get("/api/news/all")
async def get_all_news():
    """
    Get all news from all categories
    """
    newsdata = get_newsdata_client()
    result = await newsdata.get_news()
    return result


@app.get("/api/economy/us")
async def get_us_economy_indicators():
    """
    Get US economic indicators from FRED
    - GDP Annual
    - GDP Quarterly
    - CPI Monthly
    - PPI Monthly
    - Unemployment Rate
    
    Updates daily at 9:00 AM HKT
    """
    fred = get_fred_client()
    result = await fred.get_us_indicators()
    return result


@app.get("/api/economy/cn")
async def get_cn_economy_indicators():
    """
    Get China economic indicators
    - GDP Annual & Quarterly (from Tushare)
    - CPI Monthly (mock)
    - PPI Monthly (mock)
    - Unemployment Rate (mock)
    """
    tushare = get_tushare_client()
    result = await tushare.get_cn_indicators()
    return result


@app.get("/api/exchanges/bybit/announcements")
async def get_bybit_announcements_api(locale: str = "en-US", limit: int = 20):
    """
    Get Bybit exchange announcements with AI analysis
    Real data from Bybit API, analyzed by DeepSeek Agent
    
    Args:
        locale: Language locale (en-US, zh-CN)
        limit: Number of announcements (max 100)
    
    Returns:
        announcements: AI-analyzed Bybit announcements
        source: Data source info
        last_updated: HKT timestamp
    """
    from datetime import datetime, timedelta
    
    client = get_bybit_client()
    agent = get_competitor_agent()
    
    # Fetch raw announcements
    announcements = client.get_announcements(locale=locale, limit=limit)
    
    # Analyze with DeepSeek AI
    analyzed = await agent.analyze_announcements(announcements)
    
    # Convert to HKT time
    hkt_now = datetime.utcnow() + timedelta(hours=8)
    
    return {
        "announcements": analyzed,
        "source": "Bybit Official API + DeepSeek AI",
        "source_url": "https://announcements.bybit.com/",
        "locale": locale,
        "last_updated": hkt_now.strftime("%Y-%m-%d %H:%M:%S") + " HKT",
        "count": len(analyzed)
    }


@app.get("/api/exchanges/binance/announcements")
async def get_binance_announcements_api(limit: int = 20, category: str = "all"):
    """
    Get Binance exchange announcements with AI analysis
    Real data from Binance RSS feed, analyzed by DeepSeek Agent
    
    Args:
        limit: Number of announcements
        category: Feed category ('all', 'new_listings', 'latest_news')
    
    Returns:
        announcements: AI-analyzed Binance announcements
        source: Data source info
        last_updated: HKT timestamp
    """
    from datetime import datetime, timedelta
    
    client = get_binance_client()
    agent = get_competitor_agent()
    
    # Fetch raw announcements from RSS
    announcements = client.get_announcements(limit=limit, category=category)
    
    # Analyze with DeepSeek Agent
    analyzed = await agent.analyze_binance_announcements(announcements)
    
    # HKT timestamp
    hkt_now = datetime.utcnow() + timedelta(hours=8)
    
    return {
        "announcements": analyzed,
        "source": "Binance RSS Feed + DeepSeek AI",
        "source_url": "https://www.binance.com/en/support/announcement",
        "category": category,
        "last_updated": hkt_now.strftime("%Y-%m-%d %H:%M:%S") + " HKT",
        "count": len(analyzed)
    }


@app.get("/api/exchanges/bitget/announcements")
async def get_bitget_announcements_api(language: str = "en_US", limit: int = 20):
    """
    Get Bitget exchange announcements with AI analysis
    Real data from Bitget API, analyzed by DeepSeek Agent
    
    Args:
        language: Language code (en_US, zh_CN)
        limit: Number of announcements
    
    Returns:
        announcements: AI-analyzed Bitget announcements
        source: Data source info
        last_updated: HKT timestamp
    """
    from datetime import datetime, timedelta
    
    client = get_bitget_client()
    agent = get_competitor_agent()
    
    # Fetch raw announcements from Bitget API
    announcements = client.get_announcements(language=language, limit=limit)
    
    # Analyze with DeepSeek Agent
    analyzed = await agent.analyze_bitget_announcements(announcements)
    
    # HKT timestamp
    hkt_now = datetime.utcnow() + timedelta(hours=8)
    
    return {
        "announcements": analyzed,
        "source": "Bitget API + DeepSeek AI",
        "source_url": "https://www.bitget.com/support/",
        "language": language,
        "last_updated": hkt_now.strftime("%Y-%m-%d %H:%M:%S") + " HKT",
        "count": len(analyzed)
    }


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")

    uvicorn.run("main:app", host=host, port=port, reload=True)
