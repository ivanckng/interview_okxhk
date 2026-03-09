"""
Yahoo Finance API Client for Stock Indices
Using yfinance library
Updates every 1 minute
"""
import yfinance as yf
import pytz
from datetime import datetime
from utils.cache import get_market_cache


# Stock index symbols mapping
INDICES = {
    "us": [
        {"symbol": "^GSPC", "name": "S&P 500"},
        {"symbol": "^DJI", "name": "Dow Jones"},
        {"symbol": "^IXIC", "name": "Nasdaq"},
    ],
    "cn": [
        {"symbol": "000001.SS", "name": "Shanghai Composite"},
        {"symbol": "399001.SZ", "name": "Shenzhen Component"},
        {"symbol": "399006.SZ", "name": "ChiNext"},
    ],
    "hk": [
        {"symbol": "^HSI", "name": "Hang Seng"},
    ],
    "uk": [
        {"symbol": "^FTSE", "name": "FTSE 100"},
    ],
    "eu": [
        {"symbol": "^STOXX50E", "name": "Euro Stoxx 50"},
        {"symbol": "^GDAXI", "name": "DAX"},
        {"symbol": "^FCHI", "name": "CAC 40"},
    ],
    "jp": [
        {"symbol": "^N225", "name": "Nikkei 225"},
    ],
    "kr": [
        {"symbol": "^KS11", "name": "KOSPI"},
        {"symbol": "^KQ11", "name": "KOSDAQ"},
    ],
}

# Commodities symbols
COMMODITIES = [
    {"symbol": "CL=F", "name": "Crude Oil"},
    {"symbol": "GC=F", "name": "Gold"},
]

# Currency pairs (all quoted in HKD except CNY which is quoted in CNY)
# HKD/CNY means 1 HKD = X CNY
CURRENCY_PAIRS = [
    {"symbol": "USDHKD=X", "name": "USD/HKD", "quote_currency": "HKD"},
    {"symbol": "HKDCNY=X", "name": "HKD/CNY", "quote_currency": "CNY"},
    {"symbol": "GBPHKD=X", "name": "GBP/HKD", "quote_currency": "HKD"},
    {"symbol": "EURHKD=X", "name": "EUR/HKD", "quote_currency": "HKD"},
    {"symbol": "JPYHKD=X", "name": "JPY/HKD", "quote_currency": "HKD"},
]

# Timezone mapping for local time display
TIMEZONES = {
    "us": "US/Eastern",
    "cn": "Asia/Shanghai",
    "hk": "Asia/Hong_Kong",
    "uk": "Europe/London",
    "eu": "Europe/Berlin",
    "jp": "Asia/Tokyo",
    "kr": "Asia/Seoul",
}


