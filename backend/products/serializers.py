"""
Serializers for products API.
Following the architecture: serializers handle input validation and output formatting only.
"""

from rest_framework import serializers
from .models import Category, Retailer, Product, ProductPrice, GPUSpecification


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'description', 'icon']


class RetailerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Retailer
        fields = ['id', 'name', 'slug', 'website', 'logo']


class ProductPriceSerializer(serializers.ModelSerializer):
    retailer = RetailerSerializer(read_only=True)
    retailer_name = serializers.CharField(source='retailer.name', read_only=True)
    
    class Meta:
        model = ProductPrice
        fields = [
            'id',
            'retailer',
            'retailer_name',
            'price',
            'original_price',
            'availability',
            'product_url',
            'is_available',
            'last_checked',
        ]


class GPUSpecificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = GPUSpecification
        fields = [
            'chipset',
            'memory_size',
            'memory_type',
            'memory_bus',
            'base_clock',
            'boost_clock',
            'interface',
            'power_connector',
            'tdp',
            'recommended_psu',
            'hdmi_ports',
            'displayport_ports',
            'length',
            'slots',
            'cuda_cores',
            'stream_processors',
            'ray_tracing',
            'dlss_support',
            'fsr_support',
        ]


class ProductListSerializer(serializers.ModelSerializer):
    """Serializer for product list view - lighter weight."""
    category = CategorySerializer(read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    prices = ProductPriceSerializer(many=True, read_only=True)
    lowest_price = serializers.DecimalField(
        source='min_price',
        max_digits=12,
        decimal_places=2,
        read_only=True
    )
    retailers_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Product
        fields = [
            'id',
            'name',
            'brand',
            'image',
            'category',
            'category_name',
            'min_price',
            'max_price',
            'lowest_price',
            'prices',
            'retailers_count',
            'created_at',
        ]
    
    def get_retailers_count(self, obj):
        return obj.prices.filter(is_available=True).count()


class ProductDetailSerializer(serializers.ModelSerializer):
    """Serializer for product detail view - includes all data."""
    category = CategorySerializer(read_only=True)
    prices = ProductPriceSerializer(many=True, read_only=True)
    gpu_specs = GPUSpecificationSerializer(read_only=True)
    
    class Meta:
        model = Product
        fields = [
            'id',
            'name',
            'slug',
            'brand',
            'model',
            'image',
            'description',
            'category',
            'min_price',
            'max_price',
            'prices',
            'gpu_specs',
            'created_at',
            'updated_at',
        ]


class GPUProductSerializer(ProductDetailSerializer):
    """Serializer specifically for GPU products with specs."""
    gpu_specs = GPUSpecificationSerializer(read_only=True)
    
    class Meta(ProductDetailSerializer.Meta):
        fields = ProductDetailSerializer.Meta.fields


class ProductFilterSerializer(serializers.Serializer):
    """Serializer for product filter options."""
    brands = serializers.ListField(child=serializers.CharField())
    memory_sizes = serializers.ListField(child=serializers.CharField())
    price_range = serializers.DictField()
    retailers = RetailerSerializer(many=True)
