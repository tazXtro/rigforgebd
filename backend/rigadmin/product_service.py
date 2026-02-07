"""
Admin product management service layer.

Handles business logic for admin product CRUD operations:
    - Create product with initial retailer price
    - Update product fields (name, brand, image, category)
    - Update product specifications
    - Add/update retailer prices
    - Delete products
"""

import logging
from typing import Optional, Dict, Any, Tuple

from slugify import slugify

from rigadmin.repositories.supabase import admin_repository
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
    ProductNotFoundError,
)
from users.repositories.exceptions import RepositoryError

logger = logging.getLogger(__name__)


class AdminProductService:
    """
    Service layer for admin product management.

    Orchestrates repository calls for product CRUD operations.
    Enforces admin authorization on every action.
    """

    def __init__(
        self,
        admin_repo=None,
        product_repo=None,
        retailer_repo=None,
        price_repo=None,
        specs_repo=None,
    ):
        self.admin_repo = admin_repo or admin_repository
        self.product_repo = product_repo or product_repository
        self.retailer_repo = retailer_repo or retailer_repository
        self.price_repo = price_repo or price_repository
        self.specs_repo = specs_repo or product_specs_repository

    # ------------------------------------------------------------------ auth
    def _verify_admin(self, email: str) -> bool:
        """Check if the email belongs to an admin."""
        try:
            admin = self.admin_repo.get_by_email(email)
            return admin is not None
        except RepositoryError:
            return False

    # ----------------------------------------------------------- create
    def create_product(self, data: Dict[str, Any]) -> Tuple[Optional[dict], Optional[str]]:
        """
        Create a new product with an initial retailer price entry.

        Args:
            data: Validated serializer data including admin_email, name,
                  category, brand, image_url, specs, retailer_id, price,
                  product_url, in_stock.

        Returns:
            (product_dict, None) on success or (None, error_message) on failure.
        """
        if not self._verify_admin(data["admin_email"]):
            return None, "Not authorized"

        try:
            # Validate retailer exists
            retailer = self.retailer_repo.get_by_id(str(data["retailer_id"]))
            if not retailer:
                return None, "Retailer not found"

            # Build product data
            name = data["name"].strip()
            category = data["category"].strip()
            product_data = {
                "name": name,
                "slug": slugify(name, lowercase=True, max_length=200),
                "category": category,
                "category_slug": slugify(category, lowercase=True),
                "brand": (data.get("brand") or "").strip() or None,
                "image_url": data.get("image_url") or None,
            }

            # Check slug uniqueness
            existing = self.product_repo.get_by_slug(product_data["slug"])
            if existing:
                return None, f"A product with a similar name already exists (slug: {product_data['slug']})"

            product = self.product_repo.create(product_data)

            # Create initial price entry
            price_data = {
                "product_id": product["id"],
                "retailer_id": str(data["retailer_id"]),
                "price": float(data["price"]),
                "currency": "BDT",
                "product_url": data["product_url"],
                "in_stock": data.get("in_stock", True),
            }
            self.price_repo.create(price_data)

            # Save specs if provided
            specs = data.get("specs")
            if specs and isinstance(specs, dict) and len(specs) > 0:
                self.specs_repo.upsert(
                    product_id=product["id"],
                    specs=specs,
                )

            # Invalidate caches
            self.product_repo.invalidate_category_counts_cache()

            logger.info(f"Admin created product: {product['name']} (id={product['id']})")
            return product, None

        except (ProductCreationError, ProductRepositoryError) as e:
            logger.error(f"Failed to create product: {e}")
            return None, f"Failed to create product: {e.message}"

    # ----------------------------------------------------------- update product
    def update_product(
        self, product_id: str, data: Dict[str, Any]
    ) -> Tuple[Optional[dict], Optional[str]]:
        """
        Update product base fields (name, brand, image_url, category).

        Only fields present in *data* are updated.
        """
        if not self._verify_admin(data["admin_email"]):
            return None, "Not authorized"

        try:
            product = self.product_repo.get_by_id(product_id)
            if not product:
                return None, "Product not found"

            update_fields: Dict[str, Any] = {}

            if "name" in data:
                name = data["name"].strip()
                update_fields["name"] = name
                update_fields["slug"] = slugify(name, lowercase=True, max_length=200)

            if "brand" in data:
                update_fields["brand"] = (data["brand"] or "").strip() or None

            if "image_url" in data:
                update_fields["image_url"] = data["image_url"] or None

            if "category" in data:
                category = data["category"].strip()
                update_fields["category"] = category
                update_fields["category_slug"] = slugify(category, lowercase=True)

            if not update_fields:
                return product, None  # nothing to update

            updated = self.product_repo.update(product_id, update_fields)
            if not updated:
                return None, "Failed to update product"

            self.product_repo.invalidate_category_counts_cache()

            logger.info(f"Admin updated product {product_id}: fields={list(update_fields.keys())}")
            return updated, None

        except (ProductUpdateError, ProductRepositoryError) as e:
            logger.error(f"Failed to update product {product_id}: {e}")
            return None, f"Failed to update product: {e.message}"

    # ----------------------------------------------------------- update specs
    def update_specs(
        self, product_id: str, data: Dict[str, Any]
    ) -> Tuple[Optional[dict], Optional[str]]:
        """Update specifications for a product."""
        if not self._verify_admin(data["admin_email"]):
            return None, "Not authorized"

        try:
            product = self.product_repo.get_by_id(product_id)
            if not product:
                return None, "Product not found"

            specs_record = self.specs_repo.upsert(
                product_id=product_id,
                specs=data["specs"],
            )
            logger.info(f"Admin updated specs for product {product_id}")
            return specs_record, None

        except ProductRepositoryError as e:
            logger.error(f"Failed to update specs for {product_id}: {e}")
            return None, f"Failed to update specs: {e.message}"

    # ----------------------------------------------------------- price operations
    def add_price(
        self, product_id: str, data: Dict[str, Any]
    ) -> Tuple[Optional[dict], Optional[str]]:
        """Add a new retailer price entry to a product."""
        if not self._verify_admin(data["admin_email"]):
            return None, "Not authorized"

        try:
            product = self.product_repo.get_by_id(product_id)
            if not product:
                return None, "Product not found"

            retailer = self.retailer_repo.get_by_id(str(data["retailer_id"]))
            if not retailer:
                return None, "Retailer not found"

            price_data = {
                "product_id": product_id,
                "retailer_id": str(data["retailer_id"]),
                "price": float(data["price"]),
                "currency": "BDT",
                "product_url": data["product_url"],
                "in_stock": data.get("in_stock", True),
            }
            price = self.price_repo.create(price_data)
            logger.info(f"Admin added price for product {product_id}, retailer {retailer['name']}")
            return price, None

        except ProductRepositoryError as e:
            logger.error(f"Failed to add price for {product_id}: {e}")
            return None, f"Failed to add price: {e.message}"

    def update_price(
        self, product_id: str, price_id: str, data: Dict[str, Any]
    ) -> Tuple[Optional[dict], Optional[str]]:
        """Update an existing retailer price entry."""
        if not self._verify_admin(data["admin_email"]):
            return None, "Not authorized"

        try:
            update_fields: Dict[str, Any] = {}
            if "price" in data:
                update_fields["price"] = float(data["price"])
            if "in_stock" in data:
                update_fields["in_stock"] = data["in_stock"]
            if "product_url" in data:
                update_fields["product_url"] = data["product_url"]

            if not update_fields:
                return None, "No fields to update"

            updated = self.price_repo.update(price_id, update_fields)
            if not updated:
                return None, "Price entry not found"

            logger.info(f"Admin updated price {price_id} for product {product_id}")
            return updated, None

        except ProductRepositoryError as e:
            logger.error(f"Failed to update price {price_id}: {e}")
            return None, f"Failed to update price: {e.message}"

    # ----------------------------------------------------------- delete
    def delete_product(
        self, product_id: str, admin_email: str
    ) -> Tuple[bool, Optional[str]]:
        """Delete a product and all its associated data."""
        if not self._verify_admin(admin_email):
            return False, "Not authorized"

        try:
            product = self.product_repo.get_by_id(product_id)
            if not product:
                return False, "Product not found"

            # Delete specs first (cascade may or may not handle it)
            try:
                self.specs_repo.delete_by_product_id(product_id)
            except Exception:
                pass  # specs might not exist

            # Delete the product (prices cascade via FK)
            from core.infrastructure.supabase.client import get_supabase_client
            client = get_supabase_client()
            client.table("products").delete().eq("id", product_id).execute()

            self.product_repo.invalidate_category_counts_cache()

            logger.info(f"Admin deleted product {product_id} ({product['name']})")
            return True, None

        except Exception as e:
            logger.error(f"Failed to delete product {product_id}: {e}")
            return False, f"Failed to delete product: {str(e)}"


# Singleton instance
admin_product_service = AdminProductService()
