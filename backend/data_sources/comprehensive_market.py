"""
Comprehensive Market Data Aggregator
统一数据源配置:

经济数据 (GDP, CPI, PPI, Unemployment):
- 美国：FRED (Federal Reserve Economic Data)
- 中国：Tushare (中国财经数据接口)
- 其他国家：Fallback 数据

金融数据 (Stock Indices, Commodities, Currency):
- Source: Yahoo Finance (yfinance)
- Cache: 1 minute (60 seconds)
- Update frequency: Every 1 minute
"""
import asyncio
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta

from .fred import get_fred_client
from .tushare import get_tushare_client
from .yfinance_data import get_stock_indices as yf_indices, get_commodities as yf_commodities, get_currency_rates as yf_currency


class ComprehensiveMarketDataClient:
    """
    统一市场数据聚合器
    经济数据：FRED (美国) + Tushare (中国) + Fallback (其他国家)
    股指/大宗商品/外汇：Yahoo Finance
    """

    # 缓存配置
    CACHE_CONFIG = {
        "economic": {"ttl": 86400, "description": "24 hours"},      # 经济数据：24 小时
        "financial": {"ttl": 60, "description": "1 minute"},        # 金融数据：1 分钟
        "commodities": {"ttl": 60, "description": "1 minute"},      # 大宗商品：1 分钟
        "currency": {"ttl": 60, "description": "1 minute"},         # 外汇：1 分钟
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
        self.fred = get_fred_client()
        self.tushare = get_tushare_client()
        # 内存缓存
        self._cache = {
            "economic": {},      # 经济数据缓存
            "stock_indices": {}, # 股指缓存
            "commodities": None, # 大宗商品缓存
            "currency": None,    # 外汇缓存
        }
        self._cache_time = {
            "economic": {},
            "stock_indices": {},
            "commodities": None,
            "currency": None,
        }

    def _is_cache_valid(self, cache_type: str, key: str = None) -> bool:
        """检查缓存是否有效"""
        now = datetime.utcnow()
        ttl = self.CACHE_CONFIG[cache_type]["ttl"]

        if cache_type in ["commodities", "currency"]:
            if self._cache_time[cache_type] is None:
                return False
            return (now - self._cache_time[cache_type]).seconds < ttl
        else:
            if key not in self._cache_time[cache_type]:
                return False
            return (now - self._cache_time[cache_type][key]).seconds < ttl

    def _set_cache(self, cache_type: str, key: str, data: Any):
        """设置缓存"""
        if cache_type in ["commodities", "currency"]:
            self._cache[cache_type] = data
            self._cache_time[cache_type] = datetime.utcnow()
        else:
            self._cache[cache_type][key] = data
            self._cache_time[cache_type][key] = datetime.utcnow()

    def _get_cache(self, cache_type: str, key: str = None):
        """获取缓存"""
        if cache_type in ["commodities", "currency"]:
            return self._cache[cache_type]
        return self._cache[cache_type].get(key)

    async def get_country_economic_data(self, country_id: str, use_cache: bool = True) -> Dict[str, Any]:
        """
        获取国家经济数据 (每日更新)

        Data Source:
        - US: FRED (Federal Reserve Economic Data)
        - CN: Tushare
        - Others: Fallback data

        Cache: 24 hours
        """
        # 检查缓存
        if use_cache and self._is_cache_valid("economic", country_id):
            cached = self._get_cache("economic", country_id)
            cached["cached"] = True
            return cached

        # 根据国家获取数据
        if country_id == "us":
            data = await self._get_us_economic_data()
        elif country_id == "cn":
            data = await self._get_cn_economic_data()
        else:
            data = self._get_fallback_economic_data(country_id)

        # 保存缓存
        self._set_cache("economic", country_id, data)

        return data

    async def _get_us_economic_data(self) -> Dict[str, Any]:
        """从 FRED 获取美国经济数据"""
        try:
            result = await self.fred.get_us_indicators()
            indicators = result.get("indicators", {})

            return {
                "country_id": "us",
                "country_name": "United States",
                "timestamp": datetime.utcnow().isoformat(),
                "data_source": "FRED (Federal Reserve Economic Data)",
                "data_source_url": "https://fred.stlouisfed.org/",
                "indicators": {
                    "gdp_annual": indicators.get("gdp_annual", {}).get("value"),
                    "gdp_quarterly": indicators.get("gdp_quarterly", {}).get("value"),
                    "cpi_monthly": indicators.get("cpi", {}).get("value"),
                    "ppi_monthly": indicators.get("ppi", {}).get("value"),
                    "unemployment_monthly": indicators.get("unemployment", {}).get("value"),
                    "interest_rate": indicators.get("fed_rate", {}).get("value"),
                },
                "cache_ttl": self.CACHE_CONFIG["economic"]["description"],
                "next_update": (datetime.utcnow() + timedelta(seconds=self.CACHE_CONFIG["economic"]["ttl"])).isoformat(),
                "cached": False,
            }
        except Exception as e:
            print(f"⚠️ FRED API error, using fallback: {e}")
            return self._get_fallback_economic_data("us")

    async def _get_cn_economic_data(self) -> Dict[str, Any]:
        """从 Tushare 获取中国经济数据"""
        try:
            result = await self.tushare.get_cn_indicators()
            indicators = result.get("indicators", {})

            return {
                "country_id": "cn",
                "country_name": "China",
                "timestamp": datetime.utcnow().isoformat(),
                "data_source": "Tushare (中国财经数据接口)",
                "data_source_url": "https://tushare.pro/",
                "indicators": {
                    "gdp_annual": indicators.get("gdp_annual", {}).get("value"),
                    "gdp_quarterly": indicators.get("gdp_quarterly", {}).get("value"),
                    "cpi_monthly": indicators.get("cpi", {}).get("value"),
                    "ppi_monthly": indicators.get("ppi", {}).get("value"),
                    "unemployment_monthly": indicators.get("unemployment", {}).get("value"),
                    "interest_rate": indicators.get("mlf_rate", {}).get("value"),
                },
                "cache_ttl": self.CACHE_CONFIG["economic"]["description"],
                "next_update": (datetime.utcnow() + timedelta(seconds=self.CACHE_CONFIG["economic"]["ttl"])).isoformat(),
                "cached": False,
            }
        except Exception as e:
            print(f"⚠️ Tushare API error, using fallback: {e}")
            return self._get_fallback_economic_data("cn")

    def _get_fallback_economic_data(self, country_id: str) -> Dict[str, Any]:
        """获取 fallback 经济数据"""
        fallback_data = {
            "us": {
                "gdp_annual": 2.8,
                "gdp_quarterly": 0.8,
                "cpi_monthly": 2.9,
                "ppi_monthly": 2.1,
                "unemployment_monthly": 4.1,
                "interest_rate": 5.33,
            },
            "cn": {
                "gdp_annual": 5.0,
                "gdp_quarterly": 1.6,
                "cpi_monthly": 0.2,
                "ppi_monthly": -2.2,
                "unemployment_monthly": 5.1,
                "interest_rate": 3.45,
            },
            "hk": {
                "gdp_annual": 3.2,
                "gdp_quarterly": 0.8,
                "cpi_monthly": 1.8,
                "ppi_monthly": 1.5,
                "unemployment_monthly": 3.1,
                "interest_rate": 5.75,
            },
            "eu": {
                "gdp_annual": 0.9,
                "gdp_quarterly": 0.2,
                "cpi_monthly": 2.5,
                "ppi_monthly": 1.8,
                "unemployment_monthly": 6.2,
                "interest_rate": 2.90,
            },
            "uk": {
                "gdp_annual": 1.1,
                "gdp_quarterly": 0.1,
                "cpi_monthly": 3.0,
                "ppi_monthly": 2.2,
                "unemployment_monthly": 4.4,
                "interest_rate": 4.75,
            },
            "jp": {
                "gdp_annual": 1.0,
                "gdp_quarterly": 0.4,
                "cpi_monthly": 3.6,
                "ppi_monthly": 4.0,
                "unemployment_monthly": 2.5,
                "interest_rate": 0.50,
            },
            "kr": {
                "gdp_annual": 2.8,
                "gdp_quarterly": 0.5,
                "cpi_monthly": 2.4,
                "ppi_monthly": 1.2,
                "unemployment_monthly": 3.4,
                "interest_rate": 3.25,
            },
            "sg": {
                "gdp_annual": 4.4,
                "gdp_quarterly": 1.2,
                "cpi_monthly": 2.5,
                "ppi_monthly": 2.0,
                "unemployment_monthly": 2.8,
                "interest_rate": 3.00,
            },
        }

        data = fallback_data.get(country_id, {
            "gdp_annual": 2.0,
            "gdp_quarterly": 0.5,
            "cpi_monthly": 2.5,
            "ppi_monthly": 2.0,
            "unemployment_monthly": 5.0,
            "interest_rate": 3.0,
        })

        return {
            "country_id": country_id,
            "country_name": self.COUNTRY_CONFIG.get(country_id, {}).get("name", country_id.upper()),
            "timestamp": datetime.utcnow().isoformat(),
            "data_source": "Fallback Data",
            "indicators": data,
            "cache_ttl": self.CACHE_CONFIG["economic"]["description"],
            "next_update": (datetime.utcnow() + timedelta(seconds=self.CACHE_CONFIG["economic"]["ttl"])).isoformat(),
            "cached": False,
        }

    async def get_stock_indices(self, country_id: str, use_cache: bool = True) -> Dict[str, Any]:
        """
        获取国家股指数据 (每 1 分钟更新)

        Data Source: Yahoo Finance
        Cache: 1 minute
        """
        # 检查缓存
        if use_cache and self._is_cache_valid("stock_indices", country_id):
            cached = self._get_cache("stock_indices", country_id)
            return {
                "country_id": country_id,
                "country_name": self.COUNTRY_CONFIG.get(country_id, {}).get("name", country_id.upper()),
                "timestamp": datetime.utcnow().isoformat(),
                "indices": cached,
                "source": "Yahoo Finance",
                "cache_ttl": self.CACHE_CONFIG["financial"]["description"],
                "cached": True
            }

        # 从 Yahoo Finance 获取
        result = yf_indices(country_id)
        indices = result.get("regions", {}).get(country_id, [])

        # 保存缓存
        self._set_cache("stock_indices", country_id, indices)

        return {
            "country_id": country_id,
            "country_name": self.COUNTRY_CONFIG.get(country_id, {}).get("name", country_id.upper()),
            "timestamp": datetime.utcnow().isoformat(),
            "indices": indices,
            "source": "Yahoo Finance",
            "cache_ttl": self.CACHE_CONFIG["financial"]["description"],
            "next_update": (datetime.utcnow() + timedelta(seconds=self.CACHE_CONFIG["financial"]["ttl"])).isoformat(),
            "cached": False
        }

    async def get_commodities(self, use_cache: bool = True) -> Dict[str, Any]:
        """
        获取大宗商品数据 (每 1 分钟更新)

        Data Source: Yahoo Finance
        Cache: 1 minute
        """
        # 检查缓存
        if use_cache and self._is_cache_valid("commodities"):
            cached = self._get_cache("commodities")
            cached["cached"] = True
            cached["timestamp"] = datetime.utcnow().isoformat()
            return cached

        # 从 Yahoo Finance 获取
        data = yf_commodities()

        # 添加元数据
        data["cache_ttl"] = self.CACHE_CONFIG["commodities"]["description"]
        data["next_update"] = (datetime.utcnow() + timedelta(seconds=self.CACHE_CONFIG["commodities"]["ttl"])).isoformat()
        data["cached"] = False

        # 保存缓存
        self._set_cache("commodities", None, data)

        return data

    async def get_currency_rates(self, use_cache: bool = True) -> Dict[str, Any]:
        """
        获取外汇汇率数据 (每 1 分钟更新)

        Data Source: Yahoo Finance
        Cache: 1 minute
        """
        # 检查缓存
        if use_cache and self._is_cache_valid("currency"):
            cached = self._get_cache("currency")
            cached["cached"] = True
            cached["timestamp"] = datetime.utcnow().isoformat()
            return cached

        # 从 Yahoo Finance 获取
        data = yf_currency()

        # 添加元数据
        data["cache_ttl"] = self.CACHE_CONFIG["currency"]["description"]
        data["next_update"] = (datetime.utcnow() + timedelta(seconds=self.CACHE_CONFIG["currency"]["ttl"])).isoformat()
        data["cached"] = False

        # 保存缓存
        self._set_cache("currency", None, data)

        return data

    async def get_country_data(self, country_id: str) -> Dict[str, Any]:
        """
        获取国家完整数据 (经济 + 股指)
        """
        # 获取经济数据 (24 小时缓存)
        economic_data = await self.get_country_economic_data(country_id)

        # 获取股指数据 (1 分钟缓存)
        indices_data = await self.get_stock_indices(country_id)

        # 统一数据源描述
        data_sources = []
        if country_id == "us":
            data_sources.append("FRED (Federal Reserve Economic Data)")
        elif country_id == "cn":
            data_sources.append("Tushare (中国财经数据接口)")
        else:
            data_sources.append("Fallback Data")
        data_sources.append("Yahoo Finance - Stock Indices")

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
            "data_source": "FRED + Tushare + Yahoo Finance",
            "economic_data_sources": {
                "us": "FRED (Federal Reserve Economic Data)",
                "cn": "Tushare (中国财经数据接口)",
                "others": "Fallback Data"
            },
            "financial_data_source": "Yahoo Finance (https://finance.yahoo.com/)",
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
            "data_source": "FRED + Tushare + Yahoo Finance",
            "economic_data_sources": {
                "us": "FRED (Federal Reserve Economic Data)",
                "cn": "Tushare (中国财经数据接口)",
                "others": "Fallback Data"
            },
            "financial_data_source": "Yahoo Finance (https://finance.yahoo.com/)",
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
                    "FRED - US Economic Data",
                    "Tushare - China Economic Data",
                    "Yahoo Finance - Stock Indices, Commodities, Currency",
                ],
                "last_updated": datetime.utcnow().isoformat()
            }
        }


# Global client
comprehensive_market_client = ComprehensiveMarketDataClient()


def get_comprehensive_market_client() -> ComprehensiveMarketDataClient:
    return comprehensive_market_client
