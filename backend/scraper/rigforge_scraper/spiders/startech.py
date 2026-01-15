"""
Star Tech spider for scraping startech.com.bd.

Scrapes PC component products from Star Tech Bangladesh.
"""

import logging
from urllib.parse import urljoin

import scrapy

from rigforge_scraper.spiders.base import BaseRetailerSpider
from rigforge_scraper.items import ProductItem

logger = logging.getLogger(__name__)


class StartechSpider(BaseRetailerSpider):
    """
    Spider for scraping products from startech.com.bd.
    
    Star Tech is one of the largest PC component retailers in Bangladesh.
    Their website uses a standard e-commerce layout with category pages
    and pagination.
    
    Usage:
        scrapy crawl startech
        scrapy crawl startech -a category=processor
        scrapy crawl startech -a limit=10
    """
    
    name = "startech"
    retailer_slug = "startech"
    base_url = "https://www.startech.com.bd"
    
    # Default start URLs (processors only for testing)
    start_urls = [
        "https://www.startech.com.bd/component/processor",
    ]
    
    # All available category URLs
    all_category_urls = {
        "processor": "https://www.startech.com.bd/component/processor",
        "graphics-card": "https://www.startech.com.bd/component/graphics-card",
        "motherboard": "https://www.startech.com.bd/component/motherboard",
        "ram": "https://www.startech.com.bd/component/ram",
        "storage": "https://www.startech.com.bd/component/ssd-hard-disk",
        "power-supply": "https://www.startech.com.bd/component/power-supply",
        "casing": "https://www.startech.com.bd/component/casing",
        "cooling": "https://www.startech.com.bd/component/CPU-Cooler",
        "monitor": "https://www.startech.com.bd/monitor",
    }
    
    # Custom settings for this spider
    custom_settings = {
        "DOWNLOAD_DELAY": 2.0,
        "CONCURRENT_REQUESTS": 1,
    }
    
    def __init__(self, category=None, limit=None, *args, **kwargs):
        """
        Initialize the spider with optional arguments.
        
        Args:
            category: Specific category to scrape (e.g., 'processor')
            limit: Maximum number of products to scrape
        """
        super().__init__(*args, **kwargs)
        
        self.limit = int(limit) if limit else None
        self.items_scraped = 0
        
        # Set start URLs based on category argument
        if category:
            if category in self.all_category_urls:
                self.start_urls = [self.all_category_urls[category]]
                logger.info(f"Starting with category: {category}")
            else:
                logger.warning(f"Unknown category '{category}', using default")
    
    def parse(self, response):
        """
        Parse a category listing page.
        
        Extracts product information from the listing and follows pagination.
        """
        # Determine category from URL
        category = self.get_category(response.url)
        logger.info(f"Parsing category page: {category} - {response.url}")
        
        # Find all product cards on the page
        # Star Tech uses ".p-item" for product cards
        product_cards = response.css(".p-item")
        
        if not product_cards:
            # Alternative selectors if the main one doesn't work
            product_cards = response.css(".product-item, .product-thumb")
        
        logger.info(f"Found {len(product_cards)} products on page")
        
        for card in product_cards:
            # Check limit
            if self.limit and self.items_scraped >= self.limit:
                logger.info(f"Reached limit of {self.limit} items")
                return
            
            item = self.parse_product_card(card, category, response.url)
            if item:
                self.items_scraped += 1
                yield item
        
        # Follow pagination if not at limit
        if not self.limit or self.items_scraped < self.limit:
            yield from self.follow_pagination(response)
    
    def parse_product_card(self, card, category: str, source_url: str):
        """
        Parse a single product card from the listing page.
        
        Args:
            card: Scrapy selector for the product card
            category: Product category
            source_url: URL of the listing page
            
        Returns:
            ProductItem or None if parsing fails
        """
        try:
            # Extract product name - Star Tech uses ".p-item-name" or "h4.p-item-name"
            name_elem = card.css(".p-item-name a::text").get()
            if not name_elem:
                name_elem = card.css("h4 a::text, .product-name a::text").get()
            
            if not name_elem:
                logger.debug("Could not find product name")
                return None
            
            name = self.normalize_text(name_elem)
            
            # Extract product URL
            product_url = card.css(".p-item-name a::attr(href)").get()
            if not product_url:
                product_url = card.css("h4 a::attr(href), .product-name a::attr(href)").get()
            
            if product_url:
                product_url = urljoin(self.base_url, product_url)
            else:
                logger.debug(f"Could not find URL for: {name}")
                return None
            
            # Extract price - Star Tech uses ".p-item-price span" or ".price"
            price_text = card.css(".p-item-price span::text").get()
            if not price_text:
                price_text = card.css(".price::text, .product-price::text").get()
            
            price = self.parse_price(price_text)
            if price is None or price <= 0:
                # Try to get price from other locations
                price_text = card.css(".new-price::text, .special-price::text").get()
                price = self.parse_price(price_text)
            
            if price is None or price <= 0:
                logger.debug(f"Could not parse price for: {name}")
                return None
            
            # Extract image URL
            image_url = card.css(".p-item-img img::attr(src)").get()
            if not image_url:
                image_url = card.css("img::attr(src), img::attr(data-src)").get()
            
            if image_url:
                image_url = urljoin(self.base_url, image_url)
            
            # Check stock status
            stock_text = card.css(".out-of-stock::text, .stock-status::text").get()
            in_stock = self.is_in_stock(stock_text) if stock_text else True
            
            # Also check for "Out of Stock" badge
            out_of_stock_badge = card.css(".out-of-stock, .badge-out-of-stock")
            if out_of_stock_badge:
                in_stock = False
            
            # Extract brand
            brand = self.extract_brand(name)
            
            # Create product item
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
        Follow pagination links to scrape more products.
        
        Args:
            response: Current page response
            
        Yields:
            Request for next page
        """
        # Star Tech uses ".pagination" with "a.page-link" or similar
        next_page = response.css(".pagination a[rel='next']::attr(href)").get()
        
        if not next_page:
            # Alternative: look for ">" arrow in pagination
            next_page = response.css(".pagination li:last-child a::attr(href)").get()
        
        if not next_page:
            # Look for numbered pagination and find next number
            current_page = response.css(".pagination .active::text").get()
            if current_page:
                try:
                    next_num = int(current_page.strip()) + 1
                    next_page = response.css(
                        f".pagination a:contains('{next_num}')::attr(href)"
                    ).get()
                except (ValueError, TypeError):
                    pass
        
        if next_page:
            next_url = urljoin(self.base_url, next_page)
            logger.info(f"Following pagination to: {next_url}")
            yield scrapy.Request(next_url, callback=self.parse)
        else:
            logger.info("No more pagination links found")
