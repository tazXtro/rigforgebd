"""
Ultra Tech spider for scraping ultratech.com.bd.

Scrapes PC component products from Ultra Technology Bangladesh.
"""

import logging
import traceback
from urllib.parse import urljoin

import scrapy

from rigforge_scraper.spiders.base import BaseRetailerSpider
from rigforge_scraper.items import ProductItem

logger = logging.getLogger(__name__)


class UltratechSpider(BaseRetailerSpider):
    """
    Spider for scraping products from ultratech.com.bd.
    
    Ultra Technology is a popular PC component retailer in Bangladesh.
    Their website uses an OpenCart-based layout with category pages
    and pagination.
    
    Usage:
        scrapy crawl ultratech
        scrapy crawl ultratech -a category=processor
        scrapy crawl ultratech -a category=all
        scrapy crawl ultratech -a limit=10
    """
    
    name = "ultratech"
    retailer_slug = "ultratech"
    base_url = "https://www.ultratech.com.bd"
    
    # Default start URLs (processors only for testing)
    start_urls = [
        "https://www.ultratech.com.bd/processor",
    ]
    
    # All available category URLs
    all_category_urls = {
        "processor": "https://www.ultratech.com.bd/processor",
        "graphics-card": "https://www.ultratech.com.bd/graphics-card",
        "motherboard": "https://www.ultratech.com.bd/motherboard",
        "ram": "https://www.ultratech.com.bd/ram",
        "storage": "https://www.ultratech.com.bd/ssd",
        "power-supply": "https://www.ultratech.com.bd/power-supply",
        "casing": "https://www.ultratech.com.bd/casing",
        "cooling": "https://www.ultratech.com.bd/cpu-cooler",
        "monitor": "https://www.ultratech.com.bd/monitor",
    }
    
    # Enable Playwright for this spider (for robots.txt compliant pagination)
    use_playwright = True
    playwright_config = {
        "wait_until": "networkidle",
        "timeout": 30000,
    }
    
    # Maximum pages to scrape per category (prevents excessive Playwright click chains)
    MAX_PAGES = 10
    
    # Custom settings for this spider
    custom_settings = {
        # Respect the site's requested crawl delay of 20 seconds
        "DOWNLOAD_DELAY": 20.0,
        "CONCURRENT_REQUESTS": 1,
        # Use a browser-like User-Agent (polite identification)
        "USER_AGENT": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
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
        self.pages_scraped = set()  # Track scraped pages to prevent infinite loops
        
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
        from urllib.parse import urlparse, parse_qs
        
        # Determine category from URL
        category = self.get_category(response.url)
        
        # Get current page number from URL
        parsed = urlparse(response.url)
        query_params = parse_qs(parsed.query)
        current_page = int(query_params.get('page', [1])[0])
        
        # Create a unique page identifier (category + page number)
        page_id = f"{parsed.path}:{current_page}"
        
        # Check if we've already scraped this page (prevent infinite loops)
        if page_id in self.pages_scraped:
            logger.info(f"Already scraped page {current_page}, stopping pagination")
            return
        
        self.pages_scraped.add(page_id)
        logger.info(f"Parsing UltraTech category: {category} - Page {current_page} - {response.url}")
        
        # Ultratech uses .product-layout for product items in category listings
        product_cards = response.css(".main-products .product-layout")
        
        if not product_cards:
            # Alternative selectors
            product_cards = response.css(".product-grid .product-layout, #content .product-layout")
        
        if not product_cards:
            # Fallback to product-thumb
            product_cards = response.css(".product-thumb")
        
        logger.info(f"Found {len(product_cards)} products on page")
        
        # Track if we found any products on this page
        products_found_on_page = 0
        
        for card in product_cards:
            # Check limit
            if self.limit and self.items_scraped >= self.limit:
                logger.info(f"Reached limit of {self.limit} items")
                return
            
            item = self.parse_product_card(card, category, response.url)
            if item:
                self.items_scraped += 1
                products_found_on_page += 1
                yield item
        
        # Follow pagination only if we found products on this page
        # Use Playwright click-based pagination to respect robots.txt
        if products_found_on_page > 0 and (not self.limit or self.items_scraped < self.limit):
            yield from self.follow_pagination_via_click(response)
        elif products_found_on_page == 0:
            logger.info("No products found on page, stopping pagination")
    
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
            # Check stock status - Ultratech may add out-of-stock class
            card_classes = card.attrib.get("class", "")
            if "out-of-stock" in card_classes:
                logger.debug("Skipping out-of-stock product (has out-of-stock class)")
                return None
            
            # Extract product name
            # Ultratech uses .name a for product names
            name_elem = card.css(".name a::text").get()
            if not name_elem:
                name_elem = card.css(".product-name a::text, h4 a::text, .caption a::text").get()
            if not name_elem:
                # Try to get from title attribute
                name_elem = card.css(".name a::attr(title)").get()
            if not name_elem:
                name_elem = card.css(".image a::attr(title)").get()
            
            if not name_elem:
                logger.debug("Could not find product name")
                return None
            
            name = self.normalize_text(name_elem)
            
            # Extract product URL
            product_url = card.css(".name a::attr(href)").get()
            if not product_url:
                product_url = card.css(".product-name a::attr(href), h4 a::attr(href)").get()
            if not product_url:
                product_url = card.css(".image a::attr(href)").get()
            
            if product_url:
                product_url = urljoin(self.base_url, product_url)
            else:
                logger.debug(f"Could not find URL for: {name}")
                return None
            
            # Extract price
            # Ultratech shows prices with ৳ symbol
            # Look for special/discounted price first (price-new)
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
            if price is None or price <= 0:
                logger.debug(f"Skipping product (no valid price - likely out of stock): {name}")
                return None
            
            # Extract image URL
            image_url = card.css(".image img::attr(src)").get()
            if not image_url:
                image_url = card.css("img::attr(src), img::attr(data-src)").get()
            
            if image_url:
                image_url = urljoin(self.base_url, image_url)
            
            # Check stock status from text/badge
            stock_text = card.css(".out-of-stock::text, .stock-status::text").get()
            in_stock = self.is_in_stock(stock_text) if stock_text else True
            
            # Check for out of stock badge
            out_of_stock_badge = card.css(".out-of-stock, .badge-out-of-stock, .stock-out")
            if out_of_stock_badge:
                in_stock = False
            
            # Extract brand from product name
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
        Parse UltraTech product detail page to extract specifications.
        
        Args:
            response: Scrapy response from product detail page
            
        Yields:
            ProductItem with specifications
        """
        item_data = response.meta['item_data']
        
        # UltraTech uses specification tables (OpenCart style)
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
    
    def follow_pagination_via_click(self, response):
        """
        Follow pagination by clicking through pages using Playwright.
        
        UltraTech's robots.txt blocks ?page= URLs, so we use Playwright page actions
        to click the pagination buttons. Since each request starts a fresh browser,
        we build a chain of clicks from page 1 to reach the target page.
        
        Args:
            response: Current page response
            
        Yields:
            Request for next page (with Playwright page actions)
        """
        from scrapy_playwright.page import PageMethod
        from urllib.parse import urlparse, parse_qs
        
        # Check if there's a next page link in pagination
        # OpenCart typically uses ">" or ">>" or numbered links
        next_page_exists = False
        
        # Look for ">" symbol link (common in OpenCart)
        for link in response.css(".pagination a"):
            link_text = link.css("::text").get()
            if link_text and link_text.strip() in [">", ">>", "›", "»"]:
                next_page_exists = True
                break
        
        # Also check for numbered pagination links beyond current page
        if not next_page_exists:
            current_page_text = response.css(".pagination b::text").get()
            if not current_page_text:
                current_page_text = response.css(".pagination li.active span::text, .pagination li.active a::text").get()
            
            if current_page_text:
                try:
                    current_num = int(current_page_text.strip())
                    # Check if there's a link with next page number
                    for link in response.css(".pagination a"):
                        link_text = link.css("::text").get()
                        if link_text and link_text.strip().isdigit():
                            if int(link_text.strip()) > current_num:
                                next_page_exists = True
                                break
                except (ValueError, TypeError):
                    pass
        
        if next_page_exists:
            # Get current page from URL
            parsed = urlparse(response.url)
            query_params = parse_qs(parsed.query)
            current_page = int(query_params.get('page', [1])[0])
            next_page = current_page + 1
            
            # Check max page limit to prevent excessive Playwright click chains
            if next_page > self.MAX_PAGES:
                logger.info(f"Reached max page limit ({self.MAX_PAGES}), stopping pagination")
                return
            
            # Check if next page was already scraped
            page_id = f"{parsed.path}:{next_page}"
            if page_id in self.pages_scraped:
                logger.info(f"Page {next_page} already scraped, stopping")
                return
            
            logger.info(f"Following pagination to page {next_page} via Playwright click")
            
            # Build the base URL without query params
            base_url = f"{parsed.scheme}://{parsed.netloc}{parsed.path}"
            
            # Build a chain of clicks: start from page 1 and click "Next" (next_page - 1) times
            # This is necessary because each Playwright request starts fresh
            page_methods = [
                # Wait for initial page load
                PageMethod("wait_for_load_state", "networkidle"),
            ]
            
            # Add click actions for each page we need to navigate through
            # UltraTech uses OpenCart pagination - click the ">" or next number link
            for page_num in range(2, next_page + 1):
                page_methods.extend([
                    # Click the next page link (either ">" symbol or next number)
                    # Try ">" first, common in OpenCart
                    PageMethod("click", ".pagination a:has-text('>')"),
                    # Wait for page update (respecting crawl delay)
                    PageMethod("wait_for_timeout", 2000),
                    PageMethod("wait_for_load_state", "networkidle"),
                ])
            
            yield scrapy.Request(
                url=base_url,  # Start from base URL (page 1)
                callback=self.parse,
                dont_filter=True,
                meta={
                    "playwright": True,
                    "playwright_include_page": False,
                    "playwright_page_methods": page_methods,
                },
            )
        else:
            logger.info("No more pagination links found - reached last page")
