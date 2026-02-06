"""
Moderation repository for Supabase data access.

This module handles all direct Supabase queries for moderation data.
Follows clean architecture principles:
    - Only raw data access (select, insert, update, delete)
    - Returns dictionaries/lists, never domain objects
    - Raises custom exceptions on errors
    - No business logic
    - No HTTP logic
"""

import logging
from typing import Optional, List
from datetime import datetime, timezone, timedelta

from users.repositories.exceptions import (
    RepositoryError,
    RecordNotFoundError,
    RecordCreationError,
    RecordUpdateError,
)

logger = logging.getLogger(__name__)


class BuildModerationRepository:
    """
    Repository for build moderation data access.
    
    Handles pending builds retrieval and approval status updates.
    """
    
    TABLE_NAME = "builds"
    _client = None
    
    @property
    def client(self):
        """Lazy-load the Supabase client on first access."""
        if self._client is None:
            from core.infrastructure.supabase.client import get_supabase_client
            self._client = get_supabase_client()
        return self._client
    
    def get_pending_builds(
        self,
        page: int = 1,
        page_size: int = 12,
    ) -> tuple[List[dict], int]:
        """
        Get builds pending approval with pagination.
        
        Args:
            page: Page number (1-indexed)
            page_size: Number of items per page
            
        Returns:
            Tuple of (list of builds with author info, total count)
        """
        try:
            offset = (page - 1) * page_size
            
            response = (
                self.client
                .table(self.TABLE_NAME)
                .select(
                    "*, users!builds_author_id_fkey(id, email, username, display_name, avatar_url)",
                    count="exact"
                )
                .eq("approval_status", "pending")
                .order("created_at", desc=True)
                .range(offset, offset + page_size - 1)
                .execute()
            )
            
            total = response.count if response.count is not None else 0
            return response.data or [], total
        except Exception as e:
            logger.error(f"Failed to get pending builds: {e}")
            raise RepositoryError(
                "Failed to get pending builds",
                original_error=e
            ) from e
    
    def get_pending_count(self) -> int:
        """Get the count of pending builds."""
        try:
            response = (
                self.client
                .table(self.TABLE_NAME)
                .select("id", count="exact")
                .eq("approval_status", "pending")
                .execute()
            )
            return response.count if response.count is not None else 0
        except Exception as e:
            logger.error(f"Failed to get pending count: {e}")
            raise RepositoryError(
                "Failed to get pending count",
                original_error=e
            ) from e
    
    def get_rejected_builds(
        self,
        page: int = 1,
        page_size: int = 12,
    ) -> tuple[List[dict], int]:
        """Get rejected builds with pagination."""
        try:
            offset = (page - 1) * page_size
            
            response = (
                self.client
                .table(self.TABLE_NAME)
                .select(
                    "*, users!builds_author_id_fkey(id, email, username, display_name, avatar_url)",
                    count="exact"
                )
                .eq("approval_status", "rejected")
                .order("reviewed_at", desc=True)
                .range(offset, offset + page_size - 1)
                .execute()
            )
            
            total = response.count if response.count is not None else 0
            return response.data or [], total
        except Exception as e:
            logger.error(f"Failed to get rejected builds: {e}")
            raise RepositoryError(
                "Failed to get rejected builds",
                original_error=e
            ) from e
    
    def update_approval_status(
        self,
        build_id: str,
        status: str,
        reviewed_by: str,
        rejection_reason: Optional[str] = None,
    ) -> dict:
        """
        Update a build's approval status.
        
        Args:
            build_id: The build's UUID
            status: 'approved' or 'rejected'
            reviewed_by: Admin user ID who reviewed
            rejection_reason: Reason for rejection (optional)
            
        Returns:
            Updated build data
        """
        try:
            update_data = {
                "approval_status": status,
                "reviewed_by": reviewed_by,
                "reviewed_at": datetime.now(timezone.utc).isoformat(),
            }
            
            if rejection_reason:
                update_data["rejection_reason"] = rejection_reason
            
            response = (
                self.client
                .table(self.TABLE_NAME)
                .update(update_data)
                .eq("id", build_id)
                .execute()
            )
            
            if not response.data:
                raise RecordNotFoundError(f"Build not found: {build_id}")
            
            return response.data[0]
        except RecordNotFoundError:
            raise
        except Exception as e:
            logger.error(f"Failed to update approval status for '{build_id}': {e}")
            raise RecordUpdateError(
                f"Failed to update approval status: {build_id}",
                original_error=e
            ) from e


