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
from typing import Optional, List
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
    
    def get_paginated(
        self,
        page: int = 1,
        page_size: int = 24,
        category_slug: Optional[str] = None,
    ) -> dict:
        """
        Retrieve products with pagination.
        
        Uses offset-based pagination which works well with Supabase.
        Returns both the products and pagination metadata.
        
        Args:
            page: Page number (1-indexed)
            page_size: Number of products per page
            category_slug: Optional category filter
            
        Returns:
            Dict with 'products' list and 'pagination' metadata
        """
        try:
            # Calculate offset
            offset = (page - 1) * page_size
            
            # Build base query for counting
            count_query = self.client.table(self.TABLE_NAME).select("*", count="exact")
            if category_slug:
                count_query = count_query.eq("category_slug", category_slug)
            
            # Get total count
            count_response = count_query.execute()
            total_count = count_response.count if count_response else 0
            
            # Build query for fetching products
            query = (
                self.client
                .table(self.TABLE_NAME)
                .select("*")
                .order("created_at", desc=True)  # Newest first
                .range(offset, offset + page_size - 1)
            )
            
            if category_slug:
                query = query.eq("category_slug", category_slug)
            
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
    
    def get_category_counts(self) -> dict:
        """
        Get count of products per category.
        
        Returns:
            Dict mapping category_slug to product count
        """
        try:
            # Fetch all products and count by category_slug
            response = (
                self.client
                .table(self.TABLE_NAME)
                .select("category_slug")
                .execute()
            )
            
            if not response or not response.data:
                return {}
            
            # Count products per category
            counts = {}
            for product in response.data:
                slug = product.get("category_slug", "")
                if slug:
                    counts[slug] = counts.get(slug, 0) + 1
            
            # Add total count
            counts[""] = len(response.data)
            
            return counts
            
        except Exception as e:
            logger.error(f"Failed to get category counts: {e}")
            raise ProductRepositoryError(
                "Failed to get category counts",
                original_error=e
            ) from e
    
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
    
    def get_by_product_ids(self, product_ids: List[str]) -> List[dict]:
        """
        Retrieve all price records for multiple products in a single query.
        
        This is more efficient than calling get_by_product_id for each product
        as it avoids the N+1 query problem and reduces socket pressure.
        
        Args:
            product_ids: List of product UUIDs
            
        Returns:
            List of price records with retailer data
        """
        if not product_ids:
            return []
        
        try:
            response = (
                self.client
                .table(self.TABLE_NAME)
                .select("*, retailers(*)")
                .in_("product_id", product_ids)
                .execute()
            )
            return response.data if response and response.data else []
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


# Lazy singleton instances
product_repository = ProductRepository()
retailer_repository = RetailerRepository()
price_repository = PriceRepository()
