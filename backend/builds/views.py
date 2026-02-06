"""
Builds API views (controllers).

These are thin controllers that:
    - Handle HTTP request/response
    - Validate input via serializers
    - Call service layer functions
    - Return Response objects

They MUST NOT:
    - Contain business logic
    - Access Supabase directly
    - Contain complex conditionals
"""

from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response

from builds.services import builds_service
from builds.serializers import (
    CreateBuildSerializer,
    UpdateBuildSerializer,
    VoteBuildSerializer,
    RemoveVoteSerializer,
    CreateCommentSerializer,
    UpdateCommentSerializer,
    UploadBuildImageSerializer,
)

from datetime import datetime, timezone


def _build_sanction_message(result: dict, action: str) -> str:
    """Build a user-facing sanction error message with remaining time if applicable."""
    sanction_type = result.get("sanction_type")
    expires_at = result.get("expires_at")

    if sanction_type == "permanent_ban":
        return f"Your account has been permanently banned. You cannot {action}."

    if expires_at:
        try:
            if isinstance(expires_at, str):
                expiry = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
            else:
                expiry = expires_at
            remaining = expiry - datetime.now(timezone.utc)
            total_seconds = int(remaining.total_seconds())
            if total_seconds > 0:
                days, remainder = divmod(total_seconds, 86400)
                hours, remainder = divmod(remainder, 3600)
                minutes, _ = divmod(remainder, 60)
                parts = []
                if days:
                    parts.append(f"{days}d")
                if hours:
                    parts.append(f"{hours}h")
                if minutes or not parts:
                    parts.append(f"{minutes}m")
                time_str = " ".join(parts)
                return f"Your account is currently sanctioned. You cannot {action}. Time remaining: {time_str}."
        except (ValueError, TypeError):
            pass

    return f"Your account is currently sanctioned. You cannot {action} during this period."


