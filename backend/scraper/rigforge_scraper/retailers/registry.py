"""
Central retailer registry for RigForge Scraper.

This module serves as the single source of truth for all retailer configurations.
It controls which spiders are enabled, which require Playwright, and their configs.

Adding a new retailer:
1. Create spider in spiders/ directory
2. Add entry here with spider_class path
3. Set use_playwright=True for JS-heavy sites

Example:
    RETAILERS = {
        "newretailer": {
            "enabled": True,
            "use_playwright": False,
            "spider_class": "rigforge_scraper.spiders.newretailer.NewRetailerSpider",
            "display_name": "New Retailer",
            "playwright_config": None,
        },
    }
"""

from typing import Dict, Any, Type
from importlib import import_module


# =============================================================================
# Retailer Registry
# =============================================================================

RETAILERS: Dict[str, Dict[str, Any]] = {
    "startech": {
        "enabled": True,
        "use_playwright": False,
        "spider_class": "rigforge_scraper.spiders.startech.StartechSpider",
        "display_name": "Star Tech",
        "playwright_config": None,
    },
    "techland": {
        "enabled": True,
        "use_playwright": True,
        "spider_class": "rigforge_scraper.spiders.techland.TechlandSpider",
        "display_name": "Tech Land",
        "playwright_config": {
            "wait_until": "networkidle",
            "timeout": 30000,
        },
    },
    "skyland": {
        "enabled": True,
        "use_playwright": False,
        "spider_class": "rigforge_scraper.spiders.skyland.SkylandSpider",
        "display_name": "Skyland Computer",
        "playwright_config": None,
    },
    "ultratech": {
        "enabled": True,
        "use_playwright": False,
        "spider_class": "rigforge_scraper.spiders.ultratech.UltratechSpider",
        "display_name": "Ultra Technology",
        "playwright_config": None,
    },
    "potakait": {
        "enabled": True,
        "use_playwright": False,
        "spider_class": "rigforge_scraper.spiders.potakait.PotakaitSpider",
        "display_name": "Potaka IT",
        "playwright_config": None,
    },
}


# =============================================================================
# Registry Helper Functions
# =============================================================================

def get_enabled_retailers() -> Dict[str, Dict[str, Any]]:
    """Get all enabled retailers."""
    return {k: v for k, v in RETAILERS.items() if v.get("enabled", True)}


def get_playwright_retailers() -> Dict[str, Dict[str, Any]]:
    """Get retailers that require Playwright."""
    return {
        k: v for k, v in RETAILERS.items() 
        if v.get("enabled") and v.get("use_playwright")
    }


def get_standard_retailers() -> Dict[str, Dict[str, Any]]:
    """Get retailers that don't require Playwright (standard Scrapy)."""
    return {
        k: v for k, v in RETAILERS.items() 
        if v.get("enabled") and not v.get("use_playwright")
    }


def get_retailer_config(retailer_slug: str) -> Dict[str, Any]:
    """
    Get configuration for a specific retailer.
    
    Args:
        retailer_slug: The retailer identifier (e.g., 'startech')
        
    Returns:
        Retailer configuration dict
        
    Raises:
        ValueError: If retailer is not found in registry
    """
    config = RETAILERS.get(retailer_slug)
    if not config:
        available = ", ".join(RETAILERS.keys())
        raise ValueError(f"Unknown retailer: {retailer_slug}. Available: {available}")
    return config


def get_spider_class(retailer_slug: str) -> Type:
    """
    Dynamically import and return the spider class for a retailer.
    
    Args:
        retailer_slug: The retailer identifier (e.g., 'startech')
        
    Returns:
        Spider class for the retailer
        
    Raises:
        ValueError: If retailer is not found
        ImportError: If spider module/class cannot be imported
    """
    config = get_retailer_config(retailer_slug)
    
    module_path, class_name = config["spider_class"].rsplit(".", 1)
    module = import_module(module_path)
    return getattr(module, class_name)


def list_retailers() -> None:
    """Print a formatted list of all retailers."""
    print("\nAvailable Retailers:")
    print("-" * 50)
    for slug, config in RETAILERS.items():
        status = "✓" if config.get("enabled") else "✗"
        pw = "[Playwright]" if config.get("use_playwright") else "[Standard]"
        print(f"  {status} {slug:15} {pw:15} {config.get('display_name', slug)}")
    print("-" * 50)
