"""
Simple in-memory cache with TTL support
"""
import time
from typing import Dict, Any, Optional, List
from dataclasses import dataclass, field
from datetime import datetime
import json
import os


@dataclass
class CacheEntry:
    """Cache entry with TTL"""
    value: Any
    expires_at: float
    created_at: datetime = field(default_factory=datetime.utcnow)


class MemoryCache:
    """
    Simple in-memory cache with TTL support
    Data persists to JSON file on shutdown
    """
    
    def __init__(self, default_ttl: int = 1800, cache_file: str = "cache/news_cache.json"):
        """
        Args:
            default_ttl: Default TTL in seconds (30 minutes)
            cache_file: Path to cache file for persistence
        """
        self._cache: Dict[str, CacheEntry] = {}
        self._default_ttl = default_ttl
        self._cache_file = cache_file
        self._load_cache()
    
    def _load_cache(self):
        """Load cache from file on startup"""
        if os.path.exists(self._cache_file):
            try:
                with open(self._cache_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    for key, entry_data in data.items():
                        # Check if entry is still valid
                        expires_at = entry_data.get('expires_at', 0)
                        if time.time() < expires_at:
                            self._cache[key] = CacheEntry(
                                value=entry_data.get('value'),
                                expires_at=expires_at,
                                created_at=datetime.fromisoformat(entry_data.get('created_at'))
                            )
                print(f"✅ Loaded {len(self._cache)} entries from cache file")
            except Exception as e:
                print(f"⚠️ Failed to load cache: {e}")
    
    def _save_cache(self):
        """Save cache to file"""
        try:
            os.makedirs(os.path.dirname(self._cache_file), exist_ok=True)
            data = {}
            for key, entry in self._cache.items():
                if time.time() < entry.expires_at:
                    data[key] = {
                        'value': entry.value,
                        'expires_at': entry.expires_at,
                        'created_at': entry.created_at.isoformat()
                    }
            with open(self._cache_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"⚠️ Failed to save cache: {e}")
    
    def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        entry = self._cache.get(key)
        if entry is None:
            return None
        
        if time.time() > entry.expires_at:
            # Expired, remove it
            del self._cache[key]
            return None
        
        return entry.value
    
    def set(self, key: str, value: Any, ttl: Optional[int] = None):
        """Set value in cache with TTL"""
        ttl = ttl or self._default_ttl
        expires_at = time.time() + ttl
        self._cache[key] = CacheEntry(value=value, expires_at=expires_at)
    
    def delete(self, key: str):
        """Delete key from cache"""
        if key in self._cache:
            del self._cache[key]
    
    def clear(self):
        """Clear all cache"""
        self._cache.clear()
    
    def keys(self) -> List[str]:
        """Get all valid keys"""
        now = time.time()
        return [k for k, v in self._cache.items() if v.expires_at > now]
    
    def cleanup(self):
        """Remove expired entries"""
        now = time.time()
        expired = [k for k, v in self._cache.items() if v.expires_at <= now]
        for k in expired:
            del self._cache[k]
        return len(expired)
    
    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        now = time.time()
        valid_entries = sum(1 for v in self._cache.values() if v.expires_at > now)
        expired_entries = len(self._cache) - valid_entries
        return {
            "total_entries": len(self._cache),
            "valid_entries": valid_entries,
            "expired_entries": expired_entries,
            "cache_file": self._cache_file
        }
    
    def persist(self):
        """Persist cache to file"""
        self._save_cache()


# Global cache instance
_news_cache = MemoryCache(default_ttl=1800, cache_file="cache/news_cache.json")
_market_cache = MemoryCache(default_ttl=300, cache_file="cache/market_cache.json")  # 5 min for market data
_highlight_cache = MemoryCache(default_ttl=1800, cache_file="cache/highlight_cache.json")


def get_news_cache() -> MemoryCache:
    """Get news cache instance"""
    return _news_cache


def get_market_cache() -> MemoryCache:
    """Get market cache instance"""
    return _market_cache


def get_highlight_cache() -> MemoryCache:
    """Get highlight cache instance"""
    return _highlight_cache
