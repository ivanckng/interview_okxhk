"""
DeepSeek Agent for News Analysis
Analyzes aggregated news data and generates insights
Similar to MarketsAgent and CryptoAgent
"""
import os
import httpx
import json
import re
from typing import Dict, Any, List
from datetime import datetime
from utils.cache import get_market_cache


class DeepSeekNewsAnalysisAgent:
    """
    DeepSeek Agent for analyzing news data
    """

    def __init__(self):
        self.api_key = os.getenv("DEEPSEEK_API_KEY")
        self.api_url = os.getenv("DEEPSEEK_API_URL", "https://api.deepseek.com/v1/chat/completions")
        self._cache = get_market_cache()

    def _get_cache_key(self) -> str:
        return "deepseek_news_analysis"

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

    async def analyze_news(self, news_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze news data and generate insights"""
        cache_key = self._get_cache_key()
        
        # Check cache (10 minute TTL)
        cached = self._cache.get(cache_key)
        if cached and isinstance(cached, dict) and not self._should_refresh_cache(cached):
            print(f"✅ Using cached DeepSeek news analysis")
            return cached
        
        if not self.api_key or not news_data:
            return {"error": "No API key or data", "analysis": None}

        try:
            # Prepare summary for AI
            prompt = f"""
You are an OKX Business Operations Intelligence Agent. Analyze the following crypto news from OKX's business perspective.

**News Items:**
{self._format_news(news_data)}

Based on this news data, provide a concise analysis in JSON format.

**IMPORTANT: You MUST respond in Simplified Chinese (简体中文) only!**

Provide your analysis in this JSON format:
{{
  "market_pulse": "2-3 句简体中文总结整体加密新闻情绪和关键主题，从 OKX 业务角度",
  "key_insights": ["简体中文洞察 1", "简体中文洞察 2", "简体中文洞察 3"],
  "hot_sectors": ["热门板块 1", "热门板块 2"],
  "risk_alerts": ["风险警告 1", "风险警告 2"],
  "overall_sentiment": "bullish|bearish|neutral",
  "action_items": ["简体中文行动建议 1", "简体中文行动建议 2", "简体中文行动建议 3"]
}}

Focus on:
- 需要 OKX 合规行动的监管发展
- 威胁 OKX 市场地位的竞争对手动向
- 影响 OKX 交易量/收入的机构采用趋势
- 需要 OKX 风险管理的 security 事件
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
                            {"role": "system", "content": "You are a professional crypto market analyst working for OKX. You MUST respond in Simplified Chinese (简体中文). Return analysis in JSON format only."},
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
                print(f"✅ Cached DeepSeek news analysis")
                
                return result

        except Exception as e:
            print(f"⚠️ DeepSeek news analysis error: {e}")
            return {"error": str(e), "analysis": None}

    def _format_news(self, news_list: List[Dict]) -> str:
        lines = []
        for i, news in enumerate(news_list[:10]):  # Top 10 news
            title = news.get('title', 'Unknown')[:80]
            category = news.get('category', 'unknown')
            priority = news.get('priority', 'medium')
            hot_score = news.get('hot_score', 0)
            sentiment = news.get('sentiment', 'neutral')
            lines.append(f"{i+1}. [{category.upper()}|{priority.upper()}|{hot_score}] {title} ({sentiment})")
        return "\n".join(lines) if lines else "No news"


# Global agent
deepseek_news_analysis_agent = DeepSeekNewsAnalysisAgent()


def get_deepseek_news_analysis_agent() -> DeepSeekNewsAnalysisAgent:
    return deepseek_news_analysis_agent
