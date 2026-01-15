"""
Spider for scraping GPU products from Techland BD (techlandbd.com).
"""

import re
import scrapy
from urllib.parse import urljoin
from scraper.items import GPUItem


class TechlandGPUSpider(scrapy.Spider):
    """Spider to scrape GPU products from Techland BD."""
    
    name = 'techland_gpu'
    allowed_domains = ['techlandbd.com']
    start_urls = ['https://www.techlandbd.com/pc-components/graphics-card']
    
    custom_settings = {
        'DOWNLOAD_DELAY': 1.5,
    }
    
    def parse(self, response):
        """Parse the GPU listing page."""
        # Find all product items on the page
        products = response.css('.product-layout')
        
        if not products:
            # Try alternative selector
            products = response.css('.product-thumb')
        
        self.logger.info(f"Found {len(products)} products on {response.url}")
        
        for product in products:
            # Get the product detail link
            product_link = product.css('.product-img a::attr(href)').get()
            if not product_link:
                product_link = product.css('a::attr(href)').get()
            
            if product_link:
                yield scrapy.Request(
                    url=urljoin(response.url, product_link),
                    callback=self.parse_product,
                )
        
        # Handle pagination
        next_page = response.css('.pagination li.active + li a::attr(href)').get()
        if not next_page:
            next_page = response.css('a[rel="next"]::attr(href)').get()
        
        if next_page:
            yield scrapy.Request(
                url=urljoin(response.url, next_page),
                callback=self.parse,
            )
    
    def parse_product(self, response):
        """Parse individual product page."""
        item = GPUItem()
        
        # Basic info
        item['name'] = response.css('h1.product-title::text').get('').strip()
        if not item['name']:
            item['name'] = response.css('h1::text').get('').strip()
        
        item['product_url'] = response.url
        item['retailer_slug'] = 'techland'
        
        # Image
        item['image'] = response.css('.main-image img::attr(src)').get('')
        if not item['image']:
            item['image'] = response.css('.product-image img::attr(src)').get('')
        
        # Price
        price_text = response.css('.product-price .price-new::text').get('')
        if not price_text:
            price_text = response.css('.price-new::text').get('')
        if not price_text:
            price_text = response.css('.product-price::text').get('')
        
        item['price'] = self._clean_price(price_text)
        
        # Original price (if on sale)
        original_price_text = response.css('.price-old::text').get('')
        if original_price_text:
            item['original_price'] = self._clean_price(original_price_text)
        
        # Availability
        stock_text = response.css('.stock::text').get('')
        if not stock_text:
            stock_text = response.css('.availability::text').get('')
        item['availability'] = stock_text.strip() if stock_text else 'In Stock'
        
        # Parse specifications from product page
        specs = self._parse_specifications(response)
        item.update(specs)
        
        # Extract brand from name if not in specs
        if not item.get('brand'):
            item['brand'] = self._extract_brand(item['name'])
        
        if item['name'] and item['price']:
            yield item
    
    def _clean_price(self, price_text):
        """Clean price text and extract numeric value."""
        if not price_text:
            return ''
        # Remove currency symbol and commas
        return re.sub(r'[^\d]', '', price_text)
    
    def _parse_specifications(self, response):
        """Parse GPU specifications from the product page."""
        specs = {}
        
        # Try to find specification table
        spec_rows = response.css('.specification-table tr, .tab-content table tr, #tab-specification tr')
        
        for row in spec_rows:
            label = row.css('td:first-child::text').get('').strip().lower()
            value = row.css('td:last-child::text').get('').strip()
            
            if not label or not value:
                continue
            
            # Map specifications
            if 'memory' in label and 'size' in label:
                specs['memory_size'] = value
            elif 'memory' in label and 'type' in label:
                specs['memory_type'] = value
            elif 'memory' in label and 'bus' in label:
                specs['memory_bus'] = value
            elif 'gpu' in label or 'chipset' in label:
                specs['chipset'] = value
            elif 'base' in label and 'clock' in label:
                specs['base_clock'] = value
            elif 'boost' in label and 'clock' in label:
                specs['boost_clock'] = value
            elif 'interface' in label or 'slot' in label:
                specs['interface'] = value
            elif 'tdp' in label or 'power' in label:
                specs['tdp'] = value
            elif 'cuda' in label:
                specs['cuda_cores'] = value
            elif 'stream' in label:
                specs['stream_processors'] = value
        
        # Try to extract memory from name if not found
        if not specs.get('memory_size'):
            name = response.css('h1::text').get('')
            memory_match = re.search(r'(\d+)\s*GB', name, re.IGNORECASE)
            if memory_match:
                specs['memory_size'] = f"{memory_match.group(1)}GB"
        
        return specs
    
    def _extract_brand(self, name):
        """Extract brand from product name."""
        known_brands = [
            'ASUS', 'MSI', 'Gigabyte', 'EVGA', 'Zotac', 'Sapphire',
            'PowerColor', 'XFX', 'PNY', 'Palit', 'Galax', 'Colorful',
            'Inno3D', 'Gainward', 'ASRock', 'AFOX', 'Biostar',
        ]
        
        name_upper = name.upper()
        for brand in known_brands:
            if brand.upper() in name_upper:
                return brand
        
        return ''
