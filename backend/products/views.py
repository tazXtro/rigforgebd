"""
Product API views.

Following clean architecture, views are thin controllers that:
- Handle HTTP request/response
- Validate input via serializers
- Call service layer functions
- Return Response objects
"""

import logging
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response

from products.services import product_service, product_ingestion_service
from products.serializers import (
    ProductSerializer,
    ProductListQuerySerializer,
    RetailerSerializer,
    BatchIngestionSerializer,
    IngestionResultSerializer,
)

logger = logging.getLogger(__name__)


class ProductListView(APIView):
    """
    GET /api/products/
    
    List products with server-side pagination.
    
    Query Parameters:
        - page: Page number (default: 1)
        - page_size: Items per page (default: 24, max: 100)
        - category: Category slug to filter by
        - cpu_id: Filter motherboards compatible with this CPU
        - motherboard_id: Filter RAM compatible with this motherboard
        - compat_mode: 'strict' (default) or 'lenient'
    
    Response includes pagination metadata for efficient loading.
    """
    
    def get(self, request):
        """Get paginated list of products with their prices."""
        # Validate query params
        query_serializer = ProductListQuerySerializer(data=request.query_params)
        if not query_serializer.is_valid():
            return Response(
                query_serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )
        
        params = query_serializer.validated_data
        page = params.get("page", 1)
        page_size = params.get("page_size", 24)
        category = params.get("category")
        search = params.get("search")
        brand_str = params.get("brand")
        sort = params.get("sort")
        cpu_id = params.get("cpu_id")
        motherboard_id = params.get("motherboard_id")
        compat_mode = params.get("compat_mode") or "strict"
        min_price = params.get("min_price")
        max_price = params.get("max_price")
        retailers_str = params.get("retailers")
        grouped = params.get("grouped", False)
        
        # Parse comma-separated brands
        brands = None
        if brand_str:
            brands = [b.strip() for b in brand_str.split(",") if b.strip()]
        
        # Parse comma-separated retailers
        retailers = None
        if retailers_str:
            retailers = [r.strip() for r in retailers_str.split(",") if r.strip()]

        # Compatibility filtering (CPU -> Motherboards, Motherboard -> RAM)
        product_ids = None
        if cpu_id or motherboard_id:
            if cpu_id and motherboard_id:
                return Response(
                    {"error": "Provide either cpu_id or motherboard_id, not both"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            from products.compatibility_service import compatibility_service

            if cpu_id:
                result = compatibility_service.get_compatible_motherboards(
                    cpu_id=cpu_id,
                    mode=compat_mode,
                )
            else:
                result = compatibility_service.get_compatible_ram(
                    motherboard_id=motherboard_id,
                    mode=compat_mode,
                )

            if compat_mode == "lenient":
                product_ids = list(set(result.get("compatible", []) + result.get("unknown", [])))
            else:
                product_ids = result.get("compatible", [])
        
        # Use paginated method with server-side filtering and sorting
        result = product_service.get_products_paginated(
            page=page,
            page_size=page_size,
            category_slug=category,
            search=search,
            brands=brands,
            sort_by=sort,
            product_ids=product_ids,
            min_price=min_price,
            max_price=max_price,
            retailers=retailers,
            grouped=grouped,
        )
        
        # Serialize products
        serializer = ProductSerializer(result["products"], many=True)
        
        return Response({
            "products": serializer.data,
            "pagination": result["pagination"],
        })


class ProductDetailView(APIView):
    """
    GET /api/products/<id>/
    
    Get a single product with all its retailer prices.
    """
    
    def get(self, request, product_id):
        """Get product details with prices from all retailers."""
        product = product_service.get_product_with_prices(product_id)
        
        if not product:
            return Response(
                {"error": "Product not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = ProductSerializer(product)
        return Response(serializer.data)


class RetailerListView(APIView):
    """
    GET /api/products/retailers/
    
    List all active retailers.
    """
    
    def get(self, request):
        """Get list of all active retailers."""
        retailers = product_service.get_all_retailers()
        serializer = RetailerSerializer(retailers, many=True)
        return Response(serializer.data)


class ProductIngestionView(APIView):
    """
    POST /api/products/ingest/
    
    Ingest scraped product data (internal API for scraper).
    """
    
    def post(self, request):
        """
        Ingest a batch of scraped products.
        
        This endpoint is meant to be called by the scraper
        to push scraped data into the database.
        """
        serializer = BatchIngestionSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )
        
        products = serializer.validated_data["products"]
        results = product_ingestion_service.ingest_batch(products)
        
        result_serializer = IngestionResultSerializer(results)
        return Response(result_serializer.data, status=status.HTTP_200_OK)


class CategoryCountsView(APIView):
    """
    GET /api/products/categories/counts/
    
    Get product counts per category.
    """
    
    def get(self, request):
        """Get product count for each category."""
        counts = product_service.get_category_counts()
        return Response(counts)


class BrandsListView(APIView):
    """
    GET /api/products/brands/
    
    Get list of available brands, optionally filtered by category.
    
    Query Parameters:
        - category: Category slug to filter brands by (optional)
    """
    
    def get(self, request):
        """Get list of available brands."""
        category_slug = request.query_params.get("category")
        brands = product_service.get_available_brands(category_slug)
        return Response(brands)


class ProductBySlugView(APIView):
    """
    GET /api/products/by-slug/<category>/<slug>/
    
    Get a product by its category and slug with full details.
    Includes specifications and all retailer prices.
    """
    
    def get(self, request, category_slug, product_slug):
        """Get product details by category and slug."""
        product = product_service.get_product_by_slug(category_slug, product_slug)
        
        if not product:
            return Response(
                {"error": "Product not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = ProductSerializer(product)
        return Response(serializer.data)


class CompatibleComponentsView(APIView):
    """
    GET /api/products/compatible/
    
    Get compatible components based on selected parts.
    
    Query Parameters:
        - cpu_id: Filter motherboards compatible with this CPU
        - motherboard_id: Filter RAM compatible with this motherboard
        - mode: 'strict' (default) or 'lenient'
    
    Returns product IDs only. Frontend fetches full product data separately.
    """
    
    def get(self, request):
        """Get compatible component IDs."""
        from products.compatibility_service import compatibility_service
        
        cpu_id = request.query_params.get('cpu_id')
        motherboard_id = request.query_params.get('motherboard_id')
        mode = request.query_params.get('mode', 'strict')
        
        # Validate mode
        if mode not in ('strict', 'lenient'):
            return Response(
                {"error": "mode must be 'strict' or 'lenient'"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # CPU -> Motherboards
        if cpu_id:
            result = compatibility_service.get_compatible_motherboards(
                cpu_id=cpu_id,
                mode=mode,
            )
            return Response(result)
        
        # Motherboard -> RAM
        if motherboard_id:
            result = compatibility_service.get_compatible_ram(
                motherboard_id=motherboard_id,
                mode=mode,
            )
            return Response(result)
        
        return Response(
            {"error": "Provide cpu_id or motherboard_id"},
            status=status.HTTP_400_BAD_REQUEST
        )


class ComponentCompatibilityInfoView(APIView):
    """
    GET /api/products/<id>/compatibility/
    
    Get compatibility information for a specific product.
    
    Returns extracted socket, chipset, memory type, etc.
    """
    
    def get(self, request, product_id):
        """Get compatibility info for a product."""
        from products.compatibility_service import compatibility_service
        
        compat_info = compatibility_service.get_component_compatibility_info(product_id)
        
        if not compat_info:
            return Response(
                {"error": "Compatibility info not found", "product_id": product_id},
                status=status.HTTP_404_NOT_FOUND
            )
        
        return Response(compat_info)
