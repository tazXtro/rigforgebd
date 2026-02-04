"""
Admin repository for Supabase data access.

This module handles all direct Supabase queries for admin and invite data.
Follows clean architecture principles:
    - Only raw data access (select, insert, update, delete)
    - Returns dictionaries/lists, never domain objects
    - Raises custom exceptions on errors (service layer handles them)
    - No business logic
    - No HTTP logic
"""

import logging
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional, List

from users.repositories.exceptions import (
    RepositoryError,
    RecordCreationError,
    RecordNotFoundError,
)

logger = logging.getLogger(__name__)


class AdminRepository:
    """
    Repository for admin data persistence in Supabase.
    
    All methods return raw data (dicts/lists) and handle only
    database operations. Business logic belongs in services.py.
    """
    
    TABLE_NAME = "admins"
    _client = None
    
    @property
    def client(self):
        """Lazy-load the Supabase client on first access."""
        if self._client is None:
            from core.infrastructure.supabase.client import get_supabase_client
            self._client = get_supabase_client()
        return self._client
    
    def get_by_user_id(self, user_id: str) -> Optional[dict]:
        """
        Check if a user is an admin.
        
        Args:
            user_id: The user's UUID
            
        Returns:
            Admin record dict or None if not an admin
        """
        try:
            response = (
                self.client
                .table(self.TABLE_NAME)
                .select("*, users(id, email, display_name, avatar_url)")
                .eq("user_id", user_id)
                .maybe_single()
                .execute()
            )
            return response.data if response else None
        except Exception as e:
            logger.error(f"Failed to check admin status for user '{user_id}': {e}")
            raise RepositoryError(
                f"Failed to check admin status: {user_id}",
                original_error=e
            ) from e
    
    def get_by_email(self, email: str) -> Optional[dict]:
        """
        Check if a user with given email is an admin.
        
        Args:
            email: The user's email address
            
        Returns:
            Admin record with user data or None if not an admin
        """
        try:
            # First get user by email, then check admin status
            user_response = (
                self.client
                .table("users")
                .select("id")
                .eq("email", email)
                .maybe_single()
                .execute()
            )
            
            if not user_response or not user_response.data:
                return None
            
            user_id = user_response.data["id"]
            return self.get_by_user_id(user_id)
        except RepositoryError:
            raise
        except Exception as e:
            logger.error(f"Failed to check admin by email '{email}': {e}")
            raise RepositoryError(
                f"Failed to check admin by email: {email}",
                original_error=e
            ) from e
    
    def create(self, user_id: str) -> dict:
        """
        Add a user as admin.
        
        Args:
            user_id: The user's UUID
            
        Returns:
            The created admin record
        """
        try:
            response = (
                self.client
                .table(self.TABLE_NAME)
                .insert({"user_id": user_id})
                .execute()
            )
            if response and response.data:
                logger.info(f"Created admin for user: {user_id}")
                return response.data[0]
            raise RecordCreationError(f"Insert returned no data for user: {user_id}")
        except RecordCreationError:
            raise
        except Exception as e:
            logger.error(f"Failed to create admin: {e}")
            raise RecordCreationError(
                f"Failed to create admin for user: {user_id}",
                original_error=e
            ) from e
    
    def delete(self, user_id: str) -> bool:
        """
        Remove admin status from a user.
        
        Args:
            user_id: The user's UUID
            
        Returns:
            True if deleted, False if not found
        """
        try:
            response = (
                self.client
                .table(self.TABLE_NAME)
                .delete()
                .eq("user_id", user_id)
                .execute()
            )
            deleted = len(response.data) > 0 if response and response.data else False
            if deleted:
                logger.info(f"Removed admin status for user: {user_id}")
            return deleted
        except Exception as e:
            logger.error(f"Failed to delete admin '{user_id}': {e}")
            raise RepositoryError(
                f"Failed to delete admin: {user_id}",
                original_error=e
            ) from e


