"""
Management command to run product scrapers.
Usage:
    python manage.py scrape_products --retailer=techland
    python manage.py scrape_products --retailer=startech
    python manage.py scrape_products --all
"""

import os
import sys
from django.core.management.base import BaseCommand, CommandError
from scrapy.crawler import CrawlerProcess
from scrapy.utils.project import get_project_settings


class Command(BaseCommand):
    help = 'Run product scrapers for specified retailers'

    def add_arguments(self, parser):
        parser.add_argument(
            '--retailer',
            type=str,
            help='Retailer slug to scrape (techland, startech)',
        )
        parser.add_argument(
            '--all',
            action='store_true',
            help='Scrape all active retailers',
        )
        parser.add_argument(
            '--category',
            type=str,
            default='gpu',
            help='Category to scrape (default: gpu)',
        )

    def handle(self, *args, **options):
        # Add backend directory to path
        backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(
            os.path.dirname(os.path.abspath(__file__))
        )))
        if backend_dir not in sys.path:
            sys.path.insert(0, backend_dir)

        retailer = options.get('retailer')
        scrape_all = options.get('all')
        category = options.get('category')

        if not retailer and not scrape_all:
            raise CommandError(
                'Please specify --retailer=<slug> or --all'
            )

        # Map retailer slugs to spider names
        spider_map = {
            'techland': f'techland_{category}',
            'startech': f'startech_{category}',
        }

        spiders_to_run = []
        
        if scrape_all:
            spiders_to_run = list(spider_map.values())
        elif retailer:
            if retailer not in spider_map:
                raise CommandError(
                    f'Unknown retailer: {retailer}. '
                    f'Available: {", ".join(spider_map.keys())}'
                )
            spiders_to_run = [spider_map[retailer]]

        self.stdout.write(
            self.style.NOTICE(f'Starting scrape for: {spiders_to_run}')
        )

        try:
            # Get scrapy settings
            os.chdir(backend_dir)
            settings = get_project_settings()
            
            process = CrawlerProcess(settings)
            
            for spider_name in spiders_to_run:
                self.stdout.write(f'Running spider: {spider_name}')
                process.crawl(spider_name)
            
            process.start()
            
            self.stdout.write(
                self.style.SUCCESS('Scraping completed successfully!')
            )
            
        except Exception as e:
            raise CommandError(f'Scraping failed: {str(e)}')
