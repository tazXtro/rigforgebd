"""
Potaka IT spider for scraping potakait.com.

Scrapes PC component products from Potaka IT Bangladesh.
"""

import logging
import traceback
from urllib.parse import urljoin

import scrapy

from rigforge_scraper.spiders.base import BaseRetailerSpider
from rigforge_scraper.items import ProductItem

logger = logging.getLogger(__name__)


class PotakaitSpider(BaseRetailerSpider):
    """
    Spider for scraping products from potakait.com.
    
    Potaka IT is a PC component retailer in Bangladesh.
    Their website uses a standard e-commerce layout with category pages
    and pagination.
    
    Usage:
        scrapy crawl potakait
        scrapy crawl potakait -a category=processor
        scrapy crawl potakait -a category=all -a limit=10
    """
    
    name = "potakait"
    retailer_slug = "potakait"
    base_url = "https://potakait.com"
    
    # Default start URLs (processors only for testing)
    start_urls = [
        "https://potakait.com/processors",
    ]
    
    # All available category URLs
    all_category_urls = {
        "processor": "https://potakait.com/processors",
        "graphics-card": "https://potakait.com/graphics-cards",
        "motherboard": "https://potakait.com/motherboards",
        "ram": "https://potakait.com/desktop-ram",
        "storage": "https://potakait.com/ssd",
        "hdd": "https://potakait.com/hard-disk-drives",
        "power-supply": "https://potakait.com/power-supply",
        "casing": "https://potakait.com/casing",
        "cooling": "https://potakait.com/cpu-cooler",
        "monitor": "https://potakait.com/monitors",
    }
    
    # Category mappings for this retailer
    category_mappings = {
        "processors": "Processors",
        "graphics-cards": "Graphics Cards",
        "motherboards": "Motherboards",
        "desktop-ram": "Memory",
        "ssd": "Storage",
        "hard-disk-drives": "Storage",
        "power-supply": "Power Supply",
        "casing": "Cases",
        "cpu-cooler": "Cooling",
        "monitors": "Monitors",
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
            category: Specific category to scrape (e.g., 'processor') or 'all' for all categories
            limit: Maximum number of products to scrape (omit for unlimited)
        """
        super().__init__(*args, **kwargs)
        
        self.limit = int(limit) if limit else None
        self.items_scraped = 0
        
        # Set start URLs based on category argument
        if category == "all":
            # Scrape ALL categories
            self.start_urls = list(self.all_category_urls.values())
            logger.info(f"Starting with ALL categories ({len(self.start_urls)} URLs)")
        elif category:
            if category in self.all_category_urls:
                self.start_urls = [self.all_category_urls[category]]
                logger.info(f"Starting with category: {category}")
            else:
                logger.warning(f"Unknown category '{category}', using default (processor)")
        # else: use default start_urls (processor only)
    
    def parse(self, response):
        """
        Parse a category listing page.
        
        Extracts product information from the listing and follows pagination.
        """
        # Determine category from URL
        category = self.get_category(response.url)
        logger.info(f"Parsing category page: {category} - {response.url}")
        
        # Find all product cards on the page
        # Potaka IT uses product card containers with product info
        product_cards = response.css(".product-layout, .product-thumb, .product-card")
        
        if not product_cards:
            # Try alternative selector - look for cards with product links
            product_cards = response.css("div[class*='product']")
        
        if not product_cards:
            # Try to find based on the structure we observed - products have a link and price
            # Looking for elements that contain both product link and price
            product_cards = response.xpath(
                "//a[contains(@href, 'potakait.com/')]/ancestor::div[contains(@class, 'product') or contains(@class, 'item')]"
            )
        
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
            # Extract product name - look for heading or link text
            name_elem = card.css("h4 a::text, h3 a::text, .product-name a::text, .name a::text").get()
            if not name_elem:
                name_elem = card.css("a[href*='potakait.com']::text").get()
            if not name_elem:
                # Try getting text from any heading
                name_elem = card.css("h1::text, h2::text, h3::text, h4::text, h5::text").get()
            
            if not name_elem:
                logger.debug("Could not find product name")
                return None
            
            name = self.normalize_text(name_elem)
            
            # Skip if name is too short or doesn't look like a product
            if len(name) < 5:
                return None
            
            # Extract product URL
            product_url = card.css("h4 a::attr(href), h3 a::attr(href), .product-name a::attr(href), .name a::attr(href)").get()
            if not product_url:
                product_url = card.css("a[href*='potakait.com']::attr(href)").get()
            
            if product_url:
                product_url = urljoin(self.base_url, product_url)
            else:
                logger.debug(f"Could not find URL for: {name}")
                return None
            
            # Extract price - Potaka IT shows price with ৳ symbol
            # Prices appear like "56,200৳" or "56,200 ৳"
            price_text = card.css(".price::text, .product-price::text, .new-price::text, .special-price::text").get()
            if not price_text:
                # Try to find price by looking for text with ৳
                all_text = card.css("*::text").getall()
                for text in all_text:
                    if "৳" in text and any(c.isdigit() for c in text):
                        price_text = text
                        break
            
            price = self.parse_price(price_text)
            if price is None or price <= 0:
                logger.debug(f"Skipping product (no valid price): {name}")
                return None
            
            # Check stock status - MUST filter out non-available products
            # Potaka IT has: "In Stock", "Pre Order", "Up Coming", "Out of Stock"
            # We only want "In Stock" products (those with "Buy Now" button)
            
            # Get all text content from the card to check for availability indicators
            card_text = " ".join(card.css("*::text").getall()).lower()
            
            # Check for non-available indicators
            unavailable_indicators = [
                "out of stock",
                "out-of-stock",
                "pre order",
                "pre-order",
                "preorder",
                "up coming",
                "upcoming",
                "coming soon",
            ]
            
            is_unavailable = any(indicator in card_text for indicator in unavailable_indicators)
            
            # Also check button/link text specifically for more accurate detection
            button_texts = card.css("button::text, .btn::text, a.btn::text, a[href*='javascript']::text").getall()
            button_text_combined = " ".join(button_texts).lower().strip()
            
            # "Buy Now" indicates in-stock, anything else like "Out Of Stock", "Pre Order" means not available
            has_buy_now = "buy now" in button_text_combined
            has_out_of_stock = "out of stock" in button_text_combined or "out-of-stock" in button_text_combined
            has_pre_order = "pre order" in button_text_combined or "pre-order" in button_text_combined
            has_upcoming = "up coming" in button_text_combined or "upcoming" in button_text_combined
            
            # Product is in stock only if it has "Buy Now" and none of the unavailable indicators
            in_stock = has_buy_now and not (has_out_of_stock or has_pre_order or has_upcoming)
            
            # Skip products that are not in stock
            if not in_stock or is_unavailable:
                logger.debug(f"Skipping unavailable product: {name} (out_of_stock={has_out_of_stock}, pre_order={has_pre_order}, upcoming={has_upcoming})")
                return None
            
            # Extract image URL
            image_url = card.css("img::attr(src), img::attr(data-src)").get()
            if image_url:
                image_url = urljoin(self.base_url, image_url)
            
            # Extract brand
            brand = self.extract_brand(name)
            
            # Extract basic specs from card if available
            specs = self.extract_specs(card)
            
            # Store item data and follow product URL to get detailed specs
            item_data = {
                'name': name,
                'price': price,
                'product_url': product_url,
                'category': category,
                'image_url': image_url,
                'brand': brand,
                'in_stock': in_stock,
                'specs': specs,
                'source_page': source_url,
            }
            
            # Follow product URL to get detailed specs
            return self.make_request(
                product_url,
                callback=self.parse_product_detail,
                meta={'item_data': item_data},
            )
            
        except Exception as e:
            logger.error(f"Error parsing product card: {e}\n{traceback.format_exc()}")
            return None
    
    def parse_product_detail(self, response):
        """
        Parse product detail page to extract specifications.
        
        Args:
            response: Scrapy response from product detail page
            
        Yields:
            ProductItem with specifications
        """
        item_data = response.meta['item_data']
        
        # Potaka IT uses specification tables - try multiple selectors
        specs = self.parse_specs_table(response, {
            'table': '.specification-table, .product-specification table, table.data-table, #specification table',
            'row': 'tr',
            'key': 'td:first-child::text, th::text',
            'value': 'td:last-child::text',
        })
        
        # If no specs found, try alternative selectors
        if not specs:
            # Try key-value pairs in list format
            spec_items = response.css('.product-info li, .specifications li, .spec-list li')
            for item in spec_items:
                text = item.css('::text').get()
                if text and ':' in text:
                    parts = text.split(':', 1)
                    if len(parts) == 2:
                        key = self.normalize_text(parts[0]).rstrip(':')
                        value = self.normalize_text(parts[1])
                        if key and value:
                            specs[key] = value
        
        # Try description list format (dt/dd)
        if not specs:
            for dt in response.css('.specifications dt, .product-attributes dt'):
                key = self.normalize_text(dt.css('::text').get())
                dd = dt.xpath('following-sibling::dd[1]')
                value = self.normalize_text(dd.css('::text').get())
                if key and value:
                    specs[key] = value
        
        # Merge with any specs from card
        if item_data.get('specs'):
            specs.update(item_data['specs'])
        
        # Create and yield the product item with specs
        item = self.create_product_item(
            name=item_data['name'],
            price=item_data['price'],
            product_url=item_data['product_url'],
            category=item_data['category'],
            image_url=item_data['image_url'],
            brand=item_data['brand'],
            in_stock=item_data['in_stock'],
            specs=specs,
            source_page=item_data['source_page'],
        )
        
        yield item
    
    def extract_specs(self, card) -> dict:
        """
        Extract product specifications from the card.
        
        Potaka IT shows specs as bullet points like:
        • Clock Speed: 4.3GHz Up to 5.7GHz
        • Cores: 16, Threads: 32
        
        Args:
            card: Scrapy selector for the product card
            
        Returns:
            Dictionary of specifications
        """
        specs = {}
        
        # Look for spec items (usually in list format)
        spec_items = card.css("li::text, .spec::text, .description li::text").getall()
        
        for item in spec_items:
            item = item.strip()
            if not item or item.startswith("•"):
                item = item.lstrip("•").strip()
            
            if ":" in item:
                parts = item.split(":", 1)
                if len(parts) == 2:
                    key = parts[0].strip()
                    value = parts[1].strip()
                    if key and value:
                        specs[key] = value
        
        return specs
    
    def follow_pagination(self, response):
        """
        Follow pagination links to scrape more products.
        
        Args:
            response: Current page response
            
        Yields:
            Request for next page
        """
        # Look for "NEXT" link in pagination
        next_page = response.css(".pagination a:contains('NEXT')::attr(href)").get()
        
        if not next_page:
            # Alternative: look for next page link with rel="next"
            next_page = response.css(".pagination a[rel='next']::attr(href)").get()
        
        if not next_page:
            # Look for ">" or ">>" in pagination links
            next_page = response.css(".pagination li:last-child a::attr(href)").get()
        
        if not next_page:
            # Try to find numbered pagination and go to next page
            current_page = response.css(".pagination .active::text, .pagination li.active span::text").get()
            if current_page:
                try:
                    next_num = int(current_page.strip()) + 1
                    # Look for link with next page number
                    next_page = response.xpath(
                        f"//div[contains(@class, 'pagination')]//a[text()='{next_num}']/@href"
                    ).get()
                except (ValueError, TypeError):
                    pass
        
        if next_page:
            next_url = urljoin(self.base_url, next_page)
            logger.info(f"Following pagination to: {next_url}")
            yield scrapy.Request(next_url, callback=self.parse)
        else:
            logger.info("No more pagination links found")
    
    def get_category(self, url: str) -> str:
        """
        Determine category from URL path.
        
        Args:
            url: URL to extract category from
            
        Returns:
            Normalized category name
        """
        # Extract the category slug from URL
        url_lower = url.lower()
        
        for key, value in self.category_mappings.items():
            if key in url_lower:
                return value
        
        # Default fallback - extract from URL path
        from urllib.parse import urlparse
        path = urlparse(url).path.strip("/")
        if path:
            return path.replace("-", " ").title()
        
        return "Components"
