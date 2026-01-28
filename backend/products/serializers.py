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
    product_count = serializers.IntegerField(read_only=True, required=False, default=0)


class ProductPriceSerializer(serializers.Serializer):
    """Serializer for product price from a retailer."""
    
    name = serializers.CharField(help_text="Retailer name")
    slug = serializers.CharField(required=False, help_text="Retailer slug")
    price = serializers.FloatField(help_text="Price in BDT")
    inStock = serializers.BooleanField(default=True)
    url = serializers.URLField(help_text="Product URL at retailer")


class ProductSerializer(serializers.Serializer):
    """Serializer for product listing responses."""
    
    id = serializers.UUIDField(read_only=True)
    listing_id = serializers.UUIDField(read_only=True, required=False, allow_null=True)  # Unique per retailer listing
    name = serializers.CharField(max_length=500)
    slug = serializers.CharField(max_length=500)
    category = serializers.CharField(max_length=100)
    categorySlug = serializers.CharField(source="category_slug", max_length=100)
    brand = serializers.CharField(max_length=100, allow_null=True)
    image = serializers.URLField(source="image_url", allow_null=True)
    specs = serializers.JSONField(default=dict)
    retailers = ProductPriceSerializer(many=True, read_only=True)
    # Retailer availability info (for per-listing display)
    total_retailers = serializers.IntegerField(read_only=True, required=False, default=1)
    in_stock_count = serializers.IntegerField(read_only=True, required=False, default=0)


class ProductListQuerySerializer(serializers.Serializer):
    """Serializer for product list query parameters."""
    
    category = serializers.CharField(required=False)
    brand = serializers.CharField(required=False)
    search = serializers.CharField(required=False)
    sort = serializers.CharField(required=False)  # Sort option: newest, name_asc, name_desc, price_asc, price_desc
    cpu_id = serializers.CharField(required=False)
    motherboard_id = serializers.CharField(required=False)
    compat_mode = serializers.ChoiceField(required=False, choices=["strict", "lenient"])
    min_price = serializers.IntegerField(required=False, min_value=0)
    max_price = serializers.IntegerField(required=False, min_value=0)
    retailers = serializers.CharField(required=False)  # Comma-separated retailer slugs
    in_stock = serializers.BooleanField(required=False)
    grouped = serializers.BooleanField(required=False, default=False)  # If true, group all retailers under one product
    # Pagination parameters
    page = serializers.IntegerField(required=False, default=1, min_value=1)
    page_size = serializers.IntegerField(required=False, default=24, min_value=1, max_value=100)


class PaginatedProductListSerializer(serializers.Serializer):
    """Serializer for paginated product list responses."""
    
    products = ProductSerializer(many=True)
    pagination = serializers.DictField(child=serializers.IntegerField())


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
