"""
Admin API views (controllers).

These are thin controllers that:
    - Handle HTTP request/response
    - Validate input via serializers
    - Call service layer functions
    - Return Response objects

They MUST NOT:
    - Contain business logic
    - Access Supabase directly
    - Contain complex conditionals
    
SECURITY NOTE:
    All admin endpoints require a valid Clerk JWT token in the Authorization header.
    User email is extracted from the verified token, not from request body/params.
"""

from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response

from rigadmin.services import admin_service, invite_service
from rigadmin.clerk_auth import get_verified_user_email
from rigadmin.serializers import (
    AdminCheckSerializer,
    AdminProfileSerializer,
    InviteCreateSerializer,
    InviteTokenSerializer,
    InviteAcceptSerializer,
    InviteSerializer,
)


class AdminCheckView(APIView):
    """
    Check if the authenticated user is an admin.
    
    POST /api/admin/check/
    
    Requires: Authorization: Bearer <clerk_token>
    Returns: { is_admin: boolean }
    """
    
    def post(self, request):
        """
        Check admin status using JWT-verified email.
        
        The user's email is extracted from the verified Clerk JWT token,
        ensuring the request is authenticated and the admin check is secure.
        """
        email = get_verified_user_email(request)
        
        if not email:
            return Response(
                {"error": "Authentication required"},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        is_admin = admin_service.is_admin(email)
        
        return Response({"is_admin": is_admin}, status=status.HTTP_200_OK)


class AdminMeView(APIView):
    """
    Get current admin profile.
    
    GET /api/admin/me/
    
    Requires: Authorization: Bearer <clerk_token>
    """
    
    def get(self, request):
        """
        Get admin profile using JWT-verified email.
            
        Returns:
            Admin profile data or 401/403 if not authenticated/admin
        """
        email = get_verified_user_email(request)
        
        if not email:
            return Response(
                {"error": "Authentication required"},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        admin = admin_service.get_admin_profile(email)
        
        if not admin:
            return Response(
                {"error": "Not an admin"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = AdminProfileSerializer(admin)
        return Response(serializer.data, status=status.HTTP_200_OK)


class InviteListCreateView(APIView):
    """
    List pending invites or create a new invite.
    
    GET /api/admin/invites/
    POST /api/admin/invites/
    
    Requires: Authorization: Bearer <clerk_token>
    """
    
    def get(self, request):
        """
        List pending invites created by the admin.
        Uses JWT-verified email for authorization.
        """
        email = get_verified_user_email(request)
        
        if not email:
            return Response(
                {"error": "Authentication required"},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        # Verify admin status
        if not admin_service.is_admin(email):
            return Response(
                {"error": "Not authorized"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        invites = invite_service.get_pending_invites(email)
        serializer = InviteSerializer(invites, many=True)
        
        return Response({"invites": serializer.data}, status=status.HTTP_200_OK)
    
    def post(self, request):
        """
        Create a new admin invite.
        Uses JWT-verified email for authorization.
        
        Request body:
            - email (required): Target email to invite
            - expires_hours (optional): Hours until expiry (default 72)
        """
        admin_email = get_verified_user_email(request)
        
        if not admin_email:
            return Response(
                {"error": "Authentication required"},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        serializer = InviteCreateSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(
                {"errors": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        invite, error = invite_service.create_invite(
            admin_email=admin_email,
            target_email=serializer.validated_data["email"],
            expires_hours=serializer.validated_data.get("expires_hours", 72)
        )
        
        if error:
            return Response(
                {"error": error},
                status=status.HTTP_403_FORBIDDEN if "authorized" in error.lower() else status.HTTP_400_BAD_REQUEST
            )
        
        output_serializer = InviteSerializer(invite)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)


class InviteValidateView(APIView):
    """
    Validate an invite token.
    
    POST /api/admin/invites/validate/
    """
    
    def post(self, request):
        """
        Check if an invite token is valid.
        
        Request body:
            - token (required): The invite token
            
        Returns:
            { valid: boolean, email: string (if valid), error: string (if invalid) }
        """
        serializer = InviteTokenSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(
                {"errors": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        invite, error = invite_service.validate_invite(
            serializer.validated_data["token"]
        )
        
        if error:
            return Response(
                {"valid": False, "error": error},
                status=status.HTTP_200_OK
            )
        
        return Response(
            {"valid": True, "email": invite["email"]},
            status=status.HTTP_200_OK
        )


class InviteAcceptView(APIView):
    """
    Accept an invite and become an admin.
    
    POST /api/admin/invites/accept/
    """
    
    def post(self, request):
        """
        Accept an invite token.
        
        Request body:
            - token (required): The invite token
            - email (required): User's email (must match invite)
            
        Returns:
            Admin profile on success, error on failure
        """
        serializer = InviteAcceptSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(
                {"errors": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        admin, error = invite_service.accept_invite(
            token=serializer.validated_data["token"],
            user_email=serializer.validated_data["email"]
        )
        
        if error:
            return Response(
                {"error": error},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        return Response(
            {"success": True, "message": "You are now an admin!"},
            status=status.HTTP_200_OK
        )


# ==================== Build Moderation Views ====================

class PendingBuildsView(APIView):
    """
    List pending builds for approval.
    
    GET /api/admin/builds/pending/
    
    Requires: Authorization: Bearer <clerk_token>
    """
    
    def get(self, request):
        """
        Get paginated list of pending builds.
        Uses JWT-verified email for authorization.
        
        Query params:
            - page (int): Page number, default 1
            - pageSize (int): Items per page, default 12
        """
        from rigadmin.services import build_moderation_service
        
        email = get_verified_user_email(request)
        if not email:
            return Response(
                {"error": "Authentication required"},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        # Verify admin status
        if not admin_service.is_admin(email):
            return Response(
                {"error": "Not authorized"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        page = int(request.query_params.get("page", 1))
        page_size = int(request.query_params.get("pageSize", 12))
        
        builds, total = build_moderation_service.get_pending_builds(page, page_size)
        
        from rigadmin.serializers import PendingBuildSerializer
        serializer = PendingBuildSerializer(builds, many=True)
        
        return Response({
            "builds": serializer.data,
            "total": total,
            "page": page,
            "pageSize": page_size,
        }, status=status.HTTP_200_OK)


class PendingBuildsCountView(APIView):
    """
    Get count of pending builds for dashboard badge.
    
    GET /api/admin/builds/pending/count/
    
    Requires: Authorization: Bearer <clerk_token>
    """
    
    def get(self, request):
        """
        Get count of pending builds.
        Uses JWT-verified email for authorization.
        """
        from rigadmin.services import build_moderation_service
        
        email = get_verified_user_email(request)
        if not email:
            return Response(
                {"error": "Authentication required"},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        # Verify admin status
        if not admin_service.is_admin(email):
            return Response(
                {"error": "Not authorized"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        count = build_moderation_service.get_pending_count()
        
        return Response({"count": count}, status=status.HTTP_200_OK)


class BuildApproveView(APIView):
    """
    Approve a build.
    
    POST /api/admin/builds/<id>/approve/
    
    Requires: Authorization: Bearer <clerk_token>
    """
    
    def post(self, request, build_id):
        """
        Approve a build for public display.
        Uses JWT-verified email for authorization.
        """
        from rigadmin.services import build_moderation_service
        
        admin_email = get_verified_user_email(request)
        
        if not admin_email:
            return Response(
                {"error": "Authentication required"},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        result, error = build_moderation_service.approve_build(
            build_id=build_id,
            admin_email=admin_email,
        )
        
        if error:
            return Response(
                {"error": error},
                status=status.HTTP_403_FORBIDDEN if "authorized" in error.lower() else status.HTTP_400_BAD_REQUEST
            )
        
        return Response(
            {"success": True, "message": "Build approved"},
            status=status.HTTP_200_OK
        )


class BuildRejectView(APIView):
    """
    Reject a build.
    
    POST /api/admin/builds/<id>/reject/
    
    Requires: Authorization: Bearer <clerk_token>
    """
    
    def post(self, request, build_id):
        """
        Reject a build.
        Uses JWT-verified email for authorization.
        
        Request body:
            - reason (str, optional): Reason for rejection
        """
        from rigadmin.services import build_moderation_service
        
        admin_email = get_verified_user_email(request)
        
        if not admin_email:
            return Response(
                {"error": "Authentication required"},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        reason = request.data.get("reason")
        
        result, error = build_moderation_service.reject_build(
            build_id=build_id,
            admin_email=admin_email,
            reason=reason,
        )
        
        if error:
            return Response(
                {"error": error},
                status=status.HTTP_403_FORBIDDEN if "authorized" in error.lower() else status.HTTP_400_BAD_REQUEST
            )
        
        return Response(
            {"success": True, "message": "Build rejected"},
            status=status.HTTP_200_OK
        )


# ==================== User Moderation Views ====================

class AllCommentsView(APIView):
    """
    List all comments for moderation.
    
    GET /api/admin/comments/
    
    Requires: Authorization: Bearer <clerk_token>
    """
    
    def get(self, request):
        """
        Get paginated list of all comments.
        Uses JWT-verified email for authorization.
        
        Query params:
            - page (int): Page number, default 1
            - pageSize (int): Items per page, default 20
            - search (str): Optional search term
        """
        from rigadmin.services import user_moderation_service
        
        email = get_verified_user_email(request)
        if not email:
            return Response(
                {"error": "Authentication required"},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        # Verify admin status
        if not admin_service.is_admin(email):
            return Response(
                {"error": "Not authorized"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        page = int(request.query_params.get("page", 1))
        page_size = int(request.query_params.get("pageSize", 20))
        search = request.query_params.get("search")
        
        comments, total = user_moderation_service.get_all_comments(page, page_size, search)
        
        from rigadmin.serializers import CommentModerationSerializer
        serializer = CommentModerationSerializer(comments, many=True)
        
        return Response({
            "comments": serializer.data,
            "total": total,
            "page": page,
            "pageSize": page_size,
        }, status=status.HTTP_200_OK)


class SanctionsView(APIView):
    """
    List or create user sanctions.
    
    GET /api/admin/sanctions/
    POST /api/admin/sanctions/
    
    Requires: Authorization: Bearer <clerk_token>
    """
    
    def get(self, request):
        """
        Get paginated list of active sanctions.
        Uses JWT-verified email for authorization.
        
        Query params:
            - page (int): Page number, default 1
            - pageSize (int): Items per page, default 20
        """
        from rigadmin.services import user_moderation_service
        
        email = get_verified_user_email(request)
        if not email:
            return Response(
                {"error": "Authentication required"},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        # Verify admin status
        if not admin_service.is_admin(email):
            return Response(
                {"error": "Not authorized"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        page = int(request.query_params.get("page", 1))
        page_size = int(request.query_params.get("pageSize", 20))
        
        sanctions, total = user_moderation_service.get_active_sanctions(page, page_size)
        
        from rigadmin.serializers import SanctionSerializer
        serializer = SanctionSerializer(sanctions, many=True)
        
        return Response({
            "sanctions": serializer.data,
            "total": total,
            "page": page,
            "pageSize": page_size,
        }, status=status.HTTP_200_OK)
    
    def post(self, request):
        """
        Create a new sanction.
        Uses JWT-verified email for authorization.
        
        Request body:
            - user_id (str): UUID of the user to sanction
            - sanction_type (str): 'timeout' or 'permanent_ban'
            - reason (str, optional): Reason for sanction
            - duration_days (int): Days for timeout (required for timeout type)
        """
        from rigadmin.services import user_moderation_service
        from rigadmin.serializers import SanctionSerializer
        
        admin_email = get_verified_user_email(request)
        if not admin_email:
            return Response(
                {"error": "Authentication required"},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        # Extract sanction data from request body
        user_id = request.data.get("user_id")
        sanction_type = request.data.get("sanction_type")
        reason = request.data.get("reason")
        duration_days = request.data.get("duration_days")
        
        if not user_id or not sanction_type:
            return Response(
                {"error": "user_id and sanction_type are required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        result, error = user_moderation_service.sanction_user(
            user_id=str(user_id),
            admin_email=admin_email,
            sanction_type=sanction_type,
            reason=reason,
            duration_days=duration_days,
        )
        
        if error:
            return Response(
                {"error": error},
                status=status.HTTP_403_FORBIDDEN if "authorized" in error.lower() else status.HTTP_400_BAD_REQUEST
            )
        
        output_serializer = SanctionSerializer(result)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)


class SanctionDetailView(APIView):
    """
    Remove a sanction.
    
    DELETE /api/admin/sanctions/<id>/
    
    Requires: Authorization: Bearer <clerk_token>
    """
    
    def delete(self, request, sanction_id):
        """
        Remove (deactivate) a sanction.
        Uses JWT-verified email for authorization.
        """
        from rigadmin.services import user_moderation_service
        
        email = get_verified_user_email(request)
        if not email:
            return Response(
                {"error": "Authentication required"},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        success, error = user_moderation_service.remove_sanction(
            sanction_id=sanction_id,
            admin_email=email,
        )
        
        if error:
            return Response(
                {"error": error},
                status=status.HTTP_403_FORBIDDEN if "authorized" in error.lower() else status.HTTP_400_BAD_REQUEST
            )
        
        return Response(
            {"success": True, "message": "Sanction removed"},
            status=status.HTTP_200_OK
        )


class CheckUserSanctionView(APIView):
    """
    Check if a user is sanctioned.
    
    GET /api/admin/sanctions/check/<user_id>/
    """
    
    def get(self, request, user_id):
        """
        Check if a user has an active sanction.
        
        Returns sanction details if active, otherwise { sanctioned: false }
        """
        from rigadmin.services import user_moderation_service
        
        is_sanctioned, sanction = user_moderation_service.is_user_sanctioned(user_id)
        
        if is_sanctioned and sanction:
            return Response({
                "sanctioned": True,
                "sanction_type": sanction.get("sanction_type"),
                "reason": sanction.get("reason"),
                "expires_at": sanction.get("expires_at"),
            }, status=status.HTTP_200_OK)
        
        return Response({"sanctioned": False}, status=status.HTTP_200_OK)

