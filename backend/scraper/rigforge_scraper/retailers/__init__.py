"""
Retailers package for RigForge Scraper.

Provides central registry for all retailer configurations.
"""

from rigforge_scraper.retailers.registry import (
    RETAILERS,
    get_enabled_retailers,
    get_playwright_retailers,
    get_standard_retailers,
    get_retailer_config,
    get_spider_class,
    list_retailers,
)

__all__ = [
    "RETAILERS",
    "get_enabled_retailers",
    "get_playwright_retailers",
    "get_standard_retailers",
    "get_retailer_config",
    "get_spider_class",
    "list_retailers",
]
