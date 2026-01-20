"""
Product repositories for Supabase data access.

This module handles all direct Supabase queries for product data.
Follows clean architecture principles:
    - Only raw data access (select, insert, update, delete)
    - Returns dictionaries/lists, never domain objects
    - Raises custom exceptions on errors
    - No business logic
    - No HTTP logic
"""

import logging
import time
from functools import wraps
from typing import Optional, List, Callable, TypeVar
from datetime import datetime, timezone

from products.repositories.exceptions import (
    ProductRepositoryError,
    ProductNotFoundError,
    ProductCreationError,
    ProductUpdateError,
    RetailerNotFoundError,
    PriceCreationError,
    PriceUpdateError,
)

logger = logging.getLogger(__name__)

T = TypeVar('T')


def retry_on_socket_error(
    max_retries: int = 3,
    base_delay: float = 0.1,
    max_delay: float = 2.0,
) -> Callable:
    """
    Decorator to retry operations on transient socket errors.
    
    Handles WinError 10035 and similar non-blocking socket errors
    that occur under high load with rapid requests.
    
    Args:
        max_retries: Maximum number of retry attempts
        base_delay: Initial delay in seconds (doubles each retry)
        max_delay: Maximum delay cap in seconds
    """
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @wraps(func)
        def wrapper(*args, **kwargs) -> T:
            last_exception = None
            delay = base_delay
            
            for attempt in range(max_retries + 1):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    error_str = str(e)
                    # Check for transient socket errors (Windows non-blocking socket)
                    is_transient = (
                        "10035" in error_str or  # WSAEWOULDBLOCK
                        "10053" in error_str or  # WSAECONNABORTED
                        "10054" in error_str or  # WSAECONNRESET
                        "timed out" in error_str.lower() or
                        "connection" in error_str.lower() and "reset" in error_str.lower()
                    )
                    
                    if is_transient and attempt < max_retries:
                        logger.warning(
                            f"Transient error in {func.__name__} (attempt {attempt + 1}/{max_retries + 1}): {e}. "
                            f"Retrying in {delay:.2f}s..."
                        )
                        time.sleep(delay)
                        delay = min(delay * 2, max_delay)
                        last_exception = e
                    else:
                        raise
            
            # Should not reach here, but just in case
            if last_exception:
                raise last_exception
        return wrapper
    return decorator


class SimpleCache:
    """
    Simple in-memory cache with TTL for reducing repeated queries.
    
    Used for data that doesn't change frequently (like category counts)
    to reduce load on Supabase during rapid page refreshes.
    """
    
    def __init__(self):
        self._cache = {}
        self._timestamps = {}
    
    def get(self, key: str, ttl_seconds: float = 30.0):
        """
        Get cached value if not expired.
        
        Args:
            key: Cache key
            ttl_seconds: Time-to-live in seconds
            
        Returns:
            Cached value or None if expired/missing
        """
        if key not in self._cache:
            return None
        
        elapsed = time.time() - self._timestamps.get(key, 0)
        if elapsed > ttl_seconds:
            # Expired
            del self._cache[key]
            del self._timestamps[key]
            return None
        
        return self._cache[key]
    
    def set(self, key: str, value):
        """Store value in cache with current timestamp."""
        self._cache[key] = value
        self._timestamps[key] = time.time()
    
    def clear(self, key: str = None):
        """Clear specific key or entire cache."""
        if key:
            self._cache.pop(key, None)
            self._timestamps.pop(key, None)
        else:
            self._cache.clear()
            self._timestamps.clear()


# Global cache instance
_cache = SimpleCache()


