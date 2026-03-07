"""
Trading Economics API
Covers 196 countries, 20 million indicators
https://tradingeconomics.com/api
Free tier: 250 requests/month
"""
import os
import httpx
from typing import Dict, Any, List, Optional
from datetime import datetime


class TradingEconomicsClient:
    """
    Trading Economics API Client
    Comprehensive economic calendar and indicators
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
        "de": "germany",
        "fr": "france",
        "in": "india",
        "au": "australia",
        "ca": "canada",
        "br": "brazil",
        "mx": "mexico",
        "ru": "russia",
        "za": "south africa",
        "id": "indonesia",
        "th": "thailand",
        "my": "malaysia",
        "ph": "philippines",
        "vn": "vietnam",
        "tw": "taiwan",
        "ch": "switzerland",
        "se": "sweden",
        "no": "norway",
        "dk": "denmark",
        "nz": "new zealand",
    }
    
    def __init__(self):
        self.api_key = os.getenv("TRADING_ECONOMICS_API_KEY")
        self.client_key = os.getenv("TRADING_ECONOMICS_CLIENT_KEY")
    
    def _get_auth_params(self) -> dict:
        """Get authentication parameters"""
        if self.api_key and self.client_key:
            return {"c": self.client_key, "apikey": self.api_key}
        return {}
    
    async def get_indicators(self, country_id: str) -> Dict[str, Any]:
        """
        Get all indicators for a country
        """
        country_name = self.COUNTRIES.get(country_id, country_id)
        
        if not self.api_key:
            return {"error": "API key not configured", "country": country_id}
        
        try:
            async with httpx.AsyncClient() as client:
                params = self._get_auth_params()
                params["country"] = country_name
                
                response = await client.get(
                    f"{self.BASE_URL}/indicators",
                    params=params,
                    timeout=30.0
                )
                response.raise_for_status()
                return response.json()
                
        except Exception as e:
            print(f"⚠️ Trading Economics API error for {country_id}: {e}")
            return {"error": str(e), "country": country_id}
    
    async def get_historical(self, country_id: str, indicator: str) -> List[Dict]:
        """
        Get historical data for specific indicator
        """
        country_name = self.COUNTRIES.get(country_id, country_id)
        
        if not self.api_key:
            return []
        
        try:
            async with httpx.AsyncClient() as client:
                params = self._get_auth_params()
                
                response = await client.get(
                    f"{self.BASE_URL}/historical/country/{country_name}/indicator/{indicator}",
                    params=params,
                    timeout=30.0
                )
                response.raise_for_status()
                return response.json()
                
        except Exception as e:
            print(f"⚠️ Trading Economics historical error: {e}")
            return []
    
    async def get_calendar(self, date_from: str = None, date_to: str = None) -> List[Dict]:
        """
        Get economic calendar
        """
        if not self.api_key:
            return []
        
        try:
            async with httpx.AsyncClient() as client:
                params = self._get_auth_params()
                if date_from:
                    params["date_from"] = date_from
                if date_to:
                    params["date_to"] = date_to
                
                response = await client.get(
                    f"{self.BASE_URL}/calendar",
                    params=params,
                    timeout=30.0
                )
                response.raise_for_status()
                return response.json()
                
        except Exception as e:
            print(f"⚠️ Trading Economics calendar error: {e}")
            return []
    
    async def get_multi_country_indicators(self, country_ids: List[str]) -> Dict[str, Any]:
        """
        Get indicators for multiple countries
        """
        results = {}
        for country_id in country_ids:
            data = await self.get_indicators(country_id)
            results[country_id] = data
        return results


# Global client
trading_economics_client = TradingEconomicsClient()


def get_trading_economics_client() -> TradingEconomicsClient:
    return trading_economics_client
