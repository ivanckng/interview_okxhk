"""
Data Sources Module
Provides unified access to various financial and economic data sources
"""

from .bwenews import get_bwenews_client, BWEnewsClient
from .market_data import get_market_data_client, MarketDataClient
from .crypto_prices import get_crypto_price_client, CryptoPriceClient
from .world_bank import get_world_bank_client, WorldBankClient
from .trading_economics import get_trading_economics_client, TradingEconomicsClient
from .comprehensive_market import get_comprehensive_market_client, ComprehensiveMarketDataClient

__all__ = [
    # News
    'get_bwenews_client',
    'BWEnewsClient',
    
    # Market Data
    'get_market_data_client',
    'MarketDataClient',
    'get_world_bank_client',
    'WorldBankClient',
    'get_trading_economics_client',
    'TradingEconomicsClient',
    'get_comprehensive_market_client',
    'ComprehensiveMarketDataClient',
    
    # Crypto
    'get_crypto_price_client',
    'CryptoPriceClient',
]
