import asyncio
from asgiref.sync import sync_to_async
"""
Scrapy pipelines for saving scraped data to Django models.
"""

import re
from decimal import Decimal, InvalidOperation
from products.models import Category, Retailer
from products.services import create_or_update_product_from_scrape


class DjangoProductPipeline:
    """
    Pipeline to save scraped products to Django database.
    """
    
    def __init__(self):
        self.products_created = 0
        self.products_updated = 0
    
    def open_spider(self, spider):
        """Initialize counters when spider opens."""
        self.products_created = 0
        self.products_updated = 0
        spider.logger.info(f"Starting scrape for {spider.name}")
    
    def close_spider(self, spider):
        """Log stats when spider closes."""
        total = self.products_created + self.products_updated
        spider.logger.info(
            f"Scrape completed: {total} products processed "
            f"({self.products_created} created, {self.products_updated} updated)"
        )
    
    async def process_item(self, item, spider):
        """Process and save each scraped item."""
        try:
            await sync_to_async(self._save_item)(item, spider)
        except Exception as e:
            spider.logger.error(f"Error processing item: {e}")
        
        return item
    
    def _save_item(self, item, spider):
        """Synchronous method to save item to database."""
        try:
            # Get or create the category (GPU for now)
            category, _ = Category.objects.get_or_create(
                slug='gpu',
                defaults={
                    'name': 'GPU',
                    'description': 'Graphics Processing Units',
                    'icon': 'MonitorPlay',
                }
            )
            
            # Get the retailer
            retailer_slug = item.get('retailer_slug', 'unknown')
            try:
                retailer = Retailer.objects.get(slug=retailer_slug)
            except Retailer.DoesNotExist:
                spider.logger.warning(f"Retailer {retailer_slug} not found, skipping item")
                return
            
            # Parse price
            price = self._parse_price(item.get('price', '0'))
            original_price = self._parse_price(item.get('original_price')) if item.get('original_price') else None
            
            if price <= 0:
                spider.logger.warning(f"Invalid price for {item.get('name')}, skipping")
                return
            
            # Determine availability
            availability = self._parse_availability(item.get('availability', ''))
            
            # Extract brand from name if not provided
            brand = item.get('brand', '')
            if not brand:
                brand = self._extract_brand(item.get('name', ''))
            
            # Build GPU specs dict
            gpu_specs = self._build_gpu_specs(item)
            
            # Create or update the product
            product, created = create_or_update_product_from_scrape(
                name=item.get('name', '').strip(),
                retailer=retailer,
                category=category,
                price=price,
                product_url=item.get('product_url', ''),
                image=item.get('image', ''),
                brand=brand,
                availability=availability,
                original_price=original_price,
                gpu_specs=gpu_specs if any(gpu_specs.values()) else None,
            )
            
            if created:
                self.products_created += 1
            else:
                self.products_updated += 1
            
            spider.logger.debug(f"{'Created' if created else 'Updated'}: {product.name}")
            
        except Exception as e:
            spider.logger.error(f"Error in _save_item: {e}")
    
    def _parse_price(self, price_str):
        """Parse price string to Decimal."""
        if not price_str:
            return Decimal('0')
        
        try:
            # Remove currency symbols and formatting
            clean_price = re.sub(r'[^\d.]', '', str(price_str))
            return Decimal(clean_price)
        except (InvalidOperation, ValueError):
            return Decimal('0')
    
    def _parse_availability(self, availability_str):
        """Parse availability string to status."""
        availability_str = str(availability_str).lower()
        
        if 'out of stock' in availability_str or 'stock out' in availability_str:
            return 'out_of_stock'
        elif 'pre-order' in availability_str or 'preorder' in availability_str:
            return 'pre_order'
        elif 'upcoming' in availability_str:
            return 'upcoming'
        else:
            return 'in_stock'
    
    def _extract_brand(self, name):
        """Extract brand from product name."""
        known_brands = [
            'NVIDIA', 'AMD', 'ASUS', 'MSI', 'Gigabyte', 'EVGA', 'Zotac',
            'Sapphire', 'PowerColor', 'XFX', 'PNY', 'Palit', 'Galax',
            'Colorful', 'Inno3D', 'Gainward', 'ASRock', 'AFOX', 'Biostar',
        ]
        
        name_upper = name.upper()
        for brand in known_brands:
            if brand.upper() in name_upper:
                return brand
        
        return ''
    
    def _build_gpu_specs(self, item):
        """Build GPU specifications dict from item."""
        return {
            'chipset': item.get('chipset', ''),
            'memory_size': item.get('memory_size', ''),
            'memory_type': item.get('memory_type', ''),
            'memory_bus': item.get('memory_bus', ''),
            'base_clock': item.get('base_clock', ''),
            'boost_clock': item.get('boost_clock', ''),
            'interface': item.get('interface', ''),
            'power_connector': item.get('power_connector', ''),
            'tdp': item.get('tdp', ''),
            'recommended_psu': item.get('recommended_psu', ''),
            'hdmi_ports': item.get('hdmi_ports'),
            'displayport_ports': item.get('displayport_ports'),
            'length': item.get('length', ''),
            'slots': item.get('slots', ''),
            'cuda_cores': item.get('cuda_cores', ''),
            'stream_processors': item.get('stream_processors', ''),
            'ray_tracing': item.get('ray_tracing'),
            'dlss_support': item.get('dlss_support'),
            'fsr_support': item.get('fsr_support'),
        }
