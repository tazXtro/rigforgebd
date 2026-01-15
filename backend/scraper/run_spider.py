#!/usr/bin/env python
"""
Manual spider runner script for RigForge Scraper.

Usage:
    python run_spider.py startech
    python run_spider.py startech --limit 5
    python run_spider.py startech --category processor --limit 10
    python run_spider.py startech --dry-run
    python run_spider.py startech --output products.json

This script provides a convenient way to run spiders manually
without using the full scrapy command.
"""

import argparse
import json
import sys
import os
from datetime import datetime

# Add the scraper directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from scrapy.crawler import CrawlerProcess
from scrapy.utils.project import get_project_settings


def collect_items(items_list):
    """Create a pipeline that collects items into a list."""
    class CollectorPipeline:
        def process_item(self, item, spider):
            items_list.append(dict(item))
            return item
    return CollectorPipeline


def run_spider(spider_name, category=None, limit=None, dry_run=False, output=None):
    """
    Run a spider with the given options.
    
    Args:
        spider_name: Name of the spider to run (e.g., 'startech')
        category: Optional category to scrape
        limit: Optional limit on number of items
        dry_run: If True, only print items without saving
        output: Optional output file path (JSON format)
    """
    # Get Scrapy settings
    settings = get_project_settings()
    
    # Collect items for dry-run or output
    collected_items = []
    
    if dry_run or output:
        # Disable database pipelines for dry-run
        settings["ITEM_PIPELINES"] = {
            "rigforge_scraper.pipelines.CleaningPipeline": 100,
            "rigforge_scraper.pipelines.ValidationPipeline": 200,
        }
    
    # Create crawler process
    process = CrawlerProcess(settings)
    
    # Prepare spider arguments
    spider_kwargs = {}
    if category:
        spider_kwargs["category"] = category
    if limit:
        spider_kwargs["limit"] = limit
    
    # Add item collector
    class ItemCollectorPipeline:
        def process_item(self, item, spider):
            collected_items.append(dict(item))
            return item
    
    # Monkey-patch to add our collector
    original_pipelines = settings.get("ITEM_PIPELINES", {})
    settings["ITEM_PIPELINES"] = {
        **original_pipelines,
        "__main__.ItemCollectorPipeline": 300,
    }
    
    # We need to use a different approach for collecting items
    # Since we can't easily add pipelines dynamically, we'll use signals
    from scrapy import signals
    
    def item_scraped(item, response, spider):
        collected_items.append(dict(item))
    
    # Get the spider class
    if spider_name == "startech":
        from rigforge_scraper.spiders.startech import StartechSpider
        spider_cls = StartechSpider
    else:
        print(f"Unknown spider: {spider_name}")
        print("Available spiders: startech")
        sys.exit(1)
    
    # Connect to item_scraped signal
    from scrapy.signalmanager import dispatcher
    dispatcher.connect(item_scraped, signal=signals.item_scraped)
    
    # Run the spider
    print(f"\n{'='*60}")
    print(f"RigForge Scraper - Running {spider_name} spider")
    print(f"{'='*60}")
    print(f"Category: {category or 'all'}")
    print(f"Limit: {limit or 'none'}")
    print(f"Dry run: {dry_run}")
    print(f"Output: {output or 'console'}")
    print(f"{'='*60}\n")
    
    process.crawl(spider_cls, **spider_kwargs)
    process.start()
    
    # Process collected items
    print(f"\n{'='*60}")
    print(f"Scraping complete! Collected {len(collected_items)} items")
    print(f"{'='*60}\n")
    
    if dry_run:
        # Print items in a readable format
        for i, item in enumerate(collected_items, 1):
            print(f"\n--- Item {i} ---")
            print(f"Name: {item.get('name', 'N/A')}")
            print(f"Price: ৳ {item.get('price', 0):,.0f}")
            print(f"Category: {item.get('category', 'N/A')}")
            print(f"Brand: {item.get('brand', 'N/A')}")
            print(f"In Stock: {'Yes' if item.get('in_stock', True) else 'No'}")
            print(f"URL: {item.get('product_url', 'N/A')}")
    
    if output:
        # Save to JSON file
        output_data = {
            "scraped_at": datetime.now().isoformat(),
            "spider": spider_name,
            "category": category,
            "total_items": len(collected_items),
            "items": collected_items,
        }
        with open(output, "w", encoding="utf-8") as f:
            json.dump(output_data, f, indent=2, ensure_ascii=False)
        print(f"\nSaved {len(collected_items)} items to {output}")
    
    return collected_items


def main():
    parser = argparse.ArgumentParser(
        description="Run RigForge scrapers manually",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    python run_spider.py startech
    python run_spider.py startech --limit 5
    python run_spider.py startech --category processor --limit 10
    python run_spider.py startech --dry-run
    python run_spider.py startech --output products.json
        """
    )
    
    parser.add_argument(
        "spider",
        choices=["startech"],
        help="Name of the spider to run"
    )
    
    parser.add_argument(
        "--category", "-c",
        help="Specific category to scrape (e.g., processor, graphics-card)"
    )
    
    parser.add_argument(
        "--limit", "-l",
        type=int,
        help="Maximum number of products to scrape"
    )
    
    parser.add_argument(
        "--dry-run", "-d",
        action="store_true",
        help="Print scraped items without saving to database"
    )
    
    parser.add_argument(
        "--output", "-o",
        help="Output file path (JSON format)"
    )
    
    args = parser.parse_args()
    
    run_spider(
        spider_name=args.spider,
        category=args.category,
        limit=args.limit,
        dry_run=args.dry_run,
        output=args.output,
    )


if __name__ == "__main__":
    main()