class SanctionRepository:
    """
    Repository for user sanctions data access.
    
    Handles CRUD operations for user bans and timeouts.
    """
    
    TABLE_NAME = "user_sanctions"
    _client = None
    
    @property
    def client(self):
        """Lazy-load the Supabase client on first access."""
        if self._client is None:
            from core.infrastructure.supabase.client import get_supabase_client
            self._client = get_supabase_client()
        return self._client
    
    def get_active_sanctions(
        self,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[List[dict], int]:
        """
        Get active sanctions with pagination and user info.
        
        Returns:
            Tuple of (list of sanctions with user info, total count)
        """
        try:
            offset = (page - 1) * page_size
            
            response = (
                self.client
                .table(self.TABLE_NAME)
                .select(
                    "*, users!user_sanctions_user_id_fkey(id, email, username, display_name, avatar_url)",
                    count="exact"
                )
                .eq("is_active", True)
                .order("created_at", desc=True)
                .range(offset, offset + page_size - 1)
                .execute()
            )
            
            total = response.count if response.count is not None else 0
            return response.data or [], total
        except Exception as e:
            logger.error(f"Failed to get active sanctions: {e}")
            raise RepositoryError(
                "Failed to get active sanctions",
                original_error=e
            ) from e
    
    def get_user_active_sanction(self, user_id: str) -> Optional[dict]:
        """
        Check if a user has an active sanction.
        
        Args:
            user_id: The user's UUID
            
        Returns:
            Active sanction data or None
        """
        try:
            now = datetime.now(timezone.utc).isoformat()
            
            response = (
                self.client
                .table(self.TABLE_NAME)
                .select("*")
                .eq("user_id", user_id)
                .eq("is_active", True)
                .or_(f"expires_at.is.null,expires_at.gt.{now}")
                .order("created_at", desc=True)
                .limit(1)
                .maybe_single()
                .execute()
            )
            
            return response.data if response else None
        except Exception as e:
            logger.error(f"Failed to check user sanction for '{user_id}': {e}")
            raise RepositoryError(
                f"Failed to check user sanction: {user_id}",
                original_error=e
            ) from e
    
    def create(
        self,
        user_id: str,
        sanction_type: str,
        created_by: str,
        reason: Optional[str] = None,
        duration_days: Optional[int] = None,
    ) -> dict:
        """
        Create a new sanction.
        
        Args:
            user_id: The user to sanction
            sanction_type: 'timeout' or 'permanent_ban'
            created_by: Admin user ID
            reason: Reason for sanction
            duration_days: Days for timeout (required for timeout type)
            
        Returns:
            Created sanction data
        """
        try:
            sanction_data = {
                "user_id": user_id,
                "sanction_type": sanction_type,
                "created_by": created_by,
                "reason": reason,
                "is_active": True,
            }
            
            if sanction_type == "timeout" and duration_days:
                sanction_data["duration_days"] = duration_days
                sanction_data["expires_at"] = (
                    datetime.now(timezone.utc) + timedelta(days=duration_days)
                ).isoformat()
            
            response = (
                self.client
                .table(self.TABLE_NAME)
                .insert(sanction_data)
                .execute()
            )
            
            if not response.data:
                raise RecordCreationError("No data returned after insert")
            
            return response.data[0]
        except RecordCreationError:
            raise
        except Exception as e:
            logger.error(f"Failed to create sanction: {e}")
            raise RecordCreationError(
                "Failed to create sanction",
                original_error=e
            ) from e
    
    def deactivate(self, sanction_id: str) -> bool:
        """
        Deactivate a sanction (soft delete).
        
        Args:
            sanction_id: The sanction's UUID
            
        Returns:
            True if deactivated
        """
        try:
            response = (
                self.client
                .table(self.TABLE_NAME)
                .update({"is_active": False})
                .eq("id", sanction_id)
                .execute()
            )
            
            if not response.data:
                raise RecordNotFoundError(f"Sanction not found: {sanction_id}")
            
            return True
        except RecordNotFoundError:
            raise
        except Exception as e:
            logger.error(f"Failed to deactivate sanction '{sanction_id}': {e}")
            raise RecordUpdateError(
                f"Failed to deactivate sanction: {sanction_id}",
                original_error=e
            ) from e


class CommentsRepository:
    """
    Repository for fetching all comments for moderation.
    """
    
    TABLE_NAME = "build_comments"
    _client = None
    
    @property
    def client(self):
        """Lazy-load the Supabase client on first access."""
        if self._client is None:
            from core.infrastructure.supabase.client import get_supabase_client
            self._client = get_supabase_client()
        return self._client
    
    def get_all_comments(
        self,
        page: int = 1,
        page_size: int = 20,
        search: Optional[str] = None,
    ) -> tuple[List[dict], int]:
        """
        Get all comments with pagination for moderation.
        
        Args:
            page: Page number (1-indexed)
            page_size: Number of items per page
            search: Optional search term for content
            
        Returns:
            Tuple of (list of comments with author and build info, total count)
        """
        try:
            offset = (page - 1) * page_size
            
            query = (
                self.client
                .table(self.TABLE_NAME)
                .select(
                    "*, users!build_comments_author_id_fkey(id, email, username, display_name, avatar_url), builds!build_comments_build_id_fkey(id, title)",
                    count="exact"
                )
            )
            
            if search:
                query = query.ilike("content", f"%{search}%")
            
            response = (
                query
                .order("created_at", desc=True)
                .range(offset, offset + page_size - 1)
                .execute()
            )
            
            total = response.count if response.count is not None else 0
            return response.data or [], total
        except Exception as e:
            logger.error(f"Failed to get all comments: {e}")
            raise RepositoryError(
                "Failed to get all comments",
                original_error=e
            ) from e


# Singleton instances
build_moderation_repository = BuildModerationRepository()
sanction_repository = SanctionRepository()
comments_repository = CommentsRepository()
