"""
Services layer for products business logic.
Following the architecture rules: services handle business logic,
views are thin controllers.
"""

from typing import Optional
from decimal import Decimal
from django.db.models import QuerySet, Q, Min, Max
from django.utils import timezone
from django.core.cache import cache

from .models import (
    Category,
    Retailer,
    Product,
    ProductPrice,
    GPUSpecification,
    ScrapeLog,
)


# Cache timeout in seconds (5 minutes)
CACHE_TIMEOUT = 300


def get_categories() -> QuerySet[Category]:
    """Get all active categories."""
    cache_key = 'categories_list'
    categories = cache.get(cache_key)
    
    if categories is None:
        categories = list(Category.objects.all())
        cache.set(cache_key, categories, CACHE_TIMEOUT)
    
    return categories


def get_retailers(active_only: bool = True) -> QuerySet[Retailer]:
    """Get retailers, optionally filtered by active status."""
    queryset = Retailer.objects.all()
    if active_only:
        queryset = queryset.filter(is_active=True)
    return queryset


def get_products(
    category_slug: Optional[str] = None,
    brand: Optional[str] = None,
    min_price: Optional[Decimal] = None,
    max_price: Optional[Decimal] = None,
    search: Optional[str] = None,
    in_stock_only: bool = False,
    retailer_slug: Optional[str] = None,
) -> QuerySet[Product]:
    """
    Get products with optional filtering.
    """
    queryset = Product.objects.filter(is_active=True).select_related('category')
    
    if category_slug:
        queryset = queryset.filter(category__slug=category_slug)
    
    if brand:
        queryset = queryset.filter(brand__iexact=brand)
    
    if min_price is not None:
        queryset = queryset.filter(min_price__gte=min_price)
    
    if max_price is not None:
        queryset = queryset.filter(min_price__lte=max_price)
    
    if search:
        queryset = queryset.filter(
            Q(name__icontains=search) |
            Q(brand__icontains=search) |
            Q(model__icontains=search)
        )
    
    if in_stock_only:
        queryset = queryset.filter(
            prices__is_available=True,
            prices__availability='in_stock'
        ).distinct()
    
    if retailer_slug:
        queryset = queryset.filter(
            prices__retailer__slug=retailer_slug
        ).distinct()
    
    return queryset.prefetch_related('prices', 'prices__retailer')


def get_product_by_id(product_id: int) -> Optional[Product]:
    """Get a single product by ID with all related data."""
    try:
        return Product.objects.select_related(
            'category'
        ).prefetch_related(
            'prices',
            'prices__retailer'
        ).get(id=product_id, is_active=True)
    except Product.DoesNotExist:
        return None


def get_gpus(
    brand: Optional[str] = None,
    memory_size: Optional[str] = None,
    min_price: Optional[Decimal] = None,
    max_price: Optional[Decimal] = None,
    search: Optional[str] = None,
    chipset: Optional[str] = None,
) -> QuerySet[Product]:
    """
    Get GPU products with specific GPU filters.
    """
    queryset = get_products(
        category_slug='gpu',
        brand=brand,
        min_price=min_price,
        max_price=max_price,
        search=search,
    ).select_related('gpu_specs')
    
    if memory_size:
        queryset = queryset.filter(gpu_specs__memory_size__icontains=memory_size)
    
    if chipset:
        queryset = queryset.filter(gpu_specs__chipset__icontains=chipset)
    
    return queryset


def get_gpu_brands() -> list[str]:
    """Get distinct GPU brands."""
    cache_key = 'gpu_brands'
    brands = cache.get(cache_key)
    
    if brands is None:
        # Get all brands and deduplicate case-insensitively
        all_brands = Product.objects.filter(
            category__slug='gpu',
            is_active=True,
            brand__isnull=False
        ).exclude(brand='').values_list('brand', flat=True).distinct()
        
        # Deduplicate case-insensitively and sort
        seen = set()
        brands = []
        for brand in all_brands:
            brand_lower = brand.lower()
            if brand_lower not in seen:
                seen.add(brand_lower)
                brands.append(brand)
        
        brands = sorted(brands)
        cache.set(cache_key, brands, CACHE_TIMEOUT)
    
    return brands


def get_gpu_memory_sizes() -> list[str]:
    """Get distinct GPU memory sizes."""
    cache_key = 'gpu_memory_sizes'
    sizes = cache.get(cache_key)
    
    if sizes is None:
        sizes = list(
            GPUSpecification.objects.filter(
                product__is_active=True
            ).exclude(
                memory_size=''
            ).values_list('memory_size', flat=True).distinct()
        )
        cache.set(cache_key, sizes, CACHE_TIMEOUT)
    
    return sizes


def get_price_range(category_slug: Optional[str] = None) -> dict:
    """Get min and max prices for products."""
    queryset = Product.objects.filter(is_active=True, min_price__isnull=False)
    
    if category_slug:
        queryset = queryset.filter(category__slug=category_slug)
    
    result = queryset.aggregate(
        min_price=Min('min_price'),
        max_price=Max('max_price')
    )
    
    return {
        'min': result['min_price'] or 0,
        'max': result['max_price'] or 0,
    }


def create_or_update_product_from_scrape(
    name: str,
    retailer: Retailer,
    category: Category,
    price: Decimal,
    product_url: str,
    image: str = '',
    brand: str = '',
    availability: str = 'in_stock',
    original_price: Optional[Decimal] = None,
    gpu_specs: Optional[dict] = None,
) -> tuple[Product, bool]:
    """
    Create or update a product from scraped data.
    Returns tuple of (product, created).
    """
    # Try to find existing product by name similarity
    # This is a simple approach - could be enhanced with fuzzy matching
    product = Product.objects.filter(
        name__iexact=name,
        category=category
    ).first()
    
    created = False
    
    if not product:
        product = Product.objects.create(
            name=name,
            brand=brand,
            category=category,
            image=image,
        )
        created = True
    else:
        # Update product info if we have better data
        if image and not product.image:
            product.image = image
        if brand and not product.brand:
            product.brand = brand
        product.save()
    
    # Create or update price entry
    price_entry, _ = ProductPrice.objects.update_or_create(
        product=product,
        retailer=retailer,
        defaults={
            'price': price,
            'original_price': original_price,
            'availability': availability,
            'product_url': product_url,
            'is_available': availability == 'in_stock',
            'last_checked': timezone.now(),
        }
    )
    
    # Update product's price range
    product.update_price_range()
    
    # Handle GPU specs if provided
    if gpu_specs and category.slug == 'gpu':
        GPUSpecification.objects.update_or_create(
            product=product,
            defaults=gpu_specs
        )
    
    return product, created


def create_scrape_log(
    retailer: Retailer,
    category: Optional[Category] = None
) -> ScrapeLog:
    """Create a new scrape log entry."""
    return ScrapeLog.objects.create(
        retailer=retailer,
        category=category,
        status='running'
    )


def complete_scrape_log(
    log: ScrapeLog,
    products_found: int,
    products_created: int,
    products_updated: int,
    errors: str = '',
    success: bool = True
) -> ScrapeLog:
    """Mark a scrape log as completed."""
    log.status = 'completed' if success else 'failed'
    log.products_found = products_found
    log.products_created = products_created
    log.products_updated = products_updated
    log.errors = errors
    log.completed_at = timezone.now()
    log.save()
    return log


def invalidate_product_cache():
    """Clear product-related cache entries."""
    cache.delete_many([
        'categories_list',
        'gpu_brands',
        'gpu_memory_sizes',
    ])
