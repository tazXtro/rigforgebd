**Goal:** Implement a centralized “retailer hub” architecture in an existing Scrapy project so I can add a new retailer in *1–3 lines* and choose whether it uses **Scrapy** or **Playwright** via a flag.
> The system must support both **Scrapy-only** retailers and **Scrapy + Playwright (JS-rendered)** retailers, with per-request overrides.

### 📌 Requirements

1. **Create a clean plugin-style spider architecture**

   * A `RetailerBaseSpider` that all retailer spiders inherit from
   * The base spider handles:

     * `start_requests()`
     * choosing Scrapy vs Playwright based on `use_playwright` flag
     * optional per-request override (`meta["playwright"]=True`)
     * shared utilities (normalize price, clean text, absolute URLs, etc.)

2. **Central registry**

   * Create `retailers/registry.py` (or similar) where new retailers can be added like:

     ```python
     RETAILERS = {
       "bestbuy": {"enabled": True, "use_playwright": False, "spider": "BestBuySpider"},
       "somejsstore": {"enabled": True, "use_playwright": True, "spider": "SomeJSStoreSpider"},
     }
     ```
   * Make it so I can add a new retailer with minimal edits:

     * just register it in `RETAILERS`
     * implement a minimal spider subclass OR optionally allow a “config-only” spider

3. **Runner / Orchestrator**

   * Add a runnable entrypoint:

     * `python -m myproject.run_retailers --all`
     * `python -m myproject.run_retailers --retailer bestbuy`
     * `python -m myproject.run_retailers --only-playwright`
   * It should run multiple spiders sequentially (not concurrently unless trivial)
   * Must print clear console output of which retailer is running

4. **Scrapy + Playwright integration best practices**

   * Use `scrapy-playwright`
   * Include correct settings:

     * download handlers for http/https
     * asyncio reactor
     * browser type configurable
     * context kwargs (user agent optional)
   * Provide safe defaults:

     * timeouts
     * concurrency limits for Playwright sites
     * retry + backoff support
   * Ensure spiders still work without Playwright enabled

5. **Per-request Playwright support**

   * Base spider default uses `use_playwright`
   * But allow:

     ```python
     yield self.make_request(url, callback=self.parse_detail, playwright=True)
     ```
   * Implement helper `make_request()` in base spider

6. **Strong structure**

   * Suggested directory layout:

     ```
     myproject/
       spiders/
         __init__.py
         base_retailer.py
         retailer_bestbuy.py
         retailer_somejsstore.py
       retailers/
         registry.py
       run_retailers.py
       settings.py
     ```

7. **Developer UX**

   * Adding a new retailer should require only:

     * creating new spider file subclassing base
     * one line in registry
     * setting `use_playwright = True/False`
   * Provide an example “template spider” to copy/paste

8. **Data output compatibility**

   * Spiders should yield a normalized dict with recommended fields:

     * `sku`, `title`, `price`, `currency`, `availability`, `url`, `retailer`
   * Base spider should automatically attach `retailer=name`

9. **Error handling best practices**

   * If Playwright fails, log gracefully
   * Don’t crash entire run when one retailer fails
   * Add logs with spider name + url

10. **Deliverables**

* Implement all Python files mentioned above
* Provide final code that runs
* Include comments in code for how to add a new retailer