class ProductRepository:
    """
    Repository for product data persistence in Supabase.
    
    All methods return raw data (dicts/lists) and handle only
    database operations. Business logic belongs in services.py.
    """
    
    TABLE_NAME = "products"
    _client = None
    
    @property
    def client(self):
        """Lazy-load the Supabase client on first access."""
        if self._client is None:
            from core.infrastructure.supabase.client import get_supabase_client
            self._client = get_supabase_client()
        return self._client
    
    def get_by_id(self, product_id: str) -> Optional[dict]:
        """
        Retrieve a product by its ID.
        
        Args:
            product_id: The product's UUID
            
        Returns:
            Product data dict or None if not found
        """
        try:
            response = (
                self.client
                .table(self.TABLE_NAME)
                .select("*")
                .eq("id", product_id)
                .maybe_single()
                .execute()
            )
            return response.data if response else None
        except Exception as e:
            logger.error(f"Failed to fetch product by ID '{product_id}': {e}")
            raise ProductRepositoryError(
                f"Failed to fetch product by ID: {product_id}",
                original_error=e
            ) from e
    
    def get_by_slug(self, slug: str) -> Optional[dict]:
        """
        Retrieve a product by its slug.
        
        Args:
            slug: The product's URL-friendly slug
            
        Returns:
            Product data dict or None if not found
        """
        try:
            response = (
                self.client
                .table(self.TABLE_NAME)
                .select("*")
                .eq("slug", slug)
                .maybe_single()
                .execute()
            )
            return response.data if response else None
        except Exception as e:
            logger.error(f"Failed to fetch product by slug '{slug}': {e}")
            raise ProductRepositoryError(
                f"Failed to fetch product by slug: {slug}",
                original_error=e
            ) from e
    
    def get_by_category(self, category_slug: str, limit: int = 100) -> List[dict]:
        """
        Retrieve products by category.
        
        Args:
            category_slug: The category slug to filter by
            limit: Maximum number of products to return
            
        Returns:
            List of product dicts
        """
        try:
            response = (
                self.client
                .table(self.TABLE_NAME)
                .select("*")
                .eq("category_slug", category_slug)
                .limit(limit)
                .execute()
            )
            return response.data if response and response.data else []
        except Exception as e:
            logger.error(f"Failed to fetch products by category '{category_slug}': {e}")
            raise ProductRepositoryError(
                f"Failed to fetch products by category: {category_slug}",
                original_error=e
            ) from e
    
    def get_all(self, limit: int = 500) -> List[dict]:
        """
        Retrieve all products.
        
        Args:
            limit: Maximum number of products to return
            
        Returns:
            List of product dicts
        """
        try:
            response = (
                self.client
                .table(self.TABLE_NAME)
                .select("*")
                .limit(limit)
                .execute()
            )
            return response.data if response and response.data else []
        except Exception as e:
            logger.error(f"Failed to fetch all products: {e}")
            raise ProductRepositoryError(
                "Failed to fetch all products",
                original_error=e
            ) from e
    
    @retry_on_socket_error(max_retries=3, base_delay=0.1)
    def get_paginated(
        self,
        page: int = 1,
        page_size: int = 24,
        category_slug: Optional[str] = None,
        search: Optional[str] = None,
        brand: Optional[str] = None,
        sort_by: Optional[str] = None,
    ) -> dict:
        """
        Retrieve products with pagination, filtering, and sorting.
        
        Uses offset-based pagination which works well with Supabase.
        Returns both the products and pagination metadata.
        
        Args:
            page: Page number (1-indexed)
            page_size: Number of products per page
            category_slug: Optional category filter
            search: Optional search term (searches name and brand)
            brand: Optional brand filter
            sort_by: Sort option (newest, name_asc, name_desc)
            
        Returns:
            Dict with 'products' list and 'pagination' metadata
        """
        try:
            # Calculate offset
            offset = (page - 1) * page_size
            
            # Build base query for counting
            count_query = self.client.table(self.TABLE_NAME).select("*", count="exact")
            
            # Apply filters to count query
            if category_slug:
                count_query = count_query.eq("category_slug", category_slug)
            if brand:
                count_query = count_query.ilike("brand", f"%{brand}%")
            if search:
                # Search in name using case-insensitive pattern matching
                count_query = count_query.or_(f"name.ilike.%{search}%,brand.ilike.%{search}%")
            
            # Get total count
            count_response = count_query.execute()
            total_count = count_response.count if count_response else 0
            
            # Build query for fetching products
            query = (
                self.client
                .table(self.TABLE_NAME)
                .select("*")
            )
            
            # Apply sorting based on sort_by parameter
            if sort_by == "name_asc":
                query = query.order("name", desc=False)
            elif sort_by == "name_desc":
                query = query.order("name", desc=True)
            else:
                # Default: newest first
                query = query.order("created_at", desc=True)
            
            # Apply pagination
            query = query.range(offset, offset + page_size - 1)
            
            # Apply same filters to data query
            if category_slug:
                query = query.eq("category_slug", category_slug)
            if brand:
                query = query.ilike("brand", f"%{brand}%")
            if search:
                query = query.or_(f"name.ilike.%{search}%,brand.ilike.%{search}%")
            
            response = query.execute()
            products = response.data if response and response.data else []
            
            # Calculate pagination metadata
            total_pages = (total_count + page_size - 1) // page_size if total_count > 0 else 0
            
            return {
                "products": products,
                "pagination": {
                    "page": page,
                    "page_size": page_size,
                    "total_count": total_count,
                    "total_pages": total_pages,
                    "has_next": page < total_pages,
                    "has_prev": page > 1,
                },
            }
            
        except Exception as e:
            logger.error(f"Failed to fetch paginated products: {e}")
            raise ProductRepositoryError(
                "Failed to fetch paginated products",
                original_error=e
            ) from e
    
    @retry_on_socket_error(max_retries=3, base_delay=0.1)
    def get_category_counts(self, use_cache: bool = True, cache_ttl: float = 30.0) -> dict:
        """
        Get count of product listings per category.
        
        Counts are based on product_prices table (one per retailer listing),
        matching the display model where each retailer listing is a separate card.
        
        Uses caching to reduce load during rapid page refreshes.
        
        Args:
            use_cache: Whether to use cached results (default True)
            cache_ttl: Cache time-to-live in seconds (default 30)
        
        Returns:
            Dict mapping category_slug to listing count.
            Empty string key ("") contains total listings count.
        """
        cache_key = "category_counts"
        
        # Check cache first
        if use_cache:
            cached = _cache.get(cache_key, cache_ttl)
            if cached is not None:
                logger.debug("Returning cached category counts")
                return cached
        
        try:
            # Get all products with their category slugs
            products_response = (
                self.client
                .table(self.TABLE_NAME)
                .select("id, category_slug")
                .execute()
            )
            
            if not products_response or not products_response.data:
                return {}
            
            # Build a map of product_id -> category_slug
            product_categories = {
                p["id"]: p.get("category_slug", "")
                for p in products_response.data
            }
            
            # Get all price listings
            prices_response = (
                self.client
                .table("product_prices")
                .select("product_id")
                .execute()
            )
            
            if not prices_response or not prices_response.data:
                return {"": 0}
            
            # Count listings per category
            counts = {}
            total = 0
            for price in prices_response.data:
                product_id = price.get("product_id")
                category_slug = product_categories.get(product_id, "")
                if category_slug:
                    counts[category_slug] = counts.get(category_slug, 0) + 1
                total += 1
            
            # Add total count
            counts[""] = total
            
            # Cache the result
            _cache.set(cache_key, counts)
            
            return counts
            
            
        except Exception as e:
            logger.error(f"Failed to get category counts: {e}")
            raise ProductRepositoryError(
                "Failed to get category counts",
                original_error=e
            ) from e
    
    def invalidate_category_counts_cache(self):
        """Invalidate the category counts cache (call after product changes)."""
        _cache.clear("category_counts")
    
    def create(self, product_data: dict) -> dict:
        """
        Create a new product in the database.
        
        Args:
            product_data: Dict containing product fields
            
        Returns:
            The created product data including generated ID
        """
        try:
            response = (
                self.client
                .table(self.TABLE_NAME)
                .insert(product_data)
                .execute()
            )
            if response and response.data:
                logger.info(f"Created product: {product_data.get('name')}")
                return response.data[0]
            raise ProductCreationError(
                f"Insert returned no data for product: {product_data.get('name')}"
            )
        except ProductCreationError:
            raise
        except Exception as e:
            logger.error(f"Failed to create product: {e}")
            raise ProductCreationError(
                f"Failed to create product: {product_data.get('name')}",
                original_error=e
            ) from e
    
    def update(self, product_id: str, update_data: dict) -> Optional[dict]:
        """
        Update an existing product by ID.
        
        Args:
            product_id: The product's UUID
            update_data: Dict containing fields to update
            
        Returns:
            The updated product data or None if not found
        """
        try:
            # Add updated timestamp
            update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
            
            response = (
                self.client
                .table(self.TABLE_NAME)
                .update(update_data)
                .eq("id", product_id)
                .execute()
            )
            if response and response.data:
                logger.info(f"Updated product ID: {product_id}")
                return response.data[0]
            return None
        except Exception as e:
            logger.error(f"Failed to update product '{product_id}': {e}")
            raise ProductUpdateError(
                f"Failed to update product ID: {product_id}",
                original_error=e
            ) from e
    
    def upsert_by_slug(self, product_data: dict) -> dict:
        """
        Create or update a product by slug.
        
        Args:
            product_data: Dict containing product fields (must include 'slug')
            
        Returns:
            The created or updated product data
        """
        slug = product_data.get("slug")
        if not slug:
            raise ProductCreationError("Product data must include 'slug' for upsert")
        
        try:
            existing = self.get_by_slug(slug)
            if existing:
                return self.update(existing["id"], product_data)
            return self.create(product_data)
        except (ProductCreationError, ProductUpdateError):
            raise
        except Exception as e:
            logger.error(f"Failed to upsert product by slug '{slug}': {e}")
            raise ProductCreationError(
                f"Failed to upsert product: {slug}",
                original_error=e
            ) from e


