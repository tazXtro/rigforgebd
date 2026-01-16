# RigForge Scraper - Playwright Integration Guide

## 🎯 Overview

The RigForge scraper now supports both standard HTTP scraping (Scrapy) and JavaScript-heavy browser rendering (Playwright) in a unified architecture. This allows you to scrape both traditional e-commerce sites and modern JS-rendered sites without maintaining separate codebases.

## 🏗️ Architecture

### Hybrid Scraping Model

- **Standard Sites (Scrapy)**: Fast HTTP requests for sites with server-rendered HTML (e.g., StarTech)
- **JS-Heavy Sites (Playwright)**: Browser automation for sites requiring JavaScript rendering (e.g., Techland)
- **Hybrid Mode**: Per-request override to use Playwright for specific pages even in Scrapy spiders

### Key Components

1. **Base Spider** (`rigforge_scraper/spiders/base.py`)
   - Enhanced with Playwright support
   - `make_request()` helper for unified request creation
   - Playwright utilities (`scroll_page`, `click_element`)

2. **Retailer Registry** (`rigforge_scraper/retailers/registry.py`)
   - Central configuration for all retailers
   - Defines which retailers use Playwright vs Scrapy
   - Easy retailer management and filtering

3. **Orchestrator** (`scripts/run_retailers.py`)
   - CLI tool for running multiple retailers
   - Filter by mode (Playwright/Scrapy/All)
   - Graceful error handling

## 📦 Installation

### 1. Install Dependencies

```bash
cd backend/scraper
pip install scrapy-playwright
```

### 2. Install Playwright Browsers

```bash
playwright install chromium
```

## 🚀 Usage

### Running Individual Retailers

```bash
# Run StarTech (standard Scrapy)
python scripts/run_retailers.py --retailer startech --limit 10

# Run Techland (Playwright browser)
python scripts/run_retailers.py --retailer techland --limit 10

# Run with specific category
python scripts/run_retailers.py --retailer techland --category processor --limit 5

# Save to database
python scripts/run_retailers.py --retailer startech --save
```

### Running Multiple Retailers

```bash
# Run all enabled retailers
python scripts/run_retailers.py --all

# Run only Playwright retailers
python scripts/run_retailers.py --only-playwright

# Run only standard Scrapy retailers
python scripts/run_retailers.py --only-scrapy

# Run all and save to database
python scripts/run_retailers.py --all --save --limit 50
```

### Manual Spider Run (Development)

The original `run_spider.py` still works for manual testing:

```bash
python run_spider.py startech --limit 5
python run_spider.py startech --category graphics-card --save
```

## 🔧 Adding a New Retailer

### Step 1: Create Spider File

Create `rigforge_scraper/spiders/your_retailer.py`:

```python
from rigforge_scraper.spiders.base import BaseRetailerSpider

class YourRetailerSpider(BaseRetailerSpider):
    name = "your_retailer"
    retailer_slug = "your_retailer"
    base_url = "https://www.yourretailer.com"
    
    # Set to True if site uses heavy JavaScript
    use_playwright = False  # or True for JS-heavy sites
    
    # ... implement parse methods
```

### Step 2: Register in Registry

Add to `rigforge_scraper/retailers/registry.py`:

```python
RETAILERS = {
    # ... existing retailers
    
    "your_retailer": {
        "enabled": True,
        "spider_class": "rigforge_scraper.spiders.your_retailer.YourRetailerSpider",
        "use_playwright": False,  # or True
        "description": "Your Retailer - Description",
        "categories": ["processor", "graphics-card"],
        "concurrent_requests": 1,
        "download_delay": 2.0,
    },
}
```

### Step 3: Run Your Spider

```bash
python scripts/run_retailers.py --retailer your_retailer --limit 10
```

## 💡 Playwright Features

### Using Playwright in Your Spider

#### Option 1: Enable for Entire Spider

```python
class MySpider(BaseRetailerSpider):
    use_playwright = True  # All requests use browser
```

#### Option 2: Per-Request Override (Hybrid Mode)

```python
def parse(self, response):
    # This specific request uses Playwright
    yield self.make_request(
        url,
        callback=self.parse_detail,
        playwright=True,
        wait_for_selector=".product-loaded"
    )
```

### Advanced Playwright Usage

#### Wait for Specific Selector

```python
yield self.make_request(
    url,
    wait_for_selector=".products-loaded",
    playwright=True
)
```

#### Scroll Page (Trigger Lazy Loading)

```python
meta = {
    'playwright': True,
    'playwright_page_methods': [
        self.scroll_page(),
    ]
}
yield scrapy.Request(url, meta=meta)
```

#### Click Elements

```python
meta = {
    'playwright': True,
    'playwright_page_methods': [
        self.click_element('.load-more-btn'),
    ]
}
yield scrapy.Request(url, meta=meta)
```

