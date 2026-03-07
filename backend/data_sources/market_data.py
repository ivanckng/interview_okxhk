"""
Market Data Sources
- FRED API for macroeconomic data
- Financial Modeling Prep for economic calendar
"""
import os
import httpx
from typing import Dict, Any, Optional
from datetime import datetime, timedelta


class MarketDataClient:
    """
    Client for fetching macro market data
    """
    
    FRED_API_URL = "https://api.stlouisfed.org/fred"
    FMP_API_URL = "https://financialmodelingprep.com/api/v3"
    
    def __init__(self):
        self.fred_api_key = os.getenv("FRED_API_KEY")
        self.fmp_api_key = os.getenv("FMP_API_KEY")
    
    async def get_us_economic_indicators(self) -> Dict[str, Any]:
        """
        Get key US economic indicators from FRED
        """
        indicators = {
            "gdp_growth": None,
            "cpi_yoy": None,
            "ppi_yoy": None,
            "unemployment": None,
            "fed_funds_rate": None,
        }
        
        if not self.fred_api_key:
            print("⚠️ FRED_API_KEY not set, using fallback data")
            return self._get_fallback_us_data()
        
        try:
            async with httpx.AsyncClient() as client:
                # GDP Growth Rate
                gdp_response = await client.get(
                    f"{self.FRED_API_URL}/series/observations",
                    params={
                        "series_id": "A191RL1A225NBEA",  # Real GDP Growth Rate
                        "api_key": self.fred_api_key,
                        "file_type": "json",
                        "limit": 1,
                        "sort_order": "desc"
                    },
                    timeout=30.0
                )
                if gdp_response.status_code == 200:
                    data = gdp_response.json()
                    if data.get("observations"):
                        indicators["gdp_growth"] = float(data["observations"][0]["value"])
                
                # CPI YoY
                cpi_response = await client.get(
                    f"{self.FRED_API_URL}/series/observations",
                    params={
                        "series_id": "CPIAUCSL",
                        "api_key": self.fred_api_key,
                        "file_type": "json",
                        "limit": 13,
                        "sort_order": "desc"
                    },
                    timeout=30.0
                )
                if cpi_response.status_code == 200:
                    data = cpi_response.json()
                    obs = data.get("observations", [])
                    if len(obs) >= 13:
                        current = float(obs[0]["value"])
                        prev_year = float(obs[12]["value"])
                        indicators["cpi_yoy"] = round(((current - prev_year) / prev_year) * 100, 2)
                
                # Unemployment Rate
                unemp_response = await client.get(
                    f"{self.FRED_API_URL}/series/observations",
                    params={
                        "series_id": "UNRATE",
                        "api_key": self.fred_api_key,
                        "file_type": "json",
                        "limit": 1,
                        "sort_order": "desc"
                    },
                    timeout=30.0
                )
                if unemp_response.status_code == 200:
                    data = unemp_response.json()
                    if data.get("observations"):
                        indicators["unemployment"] = float(data["observations"][0]["value"])
                
                # Fed Funds Rate
                fed_response = await client.get(
                    f"{self.FRED_API_URL}/series/observations",
                    params={
                        "series_id": "DFF",
                        "api_key": self.fred_api_key,
                        "file_type": "json",
                        "limit": 1,
                        "sort_order": "desc"
                    },
                    timeout=30.0
                )
                if fed_response.status_code == 200:
                    data = fed_response.json()
                    if data.get("observations"):
                        indicators["fed_funds_rate"] = float(data["observations"][0]["value"])
                
        except Exception as e:
            print(f"⚠️ Error fetching FRED data: {e}")
            return self._get_fallback_us_data()
        
        return indicators
    
    def _get_fallback_us_data(self) -> Dict[str, Any]:
        """Fallback data when APIs are unavailable"""
        return {
            "gdp_growth": 2.8,
            "cpi_yoy": 3.2,
            "ppi_yoy": 2.1,
            "unemployment": 4.1,
            "fed_funds_rate": 5.33,
            "note": "Fallback data - API key not configured"
        }
    
    async def get_global_indicators(self) -> Dict[str, Any]:
        """
        Get global economic indicators
        """
        return {
            "us": await self.get_us_economic_indicators(),
            "eu": {
                "gdp_growth": 0.8,
                "inflation": 2.6,
                "unemployment": 6.4,
                "note": "Placeholder - ECB data API integration needed"
            },
            "china": {
                "gdp_growth": 5.2,
                "inflation": 0.7,
                "unemployment": 5.1,
                "note": "Placeholder - PBOC data API integration needed"
            },
            "uk": {
                "gdp_growth": 0.1,
                "inflation": 4.0,
                "unemployment": 4.2,
                "note": "Placeholder - BoE data API integration needed"
            }
        }
    
    async def get_market_summary(self) -> Dict[str, Any]:
        """
        Get comprehensive market summary
        """
        global_data = await self.get_global_indicators()
        
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "regions": global_data,
            "risk_indicators": {
                "recession_probability": 25,
                "inflation_trend": "cooling",
                "liquidity_condition": "tight"
            }
        }


# Global client instance
market_data_client = MarketDataClient()


def get_market_data_client() -> MarketDataClient:
    """Get market data client instance"""
    return market_data_client
