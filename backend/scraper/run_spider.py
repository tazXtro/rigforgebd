#!/usr/bin/env python
"""
Manual spider runner script for RigForge Scraper.

Usage:
    python run_spider.py startech
    python run_spider.py startech --limit 5
    python run_spider.py startech --category processor --limit 10
    python run_spider.py startech --save              # Save to database
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

# Add backend to path for Django imports
backend_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from scrapy.crawler import CrawlerProcess
from scrapy.utils.project import get_project_settings
from scrapy import signals


# Global list to collect items
collected_items = []


def item_scraped_handler(item, response, spider):
    """Signal handler to collect scraped items."""
    collected_items.append(dict(item))


def run_spider(spider_name, category=None, limit=None, save_to_db=False, output=None):
    """
    Run a spider with the given options.
    
    Args:
        spider_name: Name of the spider to run (e.g., 'startech')
        category: Optional category to scrape
        limit: Optional limit on number of items
        save_to_db: If True, save items to Supabase database
        output: Optional output file path (JSON format)
    """
    global collected_items
    collected_items = []  # Reset for each run
    
    # Get Scrapy settings
    settings = get_project_settings()
    
    # Enable database pipeline if --save flag is used
    if save_to_db:
        current_pipelines = settings.get("ITEM_PIPELINES", {})
        current_pipelines["rigforge_scraper.pipelines.SupabaseIngestionPipeline"] = 300
        settings["ITEM_PIPELINES"] = current_pipelines
    
    # Create crawler process
    process = CrawlerProcess(settings)
    
    # Prepare spider arguments
    spider_kwargs = {}
    if category:
        spider_kwargs["category"] = category
    if limit:
        spider_kwargs["limit"] = limit
    
    # Get the spider class
    if spider_name == "startech":
        from rigforge_scraper.spiders.startech import StartechSpider
        spider_cls = StartechSpider
    else:
        print(f"Unknown spider: {spider_name}")
        print("Available spiders: startech")
        sys.exit(1)
    
    # Print header
    print(f"\n{'='*60}")
    print(f"RigForge Scraper - Running {spider_name} spider")
    print(f"{'='*60}")
    print(f"Category: {category or 'default (processor)'}")
    print(f"Limit: {limit or 'none'}")
    print(f"Save to DB: {save_to_db}")
    print(f"Output file: {output or 'none'}")
    print(f"{'='*60}\n")
    
    # Create a crawler and connect the signal
    crawler = process.create_crawler(spider_cls)
    crawler.signals.connect(item_scraped_handler, signal=signals.item_scraped)
    
    # Start crawling
    process.crawl(crawler, **spider_kwargs)
    process.start()
    
    # Process collected items
    print(f"\n{'='*60}")
    print(f"Scraping complete! Collected {len(collected_items)} items")
    if save_to_db:
        print(f"Items were saved to Supabase database")
    print(f"{'='*60}\n")
    
    # Always print summary of items
    if collected_items:
        print("\nScraped Items Summary:")
        for i, item in enumerate(collected_items, 1):
            price = item.get('price', 0)
            print(f"  {i}. {item.get('name', 'N/A')[:60]}... - ৳{price:,.0f}")
    
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
    python run_spider.py startech                           # Dry run (no DB save)
    python run_spider.py startech --limit 5                 # Scrape 5 items
    python run_spider.py startech --category graphics-card  # Specific category
    python run_spider.py startech --save                    # SAVE TO DATABASE
    python run_spider.py startech --save --limit 10         # Save 10 items to DB
    python run_spider.py startech --output products.json    # Export to JSON

Available categories:
    processor, graphics-card, motherboard, ram, storage,
    power-supply, casing, cooling, monitor
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
        "--save", "-s",
        action="store_true",
        help="Save scraped items to Supabase database"
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
        save_to_db=args.save,
        output=args.output,
    )


if __name__ == "__main__":
    main()
