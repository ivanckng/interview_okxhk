"""
Shared cloud cache helpers.

Provides:
- Redis-first shared cache reads
- local memory fallback
- stale-while-revalidate support
- lightweight background refresh locks
"""
from __future__ import annotations

import asyncio
from datetime import datetime
from typing import Any, Awaitable, Callable, Optional

from utils.redis_cache import cache_delete, cache_get, cache_set, cache_set_if_absent

_local_refresh_locks: set[str] = set()


def _get_cached_at(payload: Any) -> Optional[str]:
    if not isinstance(payload, dict):
        return None
    return payload.get("cached_at") or payload.get("last_updated")


def cache_age_seconds(payload: Any) -> Optional[float]:
    cached_at = _get_cached_at(payload)
    if not cached_at:
        return None

    try:
        normalized = cached_at.replace("Z", "+00:00")
        cached_time = datetime.fromisoformat(normalized)
        if cached_time.tzinfo is not None:
            cached_time = cached_time.astimezone().replace(tzinfo=None)
        return (datetime.utcnow() - cached_time).total_seconds()
    except Exception:
        return None


def read_shared_cache(cache_key: str, local_cache: Any | None = None, local_key: str | None = None) -> Any | None:
    cached = cache_get(cache_key)
    if cached is not None:
        return cached

    if local_cache is None:
        return None

    return local_cache.get(local_key or cache_key)


def write_shared_cache(
    cache_key: str,
    payload: Any,
    ttl: int,
    local_cache: Any | None = None,
    local_key: str | None = None,
) -> Any:
    if isinstance(payload, dict) and not _get_cached_at(payload):
        payload = {**payload, "cached_at": datetime.utcnow().isoformat()}

    cache_set(cache_key, payload, ttl)

    if local_cache is not None:
        local_cache.set(local_key or cache_key, payload, ttl=ttl)

    return payload


def is_fresh(payload: Any, ttl: int) -> bool:
    age = cache_age_seconds(payload)
    return age is not None and age <= ttl


def is_serveable_stale(payload: Any, max_stale_ttl: int) -> bool:
    age = cache_age_seconds(payload)
    return age is not None and age <= max_stale_ttl


def try_acquire_refresh_lock(lock_key: str, ttl: int = 120) -> bool:
    if cache_set_if_absent(lock_key, "1", ttl):
        return True

    if lock_key in _local_refresh_locks:
        return False

    _local_refresh_locks.add(lock_key)
    return True


def release_refresh_lock(lock_key: str) -> None:
    cache_delete(lock_key)
    _local_refresh_locks.discard(lock_key)


def schedule_stale_refresh(
    lock_key: str,
    refresh_coro_factory: Callable[[], Awaitable[Any]],
    ttl: int = 120,
) -> bool:
    if not try_acquire_refresh_lock(lock_key, ttl):
        return False

    async def _runner():
        try:
            await refresh_coro_factory()
        except Exception as e:
            print(f"⚠️ Background refresh failed for {lock_key}: {e}")
        finally:
            release_refresh_lock(lock_key)

    asyncio.create_task(_runner())
    return True
