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
