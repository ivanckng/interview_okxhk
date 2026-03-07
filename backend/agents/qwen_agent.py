"""
Qwen Agent for Pulse Page - Intelligent Market Analysis & Recommendations
Uses Qwen (通义千问) for advanced reasoning and personalized insights
"""
import os
import json
import httpx
from typing import List, Dict, Any, Optional
from datetime import datetime
from models.schemas import PulseRecommendation, ProcessedNews, TrendDirection


class QwenAgent:
    """
    Qwen Agent for Pulse Page:
    1. Market intelligence synthesis
    2. Personalized recommendations
    3. Trend predictions and alerts
    4. Cross-asset correlation analysis
    """
    
    def __init__(self):
        self._api_key = None
        self._api_url = None
        self.model = "qwen-max"  # or "qwen-plus", "qwen-turbo"
    
    @property
    def api_key(self):
        if self._api_key is None:
            self._api_key = os.getenv("QWEN_API_KEY")
        return self._api_key
    
    @property
    def api_url(self):
        if self._api_url is None:
            self._api_url = os.getenv("QWEN_API_URL", "https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation")
        return self._api_url
    
    async def _call_api(self, messages: List[Dict[str, str]], temperature: float = 0.4) -> str:
        """Call Qwen API via DashScope"""
        if not self.api_key:
            raise ValueError("QWEN_API_KEY not set")
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": self.model,
            "input": {
                "messages": messages
            },
            "parameters": {
                "temperature": temperature,
                "max_tokens": 2000,
                "result_format": "message"
            }
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.api_url,
                headers=headers,
                json=payload,
                timeout=60.0
            )
            response.raise_for_status()
            data = response.json()
            
            if "output" in data and "choices" in data["output"]:
                return data["output"]["choices"][0]["message"]["content"]
            elif "choices" in data:
                return data["choices"][0]["message"]["content"]
            else:
                raise ValueError(f"Unexpected response format: {data}")
    
    async def generate_pulse_summary(
        self,
        news_items: List[ProcessedNews],
        market_data: Optional[Dict] = None,
        price_data: Optional[List[Dict]] = None
    ) -> Dict[str, Any]:
        """
        Generate comprehensive Pulse page summary
        Returns market pulse, key insights, and strategic recommendations
        """
        # Prepare context
        top_news = sorted(news_items, key=lambda x: x.hot_score, reverse=True)[:15]
        news_context = "\n".join([
            f"- [{n.priority.upper()}] {n.title}\n  Category: {n.category}, Score: {n.hot_score}, Sentiment: {n.sentiment}\n  Summary: {n.summary[:150]}..."
            for n in top_news
        ])
        
        market_context = json.dumps(market_data, default=str) if market_data else "No market data available"
        price_context = json.dumps(price_data, default=str)[:1000] if price_data else "No price data available"
        
        system_prompt = """You are an OKX Strategic Intelligence Agent, providing market analysis and strategic recommendations specifically for OKX exchange and its users.

Based on crypto news, market data, and price information, generate the following in ENGLISH:

1. market_pulse: 2-3 sentences summarizing current market conditions from OKX's perspective. What should OKX traders know?
2. key_insights: 3 key insights (1 sentence each) highlighting what's most relevant to OKX business and users
3. trend_prediction: 7-day and 30-day outlook with focus on OKX-listed assets
4. risk_alerts: 1-2 major risk alerts if applicable (security, regulatory, market risks)
5. action_items: 3 specific actionable recommendations for OKX users
6. hot_sectors: Top 3 hottest sectors/themes in the crypto market right now

Return JSON in ENGLISH:
{
  "market_pulse": "...",
  "key_insights": ["...", "...", "..."],
  "trend_prediction": {"7d": "...", "30d": "..."},
  "risk_alerts": ["..."],
  "action_items": ["...", "...", "..."],
  "hot_sectors": ["...", "...", "..."],
  "overall_sentiment": "bullish|bearish|mixed|neutral"
}

Analyze Chinese news sources but ALWAYS output your analysis in ENGLISH for OKX international users.

只返回 JSON，不要其他文字。"""

        user_content = f"""近期新闻:
{news_context}

市场数据:
{market_context}

价格数据片段:
{price_context}

请生成 Pulse 页面分析报告。"""

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content}
        ]
        
        try:
            response = await self._call_api(messages, temperature=0.4)
            
            # Clean response
            response = response.strip()
            if response.startswith("```"):
                response = response.split("```")[1]
                if response.startswith("json"):
                    response = response[4:]
            response = response.strip()
            
            result = json.loads(response)
            return result
            
        except Exception as e:
            print(f"⚠️ Failed to generate pulse summary: {e}")
            return {
                "market_pulse": "AI analysis temporarily unavailable. Please refresh to get the latest analysis.",
                "key_insights": ["System is processing data", "Please refresh the page for latest analysis"],
                "trend_prediction": {"7d": "Analyzing...", "30d": "Analyzing..."},
                "risk_alerts": [],
                "action_items": ["Monitor market movements", "Maintain risk management"],
                "hot_sectors": ["DeFi", "Layer 2", "AI Crypto"],
                "overall_sentiment": "neutral"
            }
    
    async def generate_recommendations(
        self,
        news_items: List[ProcessedNews],
        user_preferences: Optional[Dict] = None
    ) -> List[PulseRecommendation]:
        """
        Generate personalized recommendations for Pulse page
        """
        top_news = sorted(news_items, key=lambda x: x.hot_score, reverse=True)[:10]
        news_context = "\n".join([
            f"- {n.title} (Priority: {n.priority}, Category: {n.category})"
            for n in top_news
        ])
        
        system_prompt = """You are an OKX Recommendation Engine, generating personalized trading and strategic recommendations for OKX users.

Generate 3 recommendations based on latest crypto news. Each recommendation should focus on what OKX users should do.

Each recommendation includes:
- type: recommendation type (news|market|alert|opportunity)
- title: catchy title in ENGLISH (3-5 words)
- description: detailed description in ENGLISH (1-2 sentences) explaining why this matters to OKX users
- confidence: confidence level (70-95)
- action_items: 2-3 specific action items in ENGLISH

Return JSON array in ENGLISH."""

        user_content = f"""最新新闻:
{news_context}

请生成3条推荐。"""

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content}
        ]
        
        try:
            response = await self._call_api(messages, temperature=0.5)
            
            # Clean response
            response = response.strip()
            if response.startswith("```"):
                response = response.split("```")[1]
                if response.startswith("json"):
                    response = response[4:]
            response = response.strip()
            
            result = json.loads(response)
            
            if isinstance(result, dict) and "recommendations" in result:
                result = result["recommendations"]
            
            recommendations = []
            for item in result[:3]:
                rec = PulseRecommendation(
                    recommendation_type=item.get("type", "news"),
                    title=item.get("title", "Recommendation"),
                    description=item.get("description", ""),
                    confidence=item.get("confidence", 80),
                    related_items=item.get("related_items", []),
                    action_items=item.get("action_items", [])
                )
                recommendations.append(rec)
            
            return recommendations
            
        except Exception as e:
            print(f"⚠️ Failed to generate recommendations: {e}")
            # Fallback recommendations in English
            return [
                PulseRecommendation(
                    recommendation_type="news",
                    title="Watch Regulatory Developments",
                    description="Recent regulatory changes are frequent. OKX users should monitor policy trends closely as they impact exchange operations.",
                    confidence=85,
                    action_items=["Read latest regulatory news", "Assess portfolio risk exposure"]
                ),
                PulseRecommendation(
                    recommendation_type="market",
                    title="Institutional Inflows",
                    description="Major institutions continue to accumulate crypto assets, indicating positive market sentiment.",
                    confidence=78,
                    action_items=["Monitor institutional holdings", "Consider long-term positions"]
                ),
                PulseRecommendation(
                    recommendation_type="alert",
                    title="Security Alert",
                    description="Multiple security incidents reported recently. OKX users should ensure their accounts are secure.",
                    confidence=90,
                    action_items=["Check wallet security", "Enable 2FA authentication"]
                )
            ]
    
    async def predict_trends(
        self,
        news_items: List[ProcessedNews],
        timeframe: str = "7d"
    ) -> Dict[str, Any]:
        """
        Generate trend predictions based on news sentiment and market data
        """
        # Aggregate sentiment by category
        sentiment_by_category = {}
        for news in news_items:
            cat = news.category.value
            if cat not in sentiment_by_category:
                sentiment_by_category[cat] = {"positive": 0, "negative": 0, "neutral": 0, "total_score": 0}
            
            if news.sentiment == "positive":
                sentiment_by_category[cat]["positive"] += news.hot_score
            elif news.sentiment == "negative":
                sentiment_by_category[cat]["negative"] += news.hot_score
            else:
                sentiment_by_category[cat]["neutral"] += news.hot_score
            
            sentiment_by_category[cat]["total_score"] += news.hot_score
        
        # Calculate category trend
        category_trends = {}
        for cat, data in sentiment_by_category.items():
            total = data["positive"] + data["negative"] + data["neutral"]
            if total > 0:
                bullish_score = data["positive"] / total
                bearish_score = data["negative"] / total
                
                if bullish_score > 0.6:
                    trend = "bullish"
                elif bearish_score > 0.4:
                    trend = "bearish"
                else:
                    trend = "neutral"
                
                category_trends[cat] = {
                    "trend": trend,
                    "strength": min(100, int(data["total_score"] / 10)),
                    "sentiment_score": int((bullish_score - bearish_score) * 100)
                }
        
        # Overall trend
        total_positive = sum(d["positive"] for d in sentiment_by_category.values())
        total_negative = sum(d["negative"] for d in sentiment_by_category.values())
        total = total_positive + total_negative
        
        if total > 0:
            overall_bullish = total_positive / total
            if overall_bullish > 0.6:
                overall_trend = "bullish"
            elif overall_bullish < 0.4:
                overall_trend = "bearish"
            else:
                overall_trend = "mixed"
        else:
            overall_trend = "neutral"
        
        return {
            "timeframe": timeframe,
            "overall_trend": overall_trend,
            "category_trends": category_trends,
            "prediction_confidence": 75,
            "key_drivers": ["Institutional adoption", "Regulatory developments", "Market sentiment"]
        }


# Global agent instance
qwen_agent = QwenAgent()


def get_qwen_agent() -> QwenAgent:
    """Get Qwen agent instance"""
    return qwen_agent
