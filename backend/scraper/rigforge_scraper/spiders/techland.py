"""
Techland spider for scraping JS-heavy retailer site.

Uses Playwright for browser-based rendering.
"""
import logging
from urllib.parse import urljoin

import scrapy

from rigforge_scraper.spiders.base import BaseRetailerSpider
from rigforge_scraper.items import ProductItem

logger = logging.getLogger(__name__)


class TechlandSpider(BaseRetailerSpider):
    """
    Spider for Techland (example JS-heavy retailer).
    
    This spider demonstrates Playwright integration for sites
    that heavily rely on JavaScript for rendering content.
    
    Usage:
        python scripts/run_retailers.py --retailer techland
        python scripts/run_retailers.py --retailer techland --category processor --limit 10
    """
    
    name = "techland"
    retailer_slug = "techland"
    base_url = "https://www.techlandbd.com"  # Example URL (replace with actual)
    
    # Enable Playwright for this spider
    use_playwright = True
    playwright_wait_strategy = "networkidle"  # Wait for network to be idle
    playwright_page_goto_timeout = 30000
    
    # Custom settings for Playwright spider
    custom_settings = {
        "DOWNLOAD_DELAY": 3.0,
        "CONCURRENT_REQUESTS": 2,  # Lower concurrency for browser automation
    }
    
    all_category_urls = {
        "processor": f"{base_url}/components/processors",
        "graphics-card": f"{base_url}/components/graphics-cards",
        "motherboard": f"{base_url}/components/motherboards",
        "ram": f"{base_url}/components/memory",
        "storage": f"{base_url}/components/storage",
    }
    
    def __init__(self, category=None, limit=None, *args, **kwargs):
        """
        Initialize spider with category and limit options.
        
        Args:
            category: Specific category to scrape (e.g., 'processor') or 'all'
            limit: Maximum number of products to scrape
        """
        super().__init__(*args, **kwargs)
        
        self.limit = int(limit) if limit else None
        self.items_scraped = 0
        
        # Set start URLs based on category argument
        if category == "all":
            self.start_urls = list(self.all_category_urls.values())
        elif category and category in self.all_category_urls:
            self.start_urls = [self.all_category_urls[category]]
        else:
            # Default to processor category
            self.start_urls = [self.all_category_urls["processor"]]
    
    def start_requests(self):
        """
        Generate initial requests using Playwright.
        """
        for url in self.start_urls:
            # Use make_request helper (will use Playwright due to use_playwright=True)
            yield self.make_request(
                url,
                callback=self.parse,
                wait_for_selector=".product-card, .product-item"  # Wait for products to load
            )
    
    def parse(self, response):
        """
        Parse category page with JS-rendered products.
        
        Args:
            response: Playwright-rendered response
            
        Yields:
            ProductItem for each product found
        """
        category = self.get_category(response.url)
        logger.info(f"Parsing Playwright page: {category} - {response.url}")
        
        # Adjust selectors based on actual site structure
        # These are example selectors - update based on real Techland site
        product_cards = response.css(".product-card, .product-item, .p-item")
        logger.info(f"Found {len(product_cards)} products on page")
        
        for card in product_cards:
            if self.limit and self.items_scraped >= self.limit:
                logger.info(f"Reached limit of {self.limit} items")
                return
            
            item = self.parse_product_card(card, category, response.url)
            if item:
                self.items_scraped += 1
                yield item
        
        # Follow pagination
        if not self.limit or self.items_scraped < self.limit:
            yield from self.follow_pagination(response)
    
    def parse_product_card(self, card, category: str, source_url: str):
        """
        Parse single product card.
        
        Args:
            card: Scrapy selector for the product card
            category: Product category
            source_url: URL of the listing page
            
        Returns:
            ProductItem or None if parsing fails
        """
        try:
            # Adjust selectors based on actual Techland site structure
            # These are example selectors
            
            # Product name
            name = card.css(".product-title::text, .product-name::text, h3::text, h4::text").get()
            if not name:
                return None
            
            name = self.normalize_text(name)
            
            # Product URL
            product_url = card.css("a::attr(href)").get()
            if product_url:
                product_url = urljoin(self.base_url, product_url)
            else:
                return None
            
            # Price
            price_text = card.css(".price::text, .product-price::text, .p-item-price::text").get()
            price = self.parse_price(price_text)
            if not price or price <= 0:
                # Try alternative price selectors
                price_text = card.css(".new-price::text, .special-price::text, .sale-price::text").get()
                price = self.parse_price(price_text)
            
            if not price or price <= 0:
                logger.debug(f"Could not parse price for: {name}")
                return None
            
            # Image URL
            image_url = card.css("img::attr(src), img::attr(data-src), img::attr(data-lazy-src)").get()
            if image_url:
                image_url = urljoin(self.base_url, image_url)
            
            # Stock status
            stock_text = card.css(".stock-status::text, .availability::text").get()
            in_stock = self.is_in_stock(stock_text) if stock_text else True
            
            # Check for out-of-stock badge
            out_of_stock_badge = card.css(".out-of-stock, .badge-out-of-stock, .sold-out")
            if out_of_stock_badge:
                in_stock = False
            
            # Brand
            brand = self.extract_brand(name)
            
            return self.create_product_item(
                name=name,
                price=price,
                product_url=product_url,
                category=category,
                image_url=image_url,
                brand=brand,
                in_stock=in_stock,
                source_page=source_url,
            )
            
        except Exception as e:
            logger.error(f"Error parsing product card: {e}")
            return None
    
    def follow_pagination(self, response):
        """
        Follow pagination links.
        
        Args:
            response: Current page response
            
        Yields:
            Request for next page using Playwright
        """
        # Adjust pagination selectors based on actual site
        # Common pagination patterns
        next_page = response.css(".pagination .next::attr(href), a.next-page::attr(href), .pagination-next::attr(href)").get()
        
        if not next_page:
            # Alternative: look for "Next" button
            next_page = response.css("a:contains('Next')::attr(href), a:contains('→')::attr(href)").get()
        
        if next_page:
            next_url = urljoin(self.base_url, next_page)
            logger.info(f"Following pagination: {next_url}")
            yield self.make_request(
                next_url,
                callback=self.parse,
                wait_for_selector=".product-card, .product-item"
            )
        else:
            logger.info("No more pagination links found")
