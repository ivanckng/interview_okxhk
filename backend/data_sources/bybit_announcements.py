"""
Bybit Announcements API Client
Direct HTTP calls to Bybit API
Documentation: https://bybit-exchange.github.io/docs/v5/announcement
"""
import requests
from typing import List, Dict, Any
from datetime import datetime, timedelta


class BybitAnnouncementClient:
    """
    Bybit Announcement Client
    Fetches real announcements from Bybit API
    """
    
    BASE_URL = "https://api.bybit.com/v5/announcements/index"
    
    def get_announcements(self, locale: str = "en-US", limit: int = 20) -> List[Dict[str, Any]]:
        """
        Fetch announcements from Bybit
        
        Args:
            locale: Language locale (e.g., "en-US", "zh-CN")
            limit: Number of announcements to fetch
            
        Returns:
            List of announcement dictionaries
        """
        params = {
            'locale': locale,
            'limit': min(limit, 100)
        }
        
        try:
            response = requests.get(
                self.BASE_URL,
                params=params,
                timeout=10
            )
            response.raise_for_status()
            
            data = response.json()
            
            if data.get('retCode') != 0:
                print(f"⚠️ Bybit API error: {data.get('retMsg')}")
                return []
            
            announcements = data.get('result', {}).get('list', [])
            
            # Transform to our format with smart prioritization
            formatted = []
            for item in announcements:
                # Convert timestamp to ISO format
                timestamp = item.get('dateTimestamp', 0)
                publish_time = self._timestamp_to_iso(timestamp)
                
                # Calculate priority score for sorting
                priority_score = self._calculate_priority(item)
                
                formatted.append({
                    'id': f"bybit-{timestamp}",
                    'title': item.get('title', ''),
                    'description': self._truncate_description(item.get('description', '')),
                    'type': self._map_type(item.get('type', {}), item.get('title', '')),
                    'url': item.get('url', ''),
                    'publish_time': publish_time,
                    'importance': self._determine_importance(item),
                    'priority_score': priority_score,
                    'is_top': priority_score >= 80,  # Mark as TOP if high priority
                    'exchange': 'bybit',
                    'tags': item.get('tags', []),
                    'raw_data': item
                })
            
            # Sort by priority score (descending), then by date (newest first)
            formatted.sort(key=lambda x: (-x['priority_score'], -self._parse_timestamp(x['publish_time'])))
            
            print(f"✅ Fetched {len(formatted)} announcements from Bybit ({locale})")
            return formatted
            
        except Exception as e:
            print(f"❌ Failed to fetch Bybit announcements: {e}")
            return []
    
    def _timestamp_to_iso(self, timestamp_ms: int) -> str:
        """Convert milliseconds timestamp to ISO format (without microseconds for JS compatibility)"""
        if not timestamp_ms:
            return datetime.utcnow().replace(microsecond=0).isoformat()
        try:
            dt = datetime.fromtimestamp(timestamp_ms / 1000)
            return dt.replace(microsecond=0).isoformat()
        except:
            return datetime.utcnow().replace(microsecond=0).isoformat()
    
    def _truncate_description(self, desc: str, max_len: int = 200) -> str:
        """Truncate description to max length"""
        if len(desc) > max_len:
            return desc[:max_len] + '...'
        return desc
    
    def _map_type(self, type_obj: Dict, announcement_title: str = '') -> str:
        """Map Bybit announcement type to our types"""
        # 运营活动类 -> activity (拉新、促活、奖励等)
        activity_types = [
            'latest_activities',      # 最新活动
            'campaigns',              # 活动推广
            'trading_campaigns',      # 交易活动
            'airdrops',               # 空投
            'bonus',                  # 奖励
            'referral',               # 推荐拉新
            'lucky_draw',             # 抽奖
            'promotions',             # 促销
            'events',                 # 活动
            'giveaway',               # 赠品活动
            'trading_competition',    # 交易大赛
            'earn',                   # 理财活动 (Carnival等)
            'staking',                # 质押活动
        ]
        
        # 新币上线类 -> new_listing
        listing_types = [
            'new_crypto',             # 新币上线
            'new_listings',           # 新上线
            'spot_listings',          # 现货上线
            'derivatives_listings',   # 合约上线
            'tradfi_listings',        # 传统金融上线
            'new_cryptocurrency',     # 新加密货币
        ]
        
        # 产品更新类 -> product_update
        product_types = [
            'product_updates',        # 产品更新
            'feature_releases',       # 功能发布
            'platform_updates',       # 平台更新
            'new_products',           # 新产品
            'copy_trading',           # 跟单交易
            'trading_bots',           # 交易机器人
            'api_updates',            # API更新
        ]
        
        # 系统维护类 -> maintenance
        maintenance_types = [
            'maintenance',            # 系统维护
            'system_upgrades',        # 系统升级
            'service_status',         # 服务状态
        ]
        
        # 规则变更类 -> rule_change
        rule_types = [
            'rule_changes',           # 规则变更
            'policy_updates',         # 政策更新
            'fee_changes',            # 费率变更
            'kyc_changes',            # KYC变更
            'terms_of_service',       # 服务条款
        ]
        
        # 下架类 -> delisting
        delisting_types = [
            'delistings',             # 下架
            'removals',               # 移除
        ]
        
        # 新闻/其他 -> 默认根据标题猜测
        news_types = [
            'latest_bybit_news',      # Bybit新闻
            'company_news',           # 公司新闻
            'industry_news',          # 行业新闻
            'bybit_news',             # Bybit新闻变体
            'news',                   # 通用新闻
        ]
        
        if isinstance(type_obj, dict):
            type_key = type_obj.get('key', '').lower()
            type_title = type_obj.get('title', '').lower()
        else:
            type_key = str(type_obj).lower()
            type_title = ''
        
        # 映射到我们的类型
        if type_key in activity_types:
            return 'activity'
        elif type_key in listing_types:
            return 'new_listing'
        elif type_key in product_types:
            return 'product_update'
        elif type_key in maintenance_types:
            return 'maintenance'
        elif type_key in rule_types:
            return 'rule_change'
        elif type_key in delisting_types:
            return 'delisting'
        elif type_key in news_types:
            # 对于新闻类型，优先根据公告标题内容猜测（可能是活动伪装成新闻）
            guessed = self._guess_type_from_title(announcement_title)
            # 如果猜测结果是 product_update（默认），但实际标题像活动，返回 activity
            if guessed != 'product_update':
                return guessed
            # 否则返回 market
            return 'market'
        else:
            # 默认根据标题内容判断
            return self._guess_type_from_title(announcement_title)
    
    def _guess_type_from_title(self, title: str) -> str:
        """根据标题内容猜测类型"""
        title_lower = title.lower()
        
        # 活动相关 (拉新、促活、奖励等)
        activity_keywords = [
            'campaign', 'carnival', 'giveaway', 'give away', 'lucky draw', 'lucky', 
            'event', 'activity', 'promotion', 'promo', 'bonus', 'prize', 'reward', 
            'exclusive', 'new user', 'newuser', 'first deposit', 'firstdeposit',
            'referral', 'refer', 'invite', 'invitation',
            'booster', 'boost',
            'trade to share', 'trade and win', 'trading competition',
            'deposit bonus', 'cashback', 'cash back',
            'puzzle', 'hunt', 'challenge',
            'special', 'celebration', 'festival',
            'zero fee', 'zero trading fee', 'discount',
            'merchant', 'p2p merchant',
            'king of', 'queen of',
            'women\'s day', 'holiday special',
        ]
        if any(kw in title_lower for kw in activity_keywords):
            return 'activity'
        
        # 新币上线 (必须是新上线的币/交易对)
        listing_keywords = [
            'new listing:', 'new listing ', 'will list', 
            'now live:', 'now live on', 'spot trading pairs now live', 
            'spot pairs launch', 'new trading pair',
            'listing:', 'list:', 'listed:', 'tradfi stock listing',
        ]
        # 排除规则变更类标题
        if 'change' in title_lower or 'adjust' in title_lower or 'update' in title_lower:
            pass  # 可能是规则变更，不返回 new_listing
        elif any(kw in title_lower for kw in listing_keywords):
            return 'new_listing'
        
        # 下架
        if any(kw in title_lower for kw in ['delist', 'will remove', 'trading suspension', 'discontinue']):
            return 'delisting'
        
        # 维护
        if any(kw in title_lower for kw in ['maintenance', 'system upgrade', 'system update', 'support', 'network upgrade']):
            return 'maintenance'
        
        # 规则变更 (费率调整、订单限制、KYC等)
        rule_keywords = [
            'rule change', 'policy update', 'fee change', 'fee adjustment', 'trading fee',
            'terms update', 'terms of service', 'discontinuation', 'discontinue',
            'max order', 'order size', 'position limit', 'leverage limit',
            'margin requirement', 'margin change', 'adjustment',
            'changes of', 'change to', 'update to',
            'kyc', 'aml', 'verification',
        ]
        if any(kw in title_lower for kw in rule_keywords):
            return 'rule_change'
        
        # 默认产品更新
        return 'product_update'
    
    def _calculate_priority(self, item: Dict) -> int:
        """
        Calculate priority score for sorting (0-100)
        Higher score = more important (should be on top)
        """
        title = item.get('title', '').lower()
        tags = item.get('tags', [])
        tag_str = ' '.join(str(t).lower() for t in tags) if isinstance(tags, list) else ''
        
        score = 50  # Base score
        
        # TOP PRIORITY (拉新、促活类) - +40 points
        top_keywords = [
            'new listing', 'list', '上线', 'launchpool', 'launchpad',
            'airdrop', '空投', 'giveaway', 'give away', '抽奖',
            'prize pool', '奖池', 'bonus', '奖励', 'rebate', '返利',
            'referral', '推荐', 'invite', '邀请',
            'new user', '新人', '首次', 'first deposit', '首充',
            'carnival', '嘉年华', 'campaign', '活动',
            'lucky draw', 'lucky', '幸运',
            'trading competition', '交易赛', '交易大赛',
            'stake', '质押', 'earn', '理财',
        ]
        if any(kw in title for kw in top_keywords) or any(kw in tag_str for kw in top_keywords):
            score += 40
        
        # HIGH PRIORITY (重要更新) - +30 points
        high_keywords = [
            'delist', '下架', 'hack', 'security', '安全', 'system upgrade',
            'maintenance', '维护', 'urgent', '紧急',
        ]
        if any(kw in title for kw in high_keywords):
            score += 30
        
        # MEDIUM PRIORITY (产品更新) - +15 points
        medium_keywords = [
            'new product', '新产品', 'feature', '功能',
            'perpetual', '永续', 'contract', '合约',
            'upgrade', '升级', 'network', '网络',
        ]
        if any(kw in title for kw in medium_keywords):
            score += 15
        
        # Boost for recent announcements (within 24 hours) - +10 points
        ts = item.get('dateTimestamp', 0)
        if ts:
            from datetime import datetime, timedelta
            announce_time = datetime.fromtimestamp(ts / 1000)
            if datetime.now() - announce_time < timedelta(hours=24):
                score += 10
        
        return min(score, 100)  # Cap at 100
    
    def _parse_timestamp(self, iso_time: str) -> int:
        """Parse ISO time string back to timestamp for sorting"""
        try:
            dt = datetime.fromisoformat(iso_time.replace('Z', '+00:00'))
            return int(dt.timestamp())
        except:
            return 0
    
    def _determine_importance(self, item: Dict) -> str:
        """Determine announcement importance based on type and tags"""
        title = item.get('title', '').lower()
        tags = item.get('tags', [])
        
        # High importance keywords
        high_keywords = ['delist', 'hack', 'security', 'maintenance', 'system upgrade', 'urgent']
        if any(kw in title for kw in high_keywords):
            return 'high'
        
        # Check tags if available
        if isinstance(tags, list):
            tag_str = ' '.join(str(t).lower() for t in tags)
            if 'urgent' in tag_str or 'important' in tag_str:
                return 'high'
        
        # Medium importance for listings and activities
        medium_keywords = ['new listing', 'launch', 'airdrop', 'staking', 'trading competition', 'prize']
        if any(kw in title for kw in medium_keywords):
            return 'medium'
        
        return 'low'


# Global client instance
bybit_client = BybitAnnouncementClient()


def get_bybit_client() -> BybitAnnouncementClient:
    """Get Bybit client instance"""
    return bybit_client


# For testing
if __name__ == "__main__":
    client = BybitAnnouncementClient()
    announcements = client.get_announcements(locale="en-US", limit=5)
    print(f"\nFetched {len(announcements)} announcements:")
    for a in announcements[:3]:
        print(f"- [{a['type']}] {a['title'][:50]}... ({a['importance']})")
