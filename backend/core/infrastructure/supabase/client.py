"""
Supabase client singleton.

This module initializes the Supabase client ONCE and provides it to all repositories.
Environment variables:
    SUPABASE_URL: Your Supabase project URL
    SUPABASE_KEY: Your Supabase anon/service key
"""

from functools import lru_cache
from decouple import config
from supabase import create_client, Client


@lru_cache(maxsize=1)
def get_supabase_client() -> Client:
    """
    Returns a singleton Supabase client instance.
    
    The client is initialized once and cached for subsequent calls.
    Uses lru_cache to ensure only one instance exists.
    
    Note: This function is lazy - the client is only created when
    this function is first called, not at import time.
    """
    url: str = config("SUPABASE_URL")
    key: str = config("SUPABASE_KEY")
    return create_client(url, key)

