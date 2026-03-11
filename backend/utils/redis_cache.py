"""
Redis 緩存工具模塊
提供統一的 Redis 緩存接口
"""
import json
import redis
from typing import Any, Optional
from datetime import datetime
import os


class RedisCache:
    """Redis 緩存客戶端"""

    def __init__(self, host: str = 'localhost', port: int = 6379, db: int = 0):
        """
        初始化 Redis 連接
        
        Args:
            host: Redis 主機地址
            port: Redis 端口
            db: Redis 數據庫編號
        """
        self._host = host
        self._port = port
        self._db = db
        self._client: Optional[redis.Redis] = None
        self._connected = False

    def _get_client(self) -> Optional[redis.Redis]:
        """獲取 Redis 客戶端（延遲連接）"""
        if self._client is None:
            try:
                self._client = redis.Redis(
                    host=self._host,
                    port=self._port,
                    db=self._db,
                    decode_responses=True,
                    socket_connect_timeout=5,
                    socket_timeout=5
                )
                # 測試連接
                self._client.ping()
                self._connected = True
                print(f"✅ Redis connected: {self._host}:{self._port}")
            except Exception as e:
                print(f"⚠️ Redis connection failed: {e}")
                self._connected = False
                return None
        return self._client

    def get(self, key: str) -> Optional[Any]:
        """
        獲取緩存數據
        
        Args:
            key: 緩存鍵名
            
        Returns:
            緩存數據，如果不存在或過期返回 None
        """
        client = self._get_client()
        if not client:
            return None

        try:
            data = client.get(key)
            if data is None:
                return None
            
            # 嘗試解析 JSON
            try:
                return json.loads(data)
            except (json.JSONDecodeError, TypeError):
                return data
        except Exception as e:
            print(f"⚠️ Redis get error: {e}")
            return None

    def set(self, key: str, value: Any, ttl: int = 300) -> bool:
        """
        設置緩存數據
        
        Args:
            key: 緩存鍵名
            value: 緩存數據（會自動序列化為 JSON）
            ttl: 過期時間（秒），默认 5 分鐘
            
        Returns:
            是否設置成功
        """
        client = self._get_client()
        if not client:
            return False

        try:
            # 序列化數據
            if isinstance(value, (dict, list)):
                data = json.dumps(value, ensure_ascii=False, default=str)
            else:
                data = str(value)

            # 設置過期時間
            client.setex(key, ttl, data)
            return True
        except Exception as e:
            print(f"⚠️ Redis set error: {e}")
            return False

    def delete(self, key: str) -> bool:
        """刪除緩存"""
        client = self._get_client()
        if not client:
            return False

        try:
            client.delete(key)
            return True
        except Exception as e:
            print(f"⚠️ Redis delete error: {e}")
            return False

    def exists(self, key: str) -> bool:
        """檢查鍵是否存在"""
        client = self._get_client()
        if not client:
            return False

        try:
            return client.exists(key) > 0
        except Exception as e:
            print(f"⚠️ Redis exists error: {e}")
            return False

    def clear(self, pattern: str = "*") -> int:
        """
        清空緩存
        
        Args:
            pattern: 鍵名匹配模式
            
        Returns:
            清空的鍵數量
        """
        client = self._get_client()
        if not client:
            return 0

        try:
            keys = client.keys(pattern)
            if keys:
                return client.delete(*keys)
            return 0
        except Exception as e:
            print(f"⚠️ Redis clear error: {e}")
            return 0

    def get_stats(self) -> dict:
        """獲取 Redis 統計信息"""
        client = self._get_client()
        if not client:
            return {"connected": False}

        try:
            info = client.info('stats')
            keyspace = client.info('keyspace')
            return {
                "connected": True,
                "host": self._host,
                "port": self._port,
                "total_connections_received": info.get('total_connections_received', 0),
                "keys": sum(db.get('keys', 0) for db in keyspace.values())
            }
        except Exception as e:
            print(f"⚠️ Redis stats error: {e}")
            return {"connected": False, "error": str(e)}

    @property
    def is_connected(self) -> bool:
        """是否已連接"""
        return self._connected


# 全局 Redis 實例
_redis_cache: Optional[RedisCache] = None


def get_redis_cache() -> RedisCache:
    """獲取 Redis 緩存實例"""
    global _redis_cache
    if _redis_cache is None:
        # 從環境變量讀取配置
        host = os.getenv('REDIS_HOST', 'localhost')
        port = int(os.getenv('REDIS_PORT', '6379'))
        db = int(os.getenv('REDIS_DB', '0'))
        _redis_cache = RedisCache(host=host, port=port, db=db)
    return _redis_cache


# 便捷函數
def cache_get(key: str) -> Optional[Any]:
    """獲取緩存"""
    return get_redis_cache().get(key)


def cache_set(key: str, value: Any, ttl: int = 300) -> bool:
    """設置緩存"""
    return get_redis_cache().set(key, value, ttl)


def cache_delete(key: str) -> bool:
    """刪除緩存"""
    return get_redis_cache().delete(key)


def cache_exists(key: str) -> bool:
    """檢查緩存是否存在"""
    return get_redis_cache().exists(key)
