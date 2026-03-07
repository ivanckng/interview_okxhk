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
        """Fallback data when API is unavailable - 包含主流、成长期和新兴期加密货币"""
        return [
            # Major - 主流币 (Top 1-6)
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
                "note": "Fallback data - Major"
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
                "note": "Fallback data - Major"
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
                "note": "Fallback data - Major"
            },
            {
                "id": "binancecoin",
                "symbol": "BNB",
                "name": "BNB",
                "current_price": 598.42,
                "market_cap": 87000000000,
                "market_cap_rank": 4,
                "total_volume": 1200000000,
                "price_change_24h": 5.32,
                "price_change_percentage_24h": 0.89,
                "price_change_percentage_7d": 2.15,
                "sparkline_in_7d": [590, 585, 592, 595, 598],
                "note": "Fallback data - Major"
            },
            {
                "id": "solana",
                "symbol": "SOL",
                "name": "Solana",
                "current_price": 142.38,
                "market_cap": 68000000000,
                "market_cap_rank": 5,
                "total_volume": 2800000000,
                "price_change_24h": 3.85,
                "price_change_percentage_24h": 2.78,
                "price_change_percentage_7d": 8.45,
                "sparkline_in_7d": [135, 138, 130, 140, 142],
                "note": "Fallback data - Major"
            },
            {
                "id": "ripple",
                "symbol": "XRP",
                "name": "XRP",
                "current_price": 2.58,
                "market_cap": 148000000000,
                "market_cap_rank": 6,
                "total_volume": 4500000000,
                "price_change_24h": 0.08,
                "price_change_percentage_24h": 3.20,
                "price_change_percentage_7d": 12.50,
                "sparkline_in_7d": [2.40, 2.45, 2.38, 2.52, 2.58],
                "note": "Fallback data - Major"
            },
            # Emerging - 成长期 (Rank 7-12)
            {
                "id": "cardano",
                "symbol": "ADA",
                "name": "Cardano",
                "current_price": 0.78,
                "market_cap": 28000000000,
                "market_cap_rank": 7,
                "total_volume": 450000000,
                "price_change_24h": 0.02,
                "price_change_percentage_24h": 2.63,
                "price_change_percentage_7d": 5.40,
                "sparkline_in_7d": [0.76, 0.75, 0.74, 0.77, 0.78],
                "note": "Fallback data - Emerging"
            },
            {
                "id": "dogecoin",
                "symbol": "DOGE",
                "name": "Dogecoin",
                "current_price": 0.17,
                "market_cap": 25000000000,
                "market_cap_rank": 8,
                "total_volume": 850000000,
                "price_change_24h": -0.01,
                "price_change_percentage_24h": -5.56,
                "price_change_percentage_7d": -8.20,
                "sparkline_in_7d": [0.18, 0.175, 0.172, 0.168, 0.17],
                "note": "Fallback data - Emerging"
            },
            {
                "id": "tron",
                "symbol": "TRX",
                "name": "TRON",
                "current_price": 0.23,
                "market_cap": 22000000000,
                "market_cap_rank": 9,
                "total_volume": 320000000,
                "price_change_24h": 0.01,
                "price_change_percentage_24h": 4.55,
                "price_change_percentage_7d": 12.30,
                "sparkline_in_7d": [0.21, 0.215, 0.218, 0.222, 0.23],
                "note": "Fallback data - Emerging"
            },
            {
                "id": "avalanche-2",
                "symbol": "AVAX",
                "name": "Avalanche",
                "current_price": 24.85,
                "market_cap": 10200000000,
                "market_cap_rank": 10,
                "total_volume": 280000000,
                "price_change_24h": 0.65,
                "price_change_percentage_24h": 2.68,
                "price_change_percentage_7d": -3.20,
                "sparkline_in_7d": [24.5, 24.0, 23.8, 24.2, 24.85],
                "note": "Fallback data - Emerging"
            },
            {
                "id": "chainlink",
                "symbol": "LINK",
                "name": "Chainlink",
                "current_price": 14.32,
                "market_cap": 8900000000,
                "market_cap_rank": 11,
                "total_volume": 320000000,
                "price_change_24h": 0.28,
                "price_change_percentage_24h": 1.99,
                "price_change_percentage_7d": 6.80,
                "sparkline_in_7d": [14.0, 13.85, 14.1, 14.05, 14.32],
                "note": "Fallback data - Emerging"
            },
            {
                "id": "stellar",
                "symbol": "XLM",
                "name": "Stellar",
                "current_price": 0.28,
                "market_cap": 8500000000,
                "market_cap_rank": 12,
                "total_volume": 120000000,
                "price_change_24h": 0.01,
                "price_change_percentage_24h": 3.70,
                "price_change_percentage_7d": 8.90,
                "sparkline_in_7d": [0.27, 0.268, 0.272, 0.275, 0.28],
                "note": "Fallback data - Emerging"
            },
            # Growing - 新兴期 (Rank 13+)
            {
                "id": "polkadot",
                "symbol": "DOT",
                "name": "Polkadot",
                "current_price": 4.85,
                "market_cap": 7200000000,
                "market_cap_rank": 13,
                "total_volume": 180000000,
                "price_change_24h": 0.08,
                "price_change_percentage_24h": 1.68,
                "price_change_percentage_7d": -2.40,
                "sparkline_in_7d": [4.78, 4.75, 4.72, 4.80, 4.85],
                "note": "Fallback data - Growing"
            },
            {
                "id": "uniswap",
                "symbol": "UNI",
                "name": "Uniswap",
                "current_price": 9.12,
                "market_cap": 6800000000,
                "market_cap_rank": 14,
                "total_volume": 145000000,
                "price_change_24h": -0.23,
                "price_change_percentage_24h": -2.46,
                "price_change_percentage_7d": 4.20,
                "sparkline_in_7d": [9.35, 9.28, 9.15, 9.05, 9.12],
                "note": "Fallback data - Growing"
            },
            {
                "id": "near",
                "symbol": "NEAR",
                "name": "NEAR Protocol",
                "current_price": 3.42,
                "market_cap": 4100000000,
                "market_cap_rank": 15,
                "total_volume": 98000000,
                "price_change_24h": 0.12,
                "price_change_percentage_24h": 3.64,
                "price_change_percentage_7d": 15.20,
                "sparkline_in_7d": [3.25, 3.28, 3.30, 3.38, 3.42],
                "note": "Fallback data - Growing"
            },
            {
                "id": "aptos",
                "symbol": "APT",
                "name": "Aptos",
                "current_price": 6.18,
                "market_cap": 3200000000,
                "market_cap_rank": 16,
                "total_volume": 85000000,
                "price_change_24h": -0.15,
                "price_change_percentage_24h": -2.37,
                "price_change_percentage_7d": -5.80,
                "sparkline_in_7d": [6.35, 6.28, 6.20, 6.25, 6.18],
                "note": "Fallback data - Growing"
            },
            {
                "id": "filecoin",
                "symbol": "FIL",
                "name": "Filecoin",
                "current_price": 3.25,
                "market_cap": 1950000000,
                "market_cap_rank": 17,
                "total_volume": 45000000,
                "price_change_24h": 0.08,
                "price_change_percentage_24h": 2.52,
                "price_change_percentage_7d": 1.80,
                "sparkline_in_7d": [3.18, 3.15, 3.17, 3.22, 3.25],
                "note": "Fallback data - Growing"
            },
            {
                "id": "arbitrum",
                "symbol": "ARB",
                "name": "Arbitrum",
                "current_price": 0.48,
                "market_cap": 1850000000,
                "market_cap_rank": 18,
                "total_volume": 52000000,
                "price_change_24h": -0.02,
                "price_change_percentage_24h": -4.00,
                "price_change_percentage_7d": -12.50,
                "sparkline_in_7d": [0.50, 0.49, 0.485, 0.475, 0.48],
                "note": "Fallback data - Growing"
            },
            {
                "id": "optimism",
                "symbol": "OP",
                "name": "Optimism",
                "current_price": 1.12,
                "market_cap": 1650000000,
                "market_cap_rank": 19,
                "total_volume": 38000000,
                "price_change_24h": 0.03,
                "price_change_percentage_24h": 2.75,
                "price_change_percentage_7d": 8.40,
                "sparkline_in_7d": [1.09, 1.08, 1.10, 1.095, 1.12],
                "note": "Fallback data - Growing"
            },
            {
                "id": "cosmos",
                "symbol": "ATOM",
                "name": "Cosmos Hub",
                "current_price": 4.65,
                "market_cap": 1820000000,
                "market_cap_rank": 20,
                "total_volume": 42000000,
                "price_change_24h": -0.08,
                "price_change_percentage_24h": -1.69,
                "price_change_percentage_7d": -3.20,
                "sparkline_in_7d": [4.72, 4.68, 4.70, 4.60, 4.65],
                "note": "Fallback data - Growing"
            }
        ]


# Global client instance
crypto_price_client = CryptoPriceClient()


def get_crypto_price_client() -> CryptoPriceClient:
    """Get crypto price client instance"""
    return crypto_price_client
