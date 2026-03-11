"""
Bitget Announcements API Client
Fetches real announcements from Bitget API
API Documentation: https://www.bitget.com/api-doc/common/notice/Get-All-Notices
"""
import httpx
from typing import List, Dict, Any
from datetime import datetime
import time
from utils.redis_cache import cache_get, cache_set


class BitgetAnnouncementClient:
    """
    Bitget Announcement Client
    Fetches real announcements from Bitget API
    Note: API endpoint has typo 'annoucements' instead of 'announcements'
    """

    BASE_URL = "https://api.bitget.com/api/v2/public/annoucements"
    CACHE_KEY = "bitget_announcements"
    CACHE_TTL = 600  # 10 minutes

    # API announcement types mapping
    ANNOUNCEMENT_TYPES = {
        'new_cryptocurrency_listings': 'new_listing',
        'latest_news': 'market',
        'maintenance_system_updates': 'maintenance',
        'activities': 'activity',
        'product_related': 'product_update',
        'delistings': 'delisting',
    }

    def __init__(self):
        self._cache = []
        self._cache_time = 0
        self._cache_ttl = 300  # 5 minutes

    def get_announcements(self, language: str = "en_US", limit: int = 20) -> List[Dict[str, Any]]:
        """
        Fetch announcements from Bitget with caching (Redis + Memory)

        Args:
            language: Language code (en_US, zh_CN, etc.)
            limit: Number of announcements to fetch

        Returns:
            List of announcement dictionaries
        """
        cache_key = f"{self.CACHE_KEY}_{language}_{limit}"
        
        # Try Redis cache first
        cached_data = cache_get(cache_key)
        if cached_data:
            print(f"✅ Redis cache hit: {cache_key}")
            return cached_data[:limit]

        # Check memory cache
        if self._cache and (time.time() - self._cache_time) < self._cache_ttl:
            print(f"✅ Memory cache hit: {cache_key}")
            return self._cache[:limit]
        # Bitget API only supports max limit of 10
        params = {
            'language': language,
            'limit': min(limit, 10)
        }

        try:
            with httpx.Client() as client:
                response = client.get(
                    self.BASE_URL,
                    params=params,
                    headers={
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'Accept': 'application/json',
                    },
                    timeout=15
                )
                response.raise_for_status()

                data = response.json()
            
            if data.get('code') != '00000':
                print(f"⚠️ Bitget API error: {data.get('msg')}")
                return []
            
            items = data.get('data', [])
            
            formatted = []
            for item in items:
                announcement = self._parse_item(item)
                if announcement:
                    formatted.append(announcement)

            # Update cache
            self._cache = formatted
            self._cache_time = time.time()

            # Save to Redis
            cache_set(cache_key, formatted, self.CACHE_TTL)

            print(f"✅ Fetched {len(formatted)} announcements from Bitget ({language})")
            return formatted
            
        except Exception as e:
            print(f"❌ Failed to fetch Bitget announcements: {e}")
            return []
    
    def _parse_item(self, item: Dict) -> Dict[str, Any]:
        """Parse Bitget API item to announcement dict"""
        try:
            ann_id = item.get('annId', '')
            title = item.get('annTitle', '')
            desc = item.get('annDesc', '')
            ann_type = item.get('annType', '')
            ann_sub_type = item.get('annSubType', '')
            url = item.get('annUrl', '')
            c_time = item.get('cTime', 0)
            
            # Parse timestamp (milliseconds)
            publish_time = self._timestamp_to_iso(c_time)
            
            # Map type
            mapped_type = self._map_type(ann_type, ann_sub_type, title)
            
            # Calculate priority
            priority_score = self._calculate_priority(title, ann_type, ann_sub_type)
            
            # Determine importance
            importance = self._determine_importance(title, ann_type, mapped_type)
            
            return {
                'id': f"bitget-{ann_id}",
                'title': title,
                'description': desc,
                'type': mapped_type,
                'url': url,
                'publish_time': publish_time,
                'importance': importance,
                'priority_score': priority_score,
                'is_top': priority_score >= 80,
                'exchange': 'bitget',
                'tags': self._extract_tags(ann_type, ann_sub_type),
                'raw_data': item,
            }
            
        except Exception as e:
            print(f"⚠️ Failed to parse Bitget item: {e}")
            return None
    
    def _timestamp_to_iso(self, timestamp_ms: int) -> str:
        """Convert milliseconds timestamp to ISO format (without microseconds for JS compatibility)"""
        if not timestamp_ms:
            return datetime.utcnow().replace(microsecond=0).isoformat()
        try:
            dt = datetime.fromtimestamp(timestamp_ms / 1000)
            return dt.replace(microsecond=0).isoformat()
        except:
            return datetime.utcnow().replace(microsecond=0).isoformat()
    
    def _map_type(self, ann_type: str, ann_sub_type: str, title: str) -> str:
        """Map Bitget announcement type to our type categories"""
        # First check direct mapping from ann_type
        if ann_type in self.ANNOUNCEMENT_TYPES:
            return self.ANNOUNCEMENT_TYPES[ann_type]
        
        # Check sub-type keywords
        sub_type_lower = (ann_sub_type or '').lower()
        type_lower = (ann_type or '').lower()
        title_lower = title.lower()
        
        # New listings
        if 'listing' in sub_type_lower or 'list' in type_lower:
            return 'new_listing'
        
        # Maintenance
        if 'maintenance' in sub_type_lower or 'maintenance' in type_lower:
            return 'maintenance'
        
        # Delisting
        if 'delist' in sub_type_lower or 'delisting' in type_lower:
            return 'delisting'
        
        # Activity
        if 'activity' in sub_type_lower or 'activities' in type_lower:
            return 'activity'
        
        # Check title for hints
        activity_keywords = [
            'campaign', 'carnival', 'giveaway', 'lucky draw', 
            'event', 'promotion', 'bonus', 'prize', 'reward',
            'referral', 'airdrop', 'trading competition',
        ]
        if any(kw in title_lower for kw in activity_keywords):
            return 'activity'
        
        listing_keywords = ['will list', 'new listing', 'adds support for']
        if any(kw in title_lower for kw in listing_keywords):
            return 'new_listing'
        
        delisting_keywords = ['delist', 'will remove', 'suspension']
        if any(kw in title_lower for kw in delisting_keywords):
            return 'delisting'
        
        maintenance_keywords = ['suspension', 'maintenance', 'upgrade', 'system update']
        if any(kw in title_lower for kw in maintenance_keywords):
            return 'maintenance'
        
        return 'market'
    
    def _calculate_priority(self, title: str, ann_type: str, ann_sub_type: str) -> int:
        """Calculate priority score for sorting (0-100)"""
        title_lower = title.lower()
        combined = f"{title_lower} {ann_type} {ann_sub_type}".lower()
        score = 50  # Base score
        
        # TOP PRIORITY - +40 points
        top_keywords = [
            'new listing', 'will list', 'list ',
            'airdrop', 'giveaway', 'prize pool',
            'campaign', 'carnival',
            'trading competition',
            'launchpool', 'launchpad',
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
            'perpetual', 'futures',
        ]
        if any(kw in combined for kw in medium_keywords):
            score += 15
        
        return min(score, 100)
    
    def _determine_importance(self, title: str, ann_type: str, mapped_type: str) -> str:
        """Determine announcement importance"""
        title_lower = title.lower()
        
        # High importance
        high_keywords = ['delist', 'hack', 'security', 'urgent', 'maintenance', 'suspension']
        if any(kw in title_lower for kw in high_keywords):
            return 'high'
        
        # Medium importance for listings and activities
        if mapped_type in ['new_listing', 'activity']:
            return 'medium'
        
        return 'low'
    
    def _extract_tags(self, ann_type: str, ann_sub_type: str) -> List[str]:
        """Extract relevant tags from announcement type"""
        tags = []
        
        type_mapping = {
            'new_cryptocurrency_listings': 'New Listing',
            'activities': 'Activity',
            'maintenance_system_updates': 'Maintenance',
            'latest_news': 'News',
            'delistings': 'Delisting',
            'product_related': 'Product',
        }
        
        if ann_type in type_mapping:
            tags.append(type_mapping[ann_type])
        
        # Add sub-type if meaningful
        sub_type_tags = {
            'asset_maintenance': 'Asset Maintenance',
            'system_maintenance': 'System Maintenance',
            'trading_competition': 'Trading Competition',
        }
        
        if ann_sub_type in sub_type_tags:
            tags.append(sub_type_tags[ann_sub_type])
        
        return tags[:3]


# Global client instance
bitget_client = BitgetAnnouncementClient()


def get_bitget_client() -> BitgetAnnouncementClient:
    """Get Bitget client instance"""
    return bitget_client


# For testing
if __name__ == "__main__":
    client = BitgetAnnouncementClient()
    announcements = client.get_announcements(language="en_US", limit=5)
    print(f"\nFetched {len(announcements)} announcements:")
    for a in announcements[:3]:
        print(f"- [{a['type']}] {a['title'][:50]}... ({a['importance']}, score: {a['priority_score']})")
