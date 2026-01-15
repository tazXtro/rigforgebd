"""
Scrapy item definitions for scraped products.
"""

import scrapy


class GPUItem(scrapy.Item):
    """Item for GPU products."""
    # Basic product info
    name = scrapy.Field()
    brand = scrapy.Field()
    image = scrapy.Field()
    product_url = scrapy.Field()
    
    # Price info
    price = scrapy.Field()
    original_price = scrapy.Field()
    availability = scrapy.Field()
    
    # Retailer info
    retailer_slug = scrapy.Field()
    
    # GPU specifications
    chipset = scrapy.Field()
    memory_size = scrapy.Field()
    memory_type = scrapy.Field()
    memory_bus = scrapy.Field()
    base_clock = scrapy.Field()
    boost_clock = scrapy.Field()
    interface = scrapy.Field()
    power_connector = scrapy.Field()
    tdp = scrapy.Field()
    recommended_psu = scrapy.Field()
    hdmi_ports = scrapy.Field()
    displayport_ports = scrapy.Field()
    length = scrapy.Field()
    slots = scrapy.Field()
    cuda_cores = scrapy.Field()
    stream_processors = scrapy.Field()
    ray_tracing = scrapy.Field()
    dlss_support = scrapy.Field()
    fsr_support = scrapy.Field()
