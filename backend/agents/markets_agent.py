"""
Markets Data Aggregator for AI Analysis
Collects all markets data from API endpoints for AI Agent analysis
Updates every 10 minutes

Cache Strategy:
- Aggregated data + AI analysis cached together for 10 minutes
- Reduces DeepSeek API calls from ~144/day to ~20-50/day
"""
import asyncio
import httpx
from datetime import datetime
from typing import Dict, Any
from utils.cache import get_market_cache


class MarketsDataAggregator:
    """
    Aggregates all markets data from API endpoints for AI analysis
    """

    def __init__(self):
        self._cache = get_market_cache()
        self.api_base = "http://localhost:8000"

    def _get_cache_key(self) -> str:
        return "markets_ai_analysis"

    def _should_refresh_cache(self, cached_data: Any) -> bool:
        """
        Check if cache should be refreshed
        Refresh every 10 minutes
        """
        if not cached_data:
            return True

        cached_at = cached_data.get("cached_at")
        if not cached_at:
            return True

        try:
            cached_time = datetime.fromisoformat(cached_at)
            now = datetime.utcnow()
            # Refresh every 10 minutes
            return (now - cached_time).total_seconds() > 600
        except:
            return True

    async def aggregate_all_data(self) -> Dict[str, Any]:
        """
        Aggregate all markets data from API endpoints
        Cache includes both data AND AI analysis (10 minutes TTL)
        """
        cache_key = self._get_cache_key()

        # Check cache first (10 minute TTL)
        cached = self._cache.get(cache_key)
        if cached and isinstance(cached, dict) and not self._should_refresh_cache(cached):
            print(f"✅ Using cached markets AI analysis")
            return cached

        print(f"📊 Aggregating all markets data for AI analysis...")

        try:
            async with httpx.AsyncClient() as client:
                # Fetch all data from API endpoints in parallel
                responses = await asyncio.gather(
                    client.get(f"{self.api_base}/api/economy/us", timeout=30.0),
                    client.get(f"{self.api_base}/api/economy/cn", timeout=30.0),
                    client.get(f"{self.api_base}/api/market/indices", timeout=30.0),
                    client.get(f"{self.api_base}/api/market/commodities", timeout=30.0),
                    client.get(f"{self.api_base}/api/market/currency", timeout=30.0),
                    client.get(f"{self.api_base}/api/news/breaking", timeout=30.0),
                    return_exceptions=True
                )

                # Parse responses
                us_economy = responses[0].json() if not isinstance(responses[0], Exception) else {}
                cn_economy = responses[1].json() if not isinstance(responses[1], Exception) else {}
                stock_indices = responses[2].json() if not isinstance(responses[2], Exception) else {}
                commodities = responses[3].json() if not isinstance(responses[3], Exception) else {}
                currency_rates = responses[4].json() if not isinstance(responses[4], Exception) else {}
                breaking_news = responses[5].json() if not isinstance(responses[5], Exception) else {}

                # Build aggregated data structure
                aggregated_data = {
                    "timestamp": datetime.utcnow().isoformat(),
                    "economy_indicators": {
                        "us": us_economy.get("indicators", {}),
                        "cn": cn_economy.get("indicators", {}),
                    },
                    "stock_indices": stock_indices.get("regions", {}),
                    "commodities": commodities.get("commodities", []),
                    "currency_rates": currency_rates.get("currencies", []),
                    "breaking_news": breaking_news.get("articles", [])[:10],
                    "data_sources": {
                        "economy_us": "FRED",
                        "economy_cn": "Tushare + akshare",
                        "stock_indices": "Yahoo Finance",
                        "commodities": "Yahoo Finance",
                        "currency": "Yahoo Finance",
                        "news": "GNews.io",
                    },
                    "refresh_interval": "10 minutes",
                }

                # Call AI agent to analyze the data
                from agents.news_agent import get_deepseek_markets_agent
                agent = get_deepseek_markets_agent()
                ai_analysis = await agent.analyze_markets(aggregated_data)

                # Cache the COMPLETE result (data + AI analysis) for 10 minutes
                result = {
                    "markets_data": aggregated_data,
                    "ai_analysis": ai_analysis.get("analysis", {}),
                    "cached_at": datetime.utcnow().isoformat(),
                }

                self._cache.set(cache_key, result, ttl=600)
                print(f"✅ Cached markets AI analysis (10 min TTL)")

                return result

        except Exception as e:
            print(f"⚠️ Markets data aggregation error: {e}")
            return {
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat(),
            }


# Global aggregator
markets_aggregator = MarketsDataAggregator()


def get_markets_aggregator() -> MarketsDataAggregator:
    return markets_aggregator
