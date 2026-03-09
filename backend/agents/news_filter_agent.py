"""
DeepSeek Agent for News Filtering and Ranking
Filters and ranks news articles by crypto market relevance
Returns top 4 most relevant articles
"""
import os
import httpx
import json
import re
from typing import Dict, Any, List
from datetime import datetime
from utils.cache import get_market_cache


class DeepSeekNewsFilterAgent:
    """
    DeepSeek Agent for filtering and ranking news articles
    """

    def __init__(self):
        self.api_key = os.getenv("DEEPSEEK_API_KEY")
        self.api_url = os.getenv("DEEPSEEK_API_URL", "https://api.deepseek.com/v1/chat/completions")
        self._cache = get_market_cache()

    def _get_cache_key(self, category: str) -> str:
        return f"deepseek_news_filter_{category}"

    def _should_refresh_cache(self, cached_data: Any) -> bool:
        """Refresh every 24 hours for news"""
        if not cached_data:
            return True
        cached_at = cached_data.get("cached_at")
        if not cached_at:
            return True
        try:
            cached_time = datetime.fromisoformat(cached_at)
            now = datetime.utcnow()
            return (now - cached_time).total_seconds() > 86400
        except:
            return True

    async def filter_and_rank_news(self, articles: List[Dict[str, Any]], category: str = "breaking") -> List[Dict[str, Any]]:
        """
        Filter and rank news articles by crypto market relevance
        Returns top 4 most relevant articles (deduplicated)
        """
        if not articles:
            return []
        
        # Deduplicate articles by title before processing
        seen_titles = set()
        unique_articles = []
        for article in articles:
            title = article.get('title', '').strip().lower()
            if title and title not in seen_titles:
                seen_titles.add(title)
                unique_articles.append(article)
        
        articles = unique_articles
        
        if len(articles) == 0:
            return []
        
        cache_key = self._get_cache_key(category)
        
        # Check cache (24 hour TTL for news)
        cached = self._cache.get(cache_key)
        if cached and isinstance(cached, list) and not self._should_refresh_cache(cached):
            print(f"✅ Using cached DeepSeek news filter results")
            return cached
        
        if not self.api_key or len(articles) == 0:
            # Fallback: return first 4 unique articles
            return articles[:4]

        try:
            # Prepare news summary for AI
            news_summary = "\n".join([
                f"{i+1}. {art.get('title', 'No title')[:150]}"
                for i, art in enumerate(articles[:12])
            ])

            prompt = f"""
You are a crypto market news analyst. Filter and rank these news articles by their relevance to cryptocurrency markets.

**News Articles:**
{news_summary}

**Selection Criteria - KEEP articles related to:**
- Central bank policies (interest rates, quantitative easing)
- Regulatory changes (crypto, finance, technology)
- Institutional adoption (crypto ETFs, corporate bitcoin)
- Major technology developments (blockchain, AI, fintech)
- Macroeconomic factors (inflation, GDP, unemployment)
- International trade affecting markets
- Banking system news
- Government fiscal policies
- Geopolitical events affecting markets

**FILTER OUT - EXCLUDE:**
- Sports news
- Entertainment/celebrity news
- Local crime stories
- Real estate listings
- Gambling/betting news
- Individual stock insider trading
- Company press releases without market impact
- Health/science unrelated to markets

Return ONLY a JSON array of exactly 4 article indices (0-based, from the list above) ranked by crypto market relevance.
Format: [0, 2, 5, 1]

If fewer than 4 relevant articles exist, return only those that pass the filter.
"""

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.api_url,
                    headers={
                        "Content-Type": "application/json",
                        "Authorization": f"Bearer {self.api_key}"
                    },
                    json={
                        "model": "deepseek-chat",
                        "messages": [
                            {"role": "system", "content": "You are a crypto market news analyst. Return ONLY a JSON array of 4 or fewer article indices."},
                            {"role": "user", "content": prompt}
                        ],
                        "temperature": 0.3,
                        "max_tokens": 200
                    },
                    timeout=60.0
                )
                response.raise_for_status()
                data = response.json()
                
                ranked_str = data["choices"][0]["message"]["content"].strip()
                
                # Parse JSON array from response
                try:
                    json_match = re.search(r'\[[\d,\s]+\]', ranked_str)
                    if json_match:
                        ranked_indices = eval(json_match.group())
                        # Return filtered articles in ranked order
                        ranked_articles = []
                        for idx in ranked_indices[:4]:
                            if 0 <= idx < len(articles):
                                article = articles[idx].copy()
                                article['crypto_relevance_rank'] = len(ranked_articles) + 1
                                ranked_articles.append(article)
                        result = ranked_articles
                    else:
                        result = articles[:4]
                except:
                    result = articles[:4]
                
                # Cache for 24 hours
                self._cache.set(cache_key, result, ttl=86400)
                print(f"✅ DeepSeek filtered and ranked {len(result)} news articles")
                
                return result

        except Exception as e:
            print(f"⚠️ DeepSeek news filter error: {e}")
            # Fallback: return first 4 articles
            return articles[:4]


# Global agent
deepseek_news_filter_agent = DeepSeekNewsFilterAgent()


def get_deepseek_news_filter_agent() -> DeepSeekNewsFilterAgent:
    return deepseek_news_filter_agent
