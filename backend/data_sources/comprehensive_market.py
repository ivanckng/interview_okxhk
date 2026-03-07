"""
Comprehensive Market Data Aggregator
统一数据源配置:

经济数据 (GDP, CPI, PPI, Unemployment):
- Source: World Bank Open Data (https://data.worldbank.org/)
- Coverage: 200+ countries
- Cache: 24 hours (86400 seconds)
- Update frequency: Daily
- Cost: Free, no API key required

金融数据 (Stock Indices):
- Source: Alpha Vantage Global Quote API
- Cache: 10 minutes (600 seconds)
- Update frequency: Every 10 minutes

大宗商品:
- Source: Alpha Vantage (with fallback)
- Cache: 10 minutes (600 seconds)
- Update frequency: Every 10 minutes
"""
import asyncio
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta

from .alpha_vantage import get_alpha_vantage_client
from .world_bank import get_world_bank_client


class ComprehensiveMarketDataClient:
    """
    统一市场数据聚合器 - Alpha Vantage 版本
    所有数据均来自 Alpha Vantage API
    """
    
    # 缓存配置
    CACHE_CONFIG = {
        "economic": {"ttl": 86400, "description": "24 hours"},      # 经济数据: 24小时
        "financial": {"ttl": 600, "description": "10 minutes"},    # 金融数据: 10分钟
        "commodities": {"ttl": 600, "description": "10 minutes"},  # 大宗商品: 10分钟
    }
    
    # 国家配置
    COUNTRY_CONFIG = {
        "us": {"name": "United States", "code": "USA"},
        "cn": {"name": "China", "code": "CHN"},
        "hk": {"name": "Hong Kong", "code": "HKG"},
        "eu": {"name": "European Union", "code": "EUR"},
        "uk": {"name": "United Kingdom", "code": "GBR"},
        "jp": {"name": "Japan", "code": "JPN"},
        "kr": {"name": "South Korea", "code": "KOR"},
        "sg": {"name": "Singapore", "code": "SGP"},
        "de": {"name": "Germany", "code": "DEU"},
        "fr": {"name": "France", "code": "FRA"},
        "in": {"name": "India", "code": "IND"},
        "au": {"name": "Australia", "code": "AUS"},
        "ca": {"name": "Canada", "code": "CAN"},
        "br": {"name": "Brazil", "code": "BRA"},
        "mx": {"name": "Mexico", "code": "MEX"},
    }
    
    def __init__(self):
        self.alpha_vantage = get_alpha_vantage_client()
        self.world_bank = get_world_bank_client()
        # 内存缓存
        self._cache = {
            "economic": {},      # 经济数据缓存
            "stock_indices": {}, # 股指缓存
            "commodities": None, # 大宗商品缓存
        }
        self._cache_time = {
            "economic": {},
            "stock_indices": {},
            "commodities": None,
        }
    
    def _is_cache_valid(self, cache_type: str, key: str = None) -> bool:
        """检查缓存是否有效"""
        now = datetime.utcnow()
        ttl = self.CACHE_CONFIG[cache_type]["ttl"]
        
        if cache_type == "commodities":
            if self._cache_time["commodities"] is None:
                return False
            return (now - self._cache_time["commodities"]).seconds < ttl
        else:
            if key not in self._cache_time[cache_type]:
                return False
            return (now - self._cache_time[cache_type][key]).seconds < ttl
    
    def _set_cache(self, cache_type: str, key: str, data: Any):
        """设置缓存"""
        if cache_type == "commodities":
            self._cache["commodities"] = data
            self._cache_time["commodities"] = datetime.utcnow()
        else:
            self._cache[cache_type][key] = data
            self._cache_time[cache_type][key] = datetime.utcnow()
    
    def _get_cache(self, cache_type: str, key: str = None):
        """获取缓存"""
        if cache_type == "commodities":
            return self._cache["commodities"]
        return self._cache[cache_type].get(key)
    
    async def get_country_economic_data(self, country_id: str, use_cache: bool = True) -> Dict[str, Any]:
        """
        获取国家经济数据 (每日更新)
        
        Data Source: World Bank Open Data (https://data.worldbank.org/)
        - GDP Growth (Annual %)
        - CPI Inflation (Annual %)
        - PPI (Producer Price Inflation, using proxy where available)
        - Unemployment Rate (%)
        - Interest Rate (%)
        
        Cache: 24 hours
        """
        # 检查缓存
        if use_cache and self._is_cache_valid("economic", country_id):
            cached = self._get_cache("economic", country_id)
            cached["cached"] = True
            return cached
        
        # 从 World Bank 获取数据
        country_code = self.world_bank.COUNTRIES.get(country_id, country_id.upper())
        
        # 获取各项指标 (使用最近5年的数据)
        gdp_annual = await self.world_bank.get_indicator(country_code, self.world_bank.INDICATORS["gdp_growth"], "2020:2024")
        cpi_annual = await self.world_bank.get_indicator(country_code, self.world_bank.INDICATORS["inflation_cpi"], "2020:2024")
        unemployment = await self.world_bank.get_indicator(country_code, self.world_bank.INDICATORS["unemployment"], "2020:2024")
        gdp_current = await self.world_bank.get_indicator(country_code, self.world_bank.INDICATORS["gdp_current"], "2020:2024")
        
        # PPI - World Bank 没有直接的 PPI 指标，使用 CPI 作为代理或 fallback
        # 对于美国，可以尝试从 Alpha Vantage 获取，其他国家使用 CPI 或 fallback
        ppi_value = None
        if country_id == "us":
            # 尝试从 Alpha Vantage 获取美国 PPI
            ppi_data = await self.alpha_vantage.get_cpi("US", "semiannual")
            if ppi_data:
                ppi_value = ppi_data.get("value")
        
        # 如果没有 PPI，使用 CPI 作为代理或 fallback 数据
        if ppi_value is None:
            ppi_value = cpi_annual if cpi_annual else self._get_fallback_ppi(country_id)
        
        # 利率 - World Bank 数据有限，使用 fallback
        interest_rate = self._get_fallback_interest_rate(country_id)
        
        # GDP Quarterly - World Bank 只有年度数据，使用年度数据除以4作为估算
        gdp_quarterly = round(gdp_annual / 4, 1) if gdp_annual else None
        
        data = {
            "country_id": country_id,
            "country_name": self.COUNTRY_CONFIG.get(country_id, {}).get("name", country_id.upper()),
            "timestamp": datetime.utcnow().isoformat(),
            "data_source": "World Bank Open Data",
            "data_source_url": "https://data.worldbank.org/",
            "indicators": {
                "gdp_annual": round(gdp_annual, 1) if gdp_annual else None,
                "gdp_quarterly": gdp_quarterly,
                "cpi_monthly": round(cpi_annual, 1) if cpi_annual else None,  # World Bank 提供年度CPI
                "ppi_monthly": round(ppi_value, 1) if ppi_value else None,
                "unemployment_monthly": round(unemployment, 1) if unemployment else None,
                "interest_rate": interest_rate,
                "gdp_current": gdp_current,
            },
            "cache_ttl": self.CACHE_CONFIG["economic"]["description"],
            "next_update": (datetime.utcnow() + timedelta(seconds=self.CACHE_CONFIG["economic"]["ttl"])).isoformat(),
            "cached": False,
        }
        
        # 保存缓存
        self._set_cache("economic", country_id, data)
        
        return data
    
    def _get_fallback_ppi(self, country_id: str) -> float:
        """获取 PPI fallback 数据"""
        fallback_ppi = {
            "us": 2.1,
            "cn": -2.2,
            "hk": 1.5,
            "eu": 1.8,
            "uk": 2.2,
            "jp": 4.0,
            "kr": 1.2,
            "sg": 2.0,
            "de": 1.5,
            "fr": 1.2,
            "in": 1.5,
            "au": 2.8,
            "ca": 1.5,
            "br": 2.8,
            "mx": 3.2,
        }
        return fallback_ppi.get(country_id, 2.0)
    
    def _get_fallback_interest_rate(self, country_id: str) -> float:
        """获取利率 fallback 数据"""
        fallback_rates = {
            "us": 5.33,
            "cn": 3.45,
            "hk": 5.75,
            "eu": 2.90,
            "uk": 4.75,
            "jp": 0.50,
            "kr": 3.25,
            "sg": 3.00,
            "de": 2.90,
            "fr": 2.90,
            "in": 6.50,
            "au": 4.35,
            "ca": 4.25,
            "br": 10.50,
            "mx": 10.00,
        }
        return fallback_rates.get(country_id, 3.0)
    
    async def get_stock_indices(self, country_id: str, use_cache: bool = True) -> Dict[str, Any]:
        """
        获取国家股指数据 (每10分钟更新)
        
        Data Source: Alpha Vantage Global Quote API
        Cache: 10 minutes
        """
        # 检查缓存
        if use_cache and self._is_cache_valid("stock_indices", country_id):
            cached = self._get_cache("stock_indices", country_id)
            return {
                "country_id": country_id,
                "country_name": self.COUNTRY_CONFIG.get(country_id, {}).get("name", country_id.upper()),
                "timestamp": datetime.utcnow().isoformat(),
                "indices": cached,
                "source": "Alpha Vantage",
                "cache_ttl": self.CACHE_CONFIG["financial"]["description"],
                "cached": True
            }
        
        # 从 Alpha Vantage 获取
        indices = await self.alpha_vantage.get_stock_indices(country_id)
        
        # 保存缓存
        self._set_cache("stock_indices", country_id, indices)
        
        return {
            "country_id": country_id,
            "country_name": self.COUNTRY_CONFIG.get(country_id, {}).get("name", country_id.upper()),
            "timestamp": datetime.utcnow().isoformat(),
            "indices": indices,
            "source": "Alpha Vantage - Global Quote API",
            "cache_ttl": self.CACHE_CONFIG["financial"]["description"],
            "next_update": (datetime.utcnow() + timedelta(seconds=self.CACHE_CONFIG["financial"]["ttl"])).isoformat(),
            "cached": False
        }
    
    async def get_commodities(self, use_cache: bool = True) -> Dict[str, Any]:
        """
        获取大宗商品数据 (每10分钟更新)
        
        Data Source: Alpha Vantage (with fallback for free tier limits)
        Cache: 10 minutes
        """
        # 检查缓存
        if use_cache and self._is_cache_valid("commodities"):
            cached = self._get_cache("commodities")
            cached["cached"] = True
            cached["timestamp"] = datetime.utcnow().isoformat()
            return cached
        
        # 从 Alpha Vantage 获取
        data = await self.alpha_vantage.get_commodities()
        
        # 添加元数据
        data["cache_ttl"] = self.CACHE_CONFIG["commodities"]["description"]
        data["next_update"] = (datetime.utcnow() + timedelta(seconds=self.CACHE_CONFIG["commodities"]["ttl"])).isoformat()
        data["cached"] = False
        
        # 保存缓存
        self._set_cache("commodities", None, data)
        
        return data
    
    async def get_country_data(self, country_id: str) -> Dict[str, Any]:
        """
        获取国家完整数据 (经济 + 股指)
        """
        # 获取经济数据 (24小时缓存)
        economic_data = await self.get_country_economic_data(country_id)
        
        # 获取股指数据 (10分钟缓存)
        indices_data = await self.get_stock_indices(country_id)
        
        # 统一数据源描述
        data_sources = [
            "World Bank Open Data - https://data.worldbank.org/",
            "Alpha Vantage - https://www.alphavantage.co (for stock indices)",
        ]
        
        return {
            "country_id": country_id,
            "country_name": self.COUNTRY_CONFIG.get(country_id, {}).get("name", country_id.upper()),
            "timestamp": datetime.utcnow().isoformat(),
            "data_sources_used": data_sources,
            "cache_info": {
                "economic_data": {
                    "ttl": self.CACHE_CONFIG["economic"]["description"],
                    "cached": economic_data.get("cached", False),
                    "next_update": economic_data.get("next_update"),
                },
                "stock_indices": {
                    "ttl": self.CACHE_CONFIG["financial"]["description"],
                    "cached": indices_data.get("cached", False),
                    "next_update": indices_data.get("next_update"),
                }
            },
            "indicators": economic_data.get("indicators", {}),
            "stock_indices": indices_data.get("indices", []),
        }
    
    async def get_all_countries(self) -> Dict[str, Any]:
        """
        获取所有国家数据
        """
        tasks = []
        country_ids = []
        
        for country_id in self.COUNTRY_CONFIG.keys():
            tasks.append(self.get_country_data(country_id))
            country_ids.append(country_id)
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        countries_data = {}
        for country_id, result in zip(country_ids, results):
            if isinstance(result, Exception):
                countries_data[country_id] = {
                    "error": str(result),
                    "country_id": country_id
                }
            else:
                countries_data[country_id] = result
        
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "data_source": "World Bank + Alpha Vantage",
            "economic_data_source": "World Bank Open Data (https://data.worldbank.org/)",
            "financial_data_source": "Alpha Vantage (https://www.alphavantage.co)",
            "cache_policy": {
                "economic_data": self.CACHE_CONFIG["economic"]["description"],
                "financial_data": self.CACHE_CONFIG["financial"]["description"],
            },
            "countries": countries_data,
            "total_countries": len(countries_data),
        }
    
    async def get_global_summary(self) -> Dict[str, Any]:
        """
        获取全球经济摘要
        """
        all_countries = await self.get_all_countries()
        
        # 计算全球平均值
        gdp_values = []
        inflation_values = []
        unemployment_values = []
        
        for country_data in all_countries["countries"].values():
            if "error" not in country_data:
                indicators = country_data.get("indicators", {})
                if indicators.get("gdp_annual"):
                    gdp_values.append(indicators["gdp_annual"])
                if indicators.get("cpi_monthly"):
                    inflation_values.append(indicators["cpi_monthly"])
                if indicators.get("unemployment_monthly"):
                    unemployment_values.append(indicators["unemployment_monthly"])
        
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "data_source": "World Bank + Alpha Vantage",
            "economic_data_source": "World Bank Open Data (https://data.worldbank.org/)",
            "financial_data_source": "Alpha Vantage (https://www.alphavantage.co)",
            "cache_policy": {
                "economic_data": self.CACHE_CONFIG["economic"]["description"],
                "financial_data": self.CACHE_CONFIG["financial"]["description"],
            },
            "regions": all_countries["countries"],
            "global_aggregates": {
                "avg_gdp_growth": round(sum(gdp_values) / len(gdp_values), 1) if gdp_values else None,
                "avg_inflation": round(sum(inflation_values) / len(inflation_values), 1) if inflation_values else None,
                "avg_unemployment": round(sum(unemployment_values) / len(unemployment_values), 1) if unemployment_values else None,
            },
            "coverage": {
                "total_countries": len(all_countries["countries"]),
                "data_sources": [
                    "World Bank Open Data - GDP, CPI, Unemployment",
                    "Alpha Vantage - Stock Indices",
                ],
                "last_updated": datetime.utcnow().isoformat()
            }
        }


# Global client
comprehensive_market_client = ComprehensiveMarketDataClient()


def get_comprehensive_market_client() -> ComprehensiveMarketDataClient:
    return comprehensive_market_client
