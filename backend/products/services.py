"""
Product service layer for business logic.

This module contains all business logic for product management.
Follows clean architecture principles:
    - Orchestrates repository calls
    - Catches and handles repository exceptions
    - Contains business rules and workflows
    - No HTTP logic (no request objects, no Response returns)
    - No direct Supabase access
"""

import logging
import re
from typing import Optional, List, Dict, Any
from slugify import slugify

from products.repositories.supabase import (
    product_repository,
    retailer_repository,
    price_repository,
    product_specs_repository,
)
from products.repositories.exceptions import (
    ProductRepositoryError,
    ProductCreationError,
    ProductUpdateError,
    RetailerNotFoundError,
    PriceCreationError,
)

logger = logging.getLogger(__name__)


class ProductIngestionService:
    """
    Service for ingesting scraped product data.
    
    Handles the complete workflow of taking scraped data dictionaries
    and persisting them to the database with proper normalization.
    """
    
    def __init__(
        self,
        product_repo=None,
        retailer_repo=None,
        price_repo=None,
        specs_repo=None,
    ):
        self.product_repo = product_repo or product_repository
        self.retailer_repo = retailer_repo or retailer_repository
        self.price_repo = price_repo or price_repository
        self.specs_repo = specs_repo or product_specs_repository
    
    def ingest_scraped_product(self, scraped_data: Dict[str, Any]) -> Optional[dict]:
        """
        Main entry point for ingesting a single scraped product.
        
        Takes raw scraped data and:
        1. Normalizes the data
        2. Creates or updates the product
        3. Creates or updates the price record
        
        Args:
            scraped_data: Dictionary containing scraped product data:
                - name: Product name (required)
                - price: Price in BDT (required)
                - product_url: URL of the product page (required)
                - retailer_slug: Slug of the retailer (required)
                - category: Category name (required)
                - image_url: Product image URL (optional)
                - brand: Product brand (optional)
                - in_stock: Stock availability (optional, default True)
                - specs: Product specifications dict (optional)
        
        Returns:
            Dict containing the product and price data, or None on failure
        """
        try:
            # Validate required fields
            required_fields = ["name", "price", "product_url", "retailer_slug", "category"]
            for field in required_fields:
                if not scraped_data.get(field):
                    logger.error(f"Missing required field: {field}")
                    return None
            
            # Get retailer
            retailer = self.retailer_repo.get_by_slug(scraped_data["retailer_slug"])
            if not retailer:
                logger.error(f"Retailer not found: {scraped_data['retailer_slug']}")
                raise RetailerNotFoundError(
                    f"Retailer not found: {scraped_data['retailer_slug']}"
                )
            
            # Normalize and prepare product data
            product_data = self._prepare_product_data(scraped_data)
            
            # Upsert product
            product = self.product_repo.upsert_by_slug(product_data)
            
            # Prepare and upsert price data
            price_data = self._prepare_price_data(
                product_id=product["id"],
                retailer_id=retailer["id"],
                scraped_data=scraped_data,
            )
            price = self.price_repo.upsert_by_url(price_data)
            
            # Handle specs if present
            specs = scraped_data.get('specs', {})
            if specs and product:
                try:
                    self.specs_repo.upsert(
                        product_id=product['id'],
                        specs=specs,
                        source_url=scraped_data.get('specs_source_url'),
                    )
                    logger.debug(f"Saved specs for: {product['name']}")
                except Exception as e:
                    logger.warning(f"Failed to save specs for {product['name']}: {e}")
            
            logger.info(f"Successfully ingested product: {product['name']}")
            
            return {
                "product": product,
                "price": price,
                "retailer": retailer,
            }
            
        except (ProductCreationError, ProductUpdateError, PriceCreationError) as e:
            logger.error(f"Failed to ingest product: {e}")
            return None
        except ProductRepositoryError as e:
            logger.error(f"Database error during product ingestion: {e}")
            return None
    
    def ingest_batch(self, scraped_items: List[Dict[str, Any]]) -> Dict[str, int]:
        """
        Ingest a batch of scraped products.
        
        Args:
            scraped_items: List of scraped product dictionaries
            
        Returns:
            Dict with counts: {"success": N, "failed": M}
        """
        results = {"success": 0, "failed": 0}
        
        for item in scraped_items:
            try:
                result = self.ingest_scraped_product(item)
                if result:
                    results["success"] += 1
                else:
                    results["failed"] += 1
            except Exception as e:
                logger.error(f"Unexpected error ingesting item: {e}")
                results["failed"] += 1
        
        logger.info(f"Batch ingestion complete: {results}")
        return results
    
    def _prepare_product_data(self, scraped_data: Dict[str, Any]) -> dict:
        """
        Normalize scraped data into product format.
        
        Args:
            scraped_data: Raw scraped data
            
        Returns:
            Normalized product data dict
        """
        name = self._normalize_text(scraped_data["name"])
        category = scraped_data["category"]
        
        return {
            "name": name,
            "slug": self._generate_product_slug(name),
            "category": category,
            "category_slug": slugify(category, lowercase=True),
            "brand": scraped_data.get("brand", self._extract_brand(name)),
            "image_url": scraped_data.get("image_url"),
            # Note: specs are stored separately in product_specs table, not here
        }
    
    def _prepare_price_data(
        self,
        product_id: str,
        retailer_id: str,
        scraped_data: Dict[str, Any],
    ) -> dict:
        """
        Prepare price record data.
        
        Args:
            product_id: Product UUID
            retailer_id: Retailer UUID
            scraped_data: Raw scraped data
            
        Returns:
            Price data dict
        """
        return {
            "product_id": product_id,
            "retailer_id": retailer_id,
            "price": float(scraped_data["price"]),
            "currency": scraped_data.get("currency", "BDT"),
            "product_url": scraped_data["product_url"],
            "in_stock": scraped_data.get("in_stock", True),
        }
    
    def _normalize_text(self, text: str) -> str:
        """Clean and normalize text."""
        if not text:
            return ""
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text.strip())
        return text
    
    def _generate_product_slug(self, name: str) -> str:
        """Generate URL-friendly slug from product name."""
        return slugify(name, lowercase=True, max_length=200)
    
    def _extract_brand(self, name: str) -> Optional[str]:
        """
        Try to extract brand from product name.
        
        Common brands are checked first.
        """
        known_brands = [
            "AMD", "Intel", "NVIDIA", "ASUS", "MSI", "Gigabyte",
            "Corsair", "G.Skill", "Kingston", "Samsung", "Western Digital",
            "Seagate", "Crucial", "NZXT", "Cooler Master", "be quiet!",
            "Noctua", "EVGA", "Zotac", "Sapphire", "PowerColor",
            "ASRock", "Biostar", "Thermaltake", "Seasonic", "Lian Li",
            "Phanteks", "Fractal Design", "LG", "BenQ", "Dell", "HP",
            "Acer", "ViewSonic", "Logitech", "Razer", "SteelSeries",
            "HyperX", "Team", "PNY", "Adata", "Patriot", "Antec",
            "DeepCool", "Arctic", "XPG", "Toshiba", "WD",
        ]
        
        name_upper = name.upper()
        for brand in known_brands:
            if brand.upper() in name_upper:
                return brand
        
        # If no known brand, take first word as brand (common pattern)
        first_word = name.split()[0] if name.split() else None
        return first_word


