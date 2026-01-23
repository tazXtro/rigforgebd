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
            "specs_source_url": adapter.get("specs_source_url"),
        }
        
        try:
            result = self.ingestion_service.ingest_scraped_product(scraped_data)
            if result:
                self.items_saved += 1
                logger.debug(f"Saved to DB: {scraped_data['name']}")
                
                # Store product_id in item for compatibility pipeline
                adapter['_product_id'] = result['product']['id']
            else:
                self.items_failed += 1
                logger.warning(f"Failed to save: {scraped_data['name']}")
        except Exception as e:
            self.items_failed += 1
            logger.error(f"Error saving to DB: {e}")
        
        return item


class CompatibilityExtractionPipeline:
    """
    Pipeline for extracting compatibility attributes from scraped products.
    
    Uses component-specific normalizers to extract canonical compatibility
    fields (socket, chipset, DDR type, etc.) and stores them in product_compat.
    
    This pipeline runs after SupabaseIngestionPipeline to ensure the product
    exists in the database before storing compatibility data.
    """
    
    # Map category names to normalizer types
    # Must handle all variations from scrapers (title case, lowercase, plural, slug)
    CATEGORY_TO_TYPE = {
        # CPU variations
        'processor': 'cpu',
        'processors': 'cpu',
        'cpu': 'cpu',
        'cpus': 'cpu',
        # Motherboard variations
        'motherboard': 'motherboard',
        'motherboards': 'motherboard',
        'mobo': 'motherboard',
        # RAM/Memory variations
        'ram': 'ram',
        'memory': 'ram',
    }
    
    def __init__(self):
        self.normalizers = {}
        self.compat_repository = None
        self.items_extracted = 0
        self.items_skipped = 0
        self.items_failed = 0
    
    def open_spider(self, spider):
        """Initialize normalizers and repository when spider opens."""
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
        
        # Import normalizers
        from rigforge_scraper.normalizers import (
            CPUNormalizer,
            MotherboardNormalizer,
            RAMNormalizer,
        )
        
        # Initialize normalizers
        self.normalizers = {
            'cpu': CPUNormalizer(),
            'motherboard': MotherboardNormalizer(),
            'ram': RAMNormalizer(),
        }
        
        # Import repository
        from products.repositories import compat_repository
        self.compat_repository = compat_repository
        
        logger.info("CompatibilityExtractionPipeline initialized")
    
    def close_spider(self, spider):
        """Log summary when spider closes."""
        logger.info(
            f"Compatibility extraction complete: {self.items_extracted} extracted, "
            f"{self.items_skipped} skipped (not relevant), "
            f"{self.items_failed} failed"
        )
    
    def process_item(self, item, spider):
        """Extract compatibility attributes and store in product_compat."""
        adapter = ItemAdapter(item)
        
        # Check if we have product_id from ingestion pipeline
        product_id = adapter.get('_product_id')
        if not product_id:
            # No product_id means product wasn't saved (or ingestion pipeline not enabled)
            self.items_skipped += 1
            return item
        
        # Get category and determine if relevant for compatibility
        category = adapter.get('category', '').lower().replace(' ', '-')
        component_type = self.CATEGORY_TO_TYPE.get(category)
        
        if not component_type:
            # Not a compatibility-relevant category
            self.items_skipped += 1
            return item
        
        # Get the appropriate normalizer
        normalizer = self.normalizers.get(component_type)
        if not normalizer:
            self.items_skipped += 1
            return item
        
        try:
            # Extract compatibility attributes
            result = normalizer.extract(
                title=adapter.get('name', ''),
                specs=adapter.get('specs', {}),
                brand=adapter.get('brand'),
            )
            
            # Save to product_compat table
            compat_data = result.to_dict()
            save_result = self.compat_repository.upsert(product_id, compat_data)
            
            if save_result:
                self.items_extracted += 1
                logger.debug(
                    f"Saved compat for '{adapter.get('name', '')}': "
                    f"confidence={result.confidence:.2f}, source={result.source}"
                )
            else:
                self.items_failed += 1
                logger.warning(f"Failed to save compat for: {adapter.get('name', '')}")
            
        except Exception as e:
            self.items_failed += 1
            logger.error(f"Error extracting/saving compat: {e}")
        
        return item

