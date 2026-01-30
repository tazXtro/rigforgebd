"""
Techland spider for scraping techlandbd.com.

Techland uses Livewire/Alpine.js with heavy JavaScript rendering.
Product specifications are extracted from JSON-LD structured data
embedded in each product page.
"""

import html
import json
import logging
import re
import traceback
from urllib.parse import urljoin, urlparse, parse_qs

import scrapy
from scrapy_playwright.page import PageMethod

from rigforge_scraper.spiders.base import BaseRetailerSpider

logger = logging.getLogger(__name__)


class TechlandSpider(BaseRetailerSpider):
    """
    Spider for scraping products from techlandbd.com.
    
    Techland uses heavy JavaScript rendering for product listings,
    requiring Playwright to properly render the page before scraping.
    
    Usage:
        python run_spider.py techland
        python run_spider.py techland --category graphics-card --limit 5
    """
    
    name = "techland"
    retailer_slug = "techland"
    base_url = "https://www.techlandbd.com"
    
    # Enable Playwright for this spider
    use_playwright = True
    playwright_config = {
        "wait_until": "networkidle",
        "timeout": 30000,
    }
    
    # Start with graphics cards for initial testing
    start_urls = [
        "https://www.techlandbd.com/pc-components/graphics-card",
    ]
    
    # All available category URLs
    all_category_urls = {
        "processor": "https://www.techlandbd.com/pc-components/processor",
        "graphics-card": "https://www.techlandbd.com/pc-components/graphics-card",
        "motherboard": "https://www.techlandbd.com/pc-components/motherboard",
        "ram": "https://www.techlandbd.com/pc-components/shop-desktop-ram",
        "storage": "https://www.techlandbd.com/pc-components/solid-state-drive",
        "power-supply": "https://www.techlandbd.com/pc-components/power-supply",
        "casing": "https://www.techlandbd.com/pc-components/computer-case",
        "cooling": "https://www.techlandbd.com/pc-components/cpu-cooler",
        "monitor": "https://www.techlandbd.com/monitor-and-display/computer-monitor",
    }
    
    # Maximum pages to scrape per category (prevents excessive Playwright click chains)
    # Each page requires clicking "Next" from page 1, so page 10 = 9 clicks + waits
    MAX_PAGES = 10
    
    # Custom settings for Playwright spider
    custom_settings = {
        "DOWNLOAD_DELAY": 3.0,  # Higher delay for Playwright
        "CONCURRENT_REQUESTS": 1,
    }
    
    def __init__(self, category=None, limit=None, *args, **kwargs):
        """
        Initialize the spider with optional arguments.
        
        Args:
            category: Specific category to scrape (e.g., 'processor') or 'all'
            limit: Maximum number of products to scrape
        """
        super().__init__(*args, **kwargs)
        
        self.limit = int(limit) if limit else None
        self.items_scraped = 0
        self.pages_scraped = set()  # Track scraped pages to prevent infinite loops
        self.current_target_page = {}  # Track target page for each category path
        
        # Set start URLs based on category argument
        if category == "all":
            self.start_urls = list(self.all_category_urls.values())
            logger.info(f"Starting with ALL categories ({len(self.start_urls)} URLs)")
        elif category and category in self.all_category_urls:
            self.start_urls = [self.all_category_urls[category]]
            logger.info(f"Starting with category: {category}")
        elif category:
            logger.warning(f"Unknown category '{category}', using default")
    
    def parse(self, response):
        """
        Parse a category listing page.
        
        Extracts product information from the JS-rendered listing page.
        """
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
        logger.info(f"Parsing Techland category: {category} - Page {current_page} - {response.url}")
        
        # Updated Techland product card selectors (as of Jan 2026)
        # Main selector: article.products-list__item
        product_cards = response.css("article.products-list__item")
        
        if not product_cards:
            # Try alternative selectors
            product_cards = response.css(".products-list__item, .product-layout, .product-thumb")
        
        if not product_cards:
            logger.warning(f"No products found on page. HTML length: {len(response.text)}")
            # Log a snippet for debugging
            logger.debug(f"Page snippet: {response.text[:500]}")
            return
        
        logger.info(f"Found {len(product_cards)} products on page {current_page}")
        
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
        # Note: Techland's robots.txt blocks ?page= URLs, so we use Playwright page actions
        if not self.limit or self.items_scraped < self.limit:
            yield from self.follow_pagination_via_click(response)
    
    def parse_product_card(self, card, category: str, source_url: str):
        """
        Parse a single product card from the listing page.
        
        Instead of creating the item directly, this method extracts basic info
        and follows the product URL to get detailed specifications.
        
        Args:
            card: Scrapy selector for the product card
            category: Product category
            source_url: URL of the listing page
            
        Returns:
            Request to product detail page, or None if parsing fails
        """
        try:
            # Extract product name - updated selectors for Techland Jan 2026
            name = card.css("h4 a::text").get()
            if not name:
                name = card.css("h4::text, h3 a::text, .product-name a::text").get()
            
            if not name:
                # Try getting from link aria-label
                name = card.css("a[aria-label*='product details']::attr(aria-label)").get()
                if name:
                    name = name.replace(" product details", "")
            
            if not name:
                logger.warning(f"SKIPPED: Could not find product name. Card HTML snippet: {card.get()[:200]}")
                return None
            
            name = self.normalize_text(name)
            
            # Extract product URL - updated selectors
            product_url = card.css("h4 a::attr(href)").get()
            if not product_url:
                product_url = card.css("a[aria-label*='product details']::attr(href)").get()
            if not product_url:
                product_url = card.css("a[href*='techlandbd.com']::attr(href)").get()
            
            if product_url:
                product_url = urljoin(self.base_url, product_url)
            else:
                logger.warning(f"SKIPPED: Could not find URL for product: {name}")
                return None
            
            # Extract price - updated selectors for Techland Jan 2026
            # Main price is in span.text-base.font-bold.text-gray-800
            price_text = card.css("span.text-base.font-bold.text-gray-800::text").get()
            if not price_text:
                price_text = card.css(".font-bold.text-gray-800::text").get()
            if not price_text:
                price_text = card.css(".price-new::text, .price::text, .product-price::text").get()
            
            price = self.parse_price(price_text)
            if price is None or price <= 0:
                # Try looking for price in nested elements
                price_text = card.css(".price span::text").get()
                price = self.parse_price(price_text)
            
            # INTENTIONAL: Skip products without valid prices (out of stock, upcoming, etc.)
            # We only want to display products that users can actually purchase
            if price is None or price <= 0:
                logger.debug(f"Skipping product (no valid price - likely out of stock): {name}")
                return None
            
            # Extract image URL - updated selectors
            image_url = card.css("img.product-image-optimized::attr(src)").get()
            if not image_url:
                image_url = card.css(".relative img::attr(src), img::attr(src)").get()
            
            if image_url:
                image_url = urljoin(self.base_url, image_url)
            
            # Check stock status - updated selectors
            # In stock: .text-green-700 with text "In Stock"
            # Out of stock: .text-red-600 or similar
            stock_text = card.css(".text-green-700::text, .text-red-600::text").get()
            in_stock = stock_text and "in stock" in stock_text.lower() if stock_text else True
            
            # INTENTIONAL: Skip out-of-stock products
            # Techland shows prices even for out-of-stock items, so we must check stock status explicitly
            if not in_stock:
                logger.debug(f"Skipping product (out of stock): {name}")
                return None
            
            # Extract brand
            brand = self.extract_brand(name)
            
            # Store item data in meta and follow to product detail page for specs
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
            # Note: Specs are embedded in JSON-LD and wire:initial-data, so no need for
            # Playwright tab clicking - a simple request is sufficient
            return self.make_request(
                product_url,
                callback=self.parse_product_detail,
                meta={'item_data': item_data},
            )
            
        except Exception as e:
            logger.error(f"Error parsing Techland product card: {e}\n{traceback.format_exc()}")
            return None
    
    def parse_product_detail(self, response):
        """
        Parse Techland product detail page to extract specifications.
        
        Techland stores product specs in JSON-LD structured data (schema.org Product).
        Falls back to Livewire wire:initial-data if JSON-LD is unavailable.
        
        Args:
            response: Scrapy response from product detail page
            
        Yields:
            ProductItem with specifications
        """
        item_data = response.meta['item_data']
        
        # Try JSON-LD first (most reliable), then Livewire data as fallback
        specs = self._extract_specs_from_json_ld(response)
        if not specs:
            specs = self._extract_specs_from_livewire(response)
        
        if specs:
            logger.info(f"Extracted {len(specs)} specs for: {item_data['name']}")
        else:
            logger.warning(f"No specs found for: {item_data['name']} - URL: {response.url}")
        
        yield self.create_product_item(
            **item_data,
            specs=specs,
            specs_source_url=response.url,
        )
    
    def _extract_specs_from_json_ld(self, response) -> dict:
        """
        Extract product specifications from JSON-LD structured data.
        
        Techland embeds schema.org Product data with specs in additionalProperty.
        
        Args:
            response: Scrapy response object
            
        Returns:
            Dict of spec name -> value pairs
        """
        specs = {}
        json_ld_scripts = response.css('script[type="application/ld+json"]::text').getall()
        
        for script_text in json_ld_scripts:
            try:
                data = json.loads(script_text)
                products = self._find_products_in_json_ld(data)
                
                for product in products:
                    for prop in product.get('additionalProperty', []):
                        if prop.get('@type') == 'PropertyValue':
                            name = prop.get('name', '').strip()
                            value = prop.get('value', '').strip()
                            if name and value:
                                specs[name] = self._clean_spec_value(value)
            except json.JSONDecodeError:
                continue
        
        return specs
    
    def _find_products_in_json_ld(self, data) -> list:
        """Find all Product objects in JSON-LD data (handles arrays and single objects)."""
        if isinstance(data, list):
            return [item for item in data if item.get('@type') == 'Product']
        elif isinstance(data, dict) and data.get('@type') == 'Product':
            return [data]
        return []
    
    def _extract_specs_from_livewire(self, response) -> dict:
        """
        Extract specs from Livewire wire:initial-data attribute (fallback method).
        
        Args:
            response: Scrapy response object
            
        Returns:
            Dict of spec name -> value pairs
        """
        specs = {}
        wire_data = response.css('[wire\\:initial-data]::attr(wire:initial-data)').get()
        
        if not wire_data:
            return specs
        
        try:
            data = json.loads(html.unescape(wire_data))
            attributes = (
                data.get('serverMemo', {})
                .get('data', {})
                .get('pp_data', {})
                .get('active_product', {})
                .get('attributes', [])
            )
            
            # Attributes to skip (already extracted elsewhere)
            skip_attrs = {'brand', 'model', 'warranty'}
            
            for attr in attributes:
                name = attr.get('name', '').strip()
                if name.lower() in skip_attrs:
                    continue
                
                # Value can be in pivot.value or direct value
                pivot = attr.get('pivot', {})
                value = pivot.get('value', attr.get('value', '')).strip()
                
                if name and value:
                    specs[name] = self._clean_spec_value(value)
                    
        except (json.JSONDecodeError, KeyError, TypeError) as e:
            logger.debug(f"Failed to parse wire:initial-data: {e}")
        
        return specs
    
    def _clean_spec_value(self, value: str) -> str:
        """
        Clean up a specification value by removing HTML tags and normalizing text.
        
        Args:
            value: Raw spec value potentially containing HTML
            
        Returns:
            Cleaned and normalized value string
        """
        value = html.unescape(value)
        # Replace <br> tags with comma separator
        value = re.sub(r'&lt;br&gt;|&lt;/br&gt;|<br\s*/?>', ', ', value)
        # Remove any remaining HTML tags
        value = re.sub(r'&lt;[^&]*&gt;|<[^>]+>', '', value)
        return self.normalize_text(value)
    
    def follow_pagination_via_click(self, response):
        """
        Follow pagination by clicking through pages using Playwright.
        
        Techland's robots.txt blocks ?page= URLs, so we use Playwright page actions
        to click the pagination buttons. Since each request starts a fresh browser,
        we build a chain of clicks from page 1 to reach the target page.
        
        Args:
            response: Current page response
            
        Yields:
            Request for next page (with Playwright page actions)
        """
        # Check if there's a next page button
        next_page_btn = (
            response.css('[aria-label="Go to next page"]') or
            response.css('[wire\\:click="nextPage"]')
        )
        
        if not next_page_btn:
            logger.info("No more pagination links found - reached last page")
            return
        
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
        page_methods = [PageMethod("wait_for_load_state", "networkidle")]
        
        for _ in range(next_page - 1):
            page_methods.extend([
                PageMethod("click", '[aria-label="Go to next page"]'),
                PageMethod("wait_for_timeout", 1500),
                PageMethod("wait_for_load_state", "networkidle"),
            ])
        
        yield scrapy.Request(
            url=base_url,
            callback=self.parse,
            dont_filter=True,
            meta={
                "playwright": True,
                "playwright_include_page": False,
                "playwright_page_methods": page_methods,
            },
        )