class InviteRepository:
    """
    Repository for admin invite data persistence in Supabase.
    """
    
    TABLE_NAME = "admin_invites"
    _client = None
    
    @property
    def client(self):
        """Lazy-load the Supabase client on first access."""
        if self._client is None:
            from core.infrastructure.supabase.client import get_supabase_client
            self._client = get_supabase_client()
        return self._client
    
    @staticmethod
    def generate_token() -> str:
        """Generate a secure random token for invites."""
        return secrets.token_urlsafe(32)
    
    def create(
        self,
        email: str,
        created_by: str,
        expires_hours: int = 72
    ) -> dict:
        """
        Create a new admin invite.
        
        Args:
            email: Target email address (invite is locked to this email)
            created_by: User ID of the admin creating the invite
            expires_hours: Hours until invite expires (default 72)
            
        Returns:
            The created invite record with token
        """
        try:
            token = self.generate_token()
            expires_at = datetime.now(timezone.utc) + timedelta(hours=expires_hours)
            
            invite_data = {
                "token": token,
                "email": email.lower(),
                "created_by": created_by,
                "expires_at": expires_at.isoformat(),
            }
            
            response = (
                self.client
                .table(self.TABLE_NAME)
                .insert(invite_data)
                .execute()
            )
            
            if response and response.data:
                logger.info(f"Created admin invite for: {email}")
                return response.data[0]
            raise RecordCreationError(f"Insert returned no data for invite: {email}")
        except RecordCreationError:
            raise
        except Exception as e:
            logger.error(f"Failed to create invite: {e}")
            raise RecordCreationError(
                f"Failed to create invite for: {email}",
                original_error=e
            ) from e
    
    def get_by_token(self, token: str) -> Optional[dict]:
        """
        Get invite details by token.
        
        Args:
            token: The invite token
            
        Returns:
            Invite record or None if not found
        """
        try:
            response = (
                self.client
                .table(self.TABLE_NAME)
                .select("*")
                .eq("token", token)
                .maybe_single()
                .execute()
            )
            return response.data if response else None
        except Exception as e:
            logger.error(f"Failed to fetch invite by token: {e}")
            raise RepositoryError(
                "Failed to fetch invite by token",
                original_error=e
            ) from e
    
    def mark_used(self, token: str, user_id: str) -> Optional[dict]:
        """
        Mark an invite as used.
        
        Args:
            token: The invite token
            user_id: The user who accepted the invite
            
        Returns:
            Updated invite record or None
        """
        try:
            response = (
                self.client
                .table(self.TABLE_NAME)
                .update({
                    "used_at": datetime.now(timezone.utc).isoformat(),
                    "used_by": user_id
                })
                .eq("token", token)
                .execute()
            )
            if response and response.data:
                logger.info(f"Marked invite as used by user: {user_id}")
                return response.data[0]
            return None
        except Exception as e:
            logger.error(f"Failed to mark invite as used: {e}")
            raise RepositoryError(
                "Failed to mark invite as used",
                original_error=e
            ) from e
    
    def get_pending_by_creator(self, created_by: str) -> List[dict]:
        """
        Get all pending invites created by an admin.
        
        Args:
            created_by: User ID of the admin
            
        Returns:
            List of pending invite records
        """
        try:
            response = (
                self.client
                .table(self.TABLE_NAME)
                .select("*")
                .eq("created_by", created_by)
                .is_("used_at", "null")
                .gte("expires_at", datetime.now(timezone.utc).isoformat())
                .order("created_at", desc=True)
                .execute()
            )
            return response.data if response and response.data else []
        except Exception as e:
            logger.error(f"Failed to fetch pending invites: {e}")
            raise RepositoryError(
                "Failed to fetch pending invites",
                original_error=e
            ) from e


# Lazy singletons
admin_repository = AdminRepository()
invite_repository = InviteRepository()
