"""
User API views (controllers).

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

from users.services import user_service
from users.serializers import (
    UserSyncSerializer,
    UserProfileSerializer,
    UserProfileUpdateSerializer,
)


class UserSyncView(APIView):
    """
    Sync user after frontend authentication.
    
    POST /api/users/sync/
    
    Called by the frontend after successful Clerk authentication
    to ensure the user exists in our database.
    """
    
    def post(self, request):
        """
        Create or update user based on email from auth provider.
        
        Request body:
            - email (required): User's email from auth provider
            - display_name (optional): User's display name
            - avatar_url (optional): User's avatar URL
            
        Returns:
            User profile data
        """
        serializer = UserSyncSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(
                {"errors": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user = user_service.get_or_create_user(
            email=serializer.validated_data["email"],
            display_name=serializer.validated_data.get("display_name"),
            avatar_url=serializer.validated_data.get("avatar_url"),
            provider=serializer.validated_data.get("provider"),
            provider_user_id=serializer.validated_data.get("provider_user_id"),
        )
        
        if not user:
            return Response(
                {"error": "Failed to create or retrieve user"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        output_serializer = UserProfileSerializer(user)
        return Response(output_serializer.data, status=status.HTTP_200_OK)


class UserProfileView(APIView):
    """
    Get or update user profile.
    
    GET /api/users/profile/?email=<email>
    PATCH /api/users/profile/?email=<email>
    """
    
    def get(self, request):
        """
        Retrieve user profile by email.
        
        Query params:
            - email (required): User's email address
            
        Returns:
            User profile data or 404 if not found
        """
        email = request.query_params.get("email")
        
        if not email:
            return Response(
                {"error": "Email query parameter is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user = user_service.get_user_by_email(email)
        
        if not user:
            return Response(
                {"error": "User not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = UserProfileSerializer(user)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    def patch(self, request):
        """
        Update user profile.
        
        Query params:
            - email (required): User's email address
            
        Request body:
            - display_name (optional): New display name
            - avatar_url (optional): New avatar URL
            
        Returns:
            Updated user profile data
        """
        email = request.query_params.get("email")
        
        if not email:
            return Response(
                {"error": "Email query parameter is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = UserProfileUpdateSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(
                {"errors": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user = user_service.update_user_profile(
            email=email,
            display_name=serializer.validated_data.get("display_name"),
            avatar_url=serializer.validated_data.get("avatar_url"),
        )
        
        if not user:
            return Response(
                {"error": "User not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        output_serializer = UserProfileSerializer(user)
        return Response(output_serializer.data, status=status.HTTP_200_OK)
