"""
Admin compatibility views (controllers).

Thin controllers for viewing and fixing missing compatibility data.
"""

from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response

from rigadmin.compat_service import admin_compat_service
from rigadmin.compat_serializers import (
    CompatQuerySerializer,
    CompatUpdateSerializer,
    MissingCompatRecordSerializer,
    MissingCompatCountSerializer,
)


class MissingCompatCountView(APIView):
    """
    GET /api/admin/compat/missing/count/?admin_email=...

    Returns counts of products with missing compat fields per component type.
    """

    def get(self, request):
        admin_email = request.query_params.get("admin_email")
        if not admin_email:
            return Response(
                {"error": "admin_email query parameter is required"},
                status=status.HTTP_400_BAD_REQUEST,
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
    GET /api/admin/compat/missing/?admin_email=...&component_type=cpu&page=1&page_size=20

    Returns paginated list of products with missing compat fields.
    """

    def get(self, request):
        # Build serializer data from query params
        query_data = {
            "admin_email": request.query_params.get("admin_email", ""),
            "component_type": request.query_params.get("component_type", "all"),
            "page": request.query_params.get("page", 1),
            "page_size": request.query_params.get("page_size", 20),
        }

        serializer = CompatQuerySerializer(data=query_data)
        if not serializer.is_valid():
            return Response(
                {"errors": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        data = serializer.validated_data
        result, error = admin_compat_service.get_missing_records(
            admin_email=data["admin_email"],
            component_type=data["component_type"],
            page=data["page"],
            page_size=data["page_size"],
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
    """

    def patch(self, request, product_id):
        serializer = CompatUpdateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {"errors": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        data = serializer.validated_data
        admin_email = data.pop("admin_email")

        updated, error = admin_compat_service.update_compat(
            product_id=product_id,
            admin_email=admin_email,
            data=data,
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
