"""
Central registry for all retailer scrapers.

This registry serves as the single source of truth for:
- Which retailers are enabled
- Spider class to use
- Playwright vs Scrapy configuration  
- Retailer-specific settings

To add a new retailer:
1. Implement spider class in spiders/
2. Add entry to RETAILERS dict below
3. Run: python scripts/run_retailers.py --retailer your_retailer_name
"""
import logging

logger = logging.getLogger(__name__)

RETAILERS = {
    "startech": {
        "enabled": True,
        "spider_class": "rigforge_scraper.spiders.startech.StartechSpider",
        "use_playwright": False,  # Standard HTTP works fine
        "description": "Star Tech - Bangladesh's largest PC retailer",
        "categories": [
            "processor", "graphics-card", "motherboard", "ram",
            "storage", "power-supply", "casing", "cooling", "monitor"
        ],
        "concurrent_requests": 1,
        "download_delay": 2.0,
    },
    
    "techland": {
        "enabled": True,
        "spider_class": "rigforge_scraper.spiders.techland.TechlandSpider",
        "use_playwright": True,  # JS-heavy site requires browser
        "description": "Techland - JS-rendered e-commerce site",
        "categories": [
            "processor", "graphics-card", "motherboard", "ram", "storage"
        ],
        "concurrent_requests": 2,
        "download_delay": 3.0,
        "playwright_options": {
            "wait_for_selector": ".product-card",  # Wait for products to load
            "page_goto_timeout": 30000,
        },
    },
    
    # Template for adding new retailers:
    # "retailer_slug": {
    #     "enabled": True,
    #     "spider_class": "rigforge_scraper.spiders.retailer_slug.RetailerSpider",
    #     "use_playwright": False,  # Set True if JS-heavy
    #     "description": "Retailer name and description",
    #     "categories": ["processor", "graphics-card"],  # Supported categories
    #     "concurrent_requests": 1,
    #     "download_delay": 2.0,
    #     "playwright_options": {},  # Optional Playwright config
    # },
}


def get_retailer_config(retailer_name: str) -> dict:
    """
    Get configuration for a specific retailer.
    
    Args:
        retailer_name: Retailer slug (e.g., 'startech')
        
    Returns:
        Retailer configuration dict
        
    Raises:
        KeyError: If retailer not found in registry
    """
    if retailer_name not in RETAILERS:
        available = ", ".join(RETAILERS.keys())
        raise KeyError(
            f"Retailer '{retailer_name}' not found in registry. "
            f"Available retailers: {available}"
        )
    return RETAILERS[retailer_name]


def get_enabled_retailers() -> dict:
    """
    Get all enabled retailers.
    
    Returns:
        Dict of enabled retailers {name: config}
    """
    return {
        name: config
        for name, config in RETAILERS.items()
        if config.get("enabled", False)
    }


def get_playwright_retailers() -> dict:
    """
    Get retailers that use Playwright.
    
    Returns:
        Dict of Playwright-enabled retailers {name: config}
    """
    return {
        name: config
        for name, config in get_enabled_retailers().items()
        if config.get("use_playwright", False)
    }


def get_scrapy_retailers() -> dict:
    """
    Get retailers that use standard Scrapy.
    
    Returns:
        Dict of Scrapy-only retailers {name: config}
    """
    return {
        name: config
        for name, config in get_enabled_retailers().items()
        if not config.get("use_playwright", False)
    }
