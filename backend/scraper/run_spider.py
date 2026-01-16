#!/usr/bin/env python
"""
Manual spider runner script for RigForge Scraper.

Usage:
    python run_spider.py startech                         # Run single retailer
    python run_spider.py startech --limit 5               # Limit items
    python run_spider.py startech --category processor    # Specific category
    python run_spider.py startech --save                  # Save to database
    python run_spider.py --all --limit 10                 # Run all retailers
    python run_spider.py --playwright-only --limit 5      # Only JS-heavy sites
    python run_spider.py --except-playwright --limit 5    # Skip JS-heavy sites
    python run_spider.py --list                           # List all retailers

This script provides a convenient way to run spiders manually
using the central retailer registry.
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

# Import registry
from rigforge_scraper.retailers.registry import (
    RETAILERS,
    get_enabled_retailers,
    get_playwright_retailers,
    get_standard_retailers,
    get_spider_class,
    get_retailer_config,
    list_retailers,
)


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
        
    Returns:
        List of collected items
    """
    global collected_items
    collected_items = []  # Reset for each run
    
    # Get retailer config for display
    config = get_retailer_config(spider_name)
    display_name = config.get("display_name", spider_name)
    uses_playwright = config.get("use_playwright", False)
    
    # Get Scrapy settings
    settings = get_project_settings()
    
    # Disable Playwright for spiders that don't need it
    # This prevents unnecessary browser launches and saves resources
    if not uses_playwright:
        # Remove Playwright download handlers, use default Scrapy handlers
        settings["DOWNLOAD_HANDLERS"] = {}
    
    # Enable database pipeline if --save flag is used
    if save_to_db:
        current_pipelines = dict(settings.get("ITEM_PIPELINES", {}))
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
    
    # Get the spider class dynamically from registry
    spider_cls = get_spider_class(spider_name)
    
    # Print header
    pw_indicator = " [Playwright]" if uses_playwright else ""
    print(f"\n{'='*60}")
    print(f"RigForge Scraper - Running {display_name}{pw_indicator}")
    print(f"{'='*60}")
    print(f"Category: {category or 'default'}")
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
    print(f"Scraping complete! Collected {len(collected_items)} items from {display_name}")
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


def run_multiple_spiders(retailers_to_run, category=None, limit=None, save_to_db=False, output=None):
    """
    Run multiple spiders sequentially.
    
    Args:
        retailers_to_run: Dict of retailer configs to run
        category: Optional category to scrape
        limit: Optional limit on number of items PER SPIDER
        save_to_db: If True, save items to Supabase database
        output: Optional output file path (JSON format)
        
    Returns:
        Dict mapping retailer names to their collected items
    """
    all_results = {}
    
    print(f"\n{'='*60}")
    print(f"Running {len(retailers_to_run)} retailers")
    print(f"{'='*60}")
    
    for retailer_slug in retailers_to_run.keys():
        try:
            items = run_spider(
                spider_name=retailer_slug,
                category=category,
                limit=limit,
                save_to_db=save_to_db,
                output=None,  # We'll combine output at the end
            )
            all_results[retailer_slug] = items
        except Exception as e:
            print(f"\n❌ Error running {retailer_slug}: {e}")
            all_results[retailer_slug] = []
    
    # Save combined output if requested
    if output:
        combined_output = {
            "scraped_at": datetime.now().isoformat(),
            "retailers_run": list(retailers_to_run.keys()),
            "results": all_results,
            "total_items": sum(len(items) for items in all_results.values()),
        }
        with open(output, "w", encoding="utf-8") as f:
            json.dump(combined_output, f, indent=2, ensure_ascii=False)
        print(f"\nSaved combined results to {output}")
    
    # Print summary
    print(f"\n{'='*60}")
    print("Multi-Retailer Run Summary")
    print(f"{'='*60}")
    total = 0
    for retailer, items in all_results.items():
        count = len(items)
        total += count
        status = "✓" if count > 0 else "✗"
        print(f"  {status} {retailer}: {count} items")
    print(f"\nTotal: {total} items from {len(retailers_to_run)} retailers")
    print(f"{'='*60}\n")
    
    return all_results


def main():
    # Get available retailers for help text
    available_retailers = list(RETAILERS.keys())
    
    parser = argparse.ArgumentParser(
        description="Run RigForge scrapers manually",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=f"""
Examples:
    python run_spider.py startech                           # Run StarTech spider
    python run_spider.py techland                           # Run Techland (Playwright)
    python run_spider.py startech --limit 5                 # Scrape 5 items
    python run_spider.py startech --category graphics-card  # Specific category
    python run_spider.py startech --save                    # SAVE TO DATABASE
    python run_spider.py --all --limit 10                   # Run ALL retailers
    python run_spider.py --playwright-only --limit 5        # Only Playwright sites
    python run_spider.py --except-playwright --limit 10     # Skip Playwright sites
    python run_spider.py --list                             # List all retailers

Available retailers: {', '.join(available_retailers)}

Available categories:
    processor, graphics-card, motherboard, ram, storage,
    power-supply, casing, cooling, monitor
        """
    )
    
    parser.add_argument(
        "spider",
        nargs="?",  # Optional when using --all, --playwright-only, etc.
        choices=available_retailers,
        help="Name of the spider to run"
    )
    
    parser.add_argument(
        "--all", "-a",
        action="store_true",
        help="Run all enabled retailers"
    )
    
    parser.add_argument(
        "--playwright-only",
        action="store_true",
        help="Run only Playwright-enabled retailers (JS-heavy sites)"
    )
    
    parser.add_argument(
        "--except-playwright",
        action="store_true",
        help="Run all retailers EXCEPT Playwright ones (faster)"
    )
    
    parser.add_argument(
        "--list",
        action="store_true",
        help="List all available retailers and exit"
    )
    
    parser.add_argument(
        "--category", "-c",
        help="Specific category to scrape (e.g., processor, graphics-card)"
    )
    
    parser.add_argument(
        "--limit", "-l",
        type=int,
        help="Maximum number of products to scrape (per retailer if running multiple)"
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
    
    # Handle --list
    if args.list:
        list_retailers()
        sys.exit(0)
    
    # Determine which retailers to run
    if args.all:
        retailers = get_enabled_retailers()
        if not retailers:
            print("No enabled retailers found in registry.")
            sys.exit(1)
        run_multiple_spiders(
            retailers,
            category=args.category,
            limit=args.limit,
            save_to_db=args.save,
            output=args.output,
        )
    elif args.playwright_only:
        retailers = get_playwright_retailers()
        if not retailers:
            print("No Playwright retailers found in registry.")
            sys.exit(1)
        run_multiple_spiders(
            retailers,
            category=args.category,
            limit=args.limit,
            save_to_db=args.save,
            output=args.output,
        )
    elif args.except_playwright:
        retailers = get_standard_retailers()
        if not retailers:
            print("No standard (non-Playwright) retailers found in registry.")
            sys.exit(1)
        run_multiple_spiders(
            retailers,
            category=args.category,
            limit=args.limit,
            save_to_db=args.save,
            output=args.output,
        )
    elif args.spider:
        run_spider(
            spider_name=args.spider,
            category=args.category,
            limit=args.limit,
            save_to_db=args.save,
            output=args.output,
        )
    else:
        parser.print_help()
        print("\nError: You must specify a spider name or use --all, --playwright-only, or --except-playwright")
        sys.exit(1)


if __name__ == "__main__":
    main()
