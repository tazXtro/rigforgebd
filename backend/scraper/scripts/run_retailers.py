#!/usr/bin/env python
"""
Retailer orchestrator for running multiple spiders.

Usage:
    python scripts/run_retailers.py --all                  # Run all enabled retailers
    python scripts/run_retailers.py --retailer startech    # Run specific retailer
    python scripts/run_retailers.py --only-playwright      # Run only JS-heavy retailers
    python scripts/run_retailers.py --only-scrapy          # Run only standard retailers
    python scripts/run_retailers.py --all --save           # Save to database
"""
import argparse
import sys
import os
import logging
from datetime import datetime
from importlib import import_module

# Add scraper to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from scrapy.crawler import CrawlerProcess
from scrapy.utils.project import get_project_settings

logger = logging.getLogger(__name__)


def run_retailers(filter_mode='all', category=None, limit=None, save_to_db=False):
    """
    Run retailers based on filter mode.
    
    Args:
        filter_mode: 'all', 'playwright', 'scrapy', or specific retailer name
        category: Optional category filter
        limit: Optional item limit
        save_to_db: Whether to save to database
    """
    # Import registry
    from rigforge_scraper.retailers.registry import (
        get_enabled_retailers,
        get_playwright_retailers,
        get_scrapy_retailers,
        get_retailer_config
    )
    
    # Determine which retailers to run
    if filter_mode in ['all', 'ALL']:
        retailers = get_enabled_retailers()
    elif filter_mode in ['playwright', 'PLAYWRIGHT']:
        retailers = get_playwright_retailers()
    elif filter_mode in ['scrapy', 'SCRAPY']:
        retailers = get_scrapy_retailers()
    else:
        # Specific retailer
        try:
            config = get_retailer_config(filter_mode)
            retailers = {filter_mode: config}
        except KeyError as e:
            print(f"Error: {e}")
            return
    
    if not retailers:
        print("No retailers match the filter criteria.")
        return
    
    # Print summary
    print(f"\n{'='*70}")
    print(f"RigForge Scraper - Multi-Retailer Runner")
    print(f"{'='*70}")
    print(f"Mode: {filter_mode}")
    print(f"Retailers to run: {len(retailers)}")
    print(f"Category filter: {category or 'all'}")
    print(f"Item limit: {limit or 'none'}")
    print(f"Save to DB: {save_to_db}")
    print(f"{'='*70}\n")
    
    # Run each retailer sequentially
    for retailer_name, config in retailers.items():
        print(f"\n{'='*70}")
        print(f"🏪 Retailer: {retailer_name.upper()}")
        print(f"📝 {config.get('description', 'No description')}")
        print(f"🌐 Mode: {'🎭 Playwright (Browser)' if config.get('use_playwright') else '⚡ Scrapy (HTTP)'}")
        print(f"{'='*70}\n")
        
        try:
            # Get settings
            settings = get_project_settings()
            
            # Enable database pipeline if requested
            if save_to_db:
                current_pipelines = settings.get("ITEM_PIPELINES", {})
                current_pipelines["rigforge_scraper.pipelines.SupabaseIngestionPipeline"] = 300
                settings["ITEM_PIPELINES"] = current_pipelines
            
            # Create crawler process for this retailer
            process = CrawlerProcess(settings)
            
            # Import spider class dynamically
            module_path, class_name = config['spider_class'].rsplit('.', 1)
            module = import_module(module_path)
            spider_cls = getattr(module, class_name)
            
            # Prepare spider kwargs
            spider_kwargs = {}
            if category:
                spider_kwargs['category'] = category
            if limit:
                spider_kwargs['limit'] = limit
            
            # Apply retailer-specific settings dynamically
            custom_settings = getattr(spider_cls, 'custom_settings', None) or {}
            
            if 'concurrent_requests' in config:
                custom_settings['CONCURRENT_REQUESTS'] = config['concurrent_requests']
            if 'download_delay' in config:
                custom_settings['DOWNLOAD_DELAY'] = config['download_delay']
            
            # Apply custom settings
            spider_cls.custom_settings = custom_settings
            
            # Run spider
            process.crawl(spider_cls, **spider_kwargs)
            process.start(stop_after_crawl=True)
            
            print(f"\n✅ Completed {retailer_name}\n")
            
        except Exception as e:
            logger.error(f"❌ Failed to run {retailer_name}: {e}", exc_info=True)
            print(f"\n❌ Error running {retailer_name}: {e}\n")
            # Continue to next retailer instead of crashing
            continue
    
    print(f"\n{'='*70}")
    print(f"✅ All retailers completed!")
    print(f"{'='*70}\n")


def main():
    parser = argparse.ArgumentParser(
        description="Run RigForge retailer scrapers",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    python scripts/run_retailers.py --all
    python scripts/run_retailers.py --retailer startech
    python scripts/run_retailers.py --only-playwright --save
    python scripts/run_retailers.py --retailer techland --category processor --limit 10
        """
    )
    
    # Mutually exclusive group for filter mode
    filter_group = parser.add_mutually_exclusive_group(required=True)
    filter_group.add_argument("--all", action="store_const", const="all", dest="mode", help="Run all enabled retailers")
    filter_group.add_argument("--retailer", dest="mode", help="Run specific retailer by name")
    filter_group.add_argument("--only-playwright", action="store_const", const="playwright", dest="mode", help="Run only Playwright retailers")
    filter_group.add_argument("--only-scrapy", action="store_const", const="scrapy", dest="mode", help="Run only standard Scrapy retailers")
    
    parser.add_argument("--category", "-c", help="Filter by category")
    parser.add_argument("--limit", "-l", type=int, help="Limit items per retailer")
    parser.add_argument("--save", "-s", action="store_true", help="Save to database")
    
    args = parser.parse_args()
    
    run_retailers(
        filter_mode=args.mode,
        category=args.category,
        limit=args.limit,
        save_to_db=args.save
    )


if __name__ == "__main__":
    main()
