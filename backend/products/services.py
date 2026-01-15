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
    ):
        self.product_repo = product_repo or product_repository
        self.retailer_repo = retailer_repo or retailer_repository
        self.price_repo = price_repo or price_repository
    
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
            "specs": scraped_data.get("specs", {}),
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
            
            # Fetch prices for each product
            for product in products:
                prices = self.price_repo.get_by_product_id(product["id"])
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
    
    def get_all_retailers(self) -> List[dict]:
        """Get all active retailers."""
        try:
            return self.retailer_repo.get_all(active_only=True)
        except ProductRepositoryError as e:
            logger.error(f"Failed to get retailers: {e}")
            return []


# Singleton instances
product_ingestion_service = ProductIngestionService()
product_service = ProductService()
