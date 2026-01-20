"""
Products repositories.

Exports:
    - product_repository: ProductRepository instance for products table
    - retailer_repository: RetailerRepository instance for retailers table
    - price_repository: PriceRepository instance for product_prices table
    - product_specs_repository: ProductSpecsRepository instance for product_specs table
"""

from products.repositories.supabase import (
    product_repository,
    retailer_repository,
    price_repository,
    product_specs_repository,
)

__all__ = [
    "product_repository",
    "retailer_repository", 
    "price_repository",
    "product_specs_repository",
]