## ⚙️ Configuration

### Scrapy Settings (`rigforge_scraper/settings.py`)

Key Playwright settings:

```python
PLAYWRIGHT_BROWSER_TYPE = "chromium"
PLAYWRIGHT_LAUNCH_OPTIONS = {"headless": True}
PLAYWRIGHT_DEFAULT_NAVIGATION_TIMEOUT = 30000
PLAYWRIGHT_ABORT_REQUEST = lambda req: req.resource_type in ["image", "stylesheet", "font", "media"]
PLAYWRIGHT_MAX_CONTEXTS = 4
```

### Spider-Level Settings

Override in your spider:

```python
custom_settings = {
    "DOWNLOAD_DELAY": 3.0,
    "CONCURRENT_REQUESTS": 2,
}
```

## 📊 Performance Optimization

### Resource Blocking

The scraper automatically blocks images, stylesheets, fonts, and media files when using Playwright to improve performance:

```python
PLAYWRIGHT_ABORT_REQUEST = lambda req: req.resource_type in ["image", "stylesheet", "font", "media"]
```

### Concurrency

- **Scrapy spiders**: Higher concurrency (8-16 concurrent requests)
- **Playwright spiders**: Lower concurrency (2-4 concurrent requests) due to browser overhead

## 🔍 Debugging

### Enable Debug Logging

```python
# In settings.py
LOG_LEVEL = "DEBUG"
```

### Headed Mode (See Browser)

For debugging, run browser in headed mode:

```python
# Temporarily in settings.py
PLAYWRIGHT_LAUNCH_OPTIONS = {
    "headless": False,  # Show browser
}
```

### Check Request Mode

Logs will show which mode is being used:

```
DEBUG: Creating Playwright request for: https://...
DEBUG: Creating standard Scrapy request for: https://...
```

## 📝 Registry Reference

### Retailer Configuration Schema

```python
{
    "enabled": bool,              # Enable/disable retailer
    "spider_class": str,          # Full import path to spider class
    "use_playwright": bool,       # Use browser rendering?
    "description": str,           # Human-readable description
    "categories": [str],          # Supported categories
    "concurrent_requests": int,   # Max concurrent requests
    "download_delay": float,      # Delay between requests (seconds)
    "playwright_options": {       # Optional Playwright-specific config
        "wait_for_selector": str,
        "page_goto_timeout": int,
    }
}
```

## 🚨 Troubleshooting

### "Playwright not installed"

```bash
pip install scrapy-playwright
playwright install chromium
```

### "Browser launch timeout"

Increase timeout in settings:

```python
PLAYWRIGHT_LAUNCH_OPTIONS = {"timeout": 60000}
```

### "No products found"

1. Check selectors match the actual HTML structure
2. Enable headed mode to see what's happening
3. Check if page requires additional wait time

### Import errors with registry

Ensure `retailers/__init__.py` exists and imports are correct.

## 🎓 Examples

### Example 1: Standard Scrapy Spider (StarTech)

```python
class StartechSpider(BaseRetailerSpider):
    use_playwright = False  # Standard HTTP
    
    def parse(self, response):
        products = response.css(".p-item")
        for card in products:
            yield self.create_product_item(...)
```

### Example 2: Playwright Spider (Techland)

```python
class TechlandSpider(BaseRetailerSpider):
    use_playwright = True  # Browser rendering
    
    def start_requests(self):
        yield self.make_request(
            url,
            wait_for_selector=".product-card"
        )
```

### Example 3: Hybrid Spider

```python
class HybridSpider(BaseRetailerSpider):
    use_playwright = False  # Default to Scrapy
    
    def parse(self, response):
        # Most pages use Scrapy
        yield self.make_request(detail_url)
        
        # But specs page needs JavaScript
        yield self.make_request(
            specs_url,
            playwright=True,  # Override for this request
            callback=self.parse_specs
        )
```

## 📚 Additional Resources

- **Scrapy Documentation**: https://docs.scrapy.org/
- **Playwright Documentation**: https://playwright.dev/
- **scrapy-playwright**: https://github.com/scrapy-plugins/scrapy-playwright

## ✅ Best Practices

1. **Use Scrapy by default** - Only use Playwright when necessary (JS-heavy sites)
2. **Block resources** - Keep resource blocking enabled for performance
3. **Limit concurrency** - Keep Playwright concurrent requests low (2-4)
4. **Test thoroughly** - Always test with `--limit 10` before full scrape
5. **Monitor performance** - Track execution times and adjust settings
6. **Graceful degradation** - Handle errors gracefully, don't crash entire run
7. **Respect robots.txt** - Keep `ROBOTSTXT_OBEY = True`
8. **Rate limiting** - Use appropriate `DOWNLOAD_DELAY` values

---

**Need Help?** Check the implementation plan or contact the development team.
