"""
Product serializers for request/response validation.

These serializers handle input validation and output formatting
for the products API endpoints.
"""

from rest_framework import serializers


class RetailerSerializer(serializers.Serializer):
    """Serializer for retailer data in product responses."""
    
    id = serializers.UUIDField(read_only=True)
    name = serializers.CharField(max_length=100)
    slug = serializers.CharField(max_length=100)
    base_url = serializers.URLField()
    is_active = serializers.BooleanField(default=True)


class ProductPriceSerializer(serializers.Serializer):
    """Serializer for product price from a retailer."""
    
    name = serializers.CharField(help_text="Retailer name")
    price = serializers.FloatField(help_text="Price in BDT")
    inStock = serializers.BooleanField(default=True)
    url = serializers.URLField(help_text="Product URL at retailer")


class ProductSerializer(serializers.Serializer):
    """Serializer for product listing responses."""
    
    id = serializers.UUIDField(read_only=True)
    name = serializers.CharField(max_length=500)
    slug = serializers.CharField(max_length=500)
    category = serializers.CharField(max_length=100)
    categorySlug = serializers.CharField(source="category_slug", max_length=100)
    brand = serializers.CharField(max_length=100, allow_null=True)
    image = serializers.URLField(source="image_url", allow_null=True)
    specs = serializers.JSONField(default=dict)
    retailers = ProductPriceSerializer(many=True, read_only=True)


class ProductListQuerySerializer(serializers.Serializer):
    """Serializer for product list query parameters."""
    
    category = serializers.CharField(required=False)
    brand = serializers.CharField(required=False)
    search = serializers.CharField(required=False)
    min_price = serializers.IntegerField(required=False, min_value=0)
    max_price = serializers.IntegerField(required=False, min_value=0)
    in_stock = serializers.BooleanField(required=False)
    limit = serializers.IntegerField(required=False, default=100, min_value=1, max_value=500)


class ScrapedProductSerializer(serializers.Serializer):
    """
    Serializer for validating scraped product data.
    
    Used when receiving scraped data from spiders.
    """
    
    name = serializers.CharField(max_length=500)
    price = serializers.FloatField(min_value=0)
    product_url = serializers.URLField()
    retailer_slug = serializers.CharField(max_length=100)
    category = serializers.CharField(max_length=100)
    image_url = serializers.URLField(required=False, allow_null=True)
    brand = serializers.CharField(max_length=100, required=False, allow_null=True)
    in_stock = serializers.BooleanField(default=True)
    specs = serializers.JSONField(default=dict, required=False)


class BatchIngestionSerializer(serializers.Serializer):
    """Serializer for batch product ingestion requests."""
    
    products = ScrapedProductSerializer(many=True)


class IngestionResultSerializer(serializers.Serializer):
    """Serializer for ingestion result response."""
    
    success = serializers.IntegerField()
    failed = serializers.IntegerField()
