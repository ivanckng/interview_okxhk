"""
Cryptocurrency Price Data Sources
- CoinGecko API for prices and market data
"""
import os
import httpx
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta


class CryptoPriceClient:
    """
    Client for fetching cryptocurrency price data
    """
    
    COINGECKO_API_URL = "https://api.coingecko.com/api/v3"
    
    def __init__(self):
        self.api_key = os.getenv("COINGECKO_API_KEY")
    
    async def get_top_coins(self, limit: int = 20) -> List[Dict[str, Any]]:
        """
        Get top cryptocurrencies by market cap
        """
        try:
            async with httpx.AsyncClient() as client:
                headers = {}
                if self.api_key:
                    headers["x-cg-demo-api-key"] = self.api_key
                
                response = await client.get(
                    f"{self.COINGECKO_API_URL}/coins/markets",
                    params={
                        "vs_currency": "usd",
                        "order": "market_cap_desc",
                        "per_page": limit,
                        "page": 1,
                        "sparkline": "true",
                        "price_change_percentage": "24h,7d"
                    },
                    headers=headers,
                    timeout=30.0
                )
                response.raise_for_status()
                data = response.json()
                
                # Format the data
                formatted = []
                for coin in data:
                    formatted.append({
                        "id": coin["id"],
                        "symbol": coin["symbol"].upper(),
                        "name": coin["name"],
                        "current_price": coin["current_price"],
                        "market_cap": coin["market_cap"],
                        "market_cap_rank": coin["market_cap_rank"],
                        "total_volume": coin["total_volume"],
                        "price_change_24h": coin["price_change_24h"],
                        "price_change_percentage_24h": coin["price_change_percentage_24h"],
                        "price_change_percentage_7d": coin.get("price_change_percentage_7d_in_currency"),
                        "sparkline_in_7d": coin.get("sparkline_in_7d", {}).get("price", []),
                        "last_updated": coin["last_updated"]
                    })
                
                return formatted
                
        except Exception as e:
            print(f"⚠️ Error fetching CoinGecko data: {e}")
            return self._get_fallback_crypto_data()
    
    async def get_coin_details(self, coin_id: str) -> Optional[Dict[str, Any]]:
        """
        Get detailed information about a specific coin
        """
        try:
            async with httpx.AsyncClient() as client:
                headers = {}
                if self.api_key:
                    headers["x-cg-demo-api-key"] = self.api_key
                
                response = await client.get(
                    f"{self.COINGECKO_API_URL}/coins/{coin_id}",
                    params={
                        "localization": "false",
                        "tickers": "false",
                        "market_data": "true",
                        "community_data": "false",
                        "developer_data": "false",
                        "sparkline": "true"
                    },
                    headers=headers,
                    timeout=30.0
                )
                response.raise_for_status()
                return response.json()
                
        except Exception as e:
            print(f"⚠️ Error fetching coin details: {e}")
            return None
    
    async def get_global_data(self) -> Dict[str, Any]:
        """
        Get global cryptocurrency market data
        """
        try:
            async with httpx.AsyncClient() as client:
                headers = {}
                if self.api_key:
                    headers["x-cg-demo-api-key"] = self.api_key
                
                response = await client.get(
                    f"{self.COINGECKO_API_URL}/global",
                    headers=headers,
                    timeout=30.0
                )
                response.raise_for_status()
                data = response.json()
                
                return {
                    "total_market_cap": data["data"]["total_market_cap"]["usd"],
                    "total_volume": data["data"]["total_volume"]["usd"],
                    "market_cap_percentage": data["data"]["market_cap_percentage"],
                    "market_cap_change_24h": data["data"]["market_cap_change_percentage_24h_usd"],
                    "active_cryptocurrencies": data["data"]["active_cryptocurrencies"],
                    "timestamp": datetime.utcnow().isoformat()
                }
                
        except Exception as e:
            print(f"⚠️ Error fetching global data: {e}")
            return {
                "total_market_cap": 2800000000000,
                "total_volume": 85000000000,
                "market_cap_change_24h": 2.5,
                "note": "Fallback data - API error"
            }
    
    def _get_fallback_crypto_data(self) -> List[Dict[str, Any]]:
        """Fallback data when API is unavailable"""
        return [
            {
                "id": "bitcoin",
                "symbol": "BTC",
                "name": "Bitcoin",
                "current_price": 87432.51,
                "market_cap": 1720000000000,
                "market_cap_rank": 1,
                "total_volume": 28500000000,
                "price_change_24h": 1987.23,
                "price_change_percentage_24h": 2.34,
                "price_change_percentage_7d": 5.67,
                "sparkline_in_7d": [85000, 86000, 84000, 87000, 87432],
                "note": "Fallback data - API key not configured"
            },
            {
                "id": "ethereum",
                "symbol": "ETH",
                "name": "Ethereum",
                "current_price": 2256.78,
                "market_cap": 271000000000,
                "market_cap_rank": 2,
                "total_volume": 15200000000,
                "price_change_24h": -28.15,
                "price_change_percentage_24h": -1.23,
                "price_change_percentage_7d": 3.45,
                "sparkline_in_7d": [2300, 2280, 2200, 2240, 2256],
                "note": "Fallback data - API key not configured"
            },
            {
                "id": "tether",
                "symbol": "USDT",
                "name": "Tether",
                "current_price": 1.00,
                "market_cap": 95000000000,
                "market_cap_rank": 3,
                "total_volume": 45000000000,
                "price_change_24h": 0.0001,
                "price_change_percentage_24h": 0.01,
                "price_change_percentage_7d": 0.02,
                "sparkline_in_7d": [1.00, 1.00, 1.00, 1.00, 1.00],
                "note": "Fallback data - API key not configured"
            }
        ]


# Global client instance
crypto_price_client = CryptoPriceClient()


def get_crypto_price_client() -> CryptoPriceClient:
    """Get crypto price client instance"""
    return crypto_price_client