class RetailerRepository:
    """
    Repository for retailer data persistence in Supabase.
    """
    
    TABLE_NAME = "retailers"
    _client = None
    
    @property
    def client(self):
        """Lazy-load the Supabase client on first access."""
        if self._client is None:
            from core.infrastructure.supabase.client import get_supabase_client
            self._client = get_supabase_client()
        return self._client
    
    def get_by_id(self, retailer_id: str) -> Optional[dict]:
        """Retrieve a retailer by ID."""
        try:
            response = (
                self.client
                .table(self.TABLE_NAME)
                .select("*")
                .eq("id", retailer_id)
                .maybe_single()
                .execute()
            )
            return response.data if response else None
        except Exception as e:
            logger.error(f"Failed to fetch retailer by ID '{retailer_id}': {e}")
            raise ProductRepositoryError(
                f"Failed to fetch retailer by ID: {retailer_id}",
                original_error=e
            ) from e
    
    def get_by_slug(self, slug: str) -> Optional[dict]:
        """Retrieve a retailer by slug."""
        try:
            response = (
                self.client
                .table(self.TABLE_NAME)
                .select("*")
                .eq("slug", slug)
                .maybe_single()
                .execute()
            )
            return response.data if response else None
        except Exception as e:
            logger.error(f"Failed to fetch retailer by slug '{slug}': {e}")
            raise ProductRepositoryError(
                f"Failed to fetch retailer by slug: {slug}",
                original_error=e
            ) from e
    
    def get_all(self, active_only: bool = True) -> List[dict]:
        """Retrieve all retailers."""
        try:
            query = self.client.table(self.TABLE_NAME).select("*")
            if active_only:
                query = query.eq("is_active", True)
            response = query.execute()
            return response.data if response and response.data else []
        except Exception as e:
            logger.error(f"Failed to fetch retailers: {e}")
            raise ProductRepositoryError(
                "Failed to fetch retailers",
                original_error=e
            ) from e
    
    @retry_on_socket_error(max_retries=3, base_delay=0.1)
    def get_all_with_counts(self, active_only: bool = True) -> List[dict]:
        """
        Retrieve all retailers with their product listing counts.
        
        Counts are based on entries in the product_prices table,
        representing how many product listings each retailer has.
        
        Args:
            active_only: If True, only return active retailers
            
        Returns:
            List of retailer dicts with 'product_count' field
        """
        try:
            # Get all retailers
            query = self.client.table(self.TABLE_NAME).select("*")
            if active_only:
                query = query.eq("is_active", True)
            retailer_response = query.execute()
            retailers = retailer_response.data if retailer_response and retailer_response.data else []
            
            if not retailers:
                return []
            
            # Get counts from product_prices for each retailer
            # Supabase doesn't support GROUP BY easily, so we fetch and count
            prices_response = (
                self.client
                .table("product_prices")
                .select("retailer_id")
                .execute()
            )
            prices = prices_response.data if prices_response and prices_response.data else []
            
            # Count products per retailer
            counts = {}
            for price in prices:
                rid = price.get("retailer_id")
                if rid:
                    counts[rid] = counts.get(rid, 0) + 1
            
            # Attach counts to retailers
            for retailer in retailers:
                retailer["product_count"] = counts.get(retailer["id"], 0)
            
            # Sort by product_count descending (most products first)
            retailers.sort(key=lambda r: r.get("product_count", 0), reverse=True)
            
            return retailers
            
        except Exception as e:
            logger.error(f"Failed to fetch retailers with counts: {e}")
            raise ProductRepositoryError(
                "Failed to fetch retailers with counts",
                original_error=e
            ) from e


