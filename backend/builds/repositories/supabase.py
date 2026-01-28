"""
Builds repository for Supabase data access.

This module handles all direct Supabase queries for builds data.
Follows clean architecture principles:
    - Only raw data access (select, insert, update, delete)
    - Returns dictionaries/lists, never domain objects
    - Raises custom exceptions on errors (service layer handles them)
    - No business logic
    - No HTTP logic
"""

import logging
from typing import Optional, List

from builds.repositories.exceptions import (
    RepositoryError,
    RecordNotFoundError,
    RecordCreationError,
    RecordUpdateError,
    RecordDeletionError,
    DuplicateRecordError,
)

logger = logging.getLogger(__name__)


class BuildsRepository:
    """
    Repository for builds data persistence in Supabase.
    
    All methods return raw data (dicts/lists) and handle only
    database operations. Business logic belongs in services.py.
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
    
    def get_by_id(self, build_id: str) -> Optional[dict]:
        """
        Retrieve a build by its ID with author information.
        
        Args:
            build_id: The build's UUID
            
        Returns:
            Build data dict with author info, or None if not found
            
        Raises:
            RepositoryError: On database query failure
        """
        try:
            response = (
                self.client
                .table(self.TABLE_NAME)
                .select("*, users!builds_author_id_fkey(id, email, username, display_name, avatar_url)")
                .eq("id", build_id)
                .maybe_single()
                .execute()
            )
            return response.data if response else None
        except Exception as e:
            logger.error(f"Failed to fetch build by ID '{build_id}': {e}")
            raise RepositoryError(
                f"Failed to fetch build by ID: {build_id}",
                original_error=e
            ) from e
    
    def get_all(
        self,
        page: int = 1,
        page_size: int = 12,
        sort_by: str = "newest",
        featured_only: bool = False,
        search: Optional[str] = None,
        author_id: Optional[str] = None,
    ) -> tuple[List[dict], int]:
        """
        Retrieve all builds with pagination, filtering, and sorting.
        
        Args:
            page: Page number (1-indexed)
            page_size: Number of items per page
            sort_by: Sort order - 'newest', 'popular', 'mostVoted'
            featured_only: If True, only return featured builds
            search: Optional search term for title/description
            author_id: Optional filter by author
            
        Returns:
            Tuple of (list of builds, total count)
            
        Raises:
            RepositoryError: On database query failure
        """
        try:
            # Build base query
            query = self.client.table(self.TABLE_NAME).select(
                "*, users!builds_author_id_fkey(id, email, username, display_name, avatar_url)",
                count="exact"
            )
            
            # Apply filters
            if featured_only:
                query = query.eq("is_featured", True)
            
            if author_id:
                query = query.eq("author_id", author_id)
            
            if search:
                # Search in title and description
                query = query.or_(f"title.ilike.%{search}%,description.ilike.%{search}%")
            
            # Apply sorting
            if sort_by == "popular":
                query = query.order("comments_count", desc=True)
            elif sort_by == "mostVoted":
                # Order by net votes (upvotes - downvotes)
                # Using a computed column or raw query would be better, but for now:
                query = query.order("upvotes_count", desc=True)
            else:  # newest (default)
                query = query.order("created_at", desc=True)
            
            # Apply pagination
            offset = (page - 1) * page_size
            query = query.range(offset, offset + page_size - 1)
            
            response = query.execute()
            
            total = response.count if response.count is not None else 0
            return response.data or [], total
            
        except Exception as e:
            logger.error(f"Failed to fetch builds: {e}")
            raise RepositoryError(
                "Failed to fetch builds",
                original_error=e
            ) from e
    
    def get_featured(self, limit: int = 6) -> List[dict]:
        """
        Retrieve featured builds.
        
        Args:
            limit: Maximum number of builds to return
            
        Returns:
            List of featured builds
            
        Raises:
            RepositoryError: On database query failure
        """
        try:
            response = (
                self.client
                .table(self.TABLE_NAME)
                .select("*, users!builds_author_id_fkey(id, email, username, display_name, avatar_url)")
                .eq("is_featured", True)
                .order("created_at", desc=True)
                .limit(limit)
                .execute()
            )
            return response.data or []
        except Exception as e:
            logger.error(f"Failed to fetch featured builds: {e}")
            raise RepositoryError(
                "Failed to fetch featured builds",
                original_error=e
            ) from e
    
    def create(self, build_data: dict) -> dict:
        """
        Create a new build.
        
        Args:
            build_data: Build data to insert
            
        Returns:
            Created build data
            
        Raises:
            RecordCreationError: On insert failure
        """
        try:
            response = (
                self.client
                .table(self.TABLE_NAME)
                .insert(build_data)
                .execute()
            )
            
            if not response.data:
                raise RecordCreationError("No data returned after insert")
            
            return response.data[0]
        except RecordCreationError:
            raise
        except Exception as e:
            logger.error(f"Failed to create build: {e}")
            raise RecordCreationError(
                "Failed to create build",
                original_error=e
            ) from e
    
    def update(self, build_id: str, update_data: dict) -> dict:
        """
        Update an existing build.
        
        Args:
            build_id: The build's UUID
            update_data: Fields to update
            
        Returns:
            Updated build data
            
        Raises:
            RecordNotFoundError: If build doesn't exist
            RecordUpdateError: On update failure
        """
        try:
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
            logger.error(f"Failed to update build '{build_id}': {e}")
            raise RecordUpdateError(
                f"Failed to update build: {build_id}",
                original_error=e
            ) from e
    
    def delete(self, build_id: str) -> bool:
        """
        Delete a build.
        
        Args:
            build_id: The build's UUID
            
        Returns:
            True if deleted successfully
            
        Raises:
            RecordDeletionError: On delete failure
        """
        try:
            response = (
                self.client
                .table(self.TABLE_NAME)
                .delete()
                .eq("id", build_id)
                .execute()
            )
            return True
        except Exception as e:
            logger.error(f"Failed to delete build '{build_id}': {e}")
            raise RecordDeletionError(
                f"Failed to delete build: {build_id}",
                original_error=e
            ) from e


class BuildVotesRepository:
    """
    Repository for build votes data persistence in Supabase.
    """
    
    TABLE_NAME = "build_votes"
    _client = None
    
    @property
    def client(self):
        """Lazy-load the Supabase client on first access."""
        if self._client is None:
            from core.infrastructure.supabase.client import get_supabase_client
            self._client = get_supabase_client()
        return self._client
    
    def get_user_vote(self, build_id: str, user_id: str) -> Optional[dict]:
        """
        Get a user's vote on a build.
        
        Args:
            build_id: The build's UUID
            user_id: The user's UUID
            
        Returns:
            Vote data or None if not voted
        """
        try:
            response = (
                self.client
                .table(self.TABLE_NAME)
                .select("*")
                .eq("build_id", build_id)
                .eq("user_id", user_id)
                .maybe_single()
                .execute()
            )
            return response.data if response else None
        except Exception as e:
            logger.error(f"Failed to get user vote: {e}")
            raise RepositoryError(
                "Failed to get user vote",
                original_error=e
            ) from e
    
    def create_or_update_vote(self, build_id: str, user_id: str, vote_type: str) -> dict:
        """
        Create or update a vote (upsert).
        
        Args:
            build_id: The build's UUID
            user_id: The user's UUID
            vote_type: 'upvote' or 'downvote'
            
        Returns:
            Vote data
        """
        try:
            response = (
                self.client
                .table(self.TABLE_NAME)
                .upsert({
                    "build_id": build_id,
                    "user_id": user_id,
                    "vote_type": vote_type,
                }, on_conflict="build_id,user_id")
                .execute()
            )
            
            if not response.data:
                raise RecordCreationError("No data returned after upsert")
            
            return response.data[0]
        except RecordCreationError:
            raise
        except Exception as e:
            logger.error(f"Failed to create/update vote: {e}")
            raise RecordCreationError(
                "Failed to create/update vote",
                original_error=e
            ) from e
    
    def delete_vote(self, build_id: str, user_id: str) -> bool:
        """
        Delete a user's vote on a build.
        
        Args:
            build_id: The build's UUID
            user_id: The user's UUID
            
        Returns:
            True if deleted
        """
        try:
            self.client.table(self.TABLE_NAME).delete().eq(
                "build_id", build_id
            ).eq(
                "user_id", user_id
            ).execute()
            return True
        except Exception as e:
            logger.error(f"Failed to delete vote: {e}")
            raise RecordDeletionError(
                "Failed to delete vote",
                original_error=e
            ) from e


class BuildCommentsRepository:
    """
    Repository for build comments data persistence in Supabase.
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
    
    def get_by_build_id(
        self,
        build_id: str,
        page: int = 1,
        page_size: int = 20
    ) -> tuple[List[dict], int]:
        """
        Get comments for a build with pagination.
        
        Args:
            build_id: The build's UUID
            page: Page number (1-indexed)
            page_size: Number of items per page
            
        Returns:
            Tuple of (list of comments with author info, total count)
        """
        try:
            offset = (page - 1) * page_size
            
            response = (
                self.client
                .table(self.TABLE_NAME)
                .select(
                    "*, users!build_comments_author_id_fkey(id, email, username, display_name, avatar_url)",
                    count="exact"
                )
                .eq("build_id", build_id)
                .order("created_at", desc=True)
                .range(offset, offset + page_size - 1)
                .execute()
            )
            
            total = response.count if response.count is not None else 0
            return response.data or [], total
        except Exception as e:
            logger.error(f"Failed to get comments for build '{build_id}': {e}")
            raise RepositoryError(
                f"Failed to get comments for build: {build_id}",
                original_error=e
            ) from e
    
    def create(self, comment_data: dict) -> dict:
        """
        Create a new comment.
        
        Args:
            comment_data: Comment data to insert
            
        Returns:
            Created comment data
        """
        try:
            response = (
                self.client
                .table(self.TABLE_NAME)
                .insert(comment_data)
                .execute()
            )
            
            if not response.data:
                raise RecordCreationError("No data returned after insert")
            
            return response.data[0]
        except RecordCreationError:
            raise
        except Exception as e:
            logger.error(f"Failed to create comment: {e}")
            raise RecordCreationError(
                "Failed to create comment",
                original_error=e
            ) from e
    
    def update(self, comment_id: str, content: str) -> dict:
        """
        Update a comment's content.
        
        Args:
            comment_id: The comment's UUID
            content: New content
            
        Returns:
            Updated comment data
        """
        try:
            response = (
                self.client
                .table(self.TABLE_NAME)
                .update({"content": content})
                .eq("id", comment_id)
                .execute()
            )
            
            if not response.data:
                raise RecordNotFoundError(f"Comment not found: {comment_id}")
            
            return response.data[0]
        except RecordNotFoundError:
            raise
        except Exception as e:
            logger.error(f"Failed to update comment '{comment_id}': {e}")
            raise RecordUpdateError(
                f"Failed to update comment: {comment_id}",
                original_error=e
            ) from e
    
    def delete(self, comment_id: str) -> bool:
        """
        Delete a comment.
        
        Args:
            comment_id: The comment's UUID
            
        Returns:
            True if deleted
        """
        try:
            self.client.table(self.TABLE_NAME).delete().eq("id", comment_id).execute()
            return True
        except Exception as e:
            logger.error(f"Failed to delete comment '{comment_id}': {e}")
            raise RecordDeletionError(
                f"Failed to delete comment: {comment_id}",
                original_error=e
            ) from e
    
    def get_by_id(self, comment_id: str) -> Optional[dict]:
        """
        Get a comment by ID.
        
        Args:
            comment_id: The comment's UUID
            
        Returns:
            Comment data or None
        """
        try:
            response = (
                self.client
                .table(self.TABLE_NAME)
                .select("*")
                .eq("id", comment_id)
                .maybe_single()
                .execute()
            )
            return response.data if response else None
        except Exception as e:
            logger.error(f"Failed to get comment '{comment_id}': {e}")
            raise RepositoryError(
                f"Failed to get comment: {comment_id}",
                original_error=e
            ) from e


# Singleton instances
builds_repository = BuildsRepository()
build_votes_repository = BuildVotesRepository()
build_comments_repository = BuildCommentsRepository()
