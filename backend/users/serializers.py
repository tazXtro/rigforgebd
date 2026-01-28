"""
User serializers for input validation and output formatting.

Uses standard DRF Serializer (not ModelSerializer since we don't use Django ORM).
Handles:
    - Input validation
    - Output formatting
    - No business logic
    - No database access
"""

from rest_framework import serializers


class UserSyncSerializer(serializers.Serializer):
    """
    Serializer for user sync request (after frontend auth).
    
    Validates the data sent from frontend after Clerk authentication.
    Email is required as the auth-agnostic identifier.
    Provider fields are optional but recommended for webhook support.
    """
    
    email = serializers.EmailField(
        required=True,
        help_text="User's email address from auth provider"
    )
    username = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=50,
        help_text="User's unique username"
    )
    display_name = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=255,
        help_text="User's display name"
    )
    avatar_url = serializers.URLField(
        required=False,
        allow_blank=True,
        help_text="URL to user's avatar image"
    )
    provider = serializers.CharField(
        required=False,
        max_length=50,
        help_text="Auth provider name (e.g., 'clerk', 'google')"
    )
    provider_user_id = serializers.CharField(
        required=False,
        max_length=255,
        help_text="External user ID from the auth provider"
    )


class UserProfileSerializer(serializers.Serializer):
    """
    Serializer for user profile output.
    
    Formats user data for API responses.
    """
    
    id = serializers.UUIDField(read_only=True)
    email = serializers.EmailField(read_only=True)
    username = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        max_length=50
    )
    display_name = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=255
    )
    avatar_url = serializers.URLField(
        required=False,
        allow_blank=True,
        allow_null=True
    )
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)


class UserProfileUpdateSerializer(serializers.Serializer):
    """
    Serializer for updating user profile.
    
    All fields are optional - only provided fields will be updated.
    """
    
    username = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=50,
        help_text="User's unique username"
    )
    display_name = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=255,
        help_text="User's display name"
    )
    avatar_url = serializers.URLField(
        required=False,
        allow_blank=True,
        allow_null=True,
        help_text="URL to user's avatar image"
    )
