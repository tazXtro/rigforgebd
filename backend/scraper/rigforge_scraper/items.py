"""
Scrapy Items for RigForge Scraper.

Defines the data structures for scraped items.
"""

import scrapy


class ProductItem(scrapy.Item):
    """
    Represents a scraped product from a retailer.
    
    Fields match the expected format for the Django ingestion service.
    """
    
    # Required fields
    name = scrapy.Field()
    price = scrapy.Field()
    product_url = scrapy.Field()
    retailer_slug = scrapy.Field()
    category = scrapy.Field()
    
    # Optional fields
    image_url = scrapy.Field()
    brand = scrapy.Field()
    in_stock = scrapy.Field()
    specs = scrapy.Field()
    specs_source_url = scrapy.Field()  # URL where specs were scraped from
    
    # Metadata (not sent to Django)
    scraped_at = scrapy.Field()
    source_page = scrapy.Field()
    
    # Internal pipeline fields (for passing data between pipelines)
    _product_id = scrapy.Field()  # Set by SupabaseIngestionPipeline for CompatibilityExtractionPipeline
