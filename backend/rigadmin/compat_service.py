"""
Admin compatibility service layer.

Business logic for querying and updating products with missing
compatibility fields (cpu_socket, mobo_socket, memory_type,
memory_max_speed_mhz).
"""

import logging
from typing import Dict, Any, List, Optional, Tuple

from rigadmin.repositories.supabase import admin_repository
from users.repositories.exceptions import RepositoryError

logger = logging.getLogger(__name__)

# Define which fields are required per component type
REQUIRED_FIELDS = {
    "cpu": ["cpu_socket"],
    "motherboard": ["mobo_socket", "memory_type"],
    "ram": ["memory_type", "memory_max_speed_mhz"],
}

# Fields that admins are allowed to update per component type
EDITABLE_FIELDS = {
    "cpu": {"cpu_socket"},
    "motherboard": {"mobo_socket", "memory_type"},
    "ram": {"memory_type", "memory_max_speed_mhz"},
}


class AdminCompatService:
    """
    Service layer for admin compatibility management.

    Queries the product_compat table for records with NULL critical fields
    and allows admins to fill them in.
    """

    def __init__(self, admin_repo=None):
        self._client = None
        self.admin_repo = admin_repo or admin_repository

    @property
    def client(self):
        if self._client is None:
            from core.infrastructure.supabase.client import get_supabase_client
            self._client = get_supabase_client()
        return self._client

    # ------------------------------------------------------------------ auth
    def _verify_admin(self, email: str) -> bool:
        try:
            admin = self.admin_repo.get_by_email(email)
            return admin is not None
        except RepositoryError:
            return False

    # ------------------------------------------------- missing field helpers
    def _get_missing_fields(self, record: Dict[str, Any]) -> List[str]:
        """Return which required fields are NULL for a given compat record."""
        comp_type = record.get("component_type", "")
        required = REQUIRED_FIELDS.get(comp_type, [])
        return [f for f in required if record.get(f) is None]

    # --------------------------------------------------- count missing
    def get_missing_counts(self, admin_email: str) -> Tuple[Optional[Dict], Optional[str]]:
        """
        Return counts of products with missing compat fields, grouped by type.

        Returns:
            (counts_dict, None) on success or (None, error_message).
        """
        if not self._verify_admin(admin_email):
            return None, "Not authorized"

        try:
            counts = {"cpu": 0, "motherboard": 0, "ram": 0}

            for comp_type, fields in REQUIRED_FIELDS.items():
                # Build an OR filter: any required field is null
                for field in fields:
                    result = (
                        self.client.table("product_compat")
                        .select("id", count="exact")
                        .eq("component_type", comp_type)
                        .is_(field, "null")
                        .execute()
                    )
                    counts[comp_type] = max(counts[comp_type], result.count or 0)

            counts["total"] = counts["cpu"] + counts["motherboard"] + counts["ram"]
            return counts, None

        except Exception as e:
            logger.error(f"Error fetching missing compat counts: {e}")
            return None, f"Failed to fetch counts: {str(e)}"

    # ------------------------------------------------- list missing records
    def get_missing_records(
        self,
        admin_email: str,
        component_type: str = "all",
        page: int = 1,
        page_size: int = 20,
    ) -> Tuple[Optional[Dict], Optional[str]]:
        """
        Fetch product_compat records where at least one critical field is NULL.

        Joins product info (name, brand, category, image_url) for display.

        Returns:
            ({records, total, page, page_size}, None) or (None, error).
        """
        if not self._verify_admin(admin_email):
            return None, "Not authorized"

        try:
            types_to_query = (
                [component_type] if component_type != "all"
                else ["cpu", "motherboard", "ram"]
            )

            all_records: List[Dict[str, Any]] = []

            for ctype in types_to_query:
                fields = REQUIRED_FIELDS.get(ctype, [])
                if not fields:
                    continue

                # For each required field, fetch records where it's null
                for field in fields:
                    result = (
                        self.client.table("product_compat")
                        .select(
                            "id, product_id, component_type, "
                            "cpu_socket, mobo_socket, memory_type, memory_max_speed_mhz, "
                            "confidence, extraction_source, "
                            "products(name, brand, category, image_url)"
                        )
                        .eq("component_type", ctype)
                        .is_(field, "null")
                        .execute()
                    )
                    if result.data:
                        all_records.extend(result.data)

            # Deduplicate by product_compat id
            seen_ids = set()
            unique_records = []
            for rec in all_records:
                if rec["id"] not in seen_ids:
                    seen_ids.add(rec["id"])
                    unique_records.append(rec)

            # Enrich with product info + missing_fields
            enriched = []
            for rec in unique_records:
                product_info = rec.pop("products", None) or {}
                enriched.append({
                    **rec,
                    "product_name": product_info.get("name"),
                    "product_brand": product_info.get("brand"),
                    "product_category": product_info.get("category"),
                    "product_image_url": product_info.get("image_url"),
                    "missing_fields": self._get_missing_fields(rec),
                })

            # Sort: most missing fields first, then by component_type
            type_order = {"cpu": 0, "motherboard": 1, "ram": 2}
            enriched.sort(
                key=lambda r: (
                    -len(r["missing_fields"]),
                    type_order.get(r["component_type"], 9),
                )
            )

            total = len(enriched)

            # Paginate
            start = (page - 1) * page_size
            end = start + page_size
            page_records = enriched[start:end]

            return {
                "records": page_records,
                "total": total,
                "page": page,
                "page_size": page_size,
            }, None

        except Exception as e:
            logger.error(f"Error fetching missing compat records: {e}")
            return None, f"Failed to fetch records: {str(e)}"

    # ------------------------------------------------- update compat record
    def update_compat(
        self,
        product_id: str,
        admin_email: str,
        data: Dict[str, Any],
    ) -> Tuple[Optional[Dict], Optional[str]]:
        """
        Update compatibility fields for a product.

        Only allows setting fields relevant to the product's component_type.
        Updates confidence to 0.95 and extraction_source to 'admin_manual'.

        Returns:
            (updated_record, None) or (None, error_message).
        """
        if not self._verify_admin(admin_email):
            return None, "Not authorized"

        try:
            # Fetch current record
            result = (
                self.client.table("product_compat")
                .select("*")
                .eq("product_id", product_id)
                .single()
                .execute()
            )

            if not result.data:
                return None, "Compatibility record not found"

            record = result.data
            comp_type = record.get("component_type")
            allowed = EDITABLE_FIELDS.get(comp_type, set())

            # Build update payload — only allowed fields
            update_payload: Dict[str, Any] = {}
            for field in allowed:
                if field in data and data[field] is not None:
                    update_payload[field] = data[field]

            if not update_payload:
                return None, "No valid fields to update"

            # Mark as admin-manual with high confidence
            update_payload["confidence"] = 0.95
            update_payload["extraction_source"] = "admin_manual"

            updated = (
                self.client.table("product_compat")
                .update(update_payload)
                .eq("product_id", product_id)
                .execute()
            )

            if updated.data:
                logger.info(
                    f"Admin updated compat for product {product_id}: "
                    f"fields={list(update_payload.keys())}"
                )
                return updated.data[0], None

            return None, "Failed to update record"

        except Exception as e:
            logger.error(f"Error updating compat for {product_id}: {e}")
            return None, f"Failed to update: {str(e)}"


# Singleton instance
admin_compat_service = AdminCompatService()
