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


# ==================== Moderation Serializers ====================

class BuildApprovalSerializer(serializers.Serializer):
    """Input validation for approving a build."""
    admin_email = serializers.EmailField(required=True)


class BuildRejectionSerializer(serializers.Serializer):
    """Input validation for rejecting a build."""
    admin_email = serializers.EmailField(required=True)
    reason = serializers.CharField(required=False, max_length=1000, allow_blank=True)


class PendingBuildSerializer(serializers.Serializer):
    """Output format for pending build data."""
    id = serializers.UUIDField(read_only=True)
    title = serializers.CharField(read_only=True)
    description = serializers.CharField(read_only=True)
    image_url = serializers.CharField(read_only=True)
    total_price = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    created_at = serializers.DateTimeField(read_only=True)
    approval_status = serializers.CharField(read_only=True)
    rejection_reason = serializers.CharField(read_only=True, allow_null=True)
    components = serializers.ListField(read_only=True, required=False, default=[])
    users = serializers.DictField(read_only=True, required=False)  # Author info


class SanctionCreateSerializer(serializers.Serializer):
    """Input validation for creating a sanction."""
    admin_email = serializers.EmailField(required=True)
    user_id = serializers.UUIDField(required=True)
    sanction_type = serializers.ChoiceField(
        choices=['timeout', 'permanent_ban'],
        required=True
    )
    reason = serializers.CharField(required=False, max_length=1000, allow_blank=True)
    duration_days = serializers.IntegerField(
        required=False,
        min_value=1,
        max_value=365,
        help_text="Required for timeout type"
    )
    
    def validate(self, data):
        if data['sanction_type'] == 'timeout' and not data.get('duration_days'):
            raise serializers.ValidationError(
                {"duration_days": "Duration is required for timeout sanctions"}
            )
        return data


class SanctionSerializer(serializers.Serializer):
    """Output format for sanction data."""
    id = serializers.UUIDField(read_only=True)
    user_id = serializers.UUIDField(read_only=True)
    sanction_type = serializers.CharField(read_only=True)
    reason = serializers.CharField(read_only=True, allow_null=True)
    duration_days = serializers.IntegerField(read_only=True, allow_null=True)
    created_at = serializers.DateTimeField(read_only=True)
    expires_at = serializers.DateTimeField(read_only=True, allow_null=True)
    is_active = serializers.BooleanField(read_only=True)
    users = serializers.DictField(read_only=True, required=False)  # User info


class CommentModerationSerializer(serializers.Serializer):
    """Output format for comment moderation data."""
    id = serializers.UUIDField(read_only=True)
    content = serializers.CharField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)
    users = serializers.DictField(read_only=True, required=False)  # Author info
    builds = serializers.DictField(read_only=True, required=False)  # Build info