class BuildsListView(APIView):
    """
    List all builds or create a new build.
    
    GET /api/builds/
    POST /api/builds/
    """
    
    def get(self, request):
        """
        Get paginated list of builds.
        
        Query params:
            - page (int): Page number, default 1
            - pageSize (int): Items per page, default 12
            - sortBy (str): 'newest', 'popular', 'mostVoted'
            - featured (bool): Filter featured builds only
            - search (str): Search term for title/description
            - userEmail (str): Optional user email for vote status
        """
        page = int(request.query_params.get("page", 1))
        page_size = int(request.query_params.get("pageSize", 12))
        sort_by = request.query_params.get("sortBy", "newest")
        featured = request.query_params.get("featured", "").lower() == "true"
        search = request.query_params.get("search")
        user_email = request.query_params.get("userEmail")
        
        # Get user_id from email if provided
        user_id = None
        if user_email:
            from users.repositories.supabase import user_repository
            user = user_repository.get_by_email(user_email)
            user_id = user["id"] if user else None
        
        result = builds_service.get_builds(
            page=page,
            page_size=page_size,
            sort_by=sort_by,
            featured_only=featured,
            search=search,
            user_id=user_id,
        )
        
        return Response(result, status=status.HTTP_200_OK)
    
    def post(self, request):
        """
        Create a new build.
        
        Request body:
            - title (str): Build title
            - description (str): Build description
            - imageUrl (str): URL or data URL to build image
            - buildDate (str): ISO date string
            - commentsEnabled (bool): Whether comments are enabled
            - components (list): List of component objects
            - totalPrice (float): Total price
            - author (dict): Author info with id, username, avatarUrl
        """
        serializer = CreateBuildSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(
                {"errors": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        data = serializer.validated_data
        author = data.get("author", {})
        
        # Get author email - we need to look up by the Clerk user ID
        # For now, we'll require the email to be passed
        author_email = author.get("email")
        
        if not author_email:
            # Try to get email from the author ID if it's a Clerk ID
            # This is a fallback - ideally frontend sends the email
            return Response(
                {"error": "Author email is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        build = builds_service.create_build(
            title=data["title"],
            description=data["description"],
            image_url=data["imageUrl"],
            build_date=data.get("buildDate") or None,
            components=data["components"],
            total_price=data["totalPrice"],
            author_email=author_email,
            comments_enabled=data.get("commentsEnabled", True),
        )
        
        if not build:
            return Response(
                {"error": "Failed to create build"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        return Response(build, status=status.HTTP_201_CREATED)


class BuildDetailView(APIView):
    """
    Retrieve, update, or delete a single build.
    
    GET /api/builds/<id>/
    PATCH /api/builds/<id>/
    DELETE /api/builds/<id>/
    """
    
    def get(self, request, build_id):
        """
        Get a single build by ID.
        
        Query params:
            - userEmail (str): Optional user email for vote status
        """
        user_email = request.query_params.get("userEmail")
        
        # Get user_id from email if provided
        user_id = None
        if user_email:
            from users.repositories.supabase import user_repository
            user = user_repository.get_by_email(user_email)
            user_id = user["id"] if user else None
        
        build = builds_service.get_build_by_id(build_id, user_id=user_id)
        
        if not build:
            return Response(
                {"error": "Build not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        return Response(build, status=status.HTTP_200_OK)
    
    def patch(self, request, build_id):
        """
        Update a build.
        
        Query params:
            - userEmail (str): Required - email of the author for verification
        
        Request body:
            - title, description, imageUrl, buildDate, commentsEnabled, components, totalPrice
        """
        user_email = request.query_params.get("userEmail")
        
        if not user_email:
            return Response(
                {"error": "userEmail query parameter is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = UpdateBuildSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(
                {"errors": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        build = builds_service.update_build(
            build_id=build_id,
            author_email=user_email,
            **serializer.validated_data,
        )
        
        if not build:
            return Response(
                {"error": "Build not found or not authorized"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        return Response(build, status=status.HTTP_200_OK)
    
    def delete(self, request, build_id):
        """
        Delete a build.
        
        Query params:
            - userEmail (str): Required - email of the author for verification
        """
        user_email = request.query_params.get("userEmail")
        
        if not user_email:
            return Response(
                {"error": "userEmail query parameter is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        success = builds_service.delete_build(build_id, user_email)
        
        if not success:
            return Response(
                {"error": "Build not found or not authorized"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        return Response(status=status.HTTP_204_NO_CONTENT)


class FeaturedBuildsView(APIView):
    """
    Get featured builds.
    
    GET /api/builds/featured/
    """
    
    def get(self, request):
        """
        Get featured builds.
        
        Query params:
            - limit (int): Maximum number of builds, default 6
            - userEmail (str): Optional user email for vote status
        """
        limit = int(request.query_params.get("limit", 6))
        user_email = request.query_params.get("userEmail")
        
        # Get user_id from email if provided
        user_id = None
        if user_email:
            from users.repositories.supabase import user_repository
            user = user_repository.get_by_email(user_email)
            user_id = user["id"] if user else None
        
        builds = builds_service.get_featured_builds(limit=limit, user_id=user_id)
        
        return Response(builds, status=status.HTTP_200_OK)


class BuildVoteView(APIView):
    """
    Vote on a build.
    
    POST /api/builds/<id>/vote/
    DELETE /api/builds/<id>/vote/
    """
    
    def post(self, request, build_id):
        """
        Vote on a build.
        
        Request body:
            - userEmail (str): Email of the voting user
            - voteType (str): 'upvote' or 'downvote'
        """
        serializer = VoteBuildSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(
                {"errors": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        build = builds_service.vote_on_build(
            build_id=build_id,
            user_email=serializer.validated_data["userEmail"],
            vote_type=serializer.validated_data["voteType"],
        )
        
        if isinstance(build, dict) and build.get("sanctioned"):
            response_data = {"error": _build_sanction_message(build, "vote")}
            if build.get("reason"):
                response_data["reason"] = build["reason"]
            return Response(
                response_data,
                status=status.HTTP_403_FORBIDDEN
            )
        
        if not build:
            return Response(
                {"error": "Failed to vote on build"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        return Response(build, status=status.HTTP_200_OK)
    
    def delete(self, request, build_id):
        """
        Remove a vote from a build.
        
        Request body:
            - userEmail (str): Email of the user removing their vote
        """
        serializer = RemoveVoteSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(
                {"errors": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        build = builds_service.remove_vote(
            build_id=build_id,
            user_email=serializer.validated_data["userEmail"],
        )
        
        if not build:
            return Response(
                {"error": "Failed to remove vote"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        return Response(build, status=status.HTTP_200_OK)


class BuildCommentsView(APIView):
    """
    Get or create comments for a build.
    
    GET /api/builds/<id>/comments/
    POST /api/builds/<id>/comments/
    """
    
    def get(self, request, build_id):
        """
        Get comments for a build.
        
        Query params:
            - page (int): Page number, default 1
            - pageSize (int): Items per page, default 20
        """
        page = int(request.query_params.get("page", 1))
        page_size = int(request.query_params.get("pageSize", 20))
        
        result = builds_service.get_comments(
            build_id=build_id,
            page=page,
            page_size=page_size,
        )
        
        return Response(result, status=status.HTTP_200_OK)
    
    def post(self, request, build_id):
        """
        Create a comment on a build.
        
        Request body:
            - authorEmail (str): Email of the comment author
            - content (str): Comment content
        """
        serializer = CreateCommentSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(
                {"errors": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        comment = builds_service.create_comment(
            build_id=build_id,
            author_email=serializer.validated_data["authorEmail"],
            content=serializer.validated_data["content"],
        )
        
        if isinstance(comment, dict) and comment.get("sanctioned"):
            response_data = {"error": _build_sanction_message(comment, "comment")}
            if comment.get("reason"):
                response_data["reason"] = comment["reason"]
            return Response(
                response_data,
                status=status.HTTP_403_FORBIDDEN
            )
        
        if not comment:
            return Response(
                {"error": "Failed to create comment"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        return Response(comment, status=status.HTTP_201_CREATED)


class CommentDetailView(APIView):
    """
    Update or delete a comment.
    
    PATCH /api/builds/comments/<id>/
    DELETE /api/builds/comments/<id>/
    """
    
    def patch(self, request, comment_id):
        """
        Update a comment.
        
        Request body:
            - authorEmail (str): Email of the author (for verification)
            - content (str): Updated comment content
        """
        serializer = UpdateCommentSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(
                {"errors": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        comment = builds_service.update_comment(
            comment_id=comment_id,
            author_email=serializer.validated_data["authorEmail"],
            content=serializer.validated_data["content"],
        )
        
        if not comment:
            return Response(
                {"error": "Comment not found or not authorized"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        return Response(comment, status=status.HTTP_200_OK)
    
    def delete(self, request, comment_id):
        """
        Delete a comment.
        
        Query params:
            - userEmail (str): Email of the user (for verification)
        """
        user_email = request.query_params.get("userEmail")
        
        if not user_email:
            return Response(
                {"error": "userEmail query parameter is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        success = builds_service.delete_comment(comment_id, user_email)
        
        if not success:
            return Response(
                {"error": "Comment not found or not authorized"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        return Response(status=status.HTTP_204_NO_CONTENT)


class UploadBuildImageView(APIView):
    """
    Upload a build image to Supabase Storage.
    
    POST /api/builds/upload-image/
    """
    
    def post(self, request):
        """
        Upload an image to storage and return the public URL.
        
        Request body:
            - imageData (str): Base64-encoded image data with data URL prefix
            - authorEmail (str): Email of the build author
            
        Returns:
            - success (bool): Whether upload was successful
            - url (str): Public URL of the uploaded image (on success)
            - error (str): Error message (on failure)
        """
        serializer = UploadBuildImageSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(
                {"success": False, "errors": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get author ID from email
        from users.repositories.supabase import user_repository
        author_email = serializer.validated_data["authorEmail"]
        author = user_repository.get_by_email(author_email)
        
        if not author:
            return Response(
                {"success": False, "error": "User not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Upload image to storage
        from builds.storage_service import build_storage_service
        result = build_storage_service.upload_build_image(
            image_data=serializer.validated_data["imageData"],
            author_id=author["id"],
        )
        
        if result["success"]:
            return Response(result, status=status.HTTP_201_CREATED)
        else:
            return Response(result, status=status.HTTP_400_BAD_REQUEST)
