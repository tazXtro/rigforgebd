"""
User service layer for business logic.

This module contains all business logic for user management.
Follows clean architecture principles:
    - Orchestrates repository calls
    - Contains business rules and workflows
    - No HTTP logic (no request objects, no Response returns)
    - No direct Supabase access
"""

from typing import Optional
from users.repositories.supabase import user_repository


class UserService:
    """
    Service layer for user management business logic.
    
    Handles user synchronization, profile management, and any
    business rules around user data.
    """
    
    def __init__(self, repository=None):
        self.repository = repository or user_repository
    
    def get_or_create_user(
        self,
        email: str,
        display_name: Optional[str] = None,
        avatar_url: Optional[str] = None,
    ) -> dict:
        """
        Get an existing user by email, or create a new one.
        
        This is the main sync function called after frontend authentication.
        Uses email as the auth-agnostic identifier to decouple from
        any specific auth provider (Clerk, Auth0, etc).
        
        Args:
            email: User's email address (primary identifier)
            display_name: Optional display name
            avatar_url: Optional avatar URL
            
        Returns:
            User data dict (existing or newly created)
        """
        # Try to find existing user
        existing_user = self.repository.get_by_email(email)
        
        if existing_user:
            # Optionally update profile if new data provided
            updates = {}
            if display_name and display_name != existing_user.get("display_name"):
                updates["display_name"] = display_name
            if avatar_url and avatar_url != existing_user.get("avatar_url"):
                updates["avatar_url"] = avatar_url
            
            if updates:
                updated_user = self.repository.update(email, updates)
                return updated_user
            
            return existing_user
        
        # Create new user
        user_data = {
            "email": email,
            "display_name": display_name or email.split("@")[0],
            "avatar_url": avatar_url,
        }
        
        return self.repository.create(user_data)
    
    def get_user_by_email(self, email: str) -> Optional[dict]:
        """
        Retrieve a user by their email address.
        
        Args:
            email: The user's email
            
        Returns:
            User data dict or None if not found
        """
        return self.repository.get_by_email(email)
    
    def get_user_by_id(self, user_id: str) -> Optional[dict]:
        """
        Retrieve a user by their database ID.
        
        Args:
            user_id: The user's UUID
            
        Returns:
            User data dict or None if not found
        """
        return self.repository.get_by_id(user_id)
    
    def update_user_profile(
        self,
        email: str,
        display_name: Optional[str] = None,
        avatar_url: Optional[str] = None,
    ) -> Optional[dict]:
        """
        Update a user's profile.
        
        Args:
            email: The user's email address
            display_name: New display name (optional)
            avatar_url: New avatar URL (optional)
            
        Returns:
            Updated user data or None if user not found
        """
        updates = {}
        if display_name is not None:
            updates["display_name"] = display_name
        if avatar_url is not None:
            updates["avatar_url"] = avatar_url
        
        if not updates:
            # Nothing to update, return existing user
            return self.repository.get_by_email(email)
        
        return self.repository.update(email, updates)


# Singleton instance for convenience
user_service = UserService()
