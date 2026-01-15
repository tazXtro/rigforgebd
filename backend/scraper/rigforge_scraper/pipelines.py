"""
Scrapy Pipelines for RigForge Scraper.

Pipelines process items after they are scraped by spiders.
"""

import re
import logging
from datetime import datetime, timezone

from itemadapter import ItemAdapter

logger = logging.getLogger(__name__)


class CleaningPipeline:
    """
    Pipeline for cleaning and normalizing scraped data.
    
    Handles text normalization, price cleaning, and URL formatting.
    """
    
    def process_item(self, item, spider):
        adapter = ItemAdapter(item)
        
        # Clean product name
        name = adapter.get("name", "")
        if name:
            adapter["name"] = self._clean_text(name)
        
        # Clean and parse price
        price = adapter.get("price")
        if price is not None:
            adapter["price"] = self._parse_price(price)
        
        # Ensure URL is absolute
        url = adapter.get("product_url", "")
        if url and not url.startswith("http"):
            base_url = getattr(spider, "base_url", "")
            adapter["product_url"] = f"{base_url}{url}"
        
        # Add scraped timestamp
        adapter["scraped_at"] = datetime.now(timezone.utc).isoformat()
        
        return item
    
    def _clean_text(self, text: str) -> str:
        """Remove extra whitespace and normalize text."""
        if not text:
            return ""
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text.strip())
        # Remove common unwanted chars
        text = text.replace('\n', ' ').replace('\r', ' ').replace('\t', ' ')
        return text.strip()
    
    def _parse_price(self, price) -> float:
        """
        Parse price from various formats.
        
        Handles:
        - "৳ 75,000"
        - "75000"
        - "75,000.00"
        - 75000
        """
        if isinstance(price, (int, float)):
            return float(price)
        
        if isinstance(price, str):
            # Remove currency symbols and common prefixes
            price = price.replace("৳", "").replace("BDT", "").replace("Tk", "")
            # Remove commas and whitespace
            price = price.replace(",", "").strip()
            # Extract number
            match = re.search(r'[\d.]+', price)
            if match:
                try:
                    return float(match.group())
                except ValueError:
                    pass
        
        logger.warning(f"Could not parse price: {price}")
        return 0.0


class ValidationPipeline:
    """
    Pipeline for validating scraped items.
    
    Drops items that don't meet minimum requirements.
    """
    
    def process_item(self, item, spider):
        adapter = ItemAdapter(item)
        
        # Validate required fields
        name = adapter.get("name", "").strip()
        if not name:
            logger.warning("Dropping item: missing name")
            raise DropItem("Missing product name")
        
        price = adapter.get("price", 0)
        if price <= 0:
            logger.warning(f"Dropping item '{name}': invalid price {price}")
            raise DropItem(f"Invalid price for {name}")
        
        url = adapter.get("product_url", "")
        if not url:
            logger.warning(f"Dropping item '{name}': missing URL")
            raise DropItem(f"Missing URL for {name}")
        
        category = adapter.get("category", "")
        if not category:
            logger.warning(f"Dropping item '{name}': missing category")
            raise DropItem(f"Missing category for {name}")
        
        # Ensure retailer slug is set
        if not adapter.get("retailer_slug"):
            adapter["retailer_slug"] = getattr(spider, "retailer_slug", "unknown")
        
        # Default in_stock to True if not set
        if adapter.get("in_stock") is None:
            adapter["in_stock"] = True
        
        return item


class DropItem(Exception):
    """Exception to drop an item from the pipeline."""
    pass
