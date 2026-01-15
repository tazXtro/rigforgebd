"""
Scrapy middleware for RigForge Scraper.

Custom middleware for request/response handling.
"""

import logging
import random
from scrapy import signals

logger = logging.getLogger(__name__)


# List of user agents to rotate
USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
]


class RotateUserAgentMiddleware:
    """
    Middleware to rotate user agents for each request.
    
    Helps avoid detection by rotating through a list of common user agents.
    """
    
    def process_request(self, request, spider):
        request.headers["User-Agent"] = random.choice(USER_AGENTS)
        return None


class RigforgeScraperSpiderMiddleware:
    """
    Spider middleware for processing spider input/output.
    """
    
    @classmethod
    def from_crawler(cls, crawler):
        s = cls()
        crawler.signals.connect(s.spider_opened, signal=signals.spider_opened)
        return s
    
    def process_spider_input(self, response, spider):
        return None
    
    def process_spider_output(self, response, result, spider):
        for i in result:
            yield i
    
    def process_spider_exception(self, response, exception, spider):
        logger.error(f"Spider exception on {response.url}: {exception}")
    
    def process_start_requests(self, start_requests, spider):
        for r in start_requests:
            yield r
    
    def spider_opened(self, spider):
        logger.info(f"Spider opened: {spider.name}")


class RigforgeScraperDownloaderMiddleware:
    """
    Downloader middleware for processing requests/responses.
    """
    
    @classmethod
    def from_crawler(cls, crawler):
        s = cls()
        crawler.signals.connect(s.spider_opened, signal=signals.spider_opened)
        return s
    
    def process_request(self, request, spider):
        return None
    
    def process_response(self, request, response, spider):
        return response
    
    def process_exception(self, request, exception, spider):
        logger.error(f"Download exception for {request.url}: {exception}")
    
    def spider_opened(self, spider):
        logger.info(f"Spider opened: {spider.name}")
