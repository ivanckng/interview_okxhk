"""
DeepSeek Agent for Markets Analysis
Analyzes all markets data and generates insights
Updates every 10 minutes
"""
import os
import httpx
import json
import re
from typing import Dict, Any, List
from datetime import datetime
from utils.cache import get_market_cache


class DeepSeekMarketsAgent:
    """
    DeepSeek Agent for analyzing all markets data
    """

    def __init__(self):
        self.api_key = os.getenv("DEEPSEEK_API_KEY")
        self.api_url = os.getenv("DEEPSEEK_API_URL", "https://api.deepseek.com/v1/chat/completions")
        self._cache = get_market_cache()

    def _get_cache_key(self) -> str:
        return "deepseek_markets_analysis"

    def _should_refresh_cache(self, cached_data: Any) -> bool:
        """Refresh every 10 minutes"""
        if not cached_data:
            return True
        cached_at = cached_data.get("cached_at")
        if not cached_at:
            return True
        try:
            cached_time = datetime.fromisoformat(cached_at)
            now = datetime.utcnow()
            return (now - cached_time).total_seconds() > 600
        except:
            return True

    async def analyze_markets(self, markets_data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze all markets data and generate insights"""
        cache_key = self._get_cache_key()
        
        # Check cache (10 minute TTL)
        cached = self._cache.get(cache_key)
        if cached and isinstance(cached, dict) and not self._should_refresh_cache(cached):
            print(f"✅ Using cached DeepSeek markets analysis")
            return cached
        
        if not self.api_key or not markets_data:
            return {"error": "No API key or data", "analysis": None}

        try:
            # Extract key data points
            us_gdp = markets_data.get('economy_indicators', {}).get('us', {}).get('gdp_annual', {})
            cn_gdp = markets_data.get('economy_indicators', {}).get('cn', {}).get('gdp_annual', {})
            stock_indices = markets_data.get('stock_indices', {})
            commodities = markets_data.get('commodities', [])
            currency_rates = markets_data.get('currency_rates', [])
            breaking_news = markets_data.get('breaking_news', [])
            
            # Prepare summary for AI
            prompt = f"""
You are a professional crypto market analyst. Analyze the following markets data:

**US Economy:**
- GDP Annual: {us_gdp.get('value', 'N/A')}% ({us_gdp.get('period', 'N/A')})

**China Economy:**
- GDP Annual: {cn_gdp.get('value', 'N/A')}% ({cn_gdp.get('period', 'N/A')})

**Stock Indices:**
{self._format_indices(stock_indices)}

**Commodities:**
{self._format_commodities(commodities)}

**Currency Rates:**
{self._format_currencies(currency_rates)}

**Breaking News:**
{self._format_news(breaking_news)}

Based on this data, provide a concise analysis in JSON format:
{{
  "market_pulse": "2-3 sentence summary of overall market sentiment",
  "key_insights": ["insight 1", "insight 2", "insight 3"],
  "hot_sectors": ["sector 1", "sector 2"],
  "risk_alerts": ["risk 1", "risk 2"],
  "overall_sentiment": "bullish|bearish|neutral"
}}
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
                            {"role": "system", "content": "You are a professional crypto market analyst. Return analysis in JSON format only."},
                            {"role": "user", "content": prompt}
                        ],
                        "temperature": 0.3,
                        "max_tokens": 800
                    },
                    timeout=60.0
                )
                response.raise_for_status()
                data = response.json()
                
                analysis_text = data["choices"][0]["message"]["content"].strip()
                
                # Parse JSON from response
                try:
                    json_match = re.search(r'\{[\s\S]*\}', analysis_text)
                    if json_match:
                        analysis = json.loads(json_match.group())
                    else:
                        analysis = {"error": "Could not parse JSON", "raw": analysis_text}
                except:
                    analysis = {"error": "Could not parse JSON", "raw": analysis_text}
                
                result = {
                    "analysis": analysis,
                    "cached_at": datetime.utcnow().isoformat(),
                    "refresh_interval": "10 minutes",
                }
                
                # Cache for 10 minutes
                self._cache.set(cache_key, result, ttl=600)
                print(f"✅ Cached DeepSeek markets analysis")
                
                return result

        except Exception as e:
            print(f"⚠️ DeepSeek markets analysis error: {e}")
            return {"error": str(e), "analysis": None}

    def _format_indices(self, indices: Dict) -> str:
        lines = []
        for region, data in indices.items():
            if isinstance(data, list):
                for idx in data[:2]:
                    lines.append(f"- {region.upper()} {idx.get('name', '')}: {idx.get('value', 0)} ({idx.get('change_percent', 0)}%)")
        return "\n".join(lines) if lines else "No data"

    def _format_commodities(self, commodities: List) -> str:
        lines = []
        for comm in commodities:
            lines.append(f"- {comm.get('name', '')}: ${comm.get('value', 0)} ({comm.get('change_percent', 0)}%)")
        return "\n".join(lines) if lines else "No data"

    def _format_currencies(self, currencies: List) -> str:
        lines = []
        for curr in currencies:
            lines.append(f"- {curr.get('name', '')}: {curr.get('value', 0)} {curr.get('quote_currency', '')}")
        return "\n".join(lines) if lines else "No data"

    def _format_news(self, news: List) -> str:
        lines = []
        for item in news[:3]:
            lines.append(f"- {item.get('title', '')[:80]}")
        return "\n".join(lines) if lines else "No news"


# Global agent
deepseek_markets_agent = DeepSeekMarketsAgent()


def get_deepseek_markets_agent() -> DeepSeekMarketsAgent:
    return deepseek_markets_agent
