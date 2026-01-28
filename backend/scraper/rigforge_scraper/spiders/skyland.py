"""
Skyland Computer spider for scraping skyland.com.bd.

Scrapes PC component products from Skyland Computer Bangladesh.
"""

import logging
import traceback
from urllib.parse import urljoin

import scrapy

from rigforge_scraper.spiders.base import BaseRetailerSpider
from rigforge_scraper.items import ProductItem

logger = logging.getLogger(__name__)


class SkylandSpider(BaseRetailerSpider):
    """
    Spider for scraping products from skyland.com.bd.
    
    Skyland Computer is a popular PC component retailer in Bangladesh.
    Their website uses OpenCart-based layout with category pages
    and pagination.
    
    Usage:
        scrapy crawl skyland
        scrapy crawl skyland -a category=processor
        scrapy crawl skyland -a category=all
        scrapy crawl skyland -a limit=10
    """
    
    name = "skyland"
    retailer_slug = "skyland"
    base_url = "https://www.skyland.com.bd"
    
    # Default start URLs (processors only for testing)
    start_urls = [
        "https://www.skyland.com.bd/processor",
    ]
    
    # All available category URLs
    all_category_urls = {
        "processor": "https://www.skyland.com.bd/processor",
        "graphics-card": "https://www.skyland.com.bd/graphics-card",
        "motherboard": "https://www.skyland.com.bd/motherboard",
        "ram": "https://www.skyland.com.bd/ram",
        "storage": "https://www.skyland.com.bd/ssd",
        "hdd": "https://www.skyland.com.bd/hdd",
        "power-supply": "https://www.skyland.com.bd/power-supply",
        "casing": "https://www.skyland.com.bd/casing",
        "cooling": "https://www.skyland.com.bd/cpu-cooler",
        "monitor": "https://www.skyland.com.bd/monitor",
        "laptop": "https://www.skyland.com.bd/all-laptop",
        "desktop": "https://www.skyland.com.bd/desktops",
        "keyboard": "https://www.skyland.com.bd/keyboard",
        "mouse": "https://www.skyland.com.bd/mouse",
        "headphone": "https://www.skyland.com.bd/headphone",
        "router": "https://www.skyland.com.bd/router",
    }
    
    # Custom settings for this spider
    custom_settings = {
        "DOWNLOAD_DELAY": 2.0,
        "CONCURRENT_REQUESTS": 1,
        # Use standard Scrapy handlers instead of Playwright (not needed for this site)
        "DOWNLOAD_HANDLERS": {
            "http": "scrapy.core.downloader.handlers.http.HTTPDownloadHandler",
            "https": "scrapy.core.downloader.handlers.http.HTTPDownloadHandler",
        },
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
        
        # Skyland uses .product-layout for product items in category listings
        # The main product grid is typically within #content or .main-content
        product_cards = response.css("#content .product-layout")
        
        if not product_cards:
            # Alternative: look for product-thumb divs
            product_cards = response.css(".main-products .product-layout, .product-grid .product-thumb")
        
        if not product_cards:
            # Fallback to broader selector but deduplicate
            product_cards = response.css(".product-thumb")
        
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
            # Check stock status FIRST - Skyland adds "out-of-stock" class to the product-layout element
            # This is the most reliable indicator on Skyland's site
            card_classes = card.attrib.get("class", "")
            if "out-of-stock" in card_classes:
                logger.debug(f"Skipping out-of-stock product (has out-of-stock class)")
                return None
            
            # Extract product name
            # Skyland typically uses .name a or .product-name a or h4 a
            name_elem = card.css(".name a::text").get()
            if not name_elem:
                name_elem = card.css(".product-name a::text, h4 a::text, .caption a::text").get()
            if not name_elem:
                # Try to get from title attribute
                name_elem = card.css("a::attr(title)").get()
            if not name_elem:
                # Try getting text from the first significant link
                name_elem = card.css(".image a::attr(title)").get()
            
            if not name_elem:
                logger.debug("Could not find product name")
                return None
            
            name = self.normalize_text(name_elem)
            
            # Extract product URL
            product_url = card.css(".name a::attr(href)").get()
            if not product_url:
                product_url = card.css(".product-name a::attr(href), h4 a::attr(href), .caption a::attr(href)").get()
            if not product_url:
                product_url = card.css(".image a::attr(href)").get()
            
            if product_url:
                product_url = urljoin(self.base_url, product_url)
            else:
                logger.debug(f"Could not find URL for: {name}")
                return None
            
            # Extract price
            # Skyland shows prices with ৳ symbol, look for price-new or special price first
            price_text = card.css(".price-new::text").get()
            if not price_text:
                price_text = card.css(".price-special::text, .special-price::text").get()
            if not price_text:
                # Fall back to regular price
                price_text = card.css(".price::text").get()
            if not price_text:
                # Try extracting from any element containing price
                price_text = card.css("[class*='price']::text").get()
            
            price = self.parse_price(price_text)
            
            # INTENTIONAL: Skip products without valid prices (out of stock, upcoming, etc.)
            # We only want to display products that users can actually purchase
            if price is None or price <= 0:
                logger.debug(f"Skipping product (no valid price - likely out of stock): {name}")
                return None
            
            # Extract image URL
            image_url = card.css(".image img::attr(src)").get()
            if not image_url:
                image_url = card.css("img::attr(src), img::attr(data-src)").get()
            
            if image_url:
                image_url = urljoin(self.base_url, image_url)
            
            # Double-check stock status via inner elements
            # Look for out-of-stock indicators in child elements
            out_of_stock_elem = card.css(".out-of-stock, .stock-status:contains('Out'), .label-danger:contains('Out')")
            in_stock = len(out_of_stock_elem) == 0
            
            # Also check button text for stock status
            button_text = card.css(".button-group button::text, .cart button::text, .btn-cart::text").get()
            if button_text and "out of stock" in button_text.lower():
                in_stock = False
            
            # INTENTIONAL: Skip out-of-stock products
            # Skyland shows prices even for out-of-stock items, so we must check stock status explicitly
            if not in_stock:
                logger.debug(f"Skipping product (out of stock): {name}")
                return None
            
            # Extract brand
            brand = self.extract_brand(name)
            
            # Store item data and follow product URL to get detailed specs
            item_data = {
                'name': name,
                'price': price,
                'product_url': product_url,
                'category': category,
                'image_url': image_url,
                'brand': brand,
                'in_stock': in_stock,
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
        Parse Skyland product detail page to extract specifications.
        
        Args:
            response: Scrapy response from product detail page
            
        Yields:
            ProductItem with specifications
        """
        item_data = response.meta['item_data']
        
        # Skyland uses specification tables (OpenCart style)
        specs = self.parse_specs_table(response, {
            'table': '#tab-specification table, .specification-table, .product-info table, table.table-striped',
            'row': 'tr',
            'key': 'td:first-child::text, th::text',
            'value': 'td:last-child::text',
        })
        
        # If no specs found, try alternative selectors
        if not specs:
            # Try key-value pairs in product attributes section
            spec_rows = response.css('.product-attributes tr, .specifications tr')
            for row in spec_rows:
                key = row.css('td:first-child::text, th::text').get()
                value = row.css('td:last-child::text').get()
                if key and value:
                    key = self.normalize_text(key).rstrip(':')
                    value = self.normalize_text(value)
                    if key and value:
                        specs[key] = value
        
        # Try description list format
        if not specs:
            for dt in response.css('.product-specs dt, .specifications dt'):
                key = self.normalize_text(dt.css('::text').get())
                dd = dt.xpath('following-sibling::dd[1]')
                value = self.normalize_text(dd.css('::text').get())
                if key and value:
                    specs[key] = value
        
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
    
    def follow_pagination(self, response):
        """
        Follow pagination links to scrape more products.
        
        Args:
            response: Current page response
            
        Yields:
            Request for next page
        """
        # Skyland uses standard pagination with .pagination class
        # Look for next page link (often > or >> symbol, or rel="next")
        next_page = response.css(".pagination a[rel='next']::attr(href)").get()
        
        if not next_page:
            # Look for ">" symbol link in pagination
            next_page = response.css(".pagination li:not(.active) a:contains('>')::attr(href)").get()
        
        if not next_page:
            # Alternative: find the link after the active page
            pagination_links = response.css(".pagination li")
            found_active = False
            for li in pagination_links:
                if found_active:
                    next_page = li.css("a::attr(href)").get()
                    break
                if li.css(".active") or li.css("a.active"):
                    found_active = True
        
        if not next_page:
            # Try looking for page=X pattern in links
            current_page_text = response.css(".pagination .active::text, .pagination .active a::text").get()
            if current_page_text:
                try:
                    current_num = int(current_page_text.strip())
                    next_num = current_num + 1
                    # Find link with next page number
                    for link in response.css(".pagination a"):
                        link_text = link.css("::text").get()
                        if link_text and link_text.strip() == str(next_num):
                            next_page = link.css("::attr(href)").get()
                            break
                except (ValueError, TypeError):
                    pass
        
        if next_page:
            next_url = urljoin(self.base_url, next_page)
            logger.info(f"Following pagination to: {next_url}")
            yield scrapy.Request(next_url, callback=self.parse)
        else:
            logger.info("No more pagination links found")
    
    def get_category(self, url_or_text: str) -> str:
        """
        Determine category from URL path or text.
        
        Overrides base method to handle Skyland-specific URL patterns.
        
        Args:
            url_or_text: URL or category text to parse
            
        Returns:
            Normalized category name
        """
        text = url_or_text.lower()
        
        # Skyland-specific mappings
        skyland_mappings = {
            "processor": "Processors",
            "graphics-card": "Graphics Cards",
            "motherboard": "Motherboards",
            "ram": "Memory",
            "ssd": "Storage",
            "hdd": "Storage",
            "power-supply": "Power Supply",
            "casing": "Cases",
            "cpu-cooler": "Cooling",
            "monitor": "Monitors",
            "all-laptop": "Laptops",
            "laptop-notebook": "Laptops",
            "desktop": "Desktops",
            "keyboard": "Keyboards",
            "mouse": "Mice",
            "headphone": "Headphones",
            "router": "Networking",
        }
        
        for key, value in skyland_mappings.items():
            if key in text:
                return value
        
        # Fall back to base implementation
        return super().get_category(url_or_text)
