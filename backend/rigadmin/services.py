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


class BuildModerationService:
    """
    Service layer for build approval workflow.
    
    Handles pending build review, approval, and rejection.
    """
    
    def __init__(self, moderation_repo=None, admin_repo=None, user_repo=None):
        from rigadmin.repositories.moderation import build_moderation_repository
        self.moderation_repo = moderation_repo or build_moderation_repository
        self.admin_repo = admin_repo or admin_repository
        self.user_repo = user_repo or user_repository
    
    def get_pending_builds(
        self,
        page: int = 1,
        page_size: int = 12,
    ) -> Tuple[List[dict], int]:
        """
        Get builds pending approval.
        
        Returns:
            Tuple of (list of pending builds, total count)
        """
        try:
            return self.moderation_repo.get_pending_builds(page, page_size)
        except RepositoryError as e:
            logger.error(f"Error fetching pending builds: {e}")
            return [], 0
    
    def get_pending_count(self) -> int:
        """Get count of pending builds for dashboard badge."""
        try:
            return self.moderation_repo.get_pending_count()
        except RepositoryError as e:
            logger.error(f"Error fetching pending count: {e}")
            return 0
    
    def approve_build(
        self,
        build_id: str,
        admin_email: str,
    ) -> Tuple[Optional[dict], Optional[str]]:
        """
        Approve a build for public display.
        
        Args:
            build_id: The build's UUID
            admin_email: Email of the approving admin
            
        Returns:
            Tuple of (updated build, error message)
        """
        try:
            # Verify admin status
            admin = self.admin_repo.get_by_email(admin_email)
            if not admin:
                return None, "Not authorized"
            
            # Get admin's user ID
            user = self.user_repo.get_by_email(admin_email)
            if not user:
                return None, "Admin user not found"
            
            result = self.moderation_repo.update_approval_status(
                build_id=build_id,
                status="approved",
                reviewed_by=user["id"],
            )
            return result, None
        except RepositoryError as e:
            logger.error(f"Error approving build: {e}")
            return None, "Failed to approve build"
    
    def reject_build(
        self,
        build_id: str,
        admin_email: str,
        reason: Optional[str] = None,
    ) -> Tuple[Optional[dict], Optional[str]]:
        """
        Reject a build.
        
        Args:
            build_id: The build's UUID
            admin_email: Email of the rejecting admin
            reason: Optional rejection reason
            
        Returns:
            Tuple of (updated build, error message)
        """
        try:
            # Verify admin status
            admin = self.admin_repo.get_by_email(admin_email)
            if not admin:
                return None, "Not authorized"
            
            # Get admin's user ID
            user = self.user_repo.get_by_email(admin_email)
            if not user:
                return None, "Admin user not found"
            
            result = self.moderation_repo.update_approval_status(
                build_id=build_id,
                status="rejected",
                reviewed_by=user["id"],
                rejection_reason=reason,
            )
            return result, None
        except RepositoryError as e:
            logger.error(f"Error rejecting build: {e}")
            return None, "Failed to reject build"


class UserModerationService:
    """
    Service layer for user moderation.
    
    Handles user sanctions (bans/timeouts) and comment moderation.
    """
    
    def __init__(self, sanction_repo=None, comments_repo=None, admin_repo=None, user_repo=None):
        from rigadmin.repositories.moderation import sanction_repository, comments_repository
        self.sanction_repo = sanction_repo or sanction_repository
        self.comments_repo = comments_repo or comments_repository
        self.admin_repo = admin_repo or admin_repository
        self.user_repo = user_repo or user_repository
    
    def get_all_comments(
        self,
        page: int = 1,
        page_size: int = 20,
        search: Optional[str] = None,
    ) -> Tuple[List[dict], int]:
        """
        Get all comments for moderation.
        
        Returns:
            Tuple of (list of comments, total count)
        """
        try:
            return self.comments_repo.get_all_comments(page, page_size, search)
        except RepositoryError as e:
            logger.error(f"Error fetching comments: {e}")
            return [], 0
    
    def get_active_sanctions(
        self,
        page: int = 1,
        page_size: int = 20,
    ) -> Tuple[List[dict], int]:
        """
        Get active sanctions.
        
        Returns:
            Tuple of (list of sanctions, total count)
        """
        try:
            return self.sanction_repo.get_active_sanctions(page, page_size)
        except RepositoryError as e:
            logger.error(f"Error fetching sanctions: {e}")
            return [], 0
    
    def sanction_user(
        self,
        user_id: str,
        admin_email: str,
        sanction_type: str,
        reason: Optional[str] = None,
        duration_days: Optional[int] = None,
    ) -> Tuple[Optional[dict], Optional[str]]:
        """
        Create a sanction for a user.
        
        Args:
            user_id: The user to sanction
            admin_email: Email of the admin creating the sanction
            sanction_type: 'timeout' or 'permanent_ban'
            reason: Reason for the sanction
            duration_days: Days for timeout
            
        Returns:
            Tuple of (sanction data, error message)
        """
        try:
            # Verify admin status
            admin = self.admin_repo.get_by_email(admin_email)
            if not admin:
                return None, "Not authorized"
            
            # Get admin's user ID
            admin_user = self.user_repo.get_by_email(admin_email)
            if not admin_user:
                return None, "Admin user not found"
            
            # Check if user already has active sanction
            existing = self.sanction_repo.get_user_active_sanction(user_id)
            if existing:
                return None, "User already has an active sanction"
            
            result = self.sanction_repo.create(
                user_id=user_id,
                sanction_type=sanction_type,
                created_by=admin_user["id"],
                reason=reason,
                duration_days=duration_days,
            )
            return result, None
        except RepositoryError as e:
            logger.error(f"Error creating sanction: {e}")
            return None, "Failed to create sanction"
    
    def remove_sanction(
        self,
        sanction_id: str,
        admin_email: str,
    ) -> Tuple[bool, Optional[str]]:
        """
        Remove (deactivate) a sanction.
        
        Args:
            sanction_id: The sanction's UUID
            admin_email: Email of the admin removing the sanction
            
        Returns:
            Tuple of (success, error message)
        """
        try:
            # Verify admin status
            admin = self.admin_repo.get_by_email(admin_email)
            if not admin:
                return False, "Not authorized"
            
            self.sanction_repo.deactivate(sanction_id)
            return True, None
        except RepositoryError as e:
            logger.error(f"Error removing sanction: {e}")
            return False, "Failed to remove sanction"
    
    def is_user_sanctioned(self, user_id: str) -> Tuple[bool, Optional[dict]]:
        """
        Check if a user is currently sanctioned.
        
        Args:
            user_id: The user's UUID
            
        Returns:
            Tuple of (is_sanctioned, sanction_details)
        """
        try:
            sanction = self.sanction_repo.get_user_active_sanction(user_id)
            if sanction:
                return True, sanction
            return False, None
        except RepositoryError as e:
            logger.error(f"Error checking user sanction: {e}")
            return False, None


# Singleton instances
admin_service = AdminService()
invite_service = InviteService()
build_moderation_service = BuildModerationService()
user_moderation_service = UserModerationService()

