"""
Spider for scraping GPU products from Star Tech BD (startech.com.bd).
"""

import re
import scrapy
from urllib.parse import urljoin
from scraper.items import GPUItem


class StartechGPUSpider(scrapy.Spider):
    """Spider to scrape GPU products from Star Tech BD."""
    
    name = 'startech_gpu'
    allowed_domains = ['startech.com.bd']
    start_urls = ['https://www.startech.com.bd/component/graphics-card']
    
    custom_settings = {
        'DOWNLOAD_DELAY': 1.5,
    }
    
    def parse(self, response):
        """Parse the GPU listing page."""
        # Find all product items on the page
        products = response.css('.p-item')
        
        if not products:
            products = response.css('.product-item')
        
        self.logger.info(f"Found {len(products)} products on {response.url}")
        
        for product in products:
            # Extract image from listing page
            image_url = product.css('.p-item-img img::attr(src)').get()
            if not image_url:
                image_url = product.css('img::attr(src)').get()
            
            # Convert to absolute URL if found
            if image_url:
                image_url = urljoin(response.url, image_url)
            
            # Get the product detail link
            product_link = product.css('.p-item-name a::attr(href)').get()
            if not product_link:
                product_link = product.css('a::attr(href)').get()
            
            if product_link:
                yield scrapy.Request(
                    url=urljoin(response.url, product_link),
                    callback=self.parse_product,
                    meta={'image_url': image_url if image_url else ''}
                )
        
        # Handle pagination
        next_page = response.css('.pagination a[rel="next"]::attr(href)').get()
        if not next_page:
            next_page = response.css('.pagination li.active + li a::attr(href)').get()
        
        if next_page:
            yield scrapy.Request(
                url=urljoin(response.url, next_page),
                callback=self.parse,
            )
    
    def parse_product(self, response):
        """Parse individual product page."""
        item = GPUItem()
        
        # Basic info
        item['name'] = response.css('h1.product-name::text').get('').strip()
        if not item['name']:
            item['name'] = response.css('h1::text').get('').strip()
        
        item['product_url'] = response.url
        item['retailer_slug'] = 'startech'
        
        # Image - use from listing page if available, otherwise try detail page
        item['image'] = response.meta.get('image_url', '')
        if not item['image']:
            img_url = response.css('.product-img img::attr(src)').get('')
            if img_url:
                item['image'] = urljoin(response.url, img_url)
        if not item['image']:
            img_url = response.css('#main-img::attr(src)').get('')
            if img_url:
                item['image'] = urljoin(response.url, img_url)
        
        # Price - Startech usually has price in a specific format
        price_text = response.css('.product-price .price-new::text').get('')
        if not price_text:
            price_text = response.css('td.product-info-data.product-price::text').get('')
        if not price_text:
            price_text = response.css('.product-price::text').get('')
        
        item['price'] = self._clean_price(price_text)
        
        # Original price (if on sale)
        original_price_text = response.css('.product-price .price-old::text').get('')
        if original_price_text:
            item['original_price'] = self._clean_price(original_price_text)
        
        # Availability
        stock_text = response.css('.product-status .status::text').get('')
        if not stock_text:
            stock_text = response.css('.stock-status::text').get('')
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
        
        # Startech has specifications in a table format
        spec_rows = response.css('.specification-table tr, .data-table tr, table.data-table tr')
        
        for row in spec_rows:
            label = row.css('td:first-child::text').get('').strip().lower()
            value = row.css('td:last-child::text').get('').strip()
            
            if not label or not value:
                continue
            
            # Map specifications
            if 'memory' in label and ('size' in label or 'capacity' in label):
                specs['memory_size'] = value
            elif 'memory' in label and 'type' in label:
                specs['memory_type'] = value
            elif 'memory' in label and ('bus' in label or 'interface' in label):
                specs['memory_bus'] = value
            elif 'gpu' in label or 'chipset' in label or 'graphics processor' in label:
                specs['chipset'] = value
            elif 'base' in label and 'clock' in label:
                specs['base_clock'] = value
            elif 'boost' in label and 'clock' in label:
                specs['boost_clock'] = value
            elif 'pci' in label or 'interface' in label:
                specs['interface'] = value
            elif 'tdp' in label or 'power consumption' in label:
                specs['tdp'] = value
            elif 'recommended psu' in label:
                specs['recommended_psu'] = value
            elif 'cuda' in label:
                specs['cuda_cores'] = value
            elif 'stream processor' in label:
                specs['stream_processors'] = value
            elif 'hdmi' in label:
                try:
                    specs['hdmi_ports'] = int(re.search(r'\d+', value).group())
                except (AttributeError, ValueError):
                    pass
            elif 'displayport' in label or 'dp' in label:
                try:
                    specs['displayport_ports'] = int(re.search(r'\d+', value).group())
                except (AttributeError, ValueError):
                    pass
        
        # Try to extract memory from name if not found
        if not specs.get('memory_size'):
            name = response.css('h1::text').get('')
            memory_match = re.search(r'(\d+)\s*GB', name, re.IGNORECASE)
            if memory_match:
                specs['memory_size'] = f"{memory_match.group(1)}GB"
        
        # Try to extract chipset from name
        if not specs.get('chipset'):
            name = response.css('h1::text').get('')
            # Look for RTX/GTX/RX patterns
            chipset_match = re.search(
                r'(RTX\s*\d{4}\s*(Ti|SUPER)?|GTX\s*\d{4}\s*(Ti|SUPER)?|RX\s*\d{4}\s*(XT)?|Arc\s*\w+)',
                name,
                re.IGNORECASE
            )
            if chipset_match:
                specs['chipset'] = chipset_match.group(1)
        
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
