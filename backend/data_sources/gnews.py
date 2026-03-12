"""
GNews API Client
Breaking news from GNews.io
https://gnews.io/
"""
import os
import httpx
import json
from typing import List, Dict, Any
from datetime import datetime
from utils.cache import get_market_cache


class GNewsClient:
    """
    GNews API Client
    Fetches breaking news from GNews.io API
    """

    BASE_URL = "https://gnews.io/api/v4/top-headlines"
    REFRESH_TTL = 1800
    STALE_TTL = 7200

    def __init__(self):
        self.api_key = os.getenv("GNEWS_API_KEY")
        self._cache = get_market_cache()

    def _get_cache_key(self, category: str = "world") -> str:
        return f"gnews_{category}"

    def _should_refresh_cache(self, cached_data: Any) -> bool:
        """
        Check if cache should be refreshed
        Refresh every 30 minutes (to stay within 100 requests/day limit)
        """
        if not cached_data:
            return True
        cached_at = cached_data.get("cached_at")
        if not cached_at:
            return True
        try:
            cached_time = datetime.fromisoformat(cached_at)
            now = datetime.utcnow()
            return (now - cached_time).total_seconds() > 1800  # 30 minutes
        except:
            return True

    async def get_breaking_news(self, category: str = "general", lang: str = "en", country: str = "us", max_results: int = 10) -> Dict[str, Any]:
        """
        Get breaking news from GNews API

        Args:
            category: News category (general, business, technology, etc.)
            lang: Language code (en, zh, etc.)
            country: Country code (us, cn, etc.)
            max_results: Maximum number of articles to return

        Returns:
            Dictionary with articles list
        """
        cache_key = self._get_cache_key(category)

        cached = self._cache.get(cache_key)
        if cached and isinstance(cached, dict) and not self._should_refresh_cache(cached):
            print(f"✅ Using cached GNews news for {category}")
            return cached

        if not self.api_key:
            return {"error": "No API key", "articles": []}

        try:
            # Build API URL - use simpler parameters for better compatibility
            url = f"{self.BASE_URL}?category={category}&lang={lang}&country={country}&max={max_results}&apikey={self.api_key}"

            async with httpx.AsyncClient() as client:
                response = await client.get(url, timeout=30.0)
                response.raise_for_status()
                data = response.json()

                articles = data.get("articles", [])

                # Transform to our format
                transformed_articles = []
                for i, article in enumerate(articles):
                    transformed_articles.append({
                        "id": f"gnews-{i}-{article.get('title', '')[:20]}",
                        "title": article.get("title", ""),
                        "description": article.get("description", ""),
                        "source": article.get("source", {}).get("name", "GNews"),
                        "link": article.get("url", ""),  # 使用 link 字段以匹配前端
                        "url": article.get("url", ""),
                        "image": article.get("image", ""),
                        "published_at": article.get("publishedAt", ""),
                        "time": self._format_time(article.get("publishedAt", "")),
                        "impact": "high" if i < 3 else "medium",
                        "region": country,
                        "category": category,
                        "crypto_impact_rank": 5 if i < 3 else 3,
                    })

                result = {
                    "status": "success",
                    "articles": transformed_articles,
                    "total_results": data.get("totalArticles", len(articles)),
                    "source": "GNews.io",
                    "category": category,
                    "language": lang,
                    "country": country,
                    "cached_at": datetime.utcnow().isoformat(),
                }

                # Keep stale cache longer so we can serve it if the provider fails.
                self._cache.set(cache_key, result, ttl=self.STALE_TTL)
                print(f"✅ Cached GNews news: {len(transformed_articles)} articles")

                return result

        except Exception as e:
            print(f"⚠️ GNews API error: {e}")
            if cached and isinstance(cached, dict):
                print(f"⚠️ Returning stale GNews cache for {category}")
                stale_result = dict(cached)
                stale_result["stale"] = True
                stale_result["error"] = str(e)
                return stale_result
            return {
                "status": "error",
                "error": str(e),
                "articles": [],
            }

    def _format_time(self, published_at: str) -> str:
        """Format published time to relative time"""
        if not published_at:
            return "Just now"
        try:
            # Parse ISO format time
            pub_time = datetime.fromisoformat(published_at.replace('Z', '+00:00'))
            now = datetime.utcnow()
            diff = now - pub_time

            minutes = int(diff.total_seconds() / 60)
            hours = int(minutes / 60)
            days = int(hours / 24)

            if minutes < 60:
                return f"{minutes}m ago"
            elif hours < 24:
                return f"{hours}h ago"
            elif days < 7:
                return f"{days}d ago"
            else:
                return pub_time.strftime("%Y-%m-%d")
        except:
            return "Just now"


# Global client
gnews_client = GNewsClient()


def get_gnews_client() -> GNewsClient:
    """Get GNews client instance"""
    return gnews_client
