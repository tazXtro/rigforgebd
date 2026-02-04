"""
Serializers for admin API input validation and output formatting.
"""

from rest_framework import serializers


class AdminCheckSerializer(serializers.Serializer):
    """Input validation for admin status check."""
    email = serializers.EmailField(required=True)


class AdminProfileSerializer(serializers.Serializer):
    """Output format for admin profile data."""
    id = serializers.UUIDField(read_only=True)
    user_id = serializers.UUIDField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)
    users = serializers.DictField(read_only=True, required=False)


class InviteCreateSerializer(serializers.Serializer):
    """Input validation for creating an invite."""
    email = serializers.EmailField(required=True, help_text="Target email address")
    expires_hours = serializers.IntegerField(
        required=False,
        default=72,
        min_value=1,
        max_value=168,  # Max 1 week
        help_text="Hours until invite expires"
    )


class InviteTokenSerializer(serializers.Serializer):
    """Input validation for invite token operations."""
    token = serializers.CharField(required=True, max_length=64)


class InviteAcceptSerializer(serializers.Serializer):
    """Input validation for accepting an invite."""
    token = serializers.CharField(required=True, max_length=64)
    email = serializers.EmailField(required=True)


class InviteSerializer(serializers.Serializer):
    """Output format for invite data."""
    id = serializers.UUIDField(read_only=True)
    token = serializers.CharField(read_only=True)
    email = serializers.EmailField(read_only=True)
    expires_at = serializers.DateTimeField(read_only=True)
    used_at = serializers.DateTimeField(read_only=True, allow_null=True)
    created_at = serializers.DateTimeField(read_only=True)
