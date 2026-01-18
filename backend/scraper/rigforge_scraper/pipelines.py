"""
Scrapy Pipelines for RigForge Scraper.

Pipelines process items after they are scraped by spiders.
"""

import re
import logging
from datetime import datetime, timezone

from itemadapter import ItemAdapter
from scrapy.exceptions import DropItem

logger = logging.getLogger(__name__)


class CleaningPipeline:
    """
    Pipeline for cleaning and normalizing scraped data.
    
    Handles text normalization, price cleaning, and URL formatting.
    """
    
    def process_item(self, item, spider):
        adapter = ItemAdapter(item)
        
        # Clean product name (light cleanup - spiders already normalize)
        name = adapter.get("name", "")
        if name:
            adapter["name"] = self._clean_text(name)
        
        # Ensure price is a float (spiders already parse, this is a safety check)
        price = adapter.get("price")
        if price is not None and not isinstance(price, (int, float)):
            logger.warning(f"Price should be numeric, got: {type(price).__name__}")
            adapter["price"] = 0.0
        
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
    
    # Note: _parse_price removed - spiders handle price parsing via BaseRetailerSpider.parse_price()
    # The pipeline now only validates that prices are numeric (see process_item above)


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


# DropItem is now imported from scrapy.exceptions (line 12)


class SupabaseIngestionPipeline:
    """
    Pipeline for saving scraped items to Supabase database.
    
    Uses the Django products service for ingestion.
    This pipeline is optional and only enabled when --save flag is used.
    """
    
    def __init__(self):
        self.ingestion_service = None
        self.items_saved = 0
        self.items_failed = 0
    
    def open_spider(self, spider):
        """Initialize Django and the ingestion service when spider opens."""
        # Set up Django settings
        import os
        import sys
        
        # Add backend to path
        backend_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        if backend_path not in sys.path:
            sys.path.insert(0, backend_path)
        
        # Configure Django settings
        os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
        
        import django
        django.setup()
        
        # Now import the service
        from products.services import product_ingestion_service
        self.ingestion_service = product_ingestion_service
        
        logger.info("SupabaseIngestionPipeline initialized")
    
    def close_spider(self, spider):
        """Log summary when spider closes."""
        logger.info(
            f"Supabase ingestion complete: {self.items_saved} saved, "
            f"{self.items_failed} failed"
        )
    
    def process_item(self, item, spider):
        """Save item to Supabase database."""
        from itemadapter import ItemAdapter
        adapter = ItemAdapter(item)
        
        # Convert to dict for ingestion service
        scraped_data = {
            "name": adapter.get("name"),
            "price": adapter.get("price"),
            "product_url": adapter.get("product_url"),
            "retailer_slug": adapter.get("retailer_slug"),
            "category": adapter.get("category"),
            "image_url": adapter.get("image_url"),
            "brand": adapter.get("brand"),
            "in_stock": adapter.get("in_stock", True),
            "specs": adapter.get("specs", {}),
        }
        
        try:
            result = self.ingestion_service.ingest_scraped_product(scraped_data)
            if result:
                self.items_saved += 1
                logger.debug(f"Saved to DB: {scraped_data['name']}")
            else:
                self.items_failed += 1
                logger.warning(f"Failed to save: {scraped_data['name']}")
        except Exception as e:
            self.items_failed += 1
            logger.error(f"Error saving to DB: {e}")
        
        return item

