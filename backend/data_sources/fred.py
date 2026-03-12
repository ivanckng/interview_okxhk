"""
FRED API Client (Federal Reserve Economic Data)
https://fred.stlouisfed.org/docs/api/fred/
Free tier: 120 requests per minute
"""
import os
import httpx
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
from utils.cache import get_market_cache


class FredClient:
    """
    FRED API Client for US economic indicators
    """

    BASE_URL = "https://api.stlouisfed.org/fred"

    # FRED Series IDs for key economic indicators
    SERIES = {
        "gdp_annual": "GDP",  # Gross Domestic Product (Nominal, for raw value)
        "gdp_quarterly": "GDPC1",  # Real Gross Domestic Product (Chained Dollars, for growth rate)
        "cpi": "CPIAUCSL",  # Consumer Price Index for All Urban Consumers
        "ppi": "PPIACO",  # Producer Price Index for All Commodities
        "unemployment": "UNRATE",  # Unemployment Rate
    }

    def __init__(self):
        self.api_key = os.getenv("FRED_API_KEY")
        self._cache = get_market_cache()

    def _get_cache_key(self) -> str:
        """Generate cache key"""
        return "fred_us_indicators"

    def _should_refresh_cache(self, cached_data: Any) -> bool:
        """
        Check if cache should be refreshed
        Refresh daily at 9:00 AM HKT (UTC+8)
        """
        if not cached_data:
            return True
        
        cached_at = cached_data.get("cached_at")
        if not cached_at:
            return True
        
        try:
            cached_time = datetime.fromisoformat(cached_at)
            now_hkt = datetime.utcnow() + timedelta(hours=8)
            
            if now_hkt.date() > cached_time.date():
                return True
            if now_hkt.hour >= 9 and cached_time.hour < 9:
                return True
            
            return False
        except:
            return True

    async def get_us_indicators(self) -> Dict[str, Any]:
        """
        Get all US economic indicators from FRED
        """
        cache_key = self._get_cache_key()

        # Check cache first
        cached = self._cache.get(cache_key)
        if cached and isinstance(cached, dict) and not self._should_refresh_cache(cached):
            print(f"✅ Using cached FRED data")
            return cached

        print(f"📊 Fetching FRED economic data...")

        try:
            async with httpx.AsyncClient() as client:
                indicators = {}

                # Get Real GDP for growth rate (GDPC1)
                gdp_growth = await self._get_gdp_growth(client, "q")
                if gdp_growth:
                    # Annual uses year only, quarterly uses year + quarter
                    indicators["gdp_annual"] = {
                        **gdp_growth,
                        "period": str(gdp_growth["year"])  # Just year for annual
                    }
                    indicators["gdp_quarterly"] = gdp_growth

                # Get Nominal GDP for absolute value
                nominal_gdp = await self._get_nominal_gdp(client)
                if nominal_gdp and gdp_growth:
                    # Add raw_value to GDP indicators
                    indicators["gdp_annual"]["raw_value"] = nominal_gdp
                    indicators["gdp_quarterly"]["raw_value"] = nominal_gdp

                # CPI (YoY percent change)
                cpi = await self._get_series_data(client, "CPIAUCSL", "m", percent_change=True)
                if cpi:
                    indicators["cpi"] = cpi

                # PPI (YoY percent change)
                ppi = await self._get_series_data(client, "PPIACO", "m", percent_change=True)
                if ppi:
                    indicators["ppi"] = ppi

                # Unemployment Rate (already in percent)
                unemployment = await self._get_series_data(client, "UNRATE", "m")
                if unemployment:
                    indicators["unemployment"] = unemployment

                result = {
                    "country": "us",
                    "country_name": "United States",
                    "indicators": indicators,
                    "data_source": "FRED",
                    "cached_at": datetime.utcnow().isoformat(),
                }

                # Cache the data
                self._cache.set(cache_key, result, ttl=86400)  # 24 hours
                print(f"✅ Cached FRED data")

                return result

        except Exception as e:
            print(f"⚠️ FRED API error: {e}")
            return {
                "error": str(e),
                "country": "us",
                "indicators": {}
            }

    async def _get_nominal_gdp(self, client: httpx.AsyncClient) -> Optional[float]:
        """
        Get latest nominal GDP value in trillions
        """
        try:
            params = {
                "series_id": "GDP",
                "api_key": self.api_key,
                "file_type": "json",
                "limit": 5,
                "sort_order": "desc",
            }

            response = await client.get(
                f"{self.BASE_URL}/series/observations",
                params=params,
                timeout=30.0
            )
            response.raise_for_status()
            data = response.json()

            observations = data.get("observations", [])
            for obs in observations:
                val = obs.get("value")
                if val and val != ".":
                    # Convert from billions to trillions
                    return round(float(val) / 1000, 2)
            
            return None

        except Exception as e:
            print(f"⚠️ FRED nominal GDP error: {e}")
            return None

    async def _get_gdp_growth(
        self, 
        client: httpx.AsyncClient, 
        frequency: str = "q",
        series_id: str = "GDPC1"  # Use real GDP by default
    ) -> Optional[Dict[str, Any]]:
        """
        Calculate GDP growth rate (YoY for annual, QoQ annualized for quarterly)
        """
        try:
            params = {
                "series_id": series_id,
                "api_key": self.api_key,
                "file_type": "json",
                "limit": 5,  # Get 5 quarters for YoY calculation
                "sort_order": "desc",
            }

            response = await client.get(
                f"{self.BASE_URL}/series/observations",
                params=params,
                timeout=30.0
            )
            response.raise_for_status()
            data = response.json()

            observations = data.get("observations", [])
            valid_obs = [o for o in observations if o.get("value") and o.get("value") != "."]
            
            if len(valid_obs) < 2:
                return None

            # Find latest non-zero value
            latest = None
            latest_value = None
            latest_date_str = None
            latest_date_obj = None
            
            for obs in valid_obs:
                val = float(obs.get("value", 0))
                if val != 0:
                    latest = obs
                    latest_value = val
                    latest_date_str = obs.get("date", "")
                    latest_date_obj = datetime.strptime(latest_date_str, "%Y-%m-%d")
                    break
            
            if latest is None:
                return None

            # Calculate YoY growth (compare to same quarter last year)
            year_ago_value = None
            for obs in valid_obs:
                obs_date = datetime.strptime(obs.get("date", ""), "%Y-%m-%d")
                if latest_date_obj and obs_date:
                    months_diff = (latest_date_obj.year - obs_date.year) * 12 + (latest_date_obj.month - obs_date.month)
                    if months_diff >= 11 and months_diff <= 13:  # Approximately 12 months
                        val = float(obs.get("value", 0))
                        if val != 0:
                            year_ago_value = val
                            break
            
            if year_ago_value and year_ago_value > 0:
                growth_rate = ((latest_value - year_ago_value) / year_ago_value) * 100
            else:
                growth_rate = 0

            # Format period
            if frequency == 'a':
                period = str(latest_date_obj.year)
            else:
                quarter = (latest_date_obj.month - 1) // 3 + 1
                period = f"{latest_date_obj.year} Q{quarter}"

            return {
                "value": round(growth_rate, 1),
                "raw_value": round(latest_value / 1000, 2),  # Convert to billions
                "period": period,
                "year": latest_date_obj.year,
                "date": latest_date_str,
                "unit": "%",
                "source": "FRED",
            }

        except Exception as e:
            print(f"⚠️ FRED GDP growth error: {e}")
            return None

    async def _get_series_data(
        self, 
        client: httpx.AsyncClient, 
        series_id: str, 
        frequency: str = "m",
        percent_change: bool = False
    ) -> Optional[Dict[str, Any]]:
        """
        Get data for a specific FRED series
        frequency: 'd' (daily), 'w' (weekly), 'm' (monthly), 'q' (quarterly), 'a' (annual)
        percent_change: If True, calculate year-over-year percent change
        """
        try:
            # Get latest observations (need 2 for percent change calculation)
            params = {
                "series_id": series_id,
                "api_key": self.api_key,
                "file_type": "json",
                "limit": 13 if percent_change else 5,  # Get more for finding non-zero values
                "sort_order": "desc",  # Get latest first
            }

            response = await client.get(
                f"{self.BASE_URL}/series/observations",
                params=params,
                timeout=30.0
            )
            response.raise_for_status()
            data = response.json()

            observations = data.get("observations", [])
            if not observations:
                return None

            # Filter out missing values (".")
            valid_obs = [o for o in observations if o.get("value") and o.get("value") != "."]
            if not valid_obs:
                return None

            # Find latest non-zero value
            latest = None
            latest_date_str = None
            latest_date_obj = None
            latest_value = None
            
            for obs in valid_obs:
                value = float(obs.get("value", 0))
                if value != 0:
                    latest = obs
                    latest_value = value
                    latest_date_str = obs.get("date", "")
                    latest_date_obj = datetime.strptime(latest_date_str, "%Y-%m-%d")
                    break
            
            if latest is None or latest_value is None:
                return None

            # Calculate percent change if needed
            if percent_change:
                # Find non-zero value from 12 months ago for YoY comparison
                year_ago_value = None
                for obs in valid_obs:
                    obs_date = datetime.strptime(obs.get("date", ""), "%Y-%m-%d")
                    if latest_date_obj and obs_date:
                        months_diff = (latest_date_obj.year - obs_date.year) * 12 + (latest_date_obj.month - obs_date.month)
                        if months_diff >= 11 and months_diff <= 13:  # Approximately 12 months
                            val = float(obs.get("value", 0))
                            if val != 0:
                                year_ago_value = val
                                break
                
                if year_ago_value and year_ago_value > 0:
                    value = ((latest_value - year_ago_value) / year_ago_value) * 100
                else:
                    value = latest_value
            else:
                value = latest_value

            # Parse date and format period
            if frequency == 'a':
                period = str(latest_date_obj.year)
            elif frequency == 'q':
                quarter = (latest_date_obj.month - 1) // 3 + 1
                period = f"{latest_date_obj.year} Q{quarter}"
            else:  # monthly
                month = latest_date_obj.strftime("%b")
                period = f"{latest_date_obj.year} {month}"

            return {
                "value": round(value, 1),
                "raw_value": round(latest_value, 2) if percent_change else None,  # Store raw value for GDP
                "period": period,
                "year": latest_date_obj.year,
                "date": latest_date_str,
                "unit": "%",
                "source": "FRED",
            }

        except Exception as e:
            print(f"⚠️ FRED series {series_id} error: {e}")
            return None


# Global client
fred_client = FredClient()


def get_fred_client() -> FredClient:
    return fred_client
