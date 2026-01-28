"""
Scrapy settings for rigforge_scraper project.

Configured for ethical, production-ready scraping of Bangladesh retailers.
"""

BOT_NAME = "rigforge_scraper"

SPIDER_MODULES = ["rigforge_scraper.spiders"]
NEWSPIDER_MODULE = "rigforge_scraper.spiders"

# Crawl responsibly by identifying yourself
USER_AGENT = "RigForgeBD Price Comparison Bot (+https://rigforgebd.com)"

# Obey robots.txt rules
ROBOTSTXT_OBEY = True

# Configure maximum concurrent requests
CONCURRENT_REQUESTS = 1
CONCURRENT_REQUESTS_PER_DOMAIN = 1

# Configure download delay (2 seconds between requests)
DOWNLOAD_DELAY = 2.0
RANDOMIZE_DOWNLOAD_DELAY = True

# Disable cookies (enabled by default)
COOKIES_ENABLED = True

# Enable AutoThrottle extension
AUTOTHROTTLE_ENABLED = True
AUTOTHROTTLE_START_DELAY = 2.0
AUTOTHROTTLE_MAX_DELAY = 10.0
AUTOTHROTTLE_TARGET_CONCURRENCY = 1.0
AUTOTHROTTLE_DEBUG = False

# Configure retry settings
RETRY_ENABLED = True
RETRY_TIMES = 3
RETRY_HTTP_CODES = [500, 502, 503, 504, 408, 429]

# Enable caching for development (disable in production)
HTTPCACHE_ENABLED = False
HTTPCACHE_EXPIRATION_SECS = 3600
HTTPCACHE_DIR = "httpcache"

# Configure pipelines
# Note: SupabaseIngestionPipeline and CompatibilityExtractionPipeline are 
# enabled dynamically via --save flag in run_spider.py
ITEM_PIPELINES = {
    "rigforge_scraper.pipelines.CleaningPipeline": 100,
    "rigforge_scraper.pipelines.ValidationPipeline": 200,
    # "rigforge_scraper.pipelines.SupabaseIngestionPipeline": 300,  # Enabled via --save
    # "rigforge_scraper.pipelines.CompatibilityExtractionPipeline": 400,  # Runs after ingestion
}

# Logging
LOG_LEVEL = "INFO"
LOG_FORMAT = "%(asctime)s [%(name)s] %(levelname)s: %(message)s"

# Request fingerprinting (for deduplication)
REQUEST_FINGERPRINTER_IMPLEMENTATION = "2.7"

# Twisted reactor (for Windows compatibility)
TWISTED_REACTOR = "twisted.internet.asyncioreactor.AsyncioSelectorReactor"

# Feed export encoding
FEED_EXPORT_ENCODING = "utf-8"

# Custom settings for our scrapers
STARTECH_START_URLS = [
    "https://www.startech.com.bd/component/processor",
    "https://www.startech.com.bd/component/graphics-card",
    "https://www.startech.com.bd/component/motherboard",
    "https://www.startech.com.bd/component/ram",
    "https://www.startech.com.bd/component/ssd-hard-disk",
    "https://www.startech.com.bd/component/power-supply",
    "https://www.startech.com.bd/component/casing",
    "https://www.startech.com.bd/component/CPU-Cooler",
]

# Category mappings for normalization
CATEGORY_MAPPINGS = {
    "processor": "Processors",
    "graphics-card": "Graphics Cards",
    "motherboard": "Motherboards",
    "ram": "Memory",
    "ssd-hard-disk": "Storage",
    "power-supply": "Power Supply",
    "casing": "Cases",
    "cpu-cooler": "Cooling",
    "monitor": "Monitors",
    "laptop-notebook": "Laptops",
}

# =============================================================================
# Playwright Configuration (for JS-heavy sites like Techland)
# =============================================================================

# Download handlers for Playwright
# These replace Scrapy's default handlers to enable Playwright rendering
DOWNLOAD_HANDLERS = {
    "http": "scrapy_playwright.handler.ScrapyPlaywrightDownloadHandler",
    "https": "scrapy_playwright.handler.ScrapyPlaywrightDownloadHandler",
}

# Browser type: chromium, firefox, or webkit
PLAYWRIGHT_BROWSER_TYPE = "chromium"

# Browser launch options
PLAYWRIGHT_LAUNCH_OPTIONS = {
    "headless": True,
}

# Default browser context options
PLAYWRIGHT_CONTEXTS = {
    "default": {
        "viewport": {"width": 1920, "height": 1080},
        "ignore_https_errors": True,
    },
}

# Default navigation timeout (in milliseconds)
PLAYWRIGHT_DEFAULT_NAVIGATION_TIMEOUT = 30000

# Maximum number of pages per browser context
PLAYWRIGHT_MAX_PAGES_PER_CONTEXT = 4

