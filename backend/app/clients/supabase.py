import threading

from supabase import Client, create_client

from app.config import settings

_local = threading.local()


def get_supabase() -> Client:
    """One client per thread. The client multiplexes every request over a
    single HTTP/2 connection whose state is not thread-safe: shared by the
    enrichment scrapers or by two jobs running at once, requests fail with
    « Resource temporarily unavailable » or « deque mutated during
    iteration »."""
    client = getattr(_local, "client", None)
    if client is None:
        client = _local.client = create_client(
            settings.supabase_url, settings.supabase_service_role_key
        )
    return client
