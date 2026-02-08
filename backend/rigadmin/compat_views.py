"""
Admin compatibility views (controllers).

Thin controllers for viewing and fixing missing compatibility data.

SECURITY NOTE:
    All admin endpoints require a valid Clerk JWT token in the Authorization header.
    User email is extracted from the verified token, not from request body/params.
"""

from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response

from rigadmin.compat_service import admin_compat_service
from rigadmin.clerk_auth import get_verified_user_email
from rigadmin.compat_serializers import (
    MissingCompatRecordSerializer,
    MissingCompatCountSerializer,
)


class MissingCompatCountView(APIView):
    """
    GET /api/admin/compat/missing/count/
    
    Returns counts of products with missing compat fields per component type.
    
    Requires: Authorization: Bearer <clerk_token>
    """

    def get(self, request):
        admin_email = get_verified_user_email(request)
        if not admin_email:
            return Response(
                {"error": "Authentication required"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        counts, error = admin_compat_service.get_missing_counts(admin_email)
        if error:
            http_status = (
                status.HTTP_403_FORBIDDEN
                if "authorized" in error.lower()
                else status.HTTP_400_BAD_REQUEST
            )
            return Response({"error": error}, status=http_status)

        serializer = MissingCompatCountSerializer(counts)
        return Response(serializer.data, status=status.HTTP_200_OK)


class MissingCompatListView(APIView):
    """
    GET /api/admin/compat/missing/?component_type=cpu&page=1&page_size=20
    
    Returns paginated list of products with missing compat fields.
    
    Requires: Authorization: Bearer <clerk_token>
    """

    def get(self, request):
        admin_email = get_verified_user_email(request)
        if not admin_email:
            return Response(
                {"error": "Authentication required"},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        
        # Extract query params
        component_type = request.query_params.get("component_type", "all")
        try:
            page = int(request.query_params.get("page", 1))
            page_size = int(request.query_params.get("page_size", 20))
        except ValueError:
            return Response(
                {"error": "page and page_size must be integers"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        result, error = admin_compat_service.get_missing_records(
            admin_email=admin_email,
            component_type=component_type,
            page=page,
            page_size=page_size,
        )

        if error:
            http_status = (
                status.HTTP_403_FORBIDDEN
                if "authorized" in error.lower()
                else status.HTTP_400_BAD_REQUEST
            )
            return Response({"error": error}, status=http_status)

        # Serialize each record
        records_serializer = MissingCompatRecordSerializer(
            result["records"], many=True
        )

        return Response(
            {
                "records": records_serializer.data,
                "total": result["total"],
                "page": result["page"],
                "page_size": result["page_size"],
            },
            status=status.HTTP_200_OK,
        )


class CompatUpdateView(APIView):
    """
    PATCH /api/admin/compat/<product_id>/
    
    Update compatibility fields for a product (admin manual fix).
    
    Requires: Authorization: Bearer <clerk_token>
    """

    def patch(self, request, product_id):
        admin_email = get_verified_user_email(request)
        if not admin_email:
            return Response(
                {"error": "Authentication required"},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        
        # Extract compat fields from request body (without admin_email)
        compat_data = {}
        for field in ["cpu_socket", "mobo_socket", "memory_type", "memory_max_speed_mhz"]:
            if field in request.data:
                compat_data[field] = request.data[field]
        
        if not compat_data:
            return Response(
                {"error": "At least one compat field is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        updated, error = admin_compat_service.update_compat(
            product_id=product_id,
            admin_email=admin_email,
            data=compat_data,
        )

        if error:
            http_status = (
                status.HTTP_403_FORBIDDEN
                if "authorized" in error.lower()
                else status.HTTP_404_NOT_FOUND
                if "not found" in error.lower()
                else status.HTTP_400_BAD_REQUEST
            )
            return Response({"error": error}, status=http_status)

        return Response(
            {"success": True, "record": updated},
            status=status.HTTP_200_OK,
        )
