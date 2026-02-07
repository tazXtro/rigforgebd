"""
Supabase client singleton.

This module initializes the Supabase client ONCE and provides it to all repositories.

The httpx transport is configured with:
    - retries=3: Automatically retries on transient connection errors
      (WinError 10035 / WSAEWOULDBLOCK, resets, timeouts). This is
      handled at the TCP/HTTP layer, *before* any application code.
    - Generous connection pool to handle concurrent Django threads.

This single configuration protects ALL Supabase calls (PostgREST,
Auth, Storage, Functions) without needing per-method retry decorators.

Environment variables:
    SUPABASE_URL: Your Supabase project URL
    SUPABASE_KEY: Your Supabase anon/service key
"""

import logging
from functools import lru_cache

import httpx
from decouple import config
from supabase import create_client, Client, ClientOptions

logger = logging.getLogger(__name__)


def _create_httpx_client() -> httpx.Client:
    """
    Create an httpx.Client with transport-level retries and tuned pooling.
    
    httpx's retries param handles transient connection-level errors:
    - Connection refused / reset
    - Socket busy (WSAEWOULDBLOCK on Windows)
    - Network unreachable
    
    These retries happen at the TCP layer and are transparent to callers.
    They do NOT retry on HTTP 4xx/5xx — only on connection failures.
    """
    transport = httpx.HTTPTransport(
        retries=3,            # Retry up to 3 times on connection errors
        limits=httpx.Limits(
            max_connections=50,             # Handle concurrent Django threads
            max_keepalive_connections=25,   # Keep more alive for burst traffic
            keepalive_expiry=30,            # Seconds before idle conn is closed
        ),
    )
    
    return httpx.Client(
        transport=transport,
        timeout=httpx.Timeout(
            connect=10.0,     # Time to establish connection
            read=30.0,        # Time to read response
            write=10.0,       # Time to send request
            pool=10.0,        # Time to wait for a connection from pool
        ),
    )


@lru_cache(maxsize=1)
def get_supabase_client() -> Client:
    """
    Returns a singleton Supabase client instance.
    
    The client is initialized once and cached for subsequent calls.
    Uses lru_cache to ensure only one instance exists.
    
    The shared httpx.Client with transport-level retries is injected
    via ClientOptions, so all sub-clients (PostgREST, Auth, Storage)
    benefit from the same resilient transport configuration.
    """
    url: str = config("SUPABASE_URL")
    key: str = config("SUPABASE_KEY")
    
    options = ClientOptions(
        httpx_client=_create_httpx_client(),
    )
    
    logger.info("Initializing Supabase client with resilient httpx transport (retries=3)")
    return create_client(url, key, options=options)

