"""
Data Sources Module
"""

from .bwenews import get_bwenews_client, BWEnewsClient
from .crypto_prices import get_crypto_price_client, CryptoPriceClient
from .comprehensive_market import get_comprehensive_market_client, ComprehensiveMarketDataClient
from .gnews import get_gnews_client, GNewsClient
from .fred import get_fred_client, FredClient
from .tushare import get_tushare_client, TushareClient
from .yfinance_data import get_yahoo_finance_client, YahooFinanceClient
from .bybit_announcements import get_bybit_client, BybitAnnouncementClient
from .binance_announcements import get_binance_client, BinanceAnnouncementClient
from .bitget_announcements import get_bitget_client, BitgetAnnouncementClient

__all__ = [
    # News
    'get_bwenews_client',
    'BWEnewsClient',
    'get_gnews_client',
    'GNewsClient',

    # Economic Data
    'get_fred_client',
    'FredClient',
    'get_tushare_client',
    'TushareClient',

    # Market Data (Yahoo Finance)
    'get_yahoo_finance_client',
    'YahooFinanceClient',
    'get_comprehensive_market_client',
    'ComprehensiveMarketDataClient',

    # Crypto
    'get_crypto_price_client',
    'CryptoPriceClient',

    # Exchange Announcements
    'get_bybit_client',
    'BybitAnnouncementClient',
    'get_binance_client',
    'BinanceAnnouncementClient',
    'get_bitget_client',
    'BitgetAnnouncementClient',
]
