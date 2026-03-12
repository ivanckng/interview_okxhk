"""
NewsData.io API Client
Real-time news API
https://newsdata.io/
Free tier: 200 requests/day
"""
import os
import httpx
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from utils.cache import get_news_cache


class NewsDataClient:
    """
    NewsData.io API Client
    Breaking news from multiple sources
    """

    BASE_URL = "https://newsdata.io/api/1/latest"

    # Category mapping
    CATEGORIES = ['breaking', 'business', 'technology', 'politics']

    # Country codes
    COUNTRIES = ['gb', 'us', 'cn', 'hk', 'jp']

    # Languages
    LANGUAGES = ['en', 'zh', 'zh-Hant']

    def __init__(self):
        self.api_key = os.getenv("NEWSDATA_API_KEY")
        self._cache = get_news_cache()

    def _get_cache_key(self, category: str) -> str:
        """Generate cache key for category"""
        return f"newsdata_{category or 'all'}"

    def _should_refresh_cache(self, cached_data: Any) -> bool:
        """
        Check if cache should be refreshed
        Refresh daily at 9:00 AM HKT (UTC+8)
        """
        if not cached_data:
            return True
        
        cached_at = cached_data.get("cached_at")
        if not cached_at:
            return True
        
        try:
            cached_time = datetime.fromisoformat(cached_at)
            now_hkt = datetime.utcnow() + timedelta(hours=8)  # Convert to HKT
            
            # Check if it's a new day (after 9 AM)
            if now_hkt.date() > cached_time.date():
                return True
            if now_hkt.hour >= 9 and cached_time.hour < 9:
                return True
            
            return False
        except:
            return True

    async def get_news(self, category: str = None) -> Dict[str, Any]:
        """
        Get news from NewsData.io API
        Default to politics category for market-relevant news
        """
        cache_key = self._get_cache_key(category or 'politics')

        # Check cache first
        try:
            cached = self._cache.get(cache_key)
            if cached and isinstance(cached, dict) and not self._should_refresh_cache(cached):
                print(f"✅ Using cached NewsData.io news for {category or 'politics'}")
                return cached
        except Exception as e:
            print(f"⚠️ Cache check error: {e}")

        print(f"📰 Fetching NewsData.io news for {category or 'politics'}...")

        try:
            async with httpx.AsyncClient() as client:
                params = {
                    "apikey": self.api_key,
                    "country": ",".join(self.COUNTRIES),
                    "language": "en",  # Use English for consistency
                    "category": "politics",  # Default to politics for market-relevant news
                }

                response = await client.get(
                    self.BASE_URL,
                    params=params,
                    timeout=30.0
                )
                response.raise_for_status()
                data = response.json()

                # Transform data to our format
                articles = []
                for item in data.get("results", []):
                    # Map API category to our category
                    api_category_list = item.get("category", [])
                    api_category = api_category_list[0] if isinstance(api_category_list, list) and len(api_category_list) > 0 else "breaking"
                    
                    # Skip sports and entertainment news
                    if api_category in ['sports', 'entertainment']:
                        continue
                    
                    articles.append({
                        "id": item.get("article_id", f"nd-{len(articles)}"),
                        "title": item.get("title", "No title"),
                        "source": item.get("source_id", item.get("creator", "Unknown")),
                        "time": self._format_time(item.get("pubDate")),
                        "impact": "high" if api_category == "breaking" else "medium",
                        "region": self._map_region(item.get("country")),
                        "category": self._map_category(api_category),
                        "link": item.get("link", "#"),
                        "description": item.get("description", ""),
                    })

                result = {
                    "status": data.get("status", "success"),
                    "totalResults": data.get("totalResults", 0),
                    "articles": articles[:12],  # Keep 12 articles for AI filtering
                    "cached_at": datetime.utcnow().isoformat(),
                }

                # Use DeepSeek to filter and rank by crypto relevance (top 4)
                try:
                    from agents.news_filter_agent import get_deepseek_news_filter_agent
                    news_filter = get_deepseek_news_filter_agent()
                    ranked_articles = await news_filter.filter_and_rank_news(articles, category or 'breaking')
                    result["articles"] = ranked_articles
                    print(f"✅ DeepSeek filtered to {len(ranked_articles)} relevant articles")
                except Exception as e:
                    print(f"⚠️ News filter error: {e}")
                    result["articles"] = articles[:4]

                # Cache the data (24 hours)
                self._cache.set(cache_key, result, ttl=86400)
                print(f"✅ Cached NewsData.io news: {len(result['articles'])} articles")

                return result

        except Exception as e:
            print(f"⚠️ NewsData.io API error: {e}")
            return {
                "status": "error",
                "error": str(e),
                "articles": []
            }

    def _format_time(self, pub_date: str) -> str:
        """Format publication time to relative time"""
        if not pub_date:
            return "Unknown"
        
        try:
            pub_time = datetime.fromisoformat(pub_date.replace("Z", "+00:00"))
            now = datetime.utcnow()
            diff = (now - pub_time.replace(tzinfo=None)).total_seconds()
            
            if diff < 60:
                return "Just now"
            elif diff < 3600:
                return f"{int(diff / 60)} minutes ago"
            elif diff < 86400:
                return f"{int(diff / 3600)} hours ago"
            else:
                return f"{int(diff / 86400)} days ago"
        except:
            return "Unknown"

    def _map_region(self, country: Any) -> str:
        """Map country code to region"""
        # Handle list or string
        if isinstance(country, list):
            country = country[0] if country else "us"
        
        mapping = {
            "united states of america": "us",
            "united states": "us",
            "usa": "us",
            "united kingdom": "uk",
            "uk": "uk",
            "china": "cn",
            "hong kong": "hk",
            "japan": "jp",
        }
        return mapping.get(str(country).lower(), "us")

    def _map_category(self, api_category: Any) -> str:
        """Map API category to our category"""
        # Handle list or string
        if isinstance(api_category, list):
            api_category = api_category[0] if api_category else "breaking"
        
        mapping = {
            "breaking": "breaking",
            "business": "business",
            "technology": "technology",
            "politics": "politics",
            "top": "breaking",
            "entertainment": "business",
            "sports": "business",
            "science": "technology",
            "health": "business",
        }
        return mapping.get(str(api_category).lower(), "business")

    async def get_news_by_category(self, category: str) -> Dict[str, Any]:
        """
        Get news for specific category
        """
        return await self.get_news(category)


# Global client
newsdata_client = NewsDataClient()


def get_newsdata_client() -> NewsDataClient:
    return newsdata_client