def get_stock_indices(region: str = None):
    """
    Get stock indices for a specific region or all regions
    Updates every 1 minute via cache
    """
    cache = get_market_cache()
    cache_key = "yfinance_indices"
    
    # Check cache (1 minute TTL)
    cached = cache.get(cache_key)
    if cached:
        cached_at = cached.get("cached_at")
        if cached_at:
            try:
                cached_time = datetime.fromisoformat(cached_at)
                if (datetime.utcnow() - cached_time).total_seconds() < 60:
                    print(f"✅ Using cached Yahoo Finance data")
                    if region:
                        return {"regions": {region: cached["regions"].get(region, [])}}
                    return cached
            except:
                pass
    
    print(f"📊 Fetching Yahoo Finance indices data...")
    
    try:
        regions_data = {}
        
        # Fetch data for each region
        for region_key, indices_list in INDICES.items():
            indices_data = []
            
            # Get timezone for local time display
            tz = pytz.timezone(TIMEZONES.get(region_key, "UTC"))
            
            for index_info in indices_list:
                symbol = index_info["symbol"]
                name = index_info["name"]
                
                try:
                    ticker = yf.Ticker(symbol)
                    info = ticker.fast_info
                    
                    price = float(info.last_price) if info.last_price else 0
                    prev_close = float(info.previous_close) if info.previous_close else 0
                    change = price - prev_close
                    change_percent = (change / prev_close * 100) if prev_close else 0
                    
                    # Convert to local time
                    local_time = datetime.utcnow().replace(tzinfo=pytz.UTC).astimezone(tz)
                    timestamp = local_time.strftime("%Y-%m-%d %H:%M %Z")
                    
                    indices_data.append({
                        "name": name,
                        "symbol": symbol,
                        "value": round(price, 2),
                        "change": round(change, 2),
                        "change_percent": round(change_percent, 2),
                        "timestamp": timestamp,
                    })
                    
                except Exception as e:
                    print(f"⚠️ Error fetching {symbol}: {e}")
                    # Get local time for fallback
                    local_time = datetime.utcnow().replace(tzinfo=pytz.UTC).astimezone(tz)
                    indices_data.append({
                        "name": name,
                        "symbol": symbol,
                        "value": 0,
                        "change": 0,
                        "change_percent": 0,
                        "timestamp": local_time.strftime("%Y-%m-%d %H:%M %Z"),
                    })
            
            regions_data[region_key] = indices_data
        
        result = {
            "regions": regions_data,
            "data_source": "Yahoo Finance",
            "cached_at": datetime.utcnow().isoformat(),
            "refresh_interval": "1 minute",
        }
        
        # Cache for 1 minute
        cache.set(cache_key, result, ttl=60)
        print(f"✅ Cached Yahoo Finance data")
        
        if region:
            return {"regions": {region: regions_data.get(region, [])}}
        return result
        
    except Exception as e:
        print(f"⚠️ Yahoo Finance API error: {e}")
        return {"error": str(e), "regions": {}}


def get_commodities():
    """
    Get commodities data (Crude Oil, Gold)
    Updates every 1 minute via cache
    """
    cache = get_market_cache()
    cache_key = "yfinance_commodities"
    
    # Check cache (1 minute TTL)
    cached = cache.get(cache_key)
    if cached:
        cached_at = cached.get("cached_at")
        if cached_at:
            try:
                cached_time = datetime.fromisoformat(cached_at)
                if (datetime.utcnow() - cached_time).total_seconds() < 60:
                    print(f"✅ Using cached Yahoo Finance commodities data")
                    return cached
            except:
                pass
    
    print(f"📊 Fetching Yahoo Finance commodities data...")
    
    try:
        commodities_data = []
        
        # Get timezone for US market time
        tz = pytz.timezone("US/Eastern")
        
        for commodity_info in COMMODITIES:
            symbol = commodity_info["symbol"]
            name = commodity_info["name"]
            
            try:
                ticker = yf.Ticker(symbol)
                info = ticker.info
                
                # Get current price
                current_price = float(info.get('regularMarketPrice', 0))
                
                # Get previous close (previous trading day's settlement for futures)
                prev_close = float(info.get('regularMarketPreviousClose', 0))
                
                if current_price == 0 or prev_close == 0:
                    # Fallback to fast_info
                    fast_info = ticker.fast_info
                    current_price = float(fast_info.last_price) if fast_info.last_price else 0
                    prev_close = float(fast_info.previous_close) if fast_info.previous_close else 0
                
                change = current_price - prev_close
                change_percent = (change / prev_close * 100) if prev_close else 0
                
                # Convert to US Eastern time
                local_time = datetime.utcnow().replace(tzinfo=pytz.UTC).astimezone(tz)
                timestamp = local_time.strftime("%Y-%m-%d %H:%M %Z")
                
                commodities_data.append({
                    "name": name,
                    "symbol": symbol,
                    "value": round(current_price, 2),
                    "change": round(change, 2),
                    "change_percent": round(change_percent, 2),
                    "timestamp": timestamp,
                })
                
            except Exception as e:
                print(f"⚠️ Error fetching {symbol}: {e}")
                local_time = datetime.utcnow().replace(tzinfo=pytz.UTC).astimezone(tz)
                commodities_data.append({
                    "name": name,
                    "symbol": symbol,
                    "value": 0,
                    "change": 0,
                    "change_percent": 0,
                    "timestamp": local_time.strftime("%Y-%m-%d %H:%M %Z"),
                })
        
        result = {
            "commodities": commodities_data,
            "data_source": "Yahoo Finance",
            "cached_at": datetime.utcnow().isoformat(),
            "refresh_interval": "1 minute",
        }
        
        # Cache for 1 minute
        cache.set(cache_key, result, ttl=60)
        print(f"✅ Cached Yahoo Finance commodities data")
        
        return result
        
    except Exception as e:
        print(f"⚠️ Yahoo Finance commodities error: {e}")
        return {"error": str(e), "commodities": []}


