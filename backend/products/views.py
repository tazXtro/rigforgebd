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
        brand = params.get("brand")
        sort = params.get("sort")
        
        # Use paginated method with server-side filtering and sorting
        result = product_service.get_products_paginated(
            page=page,
            page_size=page_size,
            category_slug=category,
            search=search,
            brand=brand,
            sort_by=sort,
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