class PriceRepository:
    """
    Repository for product pricing data persistence in Supabase.
    """
    
    TABLE_NAME = "product_prices"
    _client = None
    
    @property
    def client(self):
        """Lazy-load the Supabase client on first access."""
        if self._client is None:
            from core.infrastructure.supabase.client import get_supabase_client
            self._client = get_supabase_client()
        return self._client
    
    def get_by_product_url(self, product_url: str) -> Optional[dict]:
        """Retrieve a price record by product URL."""
        try:
            response = (
                self.client
                .table(self.TABLE_NAME)
                .select("*")
                .eq("product_url", product_url)
                .maybe_single()
                .execute()
            )
            return response.data if response else None
        except Exception as e:
            logger.error(f"Failed to fetch price by URL '{product_url}': {e}")
            raise ProductRepositoryError(
                f"Failed to fetch price by URL: {product_url}",
                original_error=e
            ) from e
    
    def get_by_product_id(self, product_id: str) -> List[dict]:
        """Retrieve all price records for a product."""
        try:
            response = (
                self.client
                .table(self.TABLE_NAME)
                .select("*, retailers(*)")
                .eq("product_id", product_id)
                .execute()
            )
            return response.data if response and response.data else []
        except Exception as e:
            logger.error(f"Failed to fetch prices for product '{product_id}': {e}")
            raise ProductRepositoryError(
                f"Failed to fetch prices for product: {product_id}",
                original_error=e
            ) from e
    
    @retry_on_socket_error(max_retries=3, base_delay=0.1)
    def get_by_product_ids(self, product_ids: List[str]) -> List[dict]:
        """
        Retrieve all price records for multiple products.
        
        This is more efficient than calling get_by_product_id for each product
        as it avoids the N+1 query problem and reduces socket pressure.
        
        For large lists of product IDs (>100), this batches the requests to
        avoid exceeding Supabase's `.in_()` filter limit which causes
        "JSON could not be generated" errors.
        
        Args:
            product_ids: List of product UUIDs
            
        Returns:
            List of price records with retailer data
        """
        if not product_ids:
            return []
        
        # Supabase has a limit on the size of the `.in_()` filter array
        # Batch requests in chunks of 100 to avoid "Bad Request" errors
        BATCH_SIZE = 100
        all_results = []
        
        try:
            for i in range(0, len(product_ids), BATCH_SIZE):
                batch = product_ids[i:i + BATCH_SIZE]
                response = (
                    self.client
                    .table(self.TABLE_NAME)
                    .select("*, retailers(*)")
                    .in_("product_id", batch)
                    .execute()
                )
                if response and response.data:
                    all_results.extend(response.data)
            
            return all_results
        except Exception as e:
            logger.error(f"Failed to fetch prices for {len(product_ids)} products: {e}")
            raise ProductRepositoryError(
                f"Failed to fetch prices for multiple products",
                original_error=e
            ) from e
    
    def create(self, price_data: dict) -> dict:
        """Create a new price record."""
        try:
            response = (
                self.client
                .table(self.TABLE_NAME)
                .insert(price_data)
                .execute()
            )
            if response and response.data:
                logger.info(f"Created price record for URL: {price_data.get('product_url')}")
                return response.data[0]
            raise PriceCreationError(
                f"Insert returned no data for price: {price_data.get('product_url')}"
            )
        except PriceCreationError:
            raise
        except Exception as e:
            logger.error(f"Failed to create price record: {e}")
            raise PriceCreationError(
                f"Failed to create price for URL: {price_data.get('product_url')}",
                original_error=e
            ) from e
    
    def update(self, price_id: str, update_data: dict) -> Optional[dict]:
        """Update an existing price record by ID."""
        try:
            update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
            update_data["last_scraped_at"] = datetime.now(timezone.utc).isoformat()
            
            response = (
                self.client
                .table(self.TABLE_NAME)
                .update(update_data)
                .eq("id", price_id)
                .execute()
            )
            if response and response.data:
                logger.info(f"Updated price record ID: {price_id}")
                return response.data[0]
            return None
        except Exception as e:
            logger.error(f"Failed to update price record '{price_id}': {e}")
            raise PriceUpdateError(
                f"Failed to update price ID: {price_id}",
                original_error=e
            ) from e
    
    def upsert_by_url(self, price_data: dict) -> dict:
        """
        Create or update a price record by product URL.
        
        Args:
            price_data: Dict containing price fields (must include 'product_url')
            
        Returns:
            The created or updated price data
        """
        product_url = price_data.get("product_url")
        if not product_url:
            raise PriceCreationError("Price data must include 'product_url' for upsert")
        
        try:
            existing = self.get_by_product_url(product_url)
            if existing:
                return self.update(existing["id"], price_data)
            return self.create(price_data)
        except (PriceCreationError, PriceUpdateError):
            raise
        except Exception as e:
            logger.error(f"Failed to upsert price by URL '{product_url}': {e}")
            raise PriceCreationError(
                f"Failed to upsert price: {product_url}",
                original_error=e
            ) from e

    @retry_on_socket_error(max_retries=3, base_delay=0.1)
    def get_listings_paginated(
        self,
        page: int = 1,
        page_size: int = 24,
        category_slug: Optional[str] = None,
        search: Optional[str] = None,
        brand: Optional[str] = None,
        sort_by: Optional[str] = None,
    ) -> dict:
        """
        Get product listings (price records with product data) with DB-level pagination.
        
        This is the optimal approach for the "exploded" view where each 
        product-retailer combination is a separate listing. Instead of 
        fetching all products then all prices, this queries the prices 
        table directly with product data joined.
        
        Args:
            page: Page number (1-indexed)
            page_size: Number of listings per page
            category_slug: Optional category filter (applied to joined product)
            search: Optional search term
            brand: Optional brand filter
            sort_by: Sort option (newest, name_asc, name_desc, price_asc, price_desc)
            
        Returns:
            Dict with 'listings' and 'pagination' metadata
        """
        try:
            offset = (page - 1) * page_size
            
            # Select prices with product and retailer data joined
            select_fields = "*, products!inner(*), retailers(*)"
            
            # Build count query with same filters
            count_query = self.client.table(self.TABLE_NAME).select(
                "id, products!inner(category_slug, name, brand)", 
                count="exact"
            )
            
            # Apply filters
            if category_slug:
                count_query = count_query.eq("products.category_slug", category_slug)
            if brand:
                count_query = count_query.ilike("products.brand", f"%{brand}%")
            if search:
                count_query = count_query.or_(
                    f"products.name.ilike.%{search}%,products.brand.ilike.%{search}%"
                )
            
            count_response = count_query.execute()
            total_count = count_response.count if count_response else 0
            
            # Build data query
            query = self.client.table(self.TABLE_NAME).select(select_fields)
            
            # Apply same filters
            if category_slug:
                query = query.eq("products.category_slug", category_slug)
            if brand:
                query = query.ilike("products.brand", f"%{brand}%")
            if search:
                query = query.or_(
                    f"products.name.ilike.%{search}%,products.brand.ilike.%{search}%"
                )
            
            # Apply sorting
            if sort_by == "price_asc":
                query = query.order("price", desc=False)
            elif sort_by == "price_desc":
                query = query.order("price", desc=True)
            elif sort_by == "name_asc":
                query = query.order("name", desc=False, foreign_table="products")
            elif sort_by == "name_desc":
                query = query.order("name", desc=True, foreign_table="products")
            else:
                # Default: newest first by product created_at
                query = query.order("created_at", desc=True, foreign_table="products")
            
            # Apply pagination
            query = query.range(offset, offset + page_size - 1)
            
            response = query.execute()
            listings = response.data if response and response.data else []
            
            total_pages = (total_count + page_size - 1) // page_size if total_count > 0 else 0
            
            return {
                "listings": listings,
                "pagination": {
                    "page": page,
                    "page_size": page_size,
                    "total_count": total_count,
                    "total_pages": total_pages,
                    "has_next": page < total_pages,
                    "has_prev": page > 1,
                },
            }
        except Exception as e:
            logger.error(f"Failed to get paginated listings: {e}")
            raise ProductRepositoryError(
                "Failed to get paginated listings",
                original_error=e
            ) from e


# Lazy singleton instances
product_repository = ProductRepository()
retailer_repository = RetailerRepository()
price_repository = PriceRepository()
