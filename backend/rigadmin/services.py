"""
Admin service layer for business logic.

This module contains all business logic for admin management.
Follows clean architecture principles:
    - Orchestrates repository calls
    - Catches and handles repository exceptions
    - Contains business rules and workflows
    - No HTTP logic (no request objects, no Response returns)
    - No direct Supabase access
"""

import logging
from datetime import datetime, timezone
from typing import Optional, List, Tuple

from rigadmin.repositories.supabase import admin_repository, invite_repository
from users.repositories.supabase import user_repository
from users.repositories.exceptions import (
    RepositoryError,
    RecordCreationError,
)

logger = logging.getLogger(__name__)


class AdminService:
    """
    Service layer for admin management business logic.
    
    Handles admin status checks, profile management, and access control.
    """
    
    def __init__(self, admin_repo=None, user_repo=None):
        self.admin_repo = admin_repo or admin_repository
        self.user_repo = user_repo or user_repository
    
    def is_admin(self, email: str) -> bool:
        """
        Check if a user is an admin by email.
        
        Args:
            email: User's email address
            
        Returns:
            True if user is an admin, False otherwise
        """
        try:
            admin = self.admin_repo.get_by_email(email)
            return admin is not None
        except RepositoryError as e:
            logger.error(f"Error checking admin status: {e}")
            return False
    
    def get_admin_profile(self, email: str) -> Optional[dict]:
        """
        Get admin profile with user data.
        
        Args:
            email: User's email address
            
        Returns:
            Admin record with nested user data, or None if not admin
        """
        try:
            return self.admin_repo.get_by_email(email)
        except RepositoryError as e:
            logger.error(f"Error fetching admin profile: {e}")
            return None
    
    def create_admin(self, user_id: str) -> Optional[dict]:
        """
        Grant admin access to a user.
        
        Args:
            user_id: The user's UUID
            
        Returns:
            Created admin record or None on failure
        """
        try:
            return self.admin_repo.create(user_id)
        except RecordCreationError as e:
            logger.error(f"Failed to create admin: {e}")
            return None
    
    def revoke_admin(self, email: str) -> bool:
        """
        Revoke admin access from a user.
        
        Args:
            email: User's email address
            
        Returns:
            True if revoked, False otherwise
        """
        try:
            user = self.user_repo.get_by_email(email)
            if not user:
                return False
            return self.admin_repo.delete(user["id"])
        except RepositoryError as e:
            logger.error(f"Failed to revoke admin: {e}")
            return False


class InviteService:
    """
    Service layer for admin invite management.
    
    Handles invite creation, validation, and acceptance with email locking.
    """
    
    def __init__(self, invite_repo=None, admin_repo=None, user_repo=None):
        self.invite_repo = invite_repo or invite_repository
        self.admin_repo = admin_repo or admin_repository
        self.user_repo = user_repo or user_repository
    
    def create_invite(
        self,
        admin_email: str,
        target_email: str,
        expires_hours: int = 72
    ) -> Tuple[Optional[dict], Optional[str]]:
        """
        Create an admin invite for a specific email.
        
        Args:
            admin_email: Email of the admin creating the invite
            target_email: Email address the invite is locked to
            expires_hours: Hours until invite expires
            
        Returns:
            Tuple of (invite record, error message)
        """
        try:
            # Verify creator is an admin
            admin = self.admin_repo.get_by_email(admin_email)
            if not admin:
                return None, "You are not authorized to create invites"
            
            # Check if target is already an admin
            existing_admin = self.admin_repo.get_by_email(target_email)
            if existing_admin:
                return None, "User is already an admin"
            
            # Create the invite
            invite = self.invite_repo.create(
                email=target_email.lower(),
                created_by=admin["user_id"],
                expires_hours=expires_hours
            )
            
            return invite, None
            
        except RecordCreationError as e:
            logger.error(f"Failed to create invite: {e}")
            return None, "Failed to create invite"
        except RepositoryError as e:
            logger.error(f"Database error creating invite: {e}")
            return None, "Database error"
    
    def validate_invite(self, token: str) -> Tuple[Optional[dict], Optional[str]]:
        """
        Validate an invite token.
        
        Args:
            token: The invite token
            
        Returns:
            Tuple of (invite record, error message)
        """
        try:
            invite = self.invite_repo.get_by_token(token)
            
            if not invite:
                return None, "Invalid invite token"
            
            # Check if already used
            if invite.get("used_at"):
                return None, "Invite has already been used"
            
            # Check if expired
            expires_at = datetime.fromisoformat(invite["expires_at"].replace("Z", "+00:00"))
            if expires_at < datetime.now(timezone.utc):
                return None, "Invite has expired"
            
            return invite, None
            
        except RepositoryError as e:
            logger.error(f"Error validating invite: {e}")
            return None, "Error validating invite"
    
    def accept_invite(
        self,
        token: str,
        user_email: str
    ) -> Tuple[Optional[dict], Optional[str]]:
        """
        Accept an invite and grant admin access.
        
        Email must match the invite's locked email.
        
        Args:
            token: The invite token
            user_email: Email of the user accepting
            
        Returns:
            Tuple of (admin record, error message)
        """
        try:
            # Validate the invite
            invite, error = self.validate_invite(token)
            if error:
                return None, error
            
            # Check email matches
            if invite["email"].lower() != user_email.lower():
                return None, "This invite is not for your email address"
            
            # Get or check user exists
            user = self.user_repo.get_by_email(user_email)
            if not user:
                return None, "User not found. Please sign up first."
            
            # Check if already an admin
            existing_admin = self.admin_repo.get_by_user_id(user["id"])
            if existing_admin:
                return None, "You are already an admin"
            
            # Grant admin access
            admin = self.admin_repo.create(user["id"])
            
            # Mark invite as used
            self.invite_repo.mark_used(token, user["id"])
            
            return admin, None
            
        except RecordCreationError as e:
            logger.error(f"Failed to accept invite: {e}")
            return None, "Failed to grant admin access"
        except RepositoryError as e:
            logger.error(f"Database error accepting invite: {e}")
            return None, "Database error"
    
    def get_pending_invites(self, admin_email: str) -> List[dict]:
        """
        Get pending invites created by an admin.
        
        Args:
            admin_email: Email of the admin
            
        Returns:
            List of pending invite records
        """
        try:
            admin = self.admin_repo.get_by_email(admin_email)
            if not admin:
                return []
            
            return self.invite_repo.get_pending_by_creator(admin["user_id"])
        except RepositoryError as e:
            logger.error(f"Error fetching pending invites: {e}")
            return []


# Singleton instances
admin_service = AdminService()
invite_service = InviteService()
