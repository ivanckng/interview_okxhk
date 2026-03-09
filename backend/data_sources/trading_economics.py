"""
Trading Economics API
Covers 196 countries, 20 million indicators
https://tradingeconomics.com/api
"""
import requests
from typing import Dict, Any, List
from datetime import datetime, timedelta
from utils.cache import get_market_cache


class TradingEconomicsClient:
    """
    Trading Economics API Client
    Using official API with client key authentication
    """

    BASE_URL = "https://api.tradingeconomics.com"

    # Country codes mapping
    COUNTRIES = {
        "us": "united states",
        "cn": "china",
        "hk": "hong kong",
        "eu": "euro area",
        "uk": "united kingdom",
        "sg": "singapore",
        "jp": "japan",
        "kr": "south korea",
    }

    # 5 key indicators to track
    INDICATOR_MAP = {
        "gdp_annual_growth": "GDP Annual Growth Rate",
        "gdp_quarterly_growth": "GDP Quarterly Growth Rate",
        "cpi_monthly": "Inflation Rate",
        "ppi_monthly": "Producer Prices",
        "unemployment_rate": "Unemployment Rate",
    }

    def __init__(self):
        # API credentials: api_key:client_key format
        self.api_key = "56c40ab56e9949a"
        self.client_key = "19jkwgcy6acm6zg"
        self._cache = get_market_cache()
        print(f"[TradingEconomics] Initialized with API key: {self.api_key[:8]}...")

    def _get_cache_key(self, country_id: str) -> str:
        """Generate cache key for country data"""
        return f"te_indicators_{country_id}"

    def _should_refresh_cache(self, cached_data: dict) -> bool:
        """
        Check if cache should be refreshed
        Refresh daily at 8:00 AM HKT (UTC+8)
        """
        if not cached_data:
            return True
        
        cached_at = cached_data.get("cached_at")
        if not cached_at:
            return True
        
        try:
            cached_time = datetime.fromisoformat(cached_at)
            now_hkt = datetime.utcnow() + timedelta(hours=8)  # Convert to HKT
            
            # Check if it's a new day (after 8 AM)
            if now_hkt.date() > cached_time.date():
                return True
            if now_hkt.hour >= 8 and cached_time.hour < 8:
                return True
            
            return False
        except:
            return True

    def get_country_indicators(self, country_id: str) -> Dict[str, Any]:
        """
        Get 5 key economic indicators for a country
        Returns: GDP Annual, GDP Quarterly, CPI, PPI, Unemployment Rate
        """
        country_name = self.COUNTRIES.get(country_id, country_id)
        cache_key = self._get_cache_key(country_id)

        # Check cache first
        cached = self._cache.get(cache_key)
        if cached and not self._should_refresh_cache(cached):
            print(f"✅ Using cached Trading Economics data for {country_id}")
            return cached

        print(f"📊 Fetching Trading Economics data for {country_name}...")

        try:
            # Use the official API format: https://api.tradingeconomics.com/country/{country}?c={client_key}
            url = f"{self.BASE_URL}/country/{country_name}"
            params = {"c": self.client_key}
            
            response = requests.get(url, params=params, timeout=30)
            response.raise_for_status()
            data = response.json()

            # Extract the 5 key indicators
            indicators = {}
            for item in data:
                indicator_name = item.get("Indicator", "")
                
                if indicator_name == "GDP Annual Growth Rate":
                    indicators["gdp_annual_growth"] = {
                        "value": item.get("LastValue"),
                        "date": item.get("LastUpdate"),
                        "unit": "%",
                        "source": "Trading Economics",
                    }
                elif indicator_name == "GDP Quarterly Growth Rate":
                    indicators["gdp_quarterly_growth"] = {
                        "value": item.get("LastValue"),
                        "date": item.get("LastUpdate"),
                        "unit": "%",
                        "source": "Trading Economics",
                    }
                elif indicator_name == "Inflation Rate":
                    indicators["cpi_monthly"] = {
                        "value": item.get("LastValue"),
                        "date": item.get("LastUpdate"),
                        "unit": "%",
                        "source": "Trading Economics",
                    }
                elif indicator_name == "Producer Prices":
                    indicators["ppi_monthly"] = {
                        "value": item.get("LastValue"),
                        "date": item.get("LastUpdate"),
                        "unit": "%",
                        "source": "Trading Economics",
                    }
                elif indicator_name == "Unemployment Rate":
                    indicators["unemployment_rate"] = {
                        "value": item.get("LastValue"),
                        "date": item.get("LastUpdate"),
                        "unit": "%",
                        "source": "Trading Economics",
                    }

            result = {
                "country_id": country_id,
                "country_name": country_name.title(),
                "timestamp": datetime.utcnow().isoformat(),
                "cached_at": datetime.utcnow().isoformat(),
                "indicators": indicators,
                "data_source": "Trading Economics",
            }

            # Cache the data
            self._cache.set(cache_key, result, ttl=86400)  # 24 hours
            print(f"✅ Cached Trading Economics data for {country_id}")

            return result

        except Exception as e:
            print(f"⚠️ Trading Economics API error for {country_id}: {e}")
            return {
                "error": str(e),
                "country": country_id,
                "indicators": {}
            }

    def get_multi_country_indicators(self, country_ids: List[str]) -> Dict[str, Any]:
        """
        Get indicators for multiple countries
        """
        results = {}
        for country_id in country_ids:
            data = self.get_country_indicators(country_id)
            results[country_id] = data
        return results


# Global client
trading_economics_client = TradingEconomicsClient()


def get_trading_economics_client() -> TradingEconomicsClient:
    return trading_economics_client
