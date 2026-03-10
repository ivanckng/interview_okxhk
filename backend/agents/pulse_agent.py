"""
Pulse Agent for Comprehensive Market Analysis
Integrates data from News, Markets, Competitors, and Crypto pages
"""
import os
import httpx
import json
from typing import List, Dict, Any
from datetime import datetime


class DateTimeEncoder(json.JSONEncoder):
    """JSON encoder that handles datetime objects"""
    def default(self, obj):
        if isinstance(obj, datetime):
            return obj.isoformat()
        return super().default(obj)


class DeepSeekPulseAgent:
    """
    DeepSeek Agent for comprehensive pulse analysis
    Integrates multi-source data for holistic market intelligence
    """

    def __init__(self):
        self.api_key = os.getenv("DEEPSEEK_API_KEY")
        self.api_url = os.getenv("DEEPSEEK_API_URL", "https://api.deepseek.com/v1/chat/completions")

    async def generate_comprehensive_analysis(
        self,
        news_data: Dict[str, Any],
        markets_data: Dict[str, Any],
        competitors_data: Dict[str, Any],
        crypto_data: Dict[str, Any],
        language: str = "zh"
    ) -> Dict[str, Any]:
        """
        Generate comprehensive analysis from all data sources
        
        Args:
            news_data: News page data with AI analysis
            markets_data: Markets page data with AI analysis
            competitors_data: Competitors page data with AI analysis
            crypto_data: Crypto page data with AI analysis
            language: Language code ('zh' or 'en')
        
        Returns:
            Comprehensive analysis result
        """
        if not self.api_key:
            return self._fallback_analysis(language)

        # Prepare data summary for AI
        news_list = news_data.get("news", [])
        # ProcessNews is a Pydantic model, use model_dump() or attribute access
        news_titles = ""
        if news_list:
            titles = []
            for n in news_list[:5]:
                # Handle both dict and Pydantic model
                if hasattr(n, 'title'):
                    # Pydantic model
                    priority = getattr(n, 'priority', 'N/A')
                    title = getattr(n, 'title', 'N/A')
                    if hasattr(priority, 'value'):
                        priority = priority.value
                    titles.append(f"  - [{str(priority).upper()}] {str(title)[:80]}")
                elif isinstance(n, dict):
                    titles.append(f"  - [{n.get('priority', 'N/A').upper()}] {n.get('title', 'N/A')[:80]}")
            news_titles = "\n".join(titles)
        else:
            news_titles = "暂无新闻数据"
        
        markets_analysis = markets_data.get("ai_analysis", {})
        markets_summary = markets_analysis.get("market_pulse", "暂无宏观分析数据")[:200] if markets_analysis else "暂无宏观分析数据"
        
        # Get economy indicators data
        markets_data_full = markets_data.get("markets_data", {})
        economy_indicators = markets_data_full.get("economy_indicators", {})
        
        # Format economy indicators for AI
        us_gdp = economy_indicators.get("us", {}).get("gdp_annual", {})
        cn_gdp = economy_indicators.get("cn", {}).get("gdp_annual", {})
        us_cpi = economy_indicators.get("us", {}).get("cpi", {})
        cn_cpi = economy_indicators.get("cn", {}).get("cpi", {})
        us_unemployment = economy_indicators.get("us", {}).get("unemployment", {})
        
        economy_summary = []
        if us_gdp.get("value"):
            economy_summary.append(f"• 美国 GDP 年率：{us_gdp.get('value')}% ({us_gdp.get('period', 'N/A')})")
        if cn_gdp.get("value"):
            economy_summary.append(f"• 中国 GDP 年率：{cn_gdp.get('value')}% ({cn_gdp.get('period', 'N/A')})")
        if us_cpi.get("value"):
            economy_summary.append(f"• 美国 CPI: {us_cpi.get('value')}% ({us_cpi.get('period', 'N/A')})")
        if cn_cpi.get("value"):
            economy_summary.append(f"• 中国 CPI: {cn_cpi.get('value')}% ({cn_cpi.get('period', 'N/A')})")
        if us_unemployment.get("value"):
            economy_summary.append(f"• 美国失业率：{us_unemployment.get('value')}% ({us_unemployment.get('period', 'N/A')})")
        
        economy_text = "\n".join(economy_summary) if economy_summary else "暂无经济指标数据"

        data_summary = {
            "news": {
                "count": len(news_data.get("news", [])),
                "trending_count": len(news_data.get("trending", [])),
                "highlight_summary": news_data.get("highlight", {}).get("summary", "暂无新闻摘要"),
                "highlight_trend": news_data.get("highlight", {}).get("trend", "neutral"),
                "top_news_titles": news_titles,
            },
            "markets": {
                "market_pulse": markets_summary,
                "key_insights": markets_analysis.get("key_insights", [])[:2] if markets_analysis else [],
                "has_data": bool(markets_analysis),
                "economy_indicators": economy_text,
            },
            "competitors": {
                "binance_count": len([a for a in competitors_data.get("announcements", []) if a.get("exchange") == "binance"]),
                "bybit_count": len([a for a in competitors_data.get("announcements", []) if a.get("exchange") == "bybit"]),
                "bitget_count": len([a for a in competitors_data.get("announcements", []) if a.get("exchange") == "bitget"]),
                "analysis_summary": competitors_data.get("ai_analysis", {}).get("summary", "暂无竞对分析")[:200] if competitors_data.get("ai_analysis") else "暂无竞对分析",
            },
            "crypto": {
                "coins_count": len(crypto_data.get("coins", [])),
                "analysis_summary": crypto_data.get("ai_analysis", {}).get("market_pulse", "暂无加密分析")[:200] if crypto_data.get("ai_analysis") else "暂无加密分析",
            },
        }

        # Set prompts based on language
        if language == "zh":
            system_prompt = """你是 OKX 的首席战略分析师，负责综合分析全球市场动态。

你需要整合以下四个维度的信息：
1. 热点新闻：监管动态、技术突破、市场事件
2. 宏观市场：全球经济指标、股市、大宗商品、外汇
3. 竞对动向：Binance、Bybit、Bitget 等交易所的最新动作
4. 加密货币：BTC、ETH 等主流币种价格走势和市场情绪

你的任务是：
1. 识别各维度之间的关联性和相互影响
2. 发现潜在的市场机会和风险
3. 生成具有洞察力的综合分析报告
4. 提供可操作的建议

请返回 JSON 格式：
{
  "market_pulse": "200 字以内的市场脉搏总结，概括当前整体市场环境",
  "key_insights": ["关键洞察 1", "关键洞察 2", "关键洞察 3"],
  "hot_sectors": ["热门板块 1", "热门板块 2"],
  "overall_sentiment": "bullish/bearish/neutral",
  "trend_prediction": {
    "7d": "7 天趋势预测",
    "30d": "30 天趋势预测"
  },
  "action_items": ["建议行动 1", "建议行动 2", "建议行动 3"],
  "risk_alerts": ["风险警示 1", "风险警示 2"]
}"""
            user_prompt = f"""请分析以下综合市场数据：

【热点新闻】
- 新闻数量：{data_summary['news']['count']} 条
- 热点新闻：{data_summary['news']['trending_count']} 条
- 市场趋势：{data_summary['news']['highlight_trend']}
- AI 摘要：{data_summary['news']['highlight_summary'][:300]}
- 最新新闻:
{data_summary['news']['top_news_titles']}

【宏观市场】
- 经济指标数据:
{data_summary['markets']['economy_indicators']}
- 市场分析：{data_summary['markets']['market_pulse']}
- 关键洞察：{', '.join(data_summary['markets']['key_insights']) if data_summary['markets']['key_insights'] else '暂无'}

【竞对动向】
- Binance: {data_summary['competitors']['binance_count']} 条公告
- Bybit: {data_summary['competitors']['bybit_count']} 条公告
- Bitget: {data_summary['competitors']['bitget_count']} 条公告
- AI 分析：{data_summary['competitors']['analysis_summary']}

【加密货币】
- 监控币种：{data_summary['crypto']['coins_count']} 个
- AI 分析：{data_summary['crypto']['analysis_summary']}

注意：请基于以上所有数据（特别是经济指标数据）生成综合分析报告，返回 JSON 格式。"""
        else:
            system_prompt = """You are OKX's Chief Strategic Analyst, responsible for comprehensive analysis of global market dynamics.

You need to integrate information from four dimensions:
1. Hot News: Regulatory developments, technological breakthroughs, market events
2. Macro Markets: Global economic indicators, stock markets, commodities, forex
3. Competitor Movements: Latest actions from exchanges like Binance, Bybit, Bitget
4. Cryptocurrency: Price trends and market sentiment for BTC, ETH and major coins

Your tasks:
1. Identify correlations and mutual influences between dimensions
2. Discover potential market opportunities and risks
3. Generate insightful comprehensive analysis report
4. Provide actionable recommendations

Return JSON format:
{
  "market_pulse": "Market pulse summary within 200 words",
  "key_insights": ["Key insight 1", "Key insight 2", "Key insight 3"],
  "hot_sectors": ["Hot sector 1", "Hot sector 2"],
  "overall_sentiment": "bullish/bearish/neutral",
  "trend_prediction": {
    "7d": "7-day trend prediction",
    "30d": "30-day trend prediction"
  },
  "action_items": ["Action item 1", "Action item 2", "Action item 3"],
  "risk_alerts": ["Risk alert 1", "Risk alert 2"]
}"""
            user_prompt = f"""Please analyze the following comprehensive market data:

【Hot News】
- News count: {data_summary['news']['count']}
- Trending news: {data_summary['news']['trending_count']}
- Market trend: {data_summary['news']['highlight_trend']}
- AI summary: {data_summary['news']['highlight_summary'][:300]}
- Latest news:
{data_summary['news']['top_news_titles']}

【Macro Markets】
- Economic Indicators:
{data_summary['markets']['economy_indicators']}
- Market analysis: {data_summary['markets']['market_pulse']}
- Key insights: {', '.join(data_summary['markets']['key_insights']) if data_summary['markets']['key_insights'] else 'None'}

【Competitor Movements】
- Binance: {data_summary['competitors']['binance_count']} announcements
- Bybit: {data_summary['competitors']['bybit_count']} announcements
- Bitget: {data_summary['competitors']['bitget_count']} announcements
- AI analysis: {data_summary['competitors']['analysis_summary']}

【Cryptocurrency】
- Tracked coins: {data_summary['crypto']['coins_count']}
- AI analysis: {data_summary['crypto']['analysis_summary']}

Please generate comprehensive analysis report in JSON format."""

        try:
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
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_prompt}
                        ],
                        "temperature": 0.3,
                        "max_tokens": 2000
                    },
                    timeout=90.0
                )
                response.raise_for_status()

                result = response.json()
                analysis_text = result["choices"][0]["message"]["content"].strip()

                # Parse JSON from response
                try:
                    if analysis_text.startswith("```"):
                        analysis_text = analysis_text.split("```")[1]
                        if analysis_text.startswith("json"):
                            analysis_text = analysis_text[4:]

                    analysis = json.loads(analysis_text.strip())
                    print(f"✅ Pulse comprehensive analysis generated")
                    return analysis

                except json.JSONDecodeError as e:
                    print(f"⚠️ Failed to parse pulse analysis: {e}")
                    return self._fallback_analysis(language)

        except Exception as e:
            print(f"⚠️ Pulse analysis failed: {e}")
            return self._fallback_analysis(language)

    def _fallback_analysis(self, language: str = "zh") -> Dict[str, Any]:
        """Fallback analysis when AI fails"""
        if language == "zh":
            return {
                "market_pulse": "当前市场环境复杂多变，建议持续关注各维度动态。",
                "key_insights": ["市场波动性增加", "需关注竞对动态", "建议多元化布局"],
                "hot_sectors": ["DeFi", "Layer2"],
                "overall_sentiment": "neutral",
                "trend_prediction": {"7d": "震荡整理", "30d": "谨慎乐观"},
                "action_items": ["监控市场动态", "评估风险敞口", "准备应对方案"],
                "risk_alerts": ["市场波动风险", "监管政策变化"]
            }
        else:
            return {
                "market_pulse": "Current market environment is complex and volatile. Continue monitoring all dimensions.",
                "key_insights": ["Increased market volatility", "Monitor competitor movements", "Diversify strategy"],
                "hot_sectors": ["DeFi", "Layer2"],
                "overall_sentiment": "neutral",
                "trend_prediction": {"7d": "Consolidation", "30d": "Cautiously optimistic"},
                "action_items": ["Monitor market dynamics", "Assess risk exposure", "Prepare contingency plans"],
                "risk_alerts": ["Market volatility risk", "Regulatory changes"]
            }


# Global agent instance
pulse_agent = DeepSeekPulseAgent()


def get_pulse_agent() -> DeepSeekPulseAgent:
    return pulse_agent
