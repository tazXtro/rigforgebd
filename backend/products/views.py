"""
API views for products.
Following the architecture: views are thin controllers that handle
HTTP request/response and delegate to services.
"""

from decimal import Decimal, InvalidOperation
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAdminUser

from . import services
from .serializers import (
    CategorySerializer,
    RetailerSerializer,
    ProductListSerializer,
    ProductDetailSerializer,
    GPUProductSerializer,
    ProductFilterSerializer,
)


class CategoryListView(APIView):
    """List all product categories."""
    permission_classes = [AllowAny]

    def get(self, request):
        categories = services.get_categories()
        serializer = CategorySerializer(categories, many=True)
        return Response(serializer.data)


class RetailerListView(APIView):
    """List all active retailers."""
    permission_classes = [AllowAny]

    def get(self, request):
        retailers = services.get_retailers()
        serializer = RetailerSerializer(retailers, many=True)
        return Response(serializer.data)


class ProductListView(APIView):
    """List products with filtering."""
    permission_classes = [AllowAny]

    def get(self, request):
        # Extract filter parameters
        category = request.query_params.get('category')
        brand = request.query_params.get('brand')
        search = request.query_params.get('search')
        retailer = request.query_params.get('retailer')
        in_stock = request.query_params.get('in_stock', '').lower() == 'true'
        
        # Parse price range
        min_price = None
        max_price = None
        try:
            if request.query_params.get('min_price'):
                min_price = Decimal(request.query_params.get('min_price'))
            if request.query_params.get('max_price'):
                max_price = Decimal(request.query_params.get('max_price'))
        except InvalidOperation:
            return Response(
                {'error': 'Invalid price format'},
                status=status.HTTP_400_BAD_REQUEST
            )

        products = services.get_products(
            category_slug=category,
            brand=brand,
            min_price=min_price,
            max_price=max_price,
            search=search,
            in_stock_only=in_stock,
            retailer_slug=retailer,
        )

        # Pagination
        page_size = int(request.query_params.get('page_size', 20))
        page = int(request.query_params.get('page', 1))
        start = (page - 1) * page_size
        end = start + page_size

        total_count = products.count()
        products_page = products[start:end]

        serializer = ProductListSerializer(products_page, many=True)
        
        return Response({
            'results': serializer.data,
            'count': total_count,
            'page': page,
            'page_size': page_size,
            'total_pages': (total_count + page_size - 1) // page_size,
        })


class ProductDetailView(APIView):
    """Get product details."""
    permission_classes = [AllowAny]

    def get(self, request, pk):
        product = services.get_product_by_id(pk)
        
        if not product:
            return Response(
                {'error': 'Product not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = ProductDetailSerializer(product)
        return Response(serializer.data)


class GPUListView(APIView):
    """List GPU products with GPU-specific filtering."""
    permission_classes = [AllowAny]

    def get(self, request):
        # Extract filter parameters
        brand = request.query_params.get('brand')
        memory_size = request.query_params.get('memory_size')
        chipset = request.query_params.get('chipset')
        search = request.query_params.get('search')
        
        # Parse price range
        min_price = None
        max_price = None
        try:
            if request.query_params.get('min_price'):
                min_price = Decimal(request.query_params.get('min_price'))
            if request.query_params.get('max_price'):
                max_price = Decimal(request.query_params.get('max_price'))
        except InvalidOperation:
            return Response(
                {'error': 'Invalid price format'},
                status=status.HTTP_400_BAD_REQUEST
            )

        products = services.get_gpus(
            brand=brand,
            memory_size=memory_size,
            min_price=min_price,
            max_price=max_price,
            search=search,
            chipset=chipset,
        )

        # Pagination
        page_size = int(request.query_params.get('page_size', 20))
        page = int(request.query_params.get('page', 1))
        start = (page - 1) * page_size
        end = start + page_size

        total_count = products.count()
        products_page = products[start:end]

        serializer = GPUProductSerializer(products_page, many=True)
        
        return Response({
            'results': serializer.data,
            'count': total_count,
            'page': page,
            'page_size': page_size,
            'total_pages': (total_count + page_size - 1) // page_size,
        })


class GPUFiltersView(APIView):
    """Get available filter options for GPUs."""
    permission_classes = [AllowAny]

    def get(self, request):
        brands = services.get_gpu_brands()
        memory_sizes = services.get_gpu_memory_sizes()
        price_range = services.get_price_range('gpu')
        retailers = services.get_retailers()
        
        return Response({
            'brands': brands,
            'memory_sizes': memory_sizes,
            'price_range': price_range,
            'retailers': RetailerSerializer(retailers, many=True).data,
        })


class TriggerScrapeView(APIView):
    """Trigger manual scraping (admin only)."""
    permission_classes = [IsAdminUser]

    def post(self, request):
        retailer_slug = request.data.get('retailer')
        category_slug = request.data.get('category', 'gpu')
        
        if not retailer_slug:
            return Response(
                {'error': 'Retailer is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Import here to avoid circular imports
        from .tasks import scrape_retailer
        
        try:
            # Trigger async task
            task = scrape_retailer.delay(retailer_slug, category_slug)
            return Response({
                'message': 'Scraping task started',
                'task_id': task.id,
            })
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
