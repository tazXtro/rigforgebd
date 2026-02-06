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
"""

from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response

from rigadmin.services import admin_service, invite_service
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
    Check if a user is an admin.
    
    POST /api/admin/check/
    """
    
    def post(self, request):
        """
        Check admin status by email.
        
        Request body:
            - email (required): User's email address
            
        Returns:
            { is_admin: boolean }
        """
        serializer = AdminCheckSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(
                {"errors": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        email = serializer.validated_data["email"]
        is_admin = admin_service.is_admin(email)
        
        return Response({"is_admin": is_admin}, status=status.HTTP_200_OK)


class AdminMeView(APIView):
    """
    Get current admin profile.
    
    GET /api/admin/me/?email=<email>
    """
    
    def get(self, request):
        """
        Get admin profile by email.
        
        Query params:
            - email (required): User's email address
            
        Returns:
            Admin profile data or 403 if not admin
        """
        email = request.query_params.get("email")
        
        if not email:
            return Response(
                {"error": "Email query parameter is required"},
                status=status.HTTP_400_BAD_REQUEST
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
    
    GET /api/admin/invites/?email=<admin_email>
    POST /api/admin/invites/
    """
    
    def get(self, request):
        """
        List pending invites created by the admin.
        
        Query params:
            - email (required): Admin's email address
        """
        email = request.query_params.get("email")
        
        if not email:
            return Response(
                {"error": "Email query parameter is required"},
                status=status.HTTP_400_BAD_REQUEST
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
        
        Request body:
            - email (required): Target email to invite
            - expires_hours (optional): Hours until expiry (default 72)
            
        Query params:
            - admin_email (required): Creator's email for authorization
        """
        admin_email = request.query_params.get("admin_email")
        
        if not admin_email:
            return Response(
                {"error": "admin_email query parameter is required"},
                status=status.HTTP_400_BAD_REQUEST
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
    
    GET /api/admin/builds/pending/?email=<admin_email>
    """
    
    def get(self, request):
        """
        Get paginated list of pending builds.
        
        Query params:
            - email (required): Admin's email for authorization
            - page (int): Page number, default 1
            - pageSize (int): Items per page, default 12
        """
        from rigadmin.services import build_moderation_service
        
        email = request.query_params.get("email")
        if not email:
            return Response(
                {"error": "Email query parameter is required"},
                status=status.HTTP_400_BAD_REQUEST
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
    
    GET /api/admin/builds/pending/count/?email=<admin_email>
    """
    
    def get(self, request):
        """
        Get count of pending builds.
        
        Query params:
            - email (required): Admin's email for authorization
        """
        from rigadmin.services import build_moderation_service
        
        email = request.query_params.get("email")
        if not email:
            return Response(
                {"error": "Email query parameter is required"},
                status=status.HTTP_400_BAD_REQUEST
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
    """
    
    def post(self, request, build_id):
        """
        Approve a build for public display.
        
        Request body:
            - admin_email (str): Email of the approving admin
        """
        from rigadmin.services import build_moderation_service
        from rigadmin.serializers import BuildApprovalSerializer
        
        serializer = BuildApprovalSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(
                {"errors": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        result, error = build_moderation_service.approve_build(
            build_id=build_id,
            admin_email=serializer.validated_data["admin_email"],
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
    """
    
    def post(self, request, build_id):
        """
        Reject a build.
        
        Request body:
            - admin_email (str): Email of the rejecting admin
            - reason (str, optional): Reason for rejection
        """
        from rigadmin.services import build_moderation_service
        from rigadmin.serializers import BuildRejectionSerializer
        
        serializer = BuildRejectionSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(
                {"errors": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        result, error = build_moderation_service.reject_build(
            build_id=build_id,
            admin_email=serializer.validated_data["admin_email"],
            reason=serializer.validated_data.get("reason"),
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
    
    GET /api/admin/comments/?email=<admin_email>
    """
    
    def get(self, request):
        """
        Get paginated list of all comments.
        
        Query params:
            - email (required): Admin's email for authorization
            - page (int): Page number, default 1
            - pageSize (int): Items per page, default 20
            - search (str): Optional search term
        """
        from rigadmin.services import user_moderation_service
        
        email = request.query_params.get("email")
        if not email:
            return Response(
                {"error": "Email query parameter is required"},
                status=status.HTTP_400_BAD_REQUEST
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
    
    GET /api/admin/sanctions/?email=<admin_email>
    POST /api/admin/sanctions/
    """
    
    def get(self, request):
        """
        Get paginated list of active sanctions.
        
        Query params:
            - email (required): Admin's email for authorization
            - page (int): Page number, default 1
            - pageSize (int): Items per page, default 20
        """
        from rigadmin.services import user_moderation_service
        
        email = request.query_params.get("email")
        if not email:
            return Response(
                {"error": "Email query parameter is required"},
                status=status.HTTP_400_BAD_REQUEST
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
        
        Request body:
            - admin_email (str): Email of the admin creating the sanction
            - user_id (str): UUID of the user to sanction
            - sanction_type (str): 'timeout' or 'permanent_ban'
            - reason (str, optional): Reason for sanction
            - duration_days (int): Days for timeout (required for timeout type)
        """
        from rigadmin.services import user_moderation_service
        from rigadmin.serializers import SanctionCreateSerializer, SanctionSerializer
        
        serializer = SanctionCreateSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(
                {"errors": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        result, error = user_moderation_service.sanction_user(
            user_id=str(serializer.validated_data["user_id"]),
            admin_email=serializer.validated_data["admin_email"],
            sanction_type=serializer.validated_data["sanction_type"],
            reason=serializer.validated_data.get("reason"),
            duration_days=serializer.validated_data.get("duration_days"),
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
    
    DELETE /api/admin/sanctions/<id>/?email=<admin_email>
    """
    
    def delete(self, request, sanction_id):
        """
        Remove (deactivate) a sanction.
        
        Query params:
            - email (required): Admin's email for authorization
        """
        from rigadmin.services import user_moderation_service
        
        email = request.query_params.get("email")
        if not email:
            return Response(
                {"error": "Email query parameter is required"},
                status=status.HTTP_400_BAD_REQUEST
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

