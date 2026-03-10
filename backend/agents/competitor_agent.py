"""
DeepSeek Agent for Competitor Analysis
Analyzes exchange announcements from OKX business perspective
"""
import os
import httpx
import json
from typing import List, Dict, Any
from datetime import datetime


class DeepSeekCompetitorAgent:
    """
    DeepSeek Agent for analyzing competitor exchange announcements
    Supports multiple exchanges: Bybit, Binance, etc.
    """
    
    def __init__(self):
        self.api_key = os.getenv("DEEPSEEK_API_KEY")
        self.api_url = os.getenv("DEEPSEEK_API_URL", "https://api.deepseek.com/v1/chat/completions")
    
    async def analyze_bybit_announcements(self, announcements: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Analyze Bybit announcements"""
        return await self._analyze_exchange_announcements(announcements, "Bybit")
    
    async def analyze_binance_announcements(self, announcements: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Analyze Binance announcements"""
        return await self._analyze_exchange_announcements(announcements, "Binance")
    
    async def analyze_bitget_announcements(self, announcements: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Analyze Bitget announcements"""
        return await self._analyze_exchange_announcements(announcements, "Bitget")
    
    async def _analyze_exchange_announcements(
        self, 
        announcements: List[Dict[str, Any]], 
        exchange_name: str
    ) -> List[Dict[str, Any]]:
        """
        Analyze competitor announcements using DeepSeek
        
        Args:
            announcements: Raw announcements from Bybit API
            
        Returns:
            Processed announcements with AI analysis
        """
        if not self.api_key or not announcements:
            return announcements
        
        system_prompt = f"""你是OKX的运营分析师，负责分析竞对（{exchange_name}等）的公告信息。

你的任务是：
1. 判断每条公告的类型（从OKX业务角度分类）
2. 评估对OKX运营的影响程度
3. 生成适合OKX内部团队阅读的中文摘要

分类标准（type字段）：
- new_listing: 新币上线/新交易对（直接影响OKX的交易量竞争）
- activity: 运营活动（拉新、促活、奖励、Carnival、Giveaway等营销手段）
- product_update: 产品功能更新（影响OKX产品 roadmap 决策）
- rule_change: 规则变更（费率调整、订单限制、KYC政策等）
- delisting: 下架通知（可能带来用户迁移机会）
- maintenance: 系统维护（暂时性影响，关注是否有机可乘）
- market: 其他市场相关

影响程度评估标准（impact_level字段）：
- critical: 极高（直接影响OKX核心业务，如大规模拉新活动、重要新币上线、费率大幅调整）
- high: 高（值得OKX立即关注并制定应对策略）
- medium: 中（需要了解，但暂不需要紧急应对）
- low: 低（常规公告，仅作信息同步）

置顶规则：
1. 优先置顶 impact_level = "critical" 的公告
2. 如果多条都是 critical，按时间先后顺序（最新的在前）
3. 其次是 high，同样按时间排序

输出要求：
1. 为每条公告生成 concise 的中文摘要（突出对OKX的启示）
2. 标记 is_top = true 如果 impact_level 为 critical 或 high
3. 保留原始字段并添加分析字段

请返回 JSON 数组格式，每条公告包含：
{{
  "id": "原始ID",
  "title": "原标题",
  "title_zh": "中文标题（翻译或优化）",
  "summary_zh": "中文摘要（突出运营影响）",
  "type": "分类",
  "impact_level": "影响程度",
  "is_top": true/false,
  "url": "原始URL",
  "tags": ["标签1", "标签2"]
}}"""

        # Prepare announcements for AI analysis
        announcements_text = json.dumps(announcements, ensure_ascii=False, indent=2)
        
        user_prompt = f"""请分析以下 {len(announcements)} 条{exchange_name}竞对公告：

{announcements_text}

请为每条公告生成分析报告，按影响程度排序，返回JSON数组。"""

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
                    timeout=60.0
                )
                response.raise_for_status()
                
                result = response.json()
                analysis_text = result["choices"][0]["message"]["content"].strip()
                
                # Parse JSON from response
                try:
                    # Remove markdown code block if present
                    if analysis_text.startswith("```"):
                        analysis_text = analysis_text.split("```")[1]
                        if analysis_text.startswith("json"):
                            analysis_text = analysis_text[4:]
                    
                    analyzed = json.loads(analysis_text.strip())

                    # Merge with original data to preserve fields like url, publish_time, type, priority_score
                    original_map = {a["id"]: a for a in announcements}
                    for item in analyzed:
                        orig = original_map.get(item["id"], {})
                        item["url"] = item.get("url") or orig.get("url", "")
                        item["publish_time"] = orig.get("publish_time", "")
                        item["exchange"] = orig.get("exchange", "")
                        item["type"] = item.get("type") or orig.get("type", "market")
                        # Preserve priority_score from original data
                        item["priority_score"] = orig.get("priority_score", 50)

                    # Sort by impact level and time
                    impact_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
                    analyzed.sort(key=lambda x: (
                        impact_order.get(x.get("impact_level", "low"), 4),
                        -self._parse_timestamp(x.get("publish_time", ""))
                    ))

                    print(f"✅ DeepSeek analyzed {len(analyzed)} announcements")
                    return analyzed
                    
                except json.JSONDecodeError as e:
                    print(f"⚠️ Failed to parse AI response: {e}")
                    return self._fallback_process(announcements)
                    
        except Exception as e:
            print(f"⚠️ DeepSeek analysis failed: {e}")
            return self._fallback_process(announcements)
    
    def _parse_timestamp(self, ts_str: str) -> int:
        """Parse timestamp string to unix timestamp"""
        try:
            dt = datetime.fromisoformat(ts_str.replace('Z', '+00:00'))
            return int(dt.timestamp())
        except:
            return 0
    
    def _fallback_process(self, announcements: List[Dict]) -> List[Dict]:
        """Fallback to rule-based processing if AI fails"""
        processed = []
        for item in announcements:
            # Generate a simple summary from title if description is empty
            desc = item.get("description", "")
            if not desc:
                # Use title as fallback summary
                title = item.get("title", "")
                desc = f"{title} - 暂无详细摘要"
            
            processed.append({
                **item,
                "title_zh": item.get("title", ""),
                "summary_zh": desc,
                "impact_level": "medium",
                "is_top": False,
                "url": item.get("url", ""),
                "publish_time": item.get("publish_time", ""),
                "priority_score": item.get("priority_score", 50),
            })
        return processed
    
    # Backward compatibility
    async def analyze_announcements(self, announcements: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Legacy method for backward compatibility - defaults to Bybit"""
        return await self.analyze_bybit_announcements(announcements)
    
    async def generate_competitor_summary(self, all_announcements: List[Dict[str, Any]], language: str = "zh") -> Dict[str, Any]:
        """
        Generate overall competitor analysis summary from all exchanges
        """
        if not self.api_key or not all_announcements:
            if language == "zh":
                return {
                    "summary": "暂无竞对数据进行分析",
                    "overall_trend": "neutral",
                    "trend_label": "暂无数据",
                    "key_points": []
                }
            else:
                return {
                    "summary": "No competitor data available for analysis",
                    "overall_trend": "neutral",
                    "trend_label": "No Data",
                    "key_points": []
                }
        
        # Count by exchange
        bybit_count = sum(1 for a in all_announcements if a.get('exchange') == 'bybit')
        binance_count = sum(1 for a in all_announcements if a.get('exchange') == 'binance')
        bitget_count = sum(1 for a in all_announcements if a.get('exchange') == 'bitget')
        
        # Count high impact announcements
        high_impact = sum(1 for a in all_announcements 
                         if a.get('impact_level') in ['critical', 'high'])
        
        system_prompt = """你是OKX的战略分析师，负责综合分析竞对（Binance、Bybit、Bitget）的最新动态。

你的任务是根据各交易所的最新公告，生成一份竞对动态总结报告。

输出要求：
1. summary: 一段简洁的总结（100字以内），概括当前竞对主要动向
2. overall_trend: 整体趋势（bullish/bearish/neutral），从OKX角度判断是机会还是威胁
3. trend_label: 趋势标签（如"机会"、"威胁"、"观望"等）
4. key_points: 3-5个关键要点，每个要点一句话

请返回 JSON 格式：
{
  "summary": "总结文本",
  "overall_trend": "bullish/bearish/neutral",
  "trend_label": "标签",
  "key_points": ["要点1", "要点2", "要点3"]
}"""

        # Prepare data for analysis
        announcements_text = json.dumps(all_announcements[:20], ensure_ascii=False, indent=2)
        
        user_prompt = f"""请分析以下竞对公告数据：

总计：{len(all_announcements)} 条公告
- Bybit: {bybit_count} 条
- Binance: {binance_count} 条  
- Bitget: {bitget_count} 条
- 高影响度：{high_impact} 条

公告详情：
{announcements_text}

请生成竞对分析报告。"""

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
                        "max_tokens": 1500
                    },
                    timeout=60.0
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
                    return analysis
                    
                except json.JSONDecodeError as e:
                    print(f"⚠️ Failed to parse summary response: {e}")
                    return self._fallback_summary(all_announcements, language)
                    
        except Exception as e:
            print(f"⚠️ Summary generation failed: {e}")
            return self._fallback_summary(all_announcements, language)
    
    def _fallback_summary(self, announcements: List[Dict], language: str = "zh") -> Dict[str, Any]:
        """Fallback summary when AI fails"""
        bybit_count = sum(1 for a in announcements if a.get('exchange') == 'bybit')
        binance_count = sum(1 for a in announcements if a.get('exchange') == 'binance')
        bitget_count = sum(1 for a in announcements if a.get('exchange') == 'bitget')
        
        return {
            "summary": f"检测到 {len(announcements)} 条竞对动态：Bybit {bybit_count} 条、Binance {binance_count} 条、Bitget {bitget_count} 条。建议持续关注主要竞争对手的产品更新和营销活动。",
            "overall_trend": "neutral",
            "trend_label": "观望",
            "key_points": [
                "多家交易所近期有产品更新",
                "需关注竞对营销活动", 
                "建议评估对OKX业务的影响"
            ]
        }


# Global agent instance
competitor_agent = DeepSeekCompetitorAgent()


def get_competitor_agent() -> DeepSeekCompetitorAgent:
    return competitor_agent
