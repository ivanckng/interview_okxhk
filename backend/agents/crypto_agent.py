"""
Crypto Data Aggregator for AI Analysis
Collects all crypto data for AI Agent analysis
Updates every 10 minutes
"""
import httpx
from datetime import datetime
from typing import Dict, Any
from utils.cache import get_market_cache
from utils.runtime import get_internal_api_base_url


class CryptoDataAggregator:
    """
    Aggregates all crypto data from API endpoints for AI analysis
    """
    
    def __init__(self):
        self._cache = get_market_cache()
        self.api_base = get_internal_api_base_url()
    
    def _get_cache_key(self) -> str:
        return "crypto_ai_analysis"
    
    def _should_refresh_cache(self, cached_data: Any) -> bool:
        """
        Check if cache should be refreshed
        Refresh every 5 minutes to stay aligned with /api/crypto/prices.
        """
        if not cached_data:
            return True
        
        cached_at = cached_data.get("cached_at")
        if not cached_at:
            return True
        
        try:
            cached_time = datetime.fromisoformat(cached_at)
            now = datetime.utcnow()
            
            return (now - cached_time).total_seconds() > 300
        except:
            return True

    async def aggregate_all_data(self) -> Dict[str, Any]:
        """
        Aggregate all crypto data from API endpoints
        """
        cache_key = self._get_cache_key()
        
        # Check cache first (5 minute TTL)
        cached = self._cache.get(cache_key)
        if cached and isinstance(cached, dict) and not self._should_refresh_cache(cached):
            print(f"✅ Using cached crypto data for AI analysis")
            return cached
        
        print(f"📊 Aggregating all crypto data for AI analysis...")
        
        try:
            async with httpx.AsyncClient() as client:
                # Fetch crypto data from API endpoint
                response = await client.get(
                    f"{self.api_base}/api/crypto/prices?limit=20",
                    timeout=30.0
                )
                response.raise_for_status()
                crypto_data = response.json()
                
                # Build aggregated data structure
                aggregated_data = {
                    "timestamp": datetime.utcnow().isoformat(),
                    "top_coins": crypto_data.get("coins", [])[:10],  # Top 10 coins
                    "global_data": crypto_data.get("global", {}),
                    "highlight": crypto_data.get("highlight", {}),
                    "data_sources": {
                        "crypto_prices": "CoinGecko",
                    },
                    "refresh_interval": "10 minutes",
                }
                
                self._cache.set(cache_key, aggregated_data, ttl=300)
                print(f"✅ Cached crypto data for AI analysis")
                
                return aggregated_data
                
        except Exception as e:
            print(f"⚠️ Crypto data aggregation error: {e}")
            return {
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat(),
            }


# Global aggregator
crypto_aggregator = CryptoDataAggregator()


def get_crypto_aggregator() -> CryptoDataAggregator:
    return crypto_aggregator
