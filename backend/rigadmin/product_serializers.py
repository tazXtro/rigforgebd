"""
Serializers for admin product management.

Handles validation for product creation, update, and price management.
"""

from rest_framework import serializers


# ==================== Input Serializers ====================

class AdminProductCreateSerializer(serializers.Serializer):
    """Input validation for creating a product via admin."""
    admin_email = serializers.EmailField(required=True)
    name = serializers.CharField(required=True, max_length=500)
    category = serializers.CharField(required=True, max_length=100)
    brand = serializers.CharField(required=False, max_length=100, allow_blank=True, allow_null=True)
    image_url = serializers.URLField(required=False, allow_blank=True, allow_null=True)
    specs = serializers.JSONField(required=False, default=dict)
    # Price entry (at least one retailer price)
    retailer_id = serializers.UUIDField(required=True, help_text="Retailer UUID")
    price = serializers.FloatField(required=True, min_value=0)
    product_url = serializers.URLField(required=True, help_text="Product URL at retailer")
    in_stock = serializers.BooleanField(required=False, default=True)


class AdminProductUpdateSerializer(serializers.Serializer):
    """Input validation for updating a product field via admin."""
    admin_email = serializers.EmailField(required=True)
    # All fields optional — only included fields get updated
    name = serializers.CharField(required=False, max_length=500)
    brand = serializers.CharField(required=False, max_length=100, allow_blank=True, allow_null=True)
    image_url = serializers.URLField(required=False, allow_blank=True, allow_null=True)
    category = serializers.CharField(required=False, max_length=100)


class AdminSpecsUpdateSerializer(serializers.Serializer):
    """Input validation for updating product specs via admin."""
    admin_email = serializers.EmailField(required=True)
    specs = serializers.JSONField(required=True)


class AdminPriceUpdateSerializer(serializers.Serializer):
    """Input validation for updating a retailer price via admin."""
    admin_email = serializers.EmailField(required=True)
    price = serializers.FloatField(required=False, min_value=0)
    in_stock = serializers.BooleanField(required=False)
    product_url = serializers.URLField(required=False)


class AdminPriceCreateSerializer(serializers.Serializer):
    """Input validation for adding a new retailer price to a product."""
    admin_email = serializers.EmailField(required=True)
    retailer_id = serializers.UUIDField(required=True)
    price = serializers.FloatField(required=True, min_value=0)
    product_url = serializers.URLField(required=True)
    in_stock = serializers.BooleanField(required=False, default=True)


class AdminProductDeleteSerializer(serializers.Serializer):
    """Input validation for deleting a product via admin."""
    admin_email = serializers.EmailField(required=True)


# ==================== Output Serializers ====================

class AdminProductOutputSerializer(serializers.Serializer):
    """Output format for admin product responses."""
    id = serializers.UUIDField(read_only=True)
    name = serializers.CharField(read_only=True)
    slug = serializers.CharField(read_only=True)
    category = serializers.CharField(read_only=True)
    category_slug = serializers.CharField(read_only=True)
    brand = serializers.CharField(read_only=True, allow_null=True)
    image_url = serializers.URLField(read_only=True, allow_null=True)
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)
