# Scraping Setup & Status

## Current Status

### ✅ Star Tech (startech.com.bd)
- **Status**: Working
- **Method**: Scrapy with CSS selectors
- **Products Found**: ~20 GPUs per page
- **Command**: `python manage.py scrape_products --retailer=startech`

### ⚠️ Techland (techlandbd.com)
- **Status**: Requires Selenium/Playwright
- **Issue**: Site uses JavaScript to load products
- **Current Scraper**: Won't work (finds 0 products)
- **Solution Needed**: Use Selenium or Scrapy-Playwright

## Running Scrapers

### Scrape Star Tech GPUs
```bash
cd backend
venv\Scripts\activate
python manage.py scrape_products --retailer=startech
```

### Check Scraped Data
```bash
python manage.py shell
```
```python
from products.models import Product
Product.objects.count()  # Check total products
Product.objects.filter(category__slug='gpu')  # Check GPUs
```

## Fixing Techland Scraper

To make Techland work, you need to either:

### Option 1: Use Scrapy-Playwright (Recommended)
```bash
pip install scrapy-playwright
playwright install
```

Then update `scraper/settings.py` to include Playwright middleware.

### Option 2: Use Selenium
```bash
pip install selenium
```

And create a new spider using Selenium instead of Scrapy.

### Option 3: API Approach
Some sites have hidden APIs. Check browser DevTools Network tab when loading products.

## Test Current Setup

Run the test script to see what's being scraped:
```bash
python test_scraper.py
```

## Next Steps

1. ✅ Star Tech scraper works - run it to get initial data
2. ⚠️ Techland needs Selenium/Playwright for JavaScript rendering
3. Add more retailers (Ryans, etc.) using similar approaches
4. Set up Celery Beat for automatic daily scraping
