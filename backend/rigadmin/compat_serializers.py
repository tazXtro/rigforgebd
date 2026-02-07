"""
Serializers for admin compatibility management.

Handles validation for viewing and updating missing compatibility fields.
"""

from rest_framework import serializers


# ==================== Input Serializers ====================

class CompatUpdateSerializer(serializers.Serializer):
    """Input validation for updating a product's compatibility fields."""
    admin_email = serializers.EmailField(required=True)

    # CPU fields
    cpu_socket = serializers.CharField(
        required=False, max_length=20, allow_blank=False, allow_null=True,
        help_text="CPU socket: AM4, AM5, LGA1700, LGA1200, LGA1851",
    )

    # Motherboard fields
    mobo_socket = serializers.CharField(
        required=False, max_length=20, allow_blank=False, allow_null=True,
        help_text="Motherboard socket: AM4, AM5, LGA1700, LGA1200, LGA1851",
    )

    # Memory fields (shared by motherboard & RAM)
    memory_type = serializers.CharField(
        required=False, max_length=10, allow_blank=False, allow_null=True,
        help_text="DDR4 or DDR5",
    )
    memory_max_speed_mhz = serializers.IntegerField(
        required=False, min_value=800, max_value=20000, allow_null=True,
        help_text="Max memory speed in MHz",
    )


class CompatQuerySerializer(serializers.Serializer):
    """Input validation for querying missing compat records."""
    admin_email = serializers.EmailField(required=True)
    component_type = serializers.ChoiceField(
        choices=["cpu", "motherboard", "ram", "all"],
        required=False,
        default="all",
        help_text="Filter by component type, or 'all'",
    )
    page = serializers.IntegerField(
        required=False, default=1, min_value=1,
    )
    page_size = serializers.IntegerField(
        required=False, default=20, min_value=1, max_value=100,
    )


# ==================== Output Serializers ====================

class MissingCompatRecordSerializer(serializers.Serializer):
    """Output format for a product with missing compatibility fields."""
    id = serializers.UUIDField(read_only=True, help_text="product_compat row ID")
    product_id = serializers.UUIDField(read_only=True)
    component_type = serializers.CharField(read_only=True)

    # Product info (joined)
    product_name = serializers.CharField(read_only=True, allow_null=True)
    product_brand = serializers.CharField(read_only=True, allow_null=True)
    product_category = serializers.CharField(read_only=True, allow_null=True)
    product_image_url = serializers.CharField(read_only=True, allow_null=True)

    # Current compat values (null = missing)
    cpu_socket = serializers.CharField(read_only=True, allow_null=True)
    mobo_socket = serializers.CharField(read_only=True, allow_null=True)
    memory_type = serializers.CharField(read_only=True, allow_null=True)
    memory_max_speed_mhz = serializers.IntegerField(read_only=True, allow_null=True)

    # Metadata
    confidence = serializers.FloatField(read_only=True)
    extraction_source = serializers.CharField(read_only=True, allow_null=True)
    missing_fields = serializers.ListField(
        child=serializers.CharField(), read_only=True,
        help_text="List of field names that are NULL for this component",
    )


class MissingCompatCountSerializer(serializers.Serializer):
    """Output format for missing compat counts by type."""
    cpu = serializers.IntegerField(read_only=True)
    motherboard = serializers.IntegerField(read_only=True)
    ram = serializers.IntegerField(read_only=True)
    total = serializers.IntegerField(read_only=True)