class ProductService:
    """
    Service for general product operations.
    
    Handles product queries and formatting for API responses.
    """
    
    def __init__(
        self,
        product_repo=None,
        retailer_repo=None,
        price_repo=None,
    ):
        self.product_repo = product_repo or product_repository
        self.retailer_repo = retailer_repo or retailer_repository
        self.price_repo = price_repo or price_repository
    
    def get_product_with_prices(self, product_id: str) -> Optional[dict]:
        """
        Get a product with all its prices from different retailers.
        
        Args:
            product_id: Product UUID
            
        Returns:
            Product dict with 'retailers' list, or None if not found
        """
        try:
            product = self.product_repo.get_by_id(product_id)
            if not product:
                return None
            
            prices = self.price_repo.get_by_product_id(product_id)
            
            # Format retailers with prices
            retailers = []
            for price in prices:
                retailer_data = price.get("retailers", {})
                retailers.append({
                    "name": retailer_data.get("name", "Unknown"),
                    "price": float(price["price"]),
                    "inStock": price.get("in_stock", True),
                    "url": price["product_url"],
                })
            
            product["retailers"] = retailers
            return product
            
        except ProductRepositoryError as e:
            logger.error(f"Failed to get product with prices: {e}")
            return None
    
    def get_products_by_category(
        self,
        category_slug: str,
        limit: int = 100,
    ) -> List[dict]:
        """
        Get all products in a category with their prices.
        
        Args:
            category_slug: Category slug to filter by
            limit: Maximum products to return
            
        Returns:
            List of products with retailer prices
        """
        try:
            products = self.product_repo.get_by_category(category_slug, limit)
            
            if not products:
                return []
            
            # Batch fetch all prices in a single query (avoids N+1 problem)
            product_ids = [p["id"] for p in products]
            all_prices = self.price_repo.get_by_product_ids(product_ids)
            
            # Group prices by product_id for efficient lookup
            prices_by_product = {}
            for price in all_prices:
                pid = price["product_id"]
                if pid not in prices_by_product:
                    prices_by_product[pid] = []
                prices_by_product[pid].append(price)
            
            # Attach prices to each product
            for product in products:
                prices = prices_by_product.get(product["id"], [])
                retailers = []
                for price in prices:
                    retailer_data = price.get("retailers", {})
                    retailers.append({
                        "name": retailer_data.get("name", "Unknown"),
                        "price": float(price["price"]),
                        "inStock": price.get("in_stock", True),
                        "url": price["product_url"],
                    })
                product["retailers"] = retailers
            
            return products
            
        except ProductRepositoryError as e:
            logger.error(f"Failed to get products by category: {e}")
            return []
    
    def get_all_products(self, limit: int = 500) -> List[dict]:
        """
        Get all products with their prices.
        
        Args:
            limit: Maximum products to return
            
        Returns:
            List of products with retailer prices
        """
        try:
            products = self.product_repo.get_all(limit)
            
            if not products:
                return []
            
            # Batch fetch all prices in a single query (avoids N+1 problem)
            product_ids = [p["id"] for p in products]
            all_prices = self.price_repo.get_by_product_ids(product_ids)
            
            # Group prices by product_id for efficient lookup
            prices_by_product = {}
            for price in all_prices:
                pid = price["product_id"]
                if pid not in prices_by_product:
                    prices_by_product[pid] = []
                prices_by_product[pid].append(price)
            
            # Attach prices to each product
            for product in products:
                prices = prices_by_product.get(product["id"], [])
                retailers = []
                for price in prices:
                    retailer_data = price.get("retailers", {})
                    retailers.append({
                        "name": retailer_data.get("name", "Unknown"),
                        "price": float(price["price"]),
                        "inStock": price.get("in_stock", True),
                        "url": price["product_url"],
                    })
                product["retailers"] = retailers
            
            return products
            
        except ProductRepositoryError as e:
            logger.error(f"Failed to get all products: {e}")
            return []
    
    def get_products_paginated(
        self,
        page: int = 1,
        page_size: int = 24,
        category_slug: Optional[str] = None,
        search: Optional[str] = None,
        brands: Optional[List[str]] = None,
        sort_by: Optional[str] = None,
        product_ids: Optional[List[str]] = None,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
        retailers: Optional[List[str]] = None,
        grouped: bool = False,
    ) -> Dict[str, Any]:
        """
        Get products with server-side pagination, filtering, and sorting.
        
        This is the preferred method for listing products as it:
        - Returns pagination metadata for UI
        - Applies filters and sorting server-side for accurate results
        - For price sorting: fetches all products, sorts by price, then paginates
        - For other sorting: uses database-level pagination for efficiency
        
        Args:
            page: Page number (1-indexed)
            page_size: Number of products per page
            category_slug: Optional category filter
            search: Optional search term
            brand: Optional brand filter
            sort_by: Sort option (newest, name_asc, name_desc, price_asc, price_desc)
            grouped: If True, return products with all retailers grouped (for builder)
            
        Returns:
            Dict with 'products' list and 'pagination' metadata
        """
        try:
            if product_ids is not None and len(product_ids) == 0:
                return {
                    "products": [],
                    "pagination": {
                        "page": page,
                        "page_size": page_size,
                        "total_count": 0,
                        "total_pages": 0,
                        "has_next": False,
                        "has_prev": False,
                    },
                }
            if grouped:
                # Return products with all retailers grouped under one product
                # This is used by the system builder
                return self._get_products_grouped_paginated(
                    page=page,
                    page_size=page_size,
                    category_slug=category_slug,
                    search=search,
                    brands=brands,
                    sort_by=sort_by,
                    product_ids=product_ids,
                    min_price=min_price,
                    max_price=max_price,
                    retailers=retailers,
                )
            else:
                # Return one entry per product-retailer listing (exploded view)
                # This allows users to compare prices across stores directly in the grid
                return self._get_product_listings_paginated(
                    page=page,
                    page_size=page_size,
                    category_slug=category_slug,
                    search=search,
                    brands=brands,
                    sort_by=sort_by,
                    product_ids=product_ids,
                    min_price=min_price,
                    max_price=max_price,
                    retailers=retailers,
                )
            
        except ProductRepositoryError as e:
            logger.error(f"Failed to get paginated products: {e}")
            return {
                "products": [],
                "pagination": {
                    "page": page,
                    "page_size": page_size,
                    "total_count": 0,
                    "total_pages": 0,
                    "has_next": False,
                    "has_prev": False,
                },
            }
    
    def _get_products_grouped_paginated(
        self,
        page: int,
        page_size: int,
        category_slug: Optional[str],
        search: Optional[str],
        brands: Optional[List[str]],
        sort_by: Optional[str],
        product_ids: Optional[List[str]],
        min_price: Optional[float],
        max_price: Optional[float],
        retailers: Optional[List[str]],
    ) -> Dict[str, Any]:
        """
        Get products with all retailers grouped under each product.
        
        Each product appears once with all its retailer prices in the 'retailers' array.
        This is useful for system builder where you want to see all prices at once.
        """
        # Fetch all products matching filters
        result = self.product_repo.get_paginated(
            page=1,
            page_size=10000,  # Get all matching products
            category_slug=category_slug,
            search=search,
            brand=None,  # Don't filter by brand at DB level, we'll do it after
            sort_by=None,  # We'll sort after adding prices
            product_ids=product_ids,
        )
        
        all_products = result["products"]
        
        if not all_products:
            return {
                "products": [],
                "pagination": {
                    "page": page,
                    "page_size": page_size,
                    "total_count": 0,
                    "total_pages": 0,
                    "has_next": False,
                    "has_prev": False,
                },
            }
        
        # Batch fetch ALL prices
        product_ids = [p["id"] for p in all_products]
        all_prices = self.price_repo.get_by_product_ids(product_ids)
        
        # Group prices by product_id
        prices_by_product = {}
        for price in all_prices:
            pid = price["product_id"]
            if pid not in prices_by_product:
                prices_by_product[pid] = []
            prices_by_product[pid].append(price)
        
        # Build products with all retailers
        products_with_prices = []
        for product in all_products:
            # Apply brand filter
            if brands and len(brands) > 0:
                product_brand = product.get("brand", "")
                if not product_brand:
                    continue
                brand_match = any(brand.lower() == product_brand.lower() for brand in brands)
                if not brand_match:
                    continue
            
            prices = prices_by_product.get(product["id"], [])
            
            # Build retailers list
            retailers_list = []
            min_product_price = None
            for price in prices:
                retailer_data = price.get("retailers", {})
                retailer_slug = retailer_data.get("slug", "")
                price_value = float(price["price"])
                
                # Apply retailer filter
                if retailers and len(retailers) > 0:
                    if retailer_slug not in retailers:
                        continue
                
                # Apply price filter
                if min_price is not None and price_value < min_price:
                    continue
                if max_price is not None and price_value > max_price:
                    continue
                
                retailers_list.append({
                    "name": retailer_data.get("name", "Unknown"),
                    "price": price_value,
                    "inStock": price.get("in_stock", True),
                    "url": price["product_url"],
                })
                
                # Track minimum price
                if min_product_price is None or price_value < min_product_price:
                    min_product_price = price_value
            
            # Skip products with no matching retailers
            if not retailers_list:
                continue
            
            # Calculate stats
            total_retailers = len(retailers_list)
            in_stock_count = sum(1 for r in retailers_list if r.get("inStock", True))
            
            product_copy = {
                **product,
                "retailers": retailers_list,
                "total_retailers": total_retailers,
                "in_stock_count": in_stock_count,
            }
            products_with_prices.append(product_copy)
        
        # Apply sorting
        if sort_by == "price_asc":
            products_with_prices.sort(key=lambda x: min(r["price"] for r in x["retailers"]) if x["retailers"] else float('inf'))
        elif sort_by == "price_desc":
            products_with_prices.sort(key=lambda x: min(r["price"] for r in x["retailers"]) if x["retailers"] else 0, reverse=True)
        elif sort_by == "name_asc":
            products_with_prices.sort(key=lambda x: x.get("name", "").lower())
        elif sort_by == "name_desc":
            products_with_prices.sort(key=lambda x: x.get("name", "").lower(), reverse=True)
        else:
            # Default: newest first
            products_with_prices.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        
        # Calculate pagination
        total_count = len(products_with_prices)
        total_pages = (total_count + page_size - 1) // page_size if total_count > 0 else 0
        
        # Apply pagination
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        paginated_products = products_with_prices[start_idx:end_idx]
        
        return {
            "products": paginated_products,
            "pagination": {
                "page": page,
                "page_size": page_size,
                "total_count": total_count,
                "total_pages": total_pages,
                "has_next": page < total_pages,
                "has_prev": page > 1,
            },
        }
    
    def _get_product_listings_paginated(
        self,
        page: int,
        page_size: int,
        category_slug: Optional[str],
        search: Optional[str],
        brands: Optional[List[str]],
        sort_by: Optional[str],
        product_ids: Optional[List[str]],
        min_price: Optional[float],
        max_price: Optional[float],
        retailers: Optional[List[str]],
    ) -> Dict[str, Any]:
        """
        Get product listings with one entry per retailer.
        
        Instead of grouping retailers under a single product card,
        this "explodes" products so each product-retailer combination
        becomes a separate item. This allows users to compare prices
        directly in the product grid.
        
        Example: If "RTX 4090" is sold at StarTech and Techland,
        it will appear as 2 separate cards in the grid.
        
        This method uses database-level pagination for efficiency,
        querying the prices table directly with product data joined.
        """
        # Use the optimized database-level pagination
        result = self.price_repo.get_listings_paginated(
            page=page,
            page_size=page_size,
            category_slug=category_slug,
            search=search,
            brands=brands,
            sort_by=sort_by,
            product_ids=product_ids,
            min_price=min_price,
            max_price=max_price,
            retailers=retailers,
        )
        
        raw_listings = result.get("listings", [])
        pagination = result.get("pagination", {})
        
        if not raw_listings:
            return {
                "products": [],
                "pagination": pagination or {
                    "page": page,
                    "page_size": page_size,
                    "total_count": 0,
                    "total_pages": 0,
                    "has_next": False,
                    "has_prev": False,
                },
            }
        
        # Transform the raw listings to the expected format
        listings = []
        for price in raw_listings:
            product = price.get("products", {})
            retailer_data = price.get("retailers", {})
            
            if not product:
                continue
            
            # Create a listing entry
            listing = {
                **product,  # Copy all product fields
                "listing_id": price["id"],  # Unique ID for this listing
                "total_retailers": 1,  # Will be calculated if needed
                "in_stock_count": 1 if price.get("in_stock", True) else 0,
                "retailers": [{
                    "name": retailer_data.get("name", "Unknown") if retailer_data else "Unknown",
                    "price": float(price["price"]),
                    "inStock": price.get("in_stock", True),
                    "url": price["product_url"],
                }],
            }
            listings.append(listing)
        
        return {
            "products": listings,
            "pagination": pagination,
        }
    
    def get_all_retailers(self) -> List[dict]:
        """
        Get all active retailers with their product listing counts.
        
        Returns retailers sorted by product count (most products first).
        """
        try:
            return self.retailer_repo.get_all_with_counts(active_only=True)
        except ProductRepositoryError as e:
            logger.error(f"Failed to get retailers: {e}")
            return []
    
    def get_category_counts(self) -> Dict[str, int]:
        """
        Get product count for each category.
        
        Returns:
            Dict mapping category_slug to count
        """
        try:
            return self.product_repo.get_category_counts()
        except ProductRepositoryError as e:
            logger.error(f"Failed to get category counts: {e}")
            return {}
    
    def get_available_brands(self, category_slug: Optional[str] = None) -> List[str]:
        """
        Get list of available brands, optionally filtered by category.
        
        Args:
            category_slug: Optional category to filter brands by
            
        Returns:
            List of unique brand names
        """
        try:
            return self.product_repo.get_available_brands(category_slug)
        except ProductRepositoryError as e:
            logger.error(f"Failed to get available brands: {e}")
            return []
    
    def get_product_by_slug(
        self,
        category_slug: str,
        product_slug: str,
    ) -> Optional[Dict[str, Any]]:
        """
        Get complete product details by category and slug.
        
        Includes specs and all retailer prices for the product detail page.
        
        Args:
            category_slug: Category slug
            product_slug: Product slug
            
        Returns:
            Product dict with specs and retailers, or None if not found
        """
        try:
            # Get product by slug
            product = self.product_repo.get_by_slug(product_slug)
            if not product:
                return None
            
            # Verify category matches
            if product.get('category_slug') != category_slug:
                return None
            
            # Get specs
            specs_record = product_specs_repository.get_by_product_id(product['id'])
            product['specs'] = specs_record['specs'] if specs_record else {}
            
            # Get all retailer prices with URLs
            prices = self.price_repo.get_by_product_id(product['id'])
            retailers = []
            for price in prices:
                retailer_info = price.get('retailers', {})
                retailers.append({
                    'name': retailer_info.get('name', 'Unknown'),
                    'slug': retailer_info.get('slug', ''),
                    'price': float(price.get('price', 0)),
                    'inStock': price.get('in_stock', True),
                    'url': price.get('product_url', ''),
                })
            
            # Sort by price (lowest first)
            retailers.sort(key=lambda r: r['price'])
            product['retailers'] = retailers
            
            return product
            
        except ProductRepositoryError as e:
            logger.error(f"Failed to get product by slug: {e}")
            return None


# Singleton instances
product_ingestion_service = ProductIngestionService()
product_service = ProductService()

