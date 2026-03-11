"""
定時任務調度器 - 每天早上 7 點刷新所有緩存
"""
import asyncio
from datetime import datetime
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from typing import Callable, Any

from utils.cache import get_news_cache, get_market_cache, get_highlight_cache


class CacheScheduler:
    """緩存定時刷新調度器"""

    def __init__(self):
        self.scheduler = AsyncIOScheduler()
        self._last_refresh = None
        self._refresh_callbacks: list[Callable] = []

    def register_refresh_callback(self, callback: Callable):
        """註冊刷新回調函數"""
        self._refresh_callbacks.append(callback)

    async def global_refresh(self):
        """全局刷新所有緩存"""
        print(f"\n{'='*60}")
        print(f"⏰ [{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] 開始全局緩存刷新")
        print(f"{'='*60}")

        try:
            # 清空舊緩存
            print("🗑️  清空新聞緩存...")
            get_news_cache().clear()

            print("🗑️  清空市場緩存...")
            get_market_cache().clear()

            print("🗑️  清空摘要緩存...")
            get_highlight_cache().clear()

            # 執行所有註冊的刷新回調
            for callback in self._refresh_callbacks:
                try:
                    if asyncio.iscoroutinefunction(callback):
                        await callback()
                    else:
                        callback()
                except Exception as e:
                    print(f"⚠️  回調執行失敗：{e}")

            # 預熱加密貨幣價格緩存
            print("🔥 預熱加密貨幣價格緩存...")
            try:
                from data_sources.crypto_prices import get_crypto_price_client
                from data_sources.comprehensive_market import get_comprehensive_market_client
                
                crypto_client = get_crypto_price_client()
                prices = await crypto_client.get_top_coins(20)
                global_data = await crypto_client.get_global_data()
                
                get_market_cache().set("crypto_prices_20", {
                    "coins": prices,
                    "global": global_data,
                }, ttl=300)  # 5 分鐘 TTL
                
                print(f"✅ 預熱 {len(prices)} 個加密貨幣價格")
            except Exception as e:
                print(f"⚠️  加密貨幣價格預熱失敗：{e}")

            self._last_refresh = datetime.now()
            print(f"✅ [{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] 全局緩存刷新完成")
            print(f"{'='*60}\n")

        except Exception as e:
            print(f"❌ 全局緩存刷新失敗：{e}")

    def start(self, refresh_hour: int = 7):
        """啟動定時任務"""
        # 每天早上 7 點執行全局刷新
        self.scheduler.add_job(
            self.global_refresh,
            CronTrigger(hour=refresh_hour, minute=0, second=0),
            id='global_refresh',
            name='每天早上 7 點全局刷新緩存',
            replace_existing=True
        )

        # 啟動時立即執行一次（如果接近 7 點或剛過 7 點）
        now = datetime.now()
        if now.hour >= refresh_hour:
            # 如果已經過了今天的 7 點，且距離不超過 1 小時，立即執行
            if now.hour == refresh_hour and now.minute < 60:
                print("🚀 檢測到啟動時間接近刷新時間，立即執行一次全局刷新...")
                asyncio.create_task(self.global_refresh())

        self.scheduler.start()
        print(f"⏰ 定時任務已啟動：每天早上 {refresh_hour}:00 刷新所有緩存")

    def shutdown(self):
        """關閉調度器"""
        self.scheduler.shutdown()

    def get_last_refresh(self) -> datetime | None:
        """獲取上次刷新時間"""
        return self._last_refresh


# 全局實例
_scheduler: CacheScheduler | None = None


def get_scheduler() -> CacheScheduler:
    """獲取定時調度器實例"""
    global _scheduler
    if _scheduler is None:
        _scheduler = CacheScheduler()
    return _scheduler


def init_scheduler(refresh_hour: int = 7):
    """初始化並啟動定時調度器"""
    scheduler = get_scheduler()
    scheduler.start(refresh_hour)
    return scheduler
