"""
Admin product management views (controllers).

Thin controllers for admin product CRUD — handle HTTP, delegate to service.

SECURITY NOTE:
    All admin endpoints require a valid Clerk JWT token in the Authorization header.
    User email is extracted from the verified token, not from request body/params.
"""

from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response

from rigadmin.product_service import admin_product_service
from rigadmin.clerk_auth import get_verified_user_email
from rigadmin.product_serializers import (
    AdminProductOutputSerializer,
)


class AdminProductCreateView(APIView):
    """
    POST /api/admin/products/ — Create a new product.
    
    Requires: Authorization: Bearer <clerk_token>
    """

    def post(self, request):
        admin_email = get_verified_user_email(request)
        if not admin_email:
            return Response(
                {"error": "Authentication required"},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        # Extract product data from request body (no admin_email needed)
        product_data = {
            "admin_email": admin_email,
            "name": request.data.get("name"),
            "category": request.data.get("category"),
            "brand": request.data.get("brand"),
            "image_url": request.data.get("image_url"),
            "specs": request.data.get("specs"),
            "retailer_id": request.data.get("retailer_id"),
            "price": request.data.get("price"),
            "product_url": request.data.get("product_url"),
            "in_stock": request.data.get("in_stock", True),
        }
        
        # Basic validation
        if not product_data["name"] or not product_data["category"]:
            return Response(
                {"error": "name and category are required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        product, error = admin_product_service.create_product(product_data)
        if error:
            http_status = (
                status.HTTP_403_FORBIDDEN if "authorized" in error.lower()
                else status.HTTP_400_BAD_REQUEST
            )
            return Response({"error": error}, status=http_status)

        added_to_existing = product.pop("_added_to_existing", False)
        output = AdminProductOutputSerializer(product)
        response_data = output.data
        if added_to_existing:
            response_data["added_to_existing"] = True
        return Response(response_data, status=status.HTTP_201_CREATED)


class AdminProductUpdateView(APIView):
    """
    PATCH /api/admin/products/<product_id>/ — Update product fields.
    DELETE /api/admin/products/<product_id>/ — Delete a product.
    
    Requires: Authorization: Bearer <clerk_token>
    """

    def patch(self, request, product_id):
        admin_email = get_verified_user_email(request)
        if not admin_email:
            return Response(
                {"error": "Authentication required"},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        # Build update data with verified admin email
        update_data = {"admin_email": admin_email}
        for field in ["name", "brand", "image_url", "category"]:
            if field in request.data:
                update_data[field] = request.data[field]

        product, error = admin_product_service.update_product(product_id, update_data)
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
        admin_email = get_verified_user_email(request)
        if not admin_email:
            return Response(
                {"error": "Authentication required"},
                status=status.HTTP_401_UNAUTHORIZED
            )

        success, error = admin_product_service.delete_product(product_id, admin_email)
        if error:
            http_status = (
                status.HTTP_403_FORBIDDEN if "authorized" in error.lower()
                else status.HTTP_404_NOT_FOUND if "not found" in error.lower()
                else status.HTTP_400_BAD_REQUEST
            )
            return Response({"error": error}, status=http_status)

        return Response({"success": True, "message": "Product deleted"}, status=status.HTTP_200_OK)


class AdminProductSpecsView(APIView):
    """
    PATCH /api/admin/products/<product_id>/specs/ — Update product specs.
    
    Requires: Authorization: Bearer <clerk_token>
    """

    def patch(self, request, product_id):
        admin_email = get_verified_user_email(request)
        if not admin_email:
            return Response(
                {"error": "Authentication required"},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        specs = request.data.get("specs")
        if not specs or not isinstance(specs, dict):
            return Response(
                {"error": "specs dict is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        update_data = {"admin_email": admin_email, "specs": specs}

        result, error = admin_product_service.update_specs(product_id, update_data)
        if error:
            http_status = (
                status.HTTP_403_FORBIDDEN if "authorized" in error.lower()
                else status.HTTP_404_NOT_FOUND if "not found" in error.lower()
                else status.HTTP_400_BAD_REQUEST
            )
            return Response({"error": error}, status=http_status)

        return Response({"success": True, "specs": result.get("specs", {})}, status=status.HTTP_200_OK)


class AdminProductPriceListCreateView(APIView):
    """
    POST /api/admin/products/<product_id>/prices/ — Add a retailer price.
    
    Requires: Authorization: Bearer <clerk_token>
    """

    def post(self, request, product_id):
        admin_email = get_verified_user_email(request)
        if not admin_email:
            return Response(
                {"error": "Authentication required"},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        price_data = {
            "admin_email": admin_email,
            "retailer_id": request.data.get("retailer_id"),
            "price": request.data.get("price"),
            "product_url": request.data.get("product_url"),
            "in_stock": request.data.get("in_stock", True),
        }
        
        if not price_data["retailer_id"] or not price_data["price"]:
            return Response(
                {"error": "retailer_id and price are required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        price, error = admin_product_service.add_price(product_id, price_data)
        if error:
            http_status = (
                status.HTTP_403_FORBIDDEN if "authorized" in error.lower()
                else status.HTTP_404_NOT_FOUND if "not found" in error.lower()
                else status.HTTP_400_BAD_REQUEST
            )
            return Response({"error": error}, status=http_status)

        return Response(price, status=status.HTTP_201_CREATED)


class AdminProductPriceUpdateView(APIView):
    """
    PATCH /api/admin/products/<product_id>/prices/<price_id>/ — Update a price entry.
    
    Requires: Authorization: Bearer <clerk_token>
    """

    def patch(self, request, product_id, price_id):
        admin_email = get_verified_user_email(request)
        if not admin_email:
            return Response(
                {"error": "Authentication required"},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        update_data = {"admin_email": admin_email}
        for field in ["price", "in_stock", "product_url"]:
            if field in request.data:
                update_data[field] = request.data[field]

        price, error = admin_product_service.update_price(product_id, price_id, update_data)
        if error:
            http_status = (
                status.HTTP_403_FORBIDDEN if "authorized" in error.lower()
                else status.HTTP_404_NOT_FOUND if "not found" in error.lower()
                else status.HTTP_400_BAD_REQUEST
            )
            return Response({"error": error}, status=http_status)

        return Response(price, status=status.HTTP_200_OK)
