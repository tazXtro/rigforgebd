"""
Admin product management views (controllers).

Thin controllers for admin product CRUD — handle HTTP, delegate to service.
"""

from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response

from rigadmin.product_service import admin_product_service
from rigadmin.product_serializers import (
    AdminProductCreateSerializer,
    AdminProductUpdateSerializer,
    AdminSpecsUpdateSerializer,
    AdminPriceUpdateSerializer,
    AdminPriceCreateSerializer,
    AdminProductDeleteSerializer,
    AdminProductOutputSerializer,
)


class AdminProductCreateView(APIView):
    """POST /api/admin/products/ — Create a new product."""

    def post(self, request):
        serializer = AdminProductCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        product, error = admin_product_service.create_product(serializer.validated_data)
        if error:
            http_status = (
                status.HTTP_403_FORBIDDEN if "authorized" in error.lower()
                else status.HTTP_400_BAD_REQUEST
            )
            return Response({"error": error}, status=http_status)

        output = AdminProductOutputSerializer(product)
        return Response(output.data, status=status.HTTP_201_CREATED)


class AdminProductUpdateView(APIView):
    """PATCH /api/admin/products/<product_id>/ — Update product fields."""

    def patch(self, request, product_id):
        serializer = AdminProductUpdateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        product, error = admin_product_service.update_product(product_id, serializer.validated_data)
        if error:
            http_status = (
                status.HTTP_403_FORBIDDEN if "authorized" in error.lower()
                else status.HTTP_404_NOT_FOUND if "not found" in error.lower()
                else status.HTTP_400_BAD_REQUEST
            )
            return Response({"error": error}, status=http_status)

        output = AdminProductOutputSerializer(product)
        return Response(output.data, status=status.HTTP_200_OK)

    def delete(self, request, product_id):
        serializer = AdminProductDeleteSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        success, error = admin_product_service.delete_product(
            product_id, serializer.validated_data["admin_email"]
        )
        if error:
            http_status = (
                status.HTTP_403_FORBIDDEN if "authorized" in error.lower()
                else status.HTTP_404_NOT_FOUND if "not found" in error.lower()
                else status.HTTP_400_BAD_REQUEST
            )
            return Response({"error": error}, status=http_status)

        return Response({"success": True, "message": "Product deleted"}, status=status.HTTP_200_OK)


class AdminProductSpecsView(APIView):
    """PATCH /api/admin/products/<product_id>/specs/ — Update product specs."""

    def patch(self, request, product_id):
        serializer = AdminSpecsUpdateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        result, error = admin_product_service.update_specs(product_id, serializer.validated_data)
        if error:
            http_status = (
                status.HTTP_403_FORBIDDEN if "authorized" in error.lower()
                else status.HTTP_404_NOT_FOUND if "not found" in error.lower()
                else status.HTTP_400_BAD_REQUEST
            )
            return Response({"error": error}, status=http_status)

        return Response({"success": True, "specs": result.get("specs", {})}, status=status.HTTP_200_OK)


class AdminProductPriceListCreateView(APIView):
    """POST /api/admin/products/<product_id>/prices/ — Add a retailer price."""

    def post(self, request, product_id):
        serializer = AdminPriceCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        price, error = admin_product_service.add_price(product_id, serializer.validated_data)
        if error:
            http_status = (
                status.HTTP_403_FORBIDDEN if "authorized" in error.lower()
                else status.HTTP_404_NOT_FOUND if "not found" in error.lower()
                else status.HTTP_400_BAD_REQUEST
            )
            return Response({"error": error}, status=http_status)

        return Response(price, status=status.HTTP_201_CREATED)


class AdminProductPriceUpdateView(APIView):
    """PATCH /api/admin/products/<product_id>/prices/<price_id>/ — Update a price entry."""

    def patch(self, request, product_id, price_id):
        serializer = AdminPriceUpdateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        price, error = admin_product_service.update_price(
            product_id, price_id, serializer.validated_data
        )
        if error:
            http_status = (
                status.HTTP_403_FORBIDDEN if "authorized" in error.lower()
                else status.HTTP_404_NOT_FOUND if "not found" in error.lower()
                else status.HTTP_400_BAD_REQUEST
            )
            return Response({"error": error}, status=http_status)

        return Response(price, status=status.HTTP_200_OK)
