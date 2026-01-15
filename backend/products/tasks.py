"""
Celery tasks for product scraping operations.
"""

import os
import sys
from celery import shared_task
from django.utils import timezone

# Add the backend directory to path for scrapy imports
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)


@shared_task(bind=True, max_retries=3)
def scrape_retailer(self, retailer_slug: str, category_slug: str = 'gpu'):
    """
    Task to scrape products from a specific retailer.
    
    Args:
        retailer_slug: The slug of the retailer to scrape (e.g., 'techland', 'startech')
        category_slug: The category to scrape (default: 'gpu')
    """
    from scrapy.crawler import CrawlerProcess
    from scrapy.utils.project import get_project_settings
    from products.models import Retailer, Category
    from products.services import create_scrape_log, complete_scrape_log
    
    # Validate retailer exists
    try:
        retailer = Retailer.objects.get(slug=retailer_slug)
    except Retailer.DoesNotExist:
        return {'error': f'Retailer {retailer_slug} not found'}
    
    # Get category if specified
    category = None
    if category_slug:
        try:
            category = Category.objects.get(slug=category_slug)
        except Category.DoesNotExist:
            pass
    
    # Create scrape log
    log = create_scrape_log(retailer, category)
    
    try:
        # Map retailer slugs to spider names
        spider_map = {
            'techland': 'techland_gpu',
            'startech': 'startech_gpu',
        }
        
        spider_name = spider_map.get(retailer_slug)
        if not spider_name:
            raise ValueError(f'No spider found for retailer {retailer_slug}')
        
        # Run the spider
        settings = get_project_settings()
        process = CrawlerProcess(settings)
        
        # Track results
        results = {'products_found': 0, 'products_created': 0, 'products_updated': 0}
        
        # Note: Running scrapy in a task requires special handling
        # For production, consider using scrapyd or running spiders as subprocess
        process.crawl(spider_name)
        process.start(stop_after_crawl=True)
        
        complete_scrape_log(
            log,
            products_found=results['products_found'],
            products_created=results['products_created'],
            products_updated=results['products_updated'],
            success=True
        )
        
        return {
            'status': 'completed',
            'retailer': retailer_slug,
            'category': category_slug,
        }
        
    except Exception as e:
        complete_scrape_log(
            log,
            products_found=0,
            products_created=0,
            products_updated=0,
            errors=str(e),
            success=False
        )
        
        # Retry on failure
        raise self.retry(exc=e, countdown=60)


@shared_task
def scrape_all_retailers(category_slug: str = 'gpu'):
    """
    Task to scrape all active retailers for a category.
    """
    from products.models import Retailer
    
    retailers = Retailer.objects.filter(is_active=True)
    results = []
    
    for retailer in retailers:
        # Queue individual scrape tasks
        task = scrape_retailer.delay(retailer.slug, category_slug)
        results.append({
            'retailer': retailer.slug,
            'task_id': task.id,
        })
    
    return {
        'status': 'queued',
        'retailers': results,
    }


@shared_task
def update_product_prices():
    """
    Task to update product price ranges.
    Called periodically to ensure price data is current.
    """
    from products.models import Product
    
    products = Product.objects.filter(is_active=True)
    updated = 0
    
    for product in products:
        product.update_price_range()
        updated += 1
    
    return {
        'status': 'completed',
        'products_updated': updated,
    }


@shared_task
def cleanup_old_scrape_logs(days: int = 30):
    """
    Task to clean up old scrape logs.
    """
    from products.models import ScrapeLog
    
    cutoff_date = timezone.now() - timezone.timedelta(days=days)
    deleted, _ = ScrapeLog.objects.filter(started_at__lt=cutoff_date).delete()
    
    return {
        'status': 'completed',
        'logs_deleted': deleted,
    }
