"""
Crypto Pulse Dashboard - FastAPI Backend
AI Agents Dashboard with DeepSeek, Qwen, and Gemini
"""
import os
import asyncio
from contextlib import asynccontextmanager
from datetime import datetime
from typing import List, Optional

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from models.schemas import (
    ProcessedNews, HighlightSummary, ChatRequest, ChatResponse,
    TrendDirection
)
from utils.cache import get_news_cache, get_highlight_cache, get_market_cache
from agents.deepseek_agent import get_deepseek_agent
from data_sources.bwenews import get_bwenews_client

# Load environment variables from backend directory
env_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(env_path)

# Global state
processed_news: List[ProcessedNews] = []


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler"""
    # Startup
    print("🚀 Starting Crypto Pulse Backend...")
    
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
    
    yield
    
    # Shutdown
    print("🛑 Shutting down...")
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
    
    if cached:
        return HighlightSummary(**cached)
    
    # Generate new highlight
    global processed_news
    agent = get_deepseek_agent()
    highlight = await agent.generate_news_highlight(processed_news)
    
    # Cache for 30 minutes
    cache.set("news_highlight", highlight.model_dump(), ttl=1800)
    
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


# ==================== Chat API (Gemini) ====================

@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Chat with Gemini Agent
    """
    # TODO: Implement Gemini integration
    return ChatResponse(
        message="Chat feature coming soon. Please configure GEMINI_API_KEY.",
        suggested_questions=[
            "What is the current Bitcoin price?",
            "Any important news today?",
            "What are the trending cryptocurrencies?"
        ]
    )


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

async def scheduled_news_refresh():
    """Background task to refresh news every 30 minutes"""
    while True:
        await asyncio.sleep(1800)  # 30 minutes
        await _fetch_and_process_news()


@app.on_event("startup")
async def start_background_tasks():
    """Start background tasks"""
    asyncio.create_task(scheduled_news_refresh())


if __name__ == "__main__":
    import uvicorn
    
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")
    
    uvicorn.run("main:app", host=host, port=port, reload=True)
