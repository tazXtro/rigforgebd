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
    
    # Playwright configuration (override in subclass for JS-heavy sites)
    use_playwright = False
    playwright_config = None  # Dict with wait_until, timeout, etc.
    
    def start_requests(self):
        """
        Generate initial requests, applying Playwright if configured.
        
        Subclasses can override if they need custom start_requests logic.
        """
        for url in self.start_urls:
            yield self.make_request(url, callback=self.parse)
    
    def make_request(self, url, callback, playwright=None, **kwargs):
        """
        Create a request with optional Playwright rendering.
        
        This is the recommended way to create requests in retailer spiders,
        as it automatically handles Playwright configuration based on the
        spider's use_playwright setting.
        
        Args:
            url: Target URL
            callback: Parse callback function
            playwright: Override Playwright usage (True/False/None=use default)
            **kwargs: Additional request arguments (meta, headers, etc.)
        
        Returns:
            scrapy.Request with appropriate meta for Playwright if needed
            
        Example:
            # Use spider's default setting
            yield self.make_request(url, self.parse_detail)
            
            # Force Playwright for specific request
            yield self.make_request(url, self.parse_detail, playwright=True)
            
            # Disable Playwright for specific request
            yield self.make_request(url, self.parse_detail, playwright=False)
        """
        use_pw = playwright if playwright is not None else self.use_playwright
        
        meta = kwargs.pop("meta", {})
        
        if use_pw:
            meta["playwright"] = True
            meta["playwright_include_page"] = False
            
            # Apply playwright config if available
            if self.playwright_config:
                page_goto_kwargs = {}
                if "wait_until" in self.playwright_config:
                    page_goto_kwargs["wait_until"] = self.playwright_config["wait_until"]
                if "timeout" in self.playwright_config:
                    page_goto_kwargs["timeout"] = self.playwright_config["timeout"]
                if page_goto_kwargs:
                    meta["playwright_page_goto_kwargs"] = page_goto_kwargs
        
        return scrapy.Request(url, callback=callback, meta=meta, **kwargs)
    
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
