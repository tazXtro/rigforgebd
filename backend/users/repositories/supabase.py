"""
User repository for Supabase data access.

This module handles all direct Supabase queries for user data.
Follows clean architecture principles:
    - Only raw data access (select, insert, update, delete)
    - Returns dictionaries/lists, never domain objects
    - Raises custom exceptions on errors (service layer handles them)
    - No business logic
    - No HTTP logic
"""

import logging
from typing import Optional

from users.repositories.exceptions import (
    RepositoryError,
    RecordCreationError,
    RecordUpdateError,
    RecordDeletionError,
)

logger = logging.getLogger(__name__)


class UserRepository:
    """
    Repository for user data persistence in Supabase.
    
    All methods return raw data (dicts/lists) and handle only
    database operations. Business logic belongs in services.py.
    
    Raises:
        RepositoryError: On database connection or query errors
        RecordCreationError: When insert operations fail
        RecordUpdateError: When update operations fail
        RecordDeletionError: When delete operations fail
    
    Note: The Supabase client is lazy-loaded on first access to
    avoid import-time errors when env vars are not set.
    """
    
    TABLE_NAME = "users"
    _client = None
    
    @property
    def client(self):
        """Lazy-load the Supabase client on first access."""
        if self._client is None:
            from core.infrastructure.supabase.client import get_supabase_client
            self._client = get_supabase_client()
        return self._client
    
    def get_by_email(self, email: str) -> Optional[dict]:
        """
        Retrieve a user by their email address.
        
        Args:
            email: The user's email address
            
        Returns:
            User data dict or None if not found
            
        Raises:
            RepositoryError: On database query failure
        """
        try:
            response = (
                self.client
                .table(self.TABLE_NAME)
                .select("*")
                .eq("email", email)
                .maybe_single()
                .execute()
            )
            return response.data if response else None
        except Exception as e:
            logger.error(f"Failed to fetch user by email '{email}': {e}")
            raise RepositoryError(
                f"Failed to fetch user by email: {email}",
                original_error=e
            ) from e
    
    def get_by_id(self, user_id: str) -> Optional[dict]:
        """
        Retrieve a user by their ID.
        
        Args:
            user_id: The user's UUID
            
        Returns:
            User data dict or None if not found
            
        Raises:
            RepositoryError: On database query failure
        """
        try:
            response = (
                self.client
                .table(self.TABLE_NAME)
                .select("*")
                .eq("id", user_id)
                .maybe_single()
                .execute()
            )
            return response.data if response else None
        except Exception as e:
            logger.error(f"Failed to fetch user by ID '{user_id}': {e}")
            raise RepositoryError(
                f"Failed to fetch user by ID: {user_id}",
                original_error=e
            ) from e
    
    def create(self, user_data: dict) -> dict:
        """
        Create a new user in the database.
        
        Args:
            user_data: Dict containing user fields (email, display_name, avatar_url)
            
        Returns:
            The created user data including generated ID and timestamps
            
        Raises:
            RecordCreationError: When insert operation fails
        """
        try:
            response = (
                self.client
                .table(self.TABLE_NAME)
                .insert(user_data)
                .execute()
            )
            if response and response.data:
                logger.info(f"Created user with email: {user_data.get('email')}")
                return response.data[0]
            raise RecordCreationError(
                f"Insert returned no data for email: {user_data.get('email')}"
            )
        except RecordCreationError:
            raise
        except Exception as e:
            logger.error(f"Failed to create user: {e}")
            raise RecordCreationError(
                f"Failed to create user with email: {user_data.get('email')}",
                original_error=e
            ) from e
    
    def update(self, email: str, update_data: dict) -> Optional[dict]:
        """
        Update an existing user by email.
        
        Args:
            email: The user's email address
            update_data: Dict containing fields to update
            
        Returns:
            The updated user data or None if not found
            
        Raises:
            RecordUpdateError: When update operation fails
        """
        try:
            response = (
                self.client
                .table(self.TABLE_NAME)
                .update(update_data)
                .eq("email", email)
                .execute()
            )
            if response and response.data:
                logger.info(f"Updated user with email: {email}")
                return response.data[0]
            return None  # User not found
        except Exception as e:
            logger.error(f"Failed to update user '{email}': {e}")
            raise RecordUpdateError(
                f"Failed to update user with email: {email}",
                original_error=e
            ) from e
    
    def delete(self, email: str) -> bool:
        """
        Delete a user by email.
        
        Args:
            email: The user's email address
            
        Returns:
            True if deleted, False if not found
            
        Raises:
            RecordDeletionError: When delete operation fails
        """
        try:
            response = (
                self.client
                .table(self.TABLE_NAME)
                .delete()
                .eq("email", email)
                .execute()
            )
            deleted = len(response.data) > 0 if response and response.data else False
            if deleted:
                logger.info(f"Deleted user with email: {email}")
            return deleted
        except Exception as e:
            logger.error(f"Failed to delete user '{email}': {e}")
            raise RecordDeletionError(
                f"Failed to delete user with email: {email}",
                original_error=e
            ) from e


# Lazy singleton - only created when first used
user_repository = UserRepository()
