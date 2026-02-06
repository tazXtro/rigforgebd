"""
Builds service layer for business logic.

This module contains all business logic for builds management.
Follows clean architecture principles:
    - Orchestrates repository calls
    - Catches and handles repository exceptions
    - Contains business rules and workflows
    - No HTTP logic (no request objects, no Response returns)
    - No direct Supabase access
"""

import logging
import json
from typing import Optional, List
from datetime import datetime

from builds.repositories.supabase import (
    builds_repository,
    build_votes_repository,
    build_comments_repository,
)
from builds.repositories.exceptions import (
    RepositoryError,
    RecordNotFoundError,
    RecordCreationError,
    RecordUpdateError,
)
from users.repositories.supabase import user_repository

logger = logging.getLogger(__name__)


class BuildsService:
    """
    Service layer for builds management business logic.
    
    Handles build CRUD, voting, and commenting operations with
    business rules and validation.
    """
    
    def __init__(
        self,
        builds_repo=None,
        votes_repo=None,
        comments_repo=None,
        users_repo=None,
    ):
        self.builds_repo = builds_repo or builds_repository
        self.votes_repo = votes_repo or build_votes_repository
        self.comments_repo = comments_repo or build_comments_repository
        self.users_repo = users_repo or user_repository
    
    def _format_build(self, build: dict, user_id: Optional[str] = None) -> dict:
        """
        Format a build for API response.
        
        Transforms the raw database record into the expected API format,
        including author information and user's vote status.
        """
        # Extract author info from joined data
        author_data = build.get("users", {}) or {}
        
        # Parse components if returned as string (JSONB should return as dict/list)
        components = build.get("components", [])
        if isinstance(components, str):
            try:
                components = json.loads(components)
            except (json.JSONDecodeError, TypeError):
                components = []
        
        formatted = {
            "id": build["id"],
            "title": build["title"],
            "description": build["description"],
            "imageUrl": build["image_url"],
            "buildDate": build["build_date"],
            "createdAt": build["created_at"],
            "updatedAt": build.get("updated_at"),
            "author": {
                "id": author_data.get("id") or build["author_id"],
                "username": author_data.get("username") or author_data.get("display_name") or "Anonymous",
                "avatarUrl": author_data.get("avatar_url"),
            },
            "components": components,
            "totalPrice": float(build.get("total_price", 0)),
            "isFeatured": build.get("is_featured", False),
            "commentsEnabled": build.get("comments_enabled", True),
            "upvotes": build.get("upvotes_count", 0),
            "downvotes": build.get("downvotes_count", 0),
            "commentCount": build.get("comments_count", 0),
            "userVote": None,
            "approvalStatus": build.get("approval_status", "approved"),
            "rejectionReason": build.get("rejection_reason"),
        }
        
        # Get user's vote status if user_id provided
        if user_id:
            try:
                vote = self.votes_repo.get_user_vote(build["id"], user_id)
                if vote:
                    formatted["userVote"] = vote["vote_type"]
            except RepositoryError:
                pass  # Ignore vote lookup errors
        
        return formatted
    
    def _format_comment(self, comment: dict) -> dict:
        """Format a comment for API response."""
        author_data = comment.get("users", {}) or {}
        
        return {
            "id": comment["id"],
            "buildId": comment["build_id"],
            "authorId": author_data.get("id") or comment["author_id"],
            "authorUsername": author_data.get("username") or author_data.get("display_name") or "Anonymous",
            "authorAvatar": author_data.get("avatar_url"),
            "content": comment["content"],
            "createdAt": comment["created_at"],
            "updatedAt": comment.get("updated_at"),
        }
    
    # ==================== Build CRUD ====================
    
    def get_builds(
        self,
        page: int = 1,
        page_size: int = 12,
        sort_by: str = "newest",
        featured_only: bool = False,
        search: Optional[str] = None,
        user_id: Optional[str] = None,
        approval_status: Optional[str] = "approved",  # Default to approved for public
    ) -> dict:
        """
        Get paginated list of builds.
        
        Args:
            page: Page number (1-indexed)
            page_size: Number of items per page
            sort_by: Sort order - 'newest', 'popular', 'mostVoted'
            featured_only: If True, only return featured builds
            search: Optional search term
            user_id: Optional current user ID for vote status
            
        Returns:
            Dict with builds list, total count, page, and pageSize
        """
        try:
            builds, total = self.builds_repo.get_all(
                page=page,
                page_size=page_size,
                sort_by=sort_by,
                featured_only=featured_only,
                search=search,
                approval_status=approval_status,
            )
            
            formatted_builds = [self._format_build(b, user_id) for b in builds]
            
            return {
                "builds": formatted_builds,
                "total": total,
                "page": page,
                "pageSize": page_size,
            }
        except RepositoryError as e:
            logger.error(f"Failed to get builds: {e}")
            return {
                "builds": [],
                "total": 0,
                "page": page,
                "pageSize": page_size,
            }
    
    def get_build_by_id(self, build_id: str, user_id: Optional[str] = None) -> Optional[dict]:
        """
        Get a single build by ID.
        
        Args:
            build_id: The build's UUID
            user_id: Optional current user ID for vote status
            
        Returns:
            Formatted build dict or None if not found
        """
        try:
            build = self.builds_repo.get_by_id(build_id)
            if not build:
                return None
            return self._format_build(build, user_id)
        except RepositoryError as e:
            logger.error(f"Failed to get build {build_id}: {e}")
            return None
    
    def get_featured_builds(self, limit: int = 6, user_id: Optional[str] = None) -> List[dict]:
        """
        Get featured builds.
        
        Args:
            limit: Maximum number of builds to return
            user_id: Optional current user ID for vote status
            
        Returns:
            List of formatted builds
        """
        try:
            builds = self.builds_repo.get_featured(limit=limit)
            return [self._format_build(b, user_id) for b in builds]
        except RepositoryError as e:
            logger.error(f"Failed to get featured builds: {e}")
            return []
    
    def create_build(
        self,
        title: str,
        description: str,
        image_url: str,
        build_date: str,
        components: list,
        total_price: float,
        author_email: str,
        comments_enabled: bool = True,
    ) -> Optional[dict]:
        """
        Create a new build.
        
        Args:
            title: Build title
            description: Build description
            image_url: URL to build image
            build_date: Date the PC was built
            components: List of components
            total_price: Total price of the build
            author_email: Email of the author (to lookup user ID)
            comments_enabled: Whether comments are enabled
            
        Returns:
            Created build or None on failure
        """
        try:
            # Lookup author by email
            author = self.users_repo.get_by_email(author_email)
            if not author:
                logger.error(f"Author not found for email: {author_email}")
                return None
            
            # Prepare build data
            # Note: Supabase JSONB handles Python dicts/lists natively - don't json.dumps()
            build_data = {
                "title": title,
                "description": description,
                "image_url": image_url,
                "build_date": build_date,
                "components": components,  # JSONB handles Python lists directly
                "total_price": total_price,
                "author_id": author["id"],
                "comments_enabled": comments_enabled,
                "approval_status": "pending",  # New builds require approval
            }
            
            # Create the build
            created_build = self.builds_repo.create(build_data)
            
            # Fetch the full build with author info
            full_build = self.builds_repo.get_by_id(created_build["id"])
            return self._format_build(full_build) if full_build else None
            
        except RecordCreationError as e:
            logger.error(f"Failed to create build: {e}")
            return None
        except RepositoryError as e:
            logger.error(f"Database error creating build: {e}")
            return None
    
    def update_build(
        self,
        build_id: str,
        author_email: str,
        **update_fields,
    ) -> Optional[dict]:
        """
        Update an existing build.
        
        Only the author can update their build.
        
        Args:
            build_id: The build's UUID
            author_email: Email of the user attempting the update
            **update_fields: Fields to update
            
        Returns:
            Updated build or None on failure
        """
        try:
            # Verify the build exists and get current data
            current_build = self.builds_repo.get_by_id(build_id)
            if not current_build:
                logger.error(f"Build not found: {build_id}")
                return None
            
            # Verify ownership
            author = self.users_repo.get_by_email(author_email)
            if not author or author["id"] != current_build["author_id"]:
                logger.error(f"User {author_email} not authorized to update build {build_id}")
                return None
            
            # Prepare update data (convert camelCase to snake_case)
            update_data = {}
            field_mapping = {
                "title": "title",
                "description": "description",
                "imageUrl": "image_url",
                "buildDate": "build_date",
                "commentsEnabled": "comments_enabled",
                "components": "components",
                "totalPrice": "total_price",
            }
            
            for camel, snake in field_mapping.items():
                if camel in update_fields:
                    value = update_fields[camel]
                    if camel == "components" and isinstance(value, list):
                        value = json.dumps(value)
                    update_data[snake] = value
            
            if not update_data:
                return self._format_build(current_build)
            
            # Perform update
            self.builds_repo.update(build_id, update_data)
            
            # Fetch and return updated build
            updated_build = self.builds_repo.get_by_id(build_id)
            return self._format_build(updated_build) if updated_build else None
            
        except RecordNotFoundError:
            return None
        except (RecordUpdateError, RepositoryError) as e:
            logger.error(f"Failed to update build {build_id}: {e}")
            return None
    
    def delete_build(self, build_id: str, author_email: str) -> bool:
        """
        Delete a build.
        
        Only the author can delete their build.
        
        Args:
            build_id: The build's UUID
            author_email: Email of the user attempting deletion
            
        Returns:
            True if deleted, False otherwise
        """
        try:
            # Verify the build exists
            current_build = self.builds_repo.get_by_id(build_id)
            if not current_build:
                return False
            
            # Verify ownership
            author = self.users_repo.get_by_email(author_email)
            if not author or author["id"] != current_build["author_id"]:
                logger.error(f"User {author_email} not authorized to delete build {build_id}")
                return False
            
            return self.builds_repo.delete(build_id)
            
        except RepositoryError as e:
            logger.error(f"Failed to delete build {build_id}: {e}")
            return False
    
    # ==================== Voting ====================
    
    def vote_on_build(
        self,
        build_id: str,
        user_email: str,
        vote_type: str,
    ) -> Optional[dict]:
        """
        Vote on a build.
        
        Args:
            build_id: The build's UUID
            user_email: Email of the voting user
            vote_type: 'upvote' or 'downvote'
            
        Returns:
            Updated build or None on failure
        """
        if vote_type not in ("upvote", "downvote"):
            logger.error(f"Invalid vote type: {vote_type}")
            return None
        
        try:
            # Lookup user
            user = self.users_repo.get_by_email(user_email)
            if not user:
                logger.error(f"User not found for email: {user_email}")
                return None
            
            # Check if user is sanctioned
            sanctioned, sanction = self._is_user_sanctioned(user["id"])
            if sanctioned:
                logger.warning(f"Sanctioned user {user_email} attempted to vote")
                return {
                    "sanctioned": True,
                    "sanction_type": sanction.get("sanction_type") if sanction else None,
                    "expires_at": sanction.get("expires_at") if sanction else None,
                    "reason": sanction.get("reason") if sanction else None,
                }
            
            # Verify build exists
            build = self.builds_repo.get_by_id(build_id)
            if not build:
                logger.error(f"Build not found: {build_id}")
                return None
            
            # Create or update vote
            self.votes_repo.create_or_update_vote(str(build_id), str(user["id"]), vote_type)
            
            # Return updated build
            updated_build = self.builds_repo.get_by_id(build_id)
            return self._format_build(updated_build, user["id"]) if updated_build else None
            
        except (RecordCreationError, RepositoryError) as e:
            logger.error(f"Failed to vote on build {build_id}: {e}")
            return None
    
    def remove_vote(self, build_id: str, user_email: str) -> Optional[dict]:
        """
        Remove a vote from a build.
        
        Args:
            build_id: The build's UUID
            user_email: Email of the user removing their vote
            
        Returns:
            Updated build or None on failure
        """
        try:
            # Lookup user
            user = self.users_repo.get_by_email(user_email)
            if not user:
                logger.error(f"User not found for email: {user_email}")
                return None
            
            # Delete the vote
            self.votes_repo.delete_vote(build_id, user["id"])
            
            # Return updated build
            updated_build = self.builds_repo.get_by_id(build_id)
            return self._format_build(updated_build, user["id"]) if updated_build else None
            
        except RepositoryError as e:
            logger.error(f"Failed to remove vote from build {build_id}: {e}")
            return None
    
    # ==================== Comments ====================
    
    def get_comments(
        self,
        build_id: str,
        page: int = 1,
        page_size: int = 20,
    ) -> dict:
        """
        Get comments for a build.
        
        Args:
            build_id: The build's UUID
            page: Page number (1-indexed)
            page_size: Number of items per page
            
        Returns:
            Dict with comments list, total count, page, and pageSize
        """
        try:
            comments, total = self.comments_repo.get_by_build_id(
                build_id, page=page, page_size=page_size
            )
            
            formatted_comments = [self._format_comment(c) for c in comments]
            
            return {
                "comments": formatted_comments,
                "total": total,
                "page": page,
                "pageSize": page_size,
            }
        except RepositoryError as e:
            logger.error(f"Failed to get comments for build {build_id}: {e}")
            return {
                "comments": [],
                "total": 0,
                "page": page,
                "pageSize": page_size,
            }
    
    def create_comment(
        self,
        build_id: str,
        author_email: str,
        content: str,
    ) -> Optional[dict]:
        """
        Create a comment on a build.
        
        Args:
            build_id: The build's UUID
            author_email: Email of the comment author
            content: Comment content
            
        Returns:
            Created comment or None on failure
        """
        try:
            # Verify build exists and has comments enabled
            build = self.builds_repo.get_by_id(build_id)
            if not build:
                logger.error(f"Build not found: {build_id}")
                return None
            
            if not build.get("comments_enabled", True):
                logger.error(f"Comments disabled for build: {build_id}")
                return None
            
            # Lookup author
            author = self.users_repo.get_by_email(author_email)
            if not author:
                logger.error(f"Author not found for email: {author_email}")
                return None
            
            # Check if user is sanctioned
            sanctioned, sanction = self._is_user_sanctioned(author["id"])
            if sanctioned:
                logger.warning(f"Sanctioned user {author_email} attempted to comment")
                return {
                    "sanctioned": True,
                    "sanction_type": sanction.get("sanction_type") if sanction else None,
                    "expires_at": sanction.get("expires_at") if sanction else None,
                    "reason": sanction.get("reason") if sanction else None,
                }
            
            # Create comment
            comment_data = {
                "build_id": str(build_id),
                "author_id": str(author["id"]),
                "content": content,
            }
            
            created_comment = self.comments_repo.create(comment_data)
            
            # Format with author info
            created_comment["users"] = {
                "id": str(author["id"]),
                "username": author.get("username") or author.get("display_name") or "Anonymous",
                "display_name": author.get("display_name"),
                "avatar_url": author.get("avatar_url"),
            }
            
            return self._format_comment(created_comment)
            
        except RecordCreationError as e:
            logger.error(f"Failed to create comment: {e}")
            return None
        except RepositoryError as e:
            logger.error(f"Database error creating comment: {e}")
            return None
    
    def update_comment(
        self,
        comment_id: str,
        author_email: str,
        content: str,
    ) -> Optional[dict]:
        """
        Update a comment.
        
        Only the author can update their comment.
        
        Args:
            comment_id: The comment's UUID
            author_email: Email of the user attempting update
            content: New comment content
            
        Returns:
            Updated comment or None on failure
        """
        try:
            # Get current comment
            current_comment = self.comments_repo.get_by_id(comment_id)
            if not current_comment:
                return None
            
            # Verify ownership
            author = self.users_repo.get_by_email(author_email)
            if not author or author["id"] != current_comment["author_id"]:
                logger.error(f"User {author_email} not authorized to update comment {comment_id}")
                return None
            
            # Update
            updated = self.comments_repo.update(comment_id, content)
            
            # Add author info for formatting
            updated["users"] = {
                "id": str(author["id"]),
                "username": author.get("username") or author.get("display_name") or "Anonymous",
                "display_name": author.get("display_name"),
                "avatar_url": author.get("avatar_url"),
            }
            
            return self._format_comment(updated)
            
        except (RecordNotFoundError, RecordUpdateError, RepositoryError) as e:
            logger.error(f"Failed to update comment {comment_id}: {e}")
            return None
    
    def delete_comment(self, comment_id: str, user_email: str) -> bool:
        """
        Delete a comment.
        
        Only the author can delete their comment.
        
        Args:
            comment_id: The comment's UUID
            user_email: Email of the user attempting deletion
            
        Returns:
            True if deleted, False otherwise
        """
        try:
            # Get current comment
            current_comment = self.comments_repo.get_by_id(comment_id)
            if not current_comment:
                return False
            
            # Verify ownership
            user = self.users_repo.get_by_email(user_email)
            if not user or user["id"] != current_comment["author_id"]:
                logger.error(f"User {user_email} not authorized to delete comment {comment_id}")
                return False
            
            return self.comments_repo.delete(comment_id)
            
        except RepositoryError as e:
            logger.error(f"Failed to delete comment {comment_id}: {e}")
            return False


    def _is_user_sanctioned(self, user_id: str) -> tuple:
        """
        Check if a user is currently sanctioned.
        
        Args:
            user_id: The user's UUID
            
        Returns:
            Tuple of (is_sanctioned, sanction_details)
        """
        try:
            from rigadmin.services import user_moderation_service
            return user_moderation_service.is_user_sanctioned(user_id)
        except Exception as e:
            logger.error(f"Error checking user sanction: {e}")
            return False, None  # Allow action if check fails


# Singleton instance
builds_service = BuildsService()
