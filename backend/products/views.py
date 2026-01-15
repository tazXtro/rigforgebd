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
    
    List products with optional filtering.
    """
    
    def get(self, request):
        """Get list of products with their prices."""
        # Validate query params
        query_serializer = ProductListQuerySerializer(data=request.query_params)
        if not query_serializer.is_valid():
            return Response(
                query_serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )
        
        params = query_serializer.validated_data
        category = params.get("category")
        limit = params.get("limit", 100)
        
        if category:
            products = product_service.get_products_by_category(category, limit)
        else:
            # TODO: Implement get_all_products when needed
            products = []
        
        serializer = ProductSerializer(products, many=True)
        return Response(serializer.data)


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