def get_currency_rates():
    """
    Get currency exchange rates
    Updates every 1 minute via cache
    """
    cache = get_market_cache()
    cache_key = "yfinance_currency"
    
    # Check cache (1 minute TTL)
    cached = cache.get(cache_key)
    if cached:
        cached_at = cached.get("cached_at")
        if cached_at:
            try:
                cached_time = datetime.fromisoformat(cached_at)
                if (datetime.utcnow() - cached_time).total_seconds() < 60:
                    print(f"✅ Using cached Yahoo Finance currency data")
                    return cached
            except:
                pass
    
    print(f"📊 Fetching Yahoo Finance currency data...")
    
    try:
        currency_data = []
        
        # Get timezone for HK market time
        tz = pytz.timezone("Asia/Hong_Kong")
        
        for pair_info in CURRENCY_PAIRS:
            symbol = pair_info["symbol"]
            name = pair_info["name"]
            quote_currency = pair_info["quote_currency"]
            
            try:
                ticker = yf.Ticker(symbol)
                info = ticker.fast_info
                
                price = float(info.last_price) if info.last_price else 0
                prev_close = float(info.previous_close) if info.previous_close else 0
                change = price - prev_close
                change_percent = (change / prev_close * 100) if prev_close else 0
                
                # Convert to HK time
                local_time = datetime.utcnow().replace(tzinfo=pytz.UTC).astimezone(tz)
                timestamp = local_time.strftime("%Y-%m-%d %H:%M %Z")
                
                currency_data.append({
                    "name": name,
                    "symbol": symbol,
                    "value": round(price, 4),
                    "change": round(change, 4),
                    "change_percent": round(change_percent, 2),
                    "quote_currency": quote_currency,
                    "timestamp": timestamp,
                })
                
            except Exception as e:
                print(f"⚠️ Error fetching {symbol}: {e}")
                local_time = datetime.utcnow().replace(tzinfo=pytz.UTC).astimezone(tz)
                currency_data.append({
                    "name": name,
                    "symbol": symbol,
                    "value": 0,
                    "change": 0,
                    "change_percent": 0,
                    "quote_currency": quote_currency,
                    "timestamp": local_time.strftime("%Y-%m-%d %H:%M %Z"),
                })
        
        result = {
            "currencies": currency_data,
            "data_source": "Yahoo Finance",
            "cached_at": datetime.utcnow().isoformat(),
            "refresh_interval": "1 minute",
        }
        
        # Cache for 1 minute
        cache.set(cache_key, result, ttl=60)
        print(f"✅ Cached Yahoo Finance currency data")
        
        return result
        
    except Exception as e:
        print(f"⚠️ Yahoo Finance currency error: {e}")
        return {"error": str(e), "currencies": []}


# For backwards compatibility
class YahooFinanceClient:
    def __init__(self):
        pass
    
    def get_indices(self, region=None):
        return get_stock_indices(region)


yahoo_finance_client = YahooFinanceClient()


def get_yahoo_finance_client():
    return yahoo_finance_client
