"""
Binance Announcements API Client
Fetches real announcements from Binance internal API
"""
import requests
from typing import List, Dict, Any
from datetime import datetime, timedelta
import re
import time
from utils.redis_cache import cache_get, cache_set


class BinanceAnnouncementClient:
    """
    Binance Announcement Client
    Fetches real announcements from Binance API
    """

    # Binance CMS API for announcements
    CATALOG_IDS = {
        'latest': 48,      # Latest News
        'new_listings': 161,  # New Cryptocurrency Listings
    }

    BASE_URL = "https://www.binance.com/bapi/composite/v1/public/cms/article/catalog/list/query"
    CACHE_KEY = "binance_announcements"
    CACHE_TTL = 600  # 10 minutes

    def __init__(self):
        self._cache = []
        self._cache_time = 0
        self._cache_ttl = 300  # 5 minutes

    def get_announcements(self, limit: int = 20, category: str = "all") -> List[Dict[str, Any]]:
        """
        Fetch announcements from Binance API with caching (Redis + Memory)

        Args:
            limit: Number of announcements to fetch
            category: Feed category ('all', 'new_listings', 'latest_news')

        Returns:
            List of announcement dictionaries
        """
        cache_key = f"{self.CACHE_KEY}_{category}_{limit}"
        
        # Try Redis cache first
        cached_data = cache_get(cache_key)
        if cached_data:
            print(f"✅ Redis cache hit: {cache_key}")
            return cached_data[:limit]

        # Check memory cache
        if self._cache and (time.time() - self._cache_time) < self._cache_ttl:
            print(f"✅ Memory cache hit: {cache_key}")
            return self._cache[:limit]

        try:
            announcements = []
            
            # Determine which catalog(s) to fetch
            if category == 'new_listings':
                catalogs = [('new_listings', self.CATALOG_IDS['new_listings'])]
            elif category == 'latest_news':
                catalogs = [('latest', self.CATALOG_IDS['latest'])]
            else:
                # Fetch both for 'all'
                catalogs = [
                    ('latest', self.CATALOG_IDS['latest']),
                    ('new_listings', self.CATALOG_IDS['new_listings']),
                ]
            
            for cat_name, catalog_id in catalogs:
                data = self._fetch_catalog(catalog_id, min(limit, 20))
                for article in data.get('articles', []):
                    announcement = self._parse_article(article, cat_name)
                    if announcement:
                        announcements.append(announcement)
            
            # Sort by publish time (newest first) and limit
            announcements.sort(
                key=lambda x: x.get('publish_time', ''),
                reverse=True
            )
            
            result = announcements[:limit]

            # Update cache
            self._cache = result
            self._cache_time = time.time()

            # Save to Redis
            cache_set(cache_key, result, self.CACHE_TTL)

            print(f"✅ Fetched {len(result)} announcements from Binance ({category})")
            return result
            
        except Exception as e:
            print(f"❌ Failed to fetch Binance announcements: {e}")
            return []
    
    def _fetch_catalog(self, catalog_id: int, limit: int) -> Dict:
        """Fetch articles from a specific catalog"""
        params = {
            'catalogId': catalog_id,
            'pageNo': 1,
            'pageSize': limit,
        }
        
        response = requests.get(
            self.BASE_URL,
            params=params,
            headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json',
            },
            timeout=15
        )
        response.raise_for_status()
        
        data = response.json()
        return data.get('data', {})
    
    def _parse_article(self, article: Dict, category: str) -> Dict[str, Any]:
        """Parse article to announcement dict"""
        try:
            article_id = article.get('id', '')
            title = article.get('title', '')
            code = article.get('code', '')
            
            # Build URL
            url = f"https://www.binance.com/en/support/announcement/{code}"
            
            # Parse publish time
            publish_time_str = article.get('publishTime', '')
            publish_time = self._parse_timestamp(publish_time_str)
            
            # Get content/summary
            content = article.get('content', '') or ''
            summary = self._extract_summary(content)
            
            # Determine type
            ann_type = self._map_type(title, category)
            
            # Calculate priority
            priority_score = self._calculate_priority(title, summary)
            
            # Determine importance
            importance = self._determine_importance(title, summary, ann_type)
            
            return {
                'id': f"binance-{article_id}",
                'title': title,
                'description': summary,
                'type': ann_type,
                'url': url,
                'publish_time': publish_time.isoformat(),
                'importance': importance,
                'priority_score': priority_score,
                'is_top': priority_score >= 80,
                'exchange': 'binance',
                'tags': self._extract_tags(title),
                'raw_data': article,
            }
            
        except Exception as e:
            print(f"⚠️ Failed to parse article: {e}")
            return None
    
    def _parse_timestamp(self, ts_str: str) -> datetime:
        """Parse timestamp string to datetime (without microseconds for JS compatibility)"""
        if not ts_str:
            return datetime.utcnow().replace(microsecond=0)
        
        # Try ISO format first
        try:
            # Handle format like "2026-03-10 09:22:00"
            return datetime.strptime(ts_str, '%Y-%m-%d %H:%M:%S').replace(microsecond=0)
        except:
            pass
        
        # Try with timezone
        try:
            dt = datetime.fromisoformat(ts_str.replace('Z', '+00:00')).replace(microsecond=0)
            return dt
        except:
            pass
        
        return datetime.utcnow().replace(microsecond=0)
    
    def _extract_summary(self, content: str, max_len: int = 200) -> str:
        """Extract summary from HTML content"""
        if not content:
            return ''
        
        # Remove HTML tags
        text = re.sub(r'<[^>]+>', ' ', content)
        # Remove extra whitespace
        text = ' '.join(text.split())
        
        if len(text) > max_len:
            return text[:max_len] + '...'
        return text
    
    def _map_type(self, title: str, category: str) -> str:
        """Map Binance announcement to our type categories"""
        title_lower = title.lower()
        
        # Check for removal/delist first (even in new_listings category, removal notices appear)
        if any(kw in title_lower for kw in ['removal', 'remove', 'delist', 'will be removed']):
            return 'delisting'
        
        # New listings category
        if category == 'new_listings':
            # But still check if it's actually a removal notice
            return 'new_listing'
        
        # 运营活动类 -> activity
        activity_keywords = [
            'campaign', 'carnival', 'giveaway', 'lucky draw', 
            'event', 'promotion', 'bonus', 'prize', 'reward',
            'referral', 'refer', 'invite', 'airdrop',
            'trade to share', 'trading competition', 'trading challenge',
            'deposit bonus', 'cashback', 'cash back',
            'megadrop', 'hok', 'king of',
        ]
        if any(kw in title_lower for kw in activity_keywords):
            return 'activity'
        
        # 新币上线类 -> new_listing
        listing_keywords = [
            'will list', 'now listing', 'new listing',
            'trading now open', 'adds new',
        ]
        if any(kw in title_lower for kw in listing_keywords):
            return 'new_listing'
        
        # 产品更新类 -> product_update
        product_keywords = [
            'copy trading', 'trading bots', 'margin will add',
            'api update', 'new feature', 'product launch',
            'binance pay', 'binance card',
        ]
        if any(kw in title_lower for kw in product_keywords):
            return 'product_update'
        
        # 下架类 -> delisting
        delisting_keywords = [
            'delist', 'will remove', 'trading suspension',
            'discontinue', 'removal of',
        ]
        if any(kw in title_lower for kw in delisting_keywords):
            return 'delisting'
        
        # 维护类 -> maintenance
        maintenance_keywords = [
            'system upgrade', 'system maintenance', 'scheduled maintenance',
            'wallet maintenance', 'deposit suspension', 'withdrawal suspension',
        ]
        if any(kw in title_lower for kw in maintenance_keywords):
            return 'maintenance'
        
        # 规则变更类 -> rule_change
        rule_keywords = [
            'fee change', 'fee adjustment', 'trading fee update',
            'margin requirement', 'leverage change',
            'terms update', 'policy update', 'kyc', 'aml',
            'update to', 'changes to', 'adjustment',
        ]
        if any(kw in title_lower for kw in rule_keywords):
            return 'rule_change'
        
        return 'market'
    
    def _calculate_priority(self, title: str, description: str) -> int:
        """Calculate priority score for sorting (0-100)"""
        combined = (title + ' ' + (description or '')).lower()
        score = 50  # Base score
        
        # TOP PRIORITY - +40 points
        top_keywords = [
            'new listing', 'will list', 'binance adds',
            'airdrop', 'giveaway', 'prize pool',
            'megadrop', 'hok', 'king of',
            'referral', 'invite',
            'new user', 'first deposit',
            'carnival', 'campaign',
            'trading competition',
            'stake', 'earn',
        ]
        if any(kw in combined for kw in top_keywords):
            score += 40
        
        # HIGH PRIORITY - +30 points
        high_keywords = [
            'delist', 'hack', 'security', 'urgent',
            'system upgrade', 'maintenance',
        ]
        if any(kw in combined for kw in high_keywords):
            score += 30
        
        # MEDIUM PRIORITY - +15 points
        medium_keywords = [
            'new product', 'feature', 'copy trading',
            'perpetual', 'futures', 'margin will add',
        ]
        if any(kw in combined for kw in medium_keywords):
            score += 15
        
        return min(score, 100)
    
    def _determine_importance(self, title: str, description: str, ann_type: str) -> str:
        """Determine announcement importance"""
        combined = (title + ' ' + (description or '')).lower()
        
        # High importance
        high_keywords = ['delist', 'hack', 'security', 'urgent', 'maintenance']
        if any(kw in combined for kw in high_keywords):
            return 'high'
        
        # Medium importance for listings and activities
        if ann_type in ['new_listing', 'activity']:
            return 'medium'
        
        return 'low'
    
    def _extract_tags(self, title: str) -> List[str]:
        """Extract relevant tags from announcement"""
        title_lower = title.lower()
        tags = []
        
        tag_keywords = {
            'Launchpool': ['launchpool'],
            'Launchpad': ['launchpad'],
            'Megadrop': ['megadrop'],
            'Airdrop': ['airdrop'],
            'Listing': ['listing', 'will list', 'adds'],
            'Trading Competition': ['trading competition', 'trading challenge'],
            'Referral': ['referral', 'refer'],
            'Staking': ['stake', 'staking'],
            'Earn': ['earn', 'savings'],
            'New User': ['new user', 'first deposit'],
            'Margin': ['margin'],
        }
        
        for tag, keywords in tag_keywords.items():
            if any(kw in title_lower for kw in keywords):
                tags.append(tag)
        
        return tags[:5]


# Global client instance
binance_client = BinanceAnnouncementClient()


def get_binance_client() -> BinanceAnnouncementClient:
    """Get Binance client instance"""
    return binance_client


# For testing
if __name__ == "__main__":
    client = BinanceAnnouncementClient()
    announcements = client.get_announcements(limit=5)
    print(f"\nFetched {len(announcements)} announcements:")
    for a in announcements[:3]:
        print(f"- [{a['type']}] {a['title'][:50]}... ({a['importance']}, score: {a['priority_score']})")
