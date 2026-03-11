"""
DeepSeek Agent for data processing and highlights generation
"""
import os
import json
import httpx
from typing import List, Dict, Any, Optional
from datetime import datetime
from models.schemas import (
    RawNewsItem, ProcessedNews, HighlightSummary, 
    NewsCategory, NewsPriority, TrendDirection
)


class DeepSeekAgent:
    """
    DeepSeek Agent for:
    1. Processing raw news (classification, priority, sentiment)
    2. Generating highlight summaries for each page
    """
    
    def __init__(self):
        self._api_key = None
        self._api_url = None
        self.model = "deepseek-chat"  # or "deepseek-reasoner" for complex reasoning
    
    @property
    def api_key(self):
        if self._api_key is None:
            self._api_key = os.getenv("DEEPSEEK_API_KEY")
        return self._api_key
    
    @property
    def api_url(self):
        if self._api_url is None:
            self._api_url = os.getenv("DEEPSEEK_API_URL", "https://api.deepseek.com/v1/chat/completions")
        return self._api_url
        
    async def _call_api(self, messages: List[Dict[str, str]], temperature: float = 0.3) -> str:
        """Call DeepSeek API"""
        if not self.api_key:
            raise ValueError("DEEPSEEK_API_KEY not set")
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": 2000
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
            return data["choices"][0]["message"]["content"]
    
    async def process_news(self, raw_news: RawNewsItem) -> ProcessedNews:
        """
        Process single news item:
        - Classify category
        - Determine priority
        - Generate summary
        - Extract tags and sentiment
        - Calculate hot score
        """
        system_prompt = """You are an OKX Business Operations Intelligence Agent. You work for OKX company (not for traders). Your job is to analyze crypto news from OKX's business perspective and identify what OKX operations team should pay attention to.

Analyze the given news and return a JSON object with the following fields:
- title: Create a clean, professional headline (max 15 words) that captures the key news. Remove source prefixes like "BWENEWS:", "AggrNews:" and eliminate duplicate bilingual text. Output should be a single concise English headline.
- category: one of [regulation, technology, market, security, adoption, defi, nft]
- priority: one of [high, medium, low] based on impact to OKX business operations
- summary: concise 1-2 sentence summary in ENGLISH analyzing what this means for OKX as a company (analyze Chinese news but output in English)
- hot_score: integer 0-100 based on business impact urgency for OKX
- tags: array of 3-5 relevant keywords in English
- sentiment: one of [positive, negative, neutral] from OKX company business perspective
- key_topics: array of main topics discussed (in English)

Guidelines for title formatting:
- Remove news source prefixes (BWENEWS, AggrNews, etc.)
- Remove timestamps and dates
- Remove separator lines (---)
- Deduplicate bilingual content - keep only the English version
- Keep it professional and news-worthy
- Maximum 15 words, ideally 8-12 words

Content relevance filtering - BE STRICT:
- is_relevant: boolean indicating if this news is relevant to OKX crypto exchange operations
- Set to FALSE for ANY of these:
  * Promotional content about news channels, Telegram groups, or subscriptions (e.g., "Subscribe to our channel", "Join our group for updates")
  * Content that explicitly states it has no crypto-related information
  * Pure marketing messages with no substantive crypto news
  * Announcements about other news sources rather than actual news
- Set to TRUE for: regulatory news, competitor actions, market movements, security incidents, institutional adoption, product launches, exchange listings
- CRITICAL: If the content is promoting a news channel/Telegram group, ALWAYS set is_relevant to FALSE regardless of other factors

Focus on OKX business concerns:
- Regulatory changes affecting exchange operations and compliance requirements
- Competitor actions (Binance, ByBit, Coinbase) that threaten OKX market position
- Institutional adoption trends that could drive OKX volume/revenue
- Security incidents requiring OKX risk management attention
- Market events that could impact OKX trading volumes and user activity
- Product/technology developments OKX should consider implementing

Respond ONLY with valid JSON in ENGLISH, no markdown formatting."""

        user_content = f"""Title: {raw_news.title}
Source: {raw_news.source}
Content: {raw_news.content or 'N/A'}
Publish Time: {raw_news.publish_time}"""

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content}
        ]
        
        try:
            response = await self._call_api(messages, temperature=0.3)
            # Clean response (remove markdown if any)
            response = response.strip()
            if response.startswith("```"):
                response = response.split("```")[1]
                if response.startswith("json"):
                    response = response[4:]
            response = response.strip()
            
            result = json.loads(response)
            
            # Use AI-optimized title if available, otherwise clean the original
            optimized_title = result.get("title", raw_news.title)
            if not optimized_title or optimized_title.strip() == "":
                optimized_title = raw_news.title
            
            # Store relevance in raw_data for filtering
            is_relevant = result.get("is_relevant", True)
            
            return ProcessedNews(
                id=raw_news.id,
                title=optimized_title,
                summary=result.get("summary", raw_news.title),
                source=raw_news.source,
                source_url=raw_news.source_url,
                publish_time=raw_news.publish_time,
                category=NewsCategory(result.get("category", "market")),
                priority=NewsPriority(result.get("priority", "medium")),
                hot_score=result.get("hot_score", 50),
                tags=result.get("tags", []),
                sentiment=result.get("sentiment", "neutral"),
                key_topics=result.get("key_topics", []),
                is_relevant=is_relevant
            )
        except Exception as e:
            print(f"⚠️ Failed to process news {raw_news.id}: {e}")
            # Fallback to default processing
            return ProcessedNews(
                id=raw_news.id,
                title=raw_news.title,
                summary=raw_news.title[:100] + "..." if len(raw_news.title) > 100 else raw_news.title,
                source=raw_news.source,
                source_url=raw_news.source_url,
                publish_time=raw_news.publish_time,
                category=NewsCategory.MARKET,
                priority=NewsPriority.MEDIUM,
                hot_score=50,
                tags=["crypto"],
                sentiment="neutral",
                key_topics=[]
            )
    
    async def batch_process_news(self, raw_news_list: List[RawNewsItem]) -> List[ProcessedNews]:
        """Process multiple news items and filter out irrelevant ones"""
        results = []
        for news in raw_news_list:
            processed = await self.process_news(news)
            
            # Additional rule-based filtering for common spam patterns
            title_lower = processed.title.lower()
            summary_lower = processed.summary.lower()
            is_spam = (
                # Promotional patterns
                'subscribe to our' in title_lower or
                'subscribe to' in title_lower and 'channel' in title_lower or
                'join our' in title_lower and ('group' in title_lower or 'channel' in title_lower) or
                # Low relevance indicators
                processed.hot_score < 10 and 'promotional' in summary_lower or
                'no direct crypto' in summary_lower or
                'no substantive crypto' in summary_lower
            )
            
            # Filter out if marked irrelevant by AI or matches spam patterns
            if getattr(processed, 'is_relevant', True) and not is_spam:
                results.append(processed)
            else:
                print(f"🚫 Filtered out irrelevant news: {processed.title[:50]}...")
        return results
    
    async def generate_news_highlight(self, news_items: List[ProcessedNews]) -> HighlightSummary:
        """Generate highlight summary for News page"""
        if not news_items:
            return HighlightSummary(
                title="智能行业专家分析",
                summary="暂无新闻数据",
                trend=TrendDirection.NEUTRAL,
                highlights=["请稍后再查看更新"]
            )

        # Prepare context from top news
        top_news = sorted(news_items, key=lambda x: x.hot_score, reverse=True)[:10]
        news_context = "\n".join([
            f"- [{n.priority.upper()}] {n.title} (Category: {n.category}, Score: {n.hot_score}, Sentiment: {n.sentiment})"
            for n in top_news
        ])

        system_prompt = """你是 OKX 高薪聘请的行业分析专家，请你根据行业新闻分析行业当前的现状和发展趋势，OKX 在当前行业发展阶段需要关注的地方。

请返回 JSON 格式的中文分析，包含：
- title: 标题，固定为"智能行业专家分析"
- summary: 1-2 句话概述当前行业现状
- trend: one of [bullish, bearish, mixed, neutral]
- highlights: 3 个关键要点，每个 1-2 句话，说明 OKX 应该关注什么

关注点：
1. 监管政策变化对 OKX 合规的影响
2. 竞争对手（Binance, ByBit, Coinbase）的动向
3. 机构采用趋势对 OKX 交易量的影响
4. 市场事件对 OKX 用户活跃度的影响
5. 安全问题需要 OKX 风险管理
6. OKX 应该考虑的产品机会

请用中文回复。"""
        user_content = f"Recent News:\n{news_context}"
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content}
        ]
        
        try:
            response = await self._call_api(messages, temperature=0.4)
            response = response.strip()
            if response.startswith("```"):
                response = response.split("```")[1]
                if response.startswith("json"):
                    response = response[4:]
            response = response.strip()

            result = json.loads(response)

            return HighlightSummary(
                title=result.get("title", "智能行业专家分析"),
                summary=result.get("summary", "暂无新闻分析数据"),
                trend=TrendDirection(result.get("trend", "neutral")),
                highlights=result.get("highlights", [])
            )
        except Exception as e:
            print(f"⚠️ Failed to generate news highlight: {e}")
            return HighlightSummary(
                title="智能行业专家分析",
                summary=f"正在分析 {len(news_items)} 条最新新闻...",
                trend=TrendDirection.NEUTRAL,
                highlights=["AI 分析暂时不可用"]
            )
    
    async def generate_market_highlight(self, market_data: Dict[str, Any]) -> HighlightSummary:
        """Generate highlight for Markets page"""
        system_prompt = """你是 OKX 雇佣的高级经济学家哦，你需要根据中美两大经济体的宏观经济数据，突发的时政新闻，主要市场的股指和大宗商品以及外汇分析宏观市场变化对于 OKX 运营的影响。

请返回 JSON 格式的中文分析，包含：title（标题）, summary（摘要）, trend（bullish/bearish/mixed/neutral）, highlights（3 个要点）。

标题固定为："智能经济学家分析"

关注点：
1. 中美 GDP、通胀率、利率等宏观数据如何影响加密货币市场
2. 突发时政新闻对 OKX 运营的潜在影响
3. 全球主要股市、大宗商品、外汇市场的联动效应
4. 给 OKX 运营团队的具体建议"""

        user_content = f"Market Data: {json.dumps(market_data, default=str)}"

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content}
        ]

        try:
            response = await self._call_api(messages, temperature=0.4)
            result = json.loads(response.strip().replace("```json", "").replace("```", ""))
            return HighlightSummary(
                title=result.get("title", "智能经济学家分析"),
                summary=result.get("summary", ""),
                trend=TrendDirection(result.get("trend", "neutral")),
                highlights=result.get("highlights", [])
            )
        except Exception as e:
            print(f"⚠️ Failed to generate market highlight: {e}")
            return HighlightSummary(
                title="智能经济学家分析",
                summary="宏观经济数据分析中...",
                trend=TrendDirection.NEUTRAL,
                highlights=["数据加载中..."]
            )
    
    async def generate_company_highlight(self, announcements: List[Dict]) -> HighlightSummary:
        """Generate highlight for Company page"""
        system_prompt = """You are an OKX Competitive Intelligence Agent. Analyze exchange announcements from OKX's perspective.

Focus on: What are competitors (Binance, ByBit, Coinbase) doing? What should OKX pay attention to? Any opportunities or threats?

Return JSON in ENGLISH with: title, summary, trend (active/neutral), highlights (3 items)."""
        
        user_content = f"Announcements: {json.dumps(announcements, default=str)[:2000]}"
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content}
        ]
        
        try:
            response = await self._call_api(messages, temperature=0.4)
            result = json.loads(response.strip().replace("```json", "").replace("```", ""))
            return HighlightSummary(
                title=result.get("title", "Exchange Updates"),
                summary=result.get("summary", ""),
                trend=TrendDirection(result.get("trend", "neutral")),
                highlights=result.get("highlights", [])
            )
        except Exception as e:
            print(f"⚠️ Failed to generate company highlight: {e}")
            return HighlightSummary(
                title="Exchange Updates",
                summary="Monitoring exchange announcements.",
                trend=TrendDirection.NEUTRAL,
                highlights=["Loading exchange data..."]
            )
    
    async def generate_crypto_highlight(self, price_data: List[Dict], global_data: Optional[Dict] = None) -> HighlightSummary:
        """Generate highlight for Crypto page"""

        # 准备全局数据上下文
        global_context = ""
        if global_data:
            total_market_cap = global_data.get("total_market_cap")
            total_volume = global_data.get("total_volume")
            market_cap_pct = global_data.get("market_cap_percentage", {})
            mcap_change_24h = global_data.get("market_cap_change_24h")
            btc_dominance = market_cap_pct.get("btc", 0) if isinstance(market_cap_pct, dict) else 0
            eth_dominance = market_cap_pct.get("eth", 0) if isinstance(market_cap_pct, dict) else 0
            btc_dom_change = global_data.get("btc_dominance_change_24h")
            eth_dom_change = global_data.get("eth_dominance_change_24h")

            # 格式化数据，处理 None 值
            mcap_str = f"${total_market_cap / 1e12:.2f}T" if total_market_cap else "N/A"
            vol_str = f"${total_volume / 1e9:.2f}B" if total_volume else "N/A"
            btc_str = f"{btc_dominance}%" if btc_dominance else "N/A"
            eth_str = f"{eth_dominance}%" if eth_dominance else "N/A"
            
            # 格式化涨跌幅
            mcap_change_str = ""
            vol_change_str = ""
            btc_change_str = ""
            eth_change_str = ""
            
            if mcap_change_24h is not None:
                sign = "+" if mcap_change_24h > 0 else ""
                mcap_change_str = f" ({sign}{mcap_change_24h:.2f}%)"
            if global_data.get("total_volume_change_24h"):
                vol_change = global_data.get("total_volume_change_24h")
                sign = "+" if vol_change > 0 else ""
                vol_change_str = f" ({sign}{vol_change:.2f}%)"
            if btc_dom_change is not None:
                sign = "+" if btc_dom_change > 0 else ""
                btc_change_str = f" ({sign}{btc_dom_change:.2f}%)"
            if eth_dom_change is not None:
                sign = "+" if eth_dom_change > 0 else ""
                eth_change_str = f" ({sign}{eth_dom_change:.2f}%)"

            global_context = f"""

全球市场数据：
- 总市值：{mcap_str}{mcap_change_str}
- 24h 交易量：{vol_str}{vol_change_str}
- BTC 主导率：{btc_str}{btc_change_str}
- ETH 主导率：{eth_str}{eth_change_str}
"""
            print(f"[Crypto Highlight] Global data: mcap={mcap_str}{mcap_change_str}, vol={vol_str}{vol_change_str}, btc_dom={btc_str}{btc_change_str}, eth_dom={eth_str}{eth_change_str}")
        else:
            print("[Crypto Highlight] No global data provided")
        
        system_prompt = """你是 OKX 雇佣的 Crypto 市场分析师，为 OKX 交易用户分析加密货币价格走势。

关注点：主要币种价格波动、交易机会、支撑/阻力位，与 OKX 上市代币相关的市场动态。

请返回 JSON 格式的中文分析，包含：
- title: 标题，固定为"智能 Crypto 专家分析"
- summary: 1-2 句话概述当前加密货币市场现状
- trend: one of [bullish, bearish, mixed, neutral]
- highlights: 3 个关键要点，每个 1-2 句话

请用中文回复。"""

        user_content = f"Price Data: {json.dumps(price_data, default=str)[:2000]}{global_context}"

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content}
        ]
        
        try:
            response = await self._call_api(messages, temperature=0.4)
            result = json.loads(response.strip().replace("```json", "").replace("```", ""))
            return HighlightSummary(
                title=result.get("title", "智能 Crypto 专家分析"),
                summary=result.get("summary", ""),
                trend=TrendDirection(result.get("trend", "neutral")),
                highlights=result.get("highlights", [])
            )
        except Exception as e:
            print(f"⚠️ Failed to generate crypto highlight: {e}")
            return HighlightSummary(
                title="智能 Crypto 专家分析",
                summary="正在分析加密货币市场价格数据...",
                trend=TrendDirection.NEUTRAL,
                highlights=["AI 分析加载中，请稍候..."]
            )


# Global agent instance
deepseek_agent = DeepSeekAgent()


def get_deepseek_agent() -> DeepSeekAgent:
    """Get DeepSeek agent instance"""
    return deepseek_agent
