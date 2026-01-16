"""
Base spider class for retailer spiders.

Provides common functionality for all retailer spiders.
"""

import re
import logging
from typing import Optional
from urllib.parse import urlparse

import scrapy
from slugify import slugify

from rigforge_scraper.items import ProductItem

logger = logging.getLogger(__name__)


class BaseRetailerSpider(scrapy.Spider):
    """
    Base spider class with shared utilities for all retailer spiders.
    
    Provides:
    - Price parsing helpers
    - Text normalization
    - Slug generation
    - Brand extraction
    - Category mapping
    
    Subclasses must implement:
    - name: Spider name
    - retailer_slug: Retailer identifier (e.g., 'startech')
    - base_url: Base URL of the retailer website
    - start_urls: List of URLs to start crawling
    - parse(): Main parsing method
    """
    
    # Must be overridden by subclasses
    name = "base"
    retailer_slug = "base"
    base_url = ""
    
    # Category mappings (can be overridden)
    category_mappings = {
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
    
    # Known brands for extraction
    known_brands = [
        "AMD", "Intel", "NVIDIA", "ASUS", "MSI", "Gigabyte",
        "Corsair", "G.Skill", "Kingston", "Samsung", "Western Digital",
        "Seagate", "Crucial", "NZXT", "Cooler Master", "be quiet!",
        "Noctua", "EVGA", "Zotac", "Sapphire", "PowerColor",
        "ASRock", "Biostar", "Thermaltake", "Seasonic", "Lian Li",
        "Phanteks", "Fractal Design", "LG", "BenQ", "Dell", "HP",
        "Acer", "ViewSonic", "Logitech", "Razer", "SteelSeries",
        "HyperX", "Team", "PNY", "Adata", "Patriot", "Antec",
        "DeepCool", "Arctic", "XPG", "Toshiba", "WD", "GALAX",
        "Colorful", "Inno3D", "Palit", "Patriot", "Silicon Power",
        "Transcend", "Lexar", "PNY", "Addlink", "Netac", "Hikvision",
    ]
    
    # Playwright configuration (can be overridden by subclasses)
    use_playwright = False  # Default to standard HTTP requests
    playwright_wait_strategy = "networkidle"  # Options: networkidle, load, domcontentloaded
    playwright_page_goto_timeout = 30000  # 30 seconds

    
    def parse_price(self, price_text) -> Optional[float]:
        """
        Parse price from text, handling BDT currency format.
        
        Args:
            price_text: Price string like "৳ 75,000" or "75000"
            
        Returns:
            Float price value or None if unparseable
        """
        if price_text is None:
            return None
        
        if isinstance(price_text, (int, float)):
            return float(price_text)
        
        if not isinstance(price_text, str):
            return None
        
        # Remove currency symbols and whitespace
        cleaned = price_text.replace("৳", "").replace("BDT", "").replace("Tk", "")
        cleaned = cleaned.replace(",", "").strip()
        
        # Extract numeric value
        match = re.search(r'[\d.]+', cleaned)
        if match:
            try:
                return float(match.group())
            except ValueError:
                logger.warning(f"Could not parse price: {price_text}")
                return None
        
        return None
    
    def normalize_text(self, text: str) -> str:
        """
        Clean and normalize text by removing extra whitespace.
        
        Args:
            text: Raw text string
            
        Returns:
            Cleaned text string
        """
        if not text:
            return ""
        
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text.strip())
        # Remove common unwanted characters
        text = text.replace('\n', ' ').replace('\r', ' ').replace('\t', ' ')
        return text.strip()
    
    def generate_slug(self, name: str) -> str:
        """
        Generate a URL-friendly slug from product name.
        
        Args:
            name: Product name
            
        Returns:
            URL-friendly slug
        """
        return slugify(name, lowercase=True, max_length=200)
    
    def extract_brand(self, name: str) -> Optional[str]:
        """
        Extract brand name from product name.
        
        Args:
            name: Product name
            
        Returns:
            Brand name if found, None otherwise
        """
        if not name:
            return None
        
        name_upper = name.upper()
        for brand in self.known_brands:
            if brand.upper() in name_upper:
                return brand
        
        # Fallback: use first word as brand
        parts = name.split()
        return parts[0] if parts else None
    
    def get_category(self, url_or_text: str) -> str:
        """
        Determine category from URL path or text.
        
        Args:
            url_or_text: URL or category text to parse
            
        Returns:
            Normalized category name
        """
        text = url_or_text.lower()
        
        for key, value in self.category_mappings.items():
            if key in text:
                return value
        
        # Default to the text itself
        return url_or_text.title()
    
    def get_category_slug(self, category: str) -> str:
        """
        Generate category slug from category name.
        
        Args:
            category: Category name
            
        Returns:
            URL-friendly category slug
        """
        return slugify(category, lowercase=True)
    
    def is_in_stock(self, stock_text: str) -> bool:
        """
        Determine if product is in stock from text.
        
        Args:
            stock_text: Stock status text
            
        Returns:
            True if in stock, False otherwise
        """
        if not stock_text:
            return True  # Default to in stock
        
        stock_lower = stock_text.lower()
        out_of_stock_indicators = [
            "out of stock",
            "unavailable",
            "coming soon",
            "pre-order",
            "sold out",
        ]
        
        for indicator in out_of_stock_indicators:
            if indicator in stock_lower:
                return False
        
        return True
    
    def create_product_item(
        self,
        name: str,
        price: float,
        product_url: str,
        category: str,
        image_url: str = None,
        brand: str = None,
        in_stock: bool = True,
        specs: dict = None,
        source_page: str = None,
    ) -> ProductItem:
        """
        Create a ProductItem with all required fields.
        
        Args:
            name: Product name
            price: Price in BDT
            product_url: Full URL to product page
            category: Product category
            image_url: Product image URL (optional)
            brand: Product brand (optional, will be extracted if not provided)
            in_stock: Stock availability (optional, default True)
            specs: Product specifications dict (optional)
            source_page: URL of the page where product was found (optional)
            
        Returns:
            ProductItem with all fields populated
        """
        return ProductItem(
            name=self.normalize_text(name),
            price=price,
            product_url=product_url,
            retailer_slug=self.retailer_slug,
            category=category,
            image_url=image_url,
            brand=brand or self.extract_brand(name),
            in_stock=in_stock,
            specs=specs or {},
            source_page=source_page,
        )
    
    def make_request(
        self,
        url: str,
        callback=None,
        playwright: bool = None,
        wait_for_selector: str = None,
        **kwargs
    ) -> scrapy.Request:
        """
        Unified request method supporting both Scrapy and Playwright.
        
        This method provides a clean interface for creating requests that can
        use either standard HTTP (Scrapy) or browser rendering (Playwright).
        
        Args:
            url: Target URL to request
            callback: Callback function (default: self.parse)
            playwright: Override spider's use_playwright setting (True/False/None)
                       If None, uses self.use_playwright
            wait_for_selector: CSS selector to wait for (Playwright only)
                              Useful for waiting until content is loaded
            **kwargs: Additional scrapy.Request arguments
            
        Returns:
            scrapy.Request configured for Scrapy or Playwright
            
        Examples:
            # Use spider's default mode (Scrapy or Playwright)
            yield self.make_request(url, callback=self.parse_detail)
            
            # Force Playwright for specific request (hybrid mode)
            yield self.make_request(
                url,
                callback=self.parse_js_page,
                playwright=True,
                wait_for_selector=".product-loaded"
            )
            
            # Force standard Scrapy even if spider uses Playwright by default
            yield self.make_request(url, callback=self.parse_static, playwright=False)
        """
        # Determine rendering mode
        use_pw = playwright if playwright is not None else self.use_playwright
        
        if use_pw:
            # Configure Playwright meta
            meta = kwargs.get('meta', {})
            meta['playwright'] = True
            
            # Navigation options
            page_goto_kwargs = {
                'wait_until': self.playwright_wait_strategy,
                'timeout': self.playwright_page_goto_timeout,
            }
            meta.setdefault('playwright_page_goto_kwargs', page_goto_kwargs)
            
            # Wait for specific selector if provided
            if wait_for_selector:
                meta['playwright_page_methods'] = [
                    {
                        'method': 'wait_for_selector',
                        'args': [wait_for_selector],
                        'kwargs': {'timeout': 15000},
                    }
                ]
            
            kwargs['meta'] = meta
            logger.debug(f"Creating Playwright request for: {url}")
        else:
            logger.debug(f"Creating standard Scrapy request for: {url}")
        
        return scrapy.Request(url, callback=callback or self.parse, **kwargs)
    
    def scroll_page(self) -> dict:
        """
        Playwright page method to scroll page and trigger lazy loading.
        
        Use this in playwright_page_methods to scroll the page, which can
        trigger lazy-loaded content to appear.
        
        Returns:
            Playwright page method dict for use in meta['playwright_page_methods']
            
        Example:
            meta = {
                'playwright': True,
                'playwright_page_methods': [
                    self.scroll_page(),
                ]
            }
        """
        return {
            'method': 'evaluate',
            'args': ['window.scrollTo(0, document.body.scrollHeight)'],
        }
    
    def click_element(self, selector: str, timeout: int = 5000) -> dict:
        """
        Playwright page method to click an element.
        
        Useful for clicking "Load More" buttons, accepting cookie banners, etc.
        
        Args:
            selector: CSS selector of element to click
            timeout: Click timeout in milliseconds (default: 5000)
            
        Returns:
            Playwright page method dict for use in meta['playwright_page_methods']
            
        Example:
            meta = {
                'playwright': True,
                'playwright_page_methods': [
                    self.click_element('.load-more-btn'),
                ]
            }
        """
        return {
            'method': 'click',
            'args': [selector],
            'kwargs': {'timeout': timeout},
        }

