"""
Builds serializers for input validation and output formatting.

Uses standard DRF Serializer (not ModelSerializer since we don't use Django ORM).
Handles:
    - Input validation
    - Output formatting
    - No business logic
    - No database access
"""

from rest_framework import serializers


class BuildAuthorSerializer(serializers.Serializer):
    """Serializer for build author output."""
    
    id = serializers.UUIDField(read_only=True)
    username = serializers.CharField(read_only=True)
    avatarUrl = serializers.URLField(read_only=True, allow_null=True)


class BuildSerializer(serializers.Serializer):
    """Serializer for build output."""
    
    id = serializers.UUIDField(read_only=True)
    title = serializers.CharField(read_only=True)
    description = serializers.CharField(read_only=True)
    imageUrl = serializers.URLField(read_only=True)
    buildDate = serializers.DateTimeField(read_only=True)
    createdAt = serializers.DateTimeField(read_only=True)
    updatedAt = serializers.DateTimeField(read_only=True, allow_null=True)
    author = BuildAuthorSerializer(read_only=True)
    components = serializers.ListField(read_only=True)
    totalPrice = serializers.FloatField(read_only=True)
    isFeatured = serializers.BooleanField(read_only=True)
    commentsEnabled = serializers.BooleanField(read_only=True)
    upvotes = serializers.IntegerField(read_only=True)
    downvotes = serializers.IntegerField(read_only=True)
    commentCount = serializers.IntegerField(read_only=True)
    userVote = serializers.CharField(read_only=True, allow_null=True)


class BuildsResponseSerializer(serializers.Serializer):
    """Serializer for paginated builds response."""
    
    builds = BuildSerializer(many=True, read_only=True)
    total = serializers.IntegerField(read_only=True)
    page = serializers.IntegerField(read_only=True)
    pageSize = serializers.IntegerField(read_only=True)


class CreateBuildSerializer(serializers.Serializer):
    """Serializer for creating a new build."""
    
    title = serializers.CharField(
        required=True,
        max_length=255,
        help_text="Build title"
    )
    description = serializers.CharField(
        required=True,
        help_text="Build description"
    )
    imageUrl = serializers.CharField(  # Allow data URLs
        required=True,
        help_text="URL or data URL to build image"
    )
    buildDate = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        help_text="Date the PC was built (ISO string)"
    )
    commentsEnabled = serializers.BooleanField(
        required=False,
        default=True,
        help_text="Whether comments are enabled"
    )
    components = serializers.ListField(
        required=True,
        child=serializers.DictField(),
        help_text="List of components in the build"
    )
    totalPrice = serializers.FloatField(
        required=True,
        min_value=0,
        help_text="Total price of the build"
    )
    author = serializers.DictField(
        required=True,
        help_text="Author information (id, username, avatarUrl)"
    )


class UpdateBuildSerializer(serializers.Serializer):
    """Serializer for updating a build."""
    
    title = serializers.CharField(
        required=False,
        max_length=255,
        help_text="Build title"
    )
    description = serializers.CharField(
        required=False,
        help_text="Build description"
    )
    imageUrl = serializers.CharField(
        required=False,
        help_text="URL or data URL to build image"
    )
    buildDate = serializers.DateTimeField(
        required=False,
        help_text="Date the PC was built"
    )
    commentsEnabled = serializers.BooleanField(
        required=False,
        help_text="Whether comments are enabled"
    )
    components = serializers.ListField(
        required=False,
        child=serializers.DictField(),
        help_text="List of components in the build"
    )
    totalPrice = serializers.FloatField(
        required=False,
        min_value=0,
        help_text="Total price of the build"
    )


class VoteBuildSerializer(serializers.Serializer):
    """Serializer for voting on a build."""
    
    userEmail = serializers.EmailField(
        required=True,
        help_text="Email of the voting user"
    )
    voteType = serializers.ChoiceField(
        required=True,
        choices=["upvote", "downvote"],
        help_text="Type of vote"
    )


class RemoveVoteSerializer(serializers.Serializer):
    """Serializer for removing a vote."""
    
    userEmail = serializers.EmailField(
        required=True,
        help_text="Email of the user removing their vote"
    )


class CommentSerializer(serializers.Serializer):
    """Serializer for comment output."""
    
    id = serializers.UUIDField(read_only=True)
    buildId = serializers.UUIDField(read_only=True)
    authorId = serializers.UUIDField(read_only=True)
    authorUsername = serializers.CharField(read_only=True)
    authorAvatar = serializers.URLField(read_only=True, allow_null=True)
    content = serializers.CharField(read_only=True)
    createdAt = serializers.DateTimeField(read_only=True)
    updatedAt = serializers.DateTimeField(read_only=True, allow_null=True)


class CommentsResponseSerializer(serializers.Serializer):
    """Serializer for paginated comments response."""
    
    comments = CommentSerializer(many=True, read_only=True)
    total = serializers.IntegerField(read_only=True)
    page = serializers.IntegerField(read_only=True)
    pageSize = serializers.IntegerField(read_only=True)


class CreateCommentSerializer(serializers.Serializer):
    """Serializer for creating a comment."""
    
    authorEmail = serializers.EmailField(
        required=True,
        help_text="Email of the comment author"
    )
    content = serializers.CharField(
        required=True,
        min_length=1,
        max_length=2000,
        help_text="Comment content"
    )


class UpdateCommentSerializer(serializers.Serializer):
    """Serializer for updating a comment."""
    
    authorEmail = serializers.EmailField(
        required=True,
        help_text="Email of the comment author (for verification)"
    )
    content = serializers.CharField(
        required=True,
        min_length=1,
        max_length=2000,
        help_text="Updated comment content"
    )
