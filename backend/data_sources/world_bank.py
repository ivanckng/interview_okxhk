"""
World Bank Open Data API
Covers 200+ countries, free, no API key required
https://data.worldbank.org/
"""
import httpx
from typing import Dict, Any, List, Optional
from datetime import datetime


class WorldBankClient:
    """
    World Bank Open Data API Client
    Free, comprehensive economic data for 200+ countries
    """
    
    BASE_URL = "https://api.worldbank.org/v2"
    
    # Country codes mapping
    COUNTRIES = {
        "us": "USA",
        "cn": "CHN",
        "hk": "HKG",
        "eu": "EUU",  # European Union
        "uk": "GBR",
        "sg": "SGP",
        "jp": "JPN",
        "kr": "KOR",
        "de": "DEU",
        "fr": "FRA",
        "in": "IND",
        "br": "BRA",
        "ru": "RUS",
        "au": "AUS",
        "ca": "CAN",
    }
    
    # Indicator codes
    INDICATORS = {
        "gdp_growth": "NY.GDP.MKTP.KD.ZG",  # GDP growth (annual %)
        "gdp_current": "NY.GDP.MKTP.CD",     # GDP (current US$)
        "inflation": "FP.CPI.TOTL.ZG",       # Inflation, consumer prices (annual %)
        "unemployment": "SL.UEM.TOTL.ZS",    # Unemployment, total (% of total labor force)
        "population": "SP.POP.TOTL",         # Population, total
        "trade_gdp": "NE.TRD.GNFS.ZS",       # Trade (% of GDP)
        "fdi_inflow": "BX.KLT.DINV.WD.GD.ZS", # Foreign direct investment, net inflows (% of GDP)
        "exports": "NE.EXP.GNFS.ZS",         # Exports of goods and services (% of GDP)
        "imports": "NE.IMP.GNFS.ZS",         # Imports of goods and services (% of GDP)
        "gni_per_capita": "NY.GNP.PCAP.CD",  # GNI per capita, Atlas method (current US$)
        "ppp_conversion": "PA.NUS.PPP",      # PPP conversion factor, GDP
    }
    
    async def get_indicator(self, country_code: str, indicator: str, date: str = "2023") -> Optional[float]:
        """
        Get specific indicator for a country
        
        Args:
            country_code: ISO3 country code (e.g., 'USA', 'CHN')
            indicator: Indicator code from INDICATORS dict
            date: Year or range (e.g., '2023' or '2020:2023')
        """
        try:
            async with httpx.AsyncClient() as client:
                url = f"{self.BASE_URL}/country/{country_code}/indicator/{indicator}"
                response = await client.get(
                    url,
                    params={
                        "date": date,
                        "format": "json",
                        "per_page": 1,
                        "mrnev": 1  # Most recent non-empty value
                    },
                    timeout=30.0
                )
                response.raise_for_status()
                data = response.json()
                
                # World Bank returns [metadata, [data]]
                if len(data) > 1 and data[1]:
                    value = data[1][0].get("value")
                    return float(value) if value is not None else None
                return None
                
        except Exception as e:
            print(f"⚠️ World Bank API error for {country_code}/{indicator}: {e}")
            return None
    
    async def get_country_indicators(self, country_id: str) -> Dict[str, Any]:
        """
        Get all key indicators for a country
        """
        country_code = self.COUNTRIES.get(country_id, country_id.upper())
        
        indicators = {}
        
        # Fetch key indicators
        gdp_growth = await self.get_indicator(country_code, self.INDICATORS["gdp_growth"], "2020:2023")
        inflation = await self.get_indicator(country_code, self.INDICATORS["inflation"], "2020:2023")
        unemployment = await self.get_indicator(country_code, self.INDICATORS["unemployment"], "2020:2023")
        gdp_current = await self.get_indicator(country_code, self.INDICATORS["gdp_current"], "2020:2023")
        trade_gdp = await self.get_indicator(country_code, self.INDICATORS["trade_gdp"], "2020:2023")
        
        return {
            "country_code": country_id,
            "country_name": country_code,
            "gdp_growth_yoy": gdp_growth,
            "inflation_cpi_yoy": inflation,
            "unemployment_rate": unemployment,
            "gdp_current_usd": gdp_current,
            "trade_percent_gdp": trade_gdp,
            "data_source": "World Bank",
            "last_updated": datetime.utcnow().isoformat()
        }
    
    async def get_multi_country_data(self, country_ids: List[str]) -> Dict[str, Any]:
        """
        Get data for multiple countries
        """
        results = {}
        for country_id in country_ids:
            data = await self.get_country_indicators(country_id)
            results[country_id] = data
        return results
    
    async def get_country_list(self) -> List[Dict[str, str]]:
        """
        Get list of available countries
        """
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.BASE_URL}/country",
                    params={"format": "json", "per_page": 300},
                    timeout=30.0
                )
                response.raise_for_status()
                data = response.json()
                
                if len(data) > 1:
                    countries = [
                        {"id": c["id"], "name": c["name"], "iso2": c.get("iso2Code", "")}
                        for c in data[1]
                        if c.get("region", {}).get("id") != "NA"  # Exclude aggregates
                    ]
                    return countries
                return []
                
        except Exception as e:
            print(f"⚠️ Error fetching country list: {e}")
            return []


# Global client
world_bank_client = WorldBankClient()


def get_world_bank_client() -> WorldBankClient:
    return world_bank_client
