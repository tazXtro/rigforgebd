### You are a senior backend engineer working inside this repository.
>
> ## Goal
>
> Implement an **end-to-end web scraping pipeline** for a PCPartPicker-like application using **Scrapy**, integrated with a **Django backend** via **Celery**.
>
> The scraping system must:
>
> * Scrape PC component product data from retailer websites
> * Normalize the data
> * Store it in Django models
> * Run asynchronously via Celery
>
> ---
>
> ## Tech Stack (Hard Constraints)
>
> * Django (existing app)
> * Scrapy (primary scraping framework)
> * Playwright (ONLY for JavaScript-heavy pages, optional)
> * Celery + Redis (background jobs)
> * PostgreSQL (database)
>
> ❌ Do NOT use Selenium
> ❌ Do NOT mix scraping logic into Django views
> ❌ Do NOT scrape price history yet
>
> ---
>
> ## Architecture Rules
>
> 1. Scraping logic must be **fully decoupled** from Django views and URLs
> 2. One Scrapy spider per retailer
> 3. Scrapy spiders must output **plain Python dictionaries**
> 4. Django is responsible for **persisting data**
> 5. Scrapers must be **idempotent** (re-scraping updates existing records)
>
> ---
>
> ## Data Model Requirements
>
> Each scraped product must include:
>
> * `name` (string)
> * `category` (CPU, GPU, RAM, etc.)
> * `price` (decimal)
> * `currency` (ISO code, e.g. USD)
> * `retailer` (string)
> * `product_url` (unique)
> * `last_updated` (timestamp)
>
> ---
>
> ## Tasks (Implement in This Order)
>
> ### 1. Django Models
>
> * Create or update a `Product` model
> * Add appropriate indexes (category, retailer, product_url)
> * Ensure upsert behavior (update on conflict by product_url)
>
> ### 2. Scrapy Project
>
> * Create a standalone Scrapy project inside the repo (`scraper/`)
> * Configure Scrapy settings for:
>
>   * AutoThrottle
>   * User-Agent rotation
>   * Reasonable download delays
>
> ### 3. Base Spider
>
> * Implement a reusable `BaseRetailerSpider`
> * Include helpers for:
>
>   * Price parsing
>   * Text normalization
> * Do NOT import Django models here
>
> ### 4. Example Retailer Spider
>
> * Implement one example spider for a single retailer
> * Scrape:
>
>   * name
>   * price
>   * product URL
>   * category (hardcoded if needed)
>
> ### 5. Django Ingestion Layer
>
> * Implement a service that takes scraped dictionaries
> * Saves or updates `Product` records
> * Handle duplicates safely
>
> ### 6. Celery Integration
>
> * Implement a Celery task to run a Scrapy spider by name
> * Ensure the task does not block the worker
> * Log success/failure
>
> ---
>
> ## Code Quality Rules
>
> * Follow existing project style
> * Add docstrings to all public classes and functions
> * Keep functions small and readable
> * No unused imports
>
> ---
>
> ## Output Expectations
>
> * Production-ready Python code
> * No placeholder logic left unimplemented
> * Clear separation of concerns
>
> ---
>
> ## Working Style
>
> * Implement only what is required by this prompt
> * Do not introduce new libraries unless necessary
> * Prefer clarity over cleverness
>
> Start by implementing **Step 1: Django Models**, then proceed sequentially.

---