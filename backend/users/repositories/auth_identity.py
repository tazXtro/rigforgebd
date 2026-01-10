"""
Auth identity repository for Supabase data access.

This module handles all direct Supabase queries for auth identity data.
Auth identities link external provider user IDs (e.g., Clerk) to internal users.

Follows clean architecture principles:
    - Only raw data access (select, insert, update, delete)
    - Returns dictionaries/lists, never domain objects
    - Raises custom exceptions on errors
    - No business logic
    - No HTTP logic
"""

import logging
from typing import Optional, List

from users.repositories.exceptions import (
    RepositoryError,
    RecordCreationError,
    RecordDeletionError,
)

logger = logging.getLogger(__name__)


class AuthIdentityRepository:
    """
    Repository for auth identity persistence in Supabase.
    
    Auth identities map external provider IDs (e.g., Clerk user_xxx)
    to internal user UUIDs.
    
    Raises:
        RepositoryError: On database connection or query errors
        RecordCreationError: When insert operations fail
        RecordDeletionError: When delete operations fail
    """
    
    TABLE_NAME = "auth_identities"
    _client = None
    
    @property
    def client(self):
        """Lazy-load the Supabase client on first access."""
        if self._client is None:
            from core.infrastructure.supabase.client import get_supabase_client
            self._client = get_supabase_client()
        return self._client
    
    def get_by_provider_id(
        self,
        provider: str,
        provider_user_id: str,
    ) -> Optional[dict]:
        """
        Retrieve an auth identity by provider and external user ID.
        
        Args:
            provider: The auth provider name (e.g., 'clerk', 'google')
            provider_user_id: The external provider's user ID
            
        Returns:
            Auth identity data dict or None if not found
            
        Raises:
            RepositoryError: On database query failure
        """
        try:
            response = (
                self.client
                .table(self.TABLE_NAME)
                .select("*")
                .eq("provider", provider)
                .eq("provider_user_id", provider_user_id)
                .maybe_single()
                .execute()
            )
            return response.data if response else None
        except Exception as e:
            logger.error(
                f"Failed to fetch identity for {provider}:{provider_user_id}: {e}"
            )
            raise RepositoryError(
                f"Failed to fetch auth identity for {provider}:{provider_user_id}",
                original_error=e
            ) from e
    
    def get_by_user_id(self, user_id: str) -> List[dict]:
        """
        Retrieve all auth identities for a user.
        
        Args:
            user_id: The internal user's UUID
            
        Returns:
            List of auth identity dicts (may be empty)
            
        Raises:
            RepositoryError: On database query failure
        """
        try:
            response = (
                self.client
                .table(self.TABLE_NAME)
                .select("*")
                .eq("user_id", user_id)
                .execute()
            )
            return response.data if response and response.data else []
        except Exception as e:
            logger.error(f"Failed to fetch identities for user '{user_id}': {e}")
            raise RepositoryError(
                f"Failed to fetch auth identities for user: {user_id}",
                original_error=e
            ) from e
    
    def create(
        self,
        user_id: str,
        provider: str,
        provider_user_id: str,
    ) -> dict:
        """
        Create a new auth identity linking a provider to a user.
        
        Args:
            user_id: The internal user's UUID
            provider: The auth provider name (e.g., 'clerk')
            provider_user_id: The external provider's user ID
            
        Returns:
            The created auth identity data
            
        Raises:
            RecordCreationError: When insert operation fails
        """
        try:
            identity_data = {
                "user_id": user_id,
                "provider": provider,
                "provider_user_id": provider_user_id,
            }
            response = (
                self.client
                .table(self.TABLE_NAME)
                .insert(identity_data)
                .execute()
            )
            if response and response.data:
                logger.info(
                    f"Created auth identity: {provider}:{provider_user_id} -> {user_id}"
                )
                return response.data[0]
            raise RecordCreationError(
                f"Insert returned no data for {provider}:{provider_user_id}"
            )
        except RecordCreationError:
            raise
        except Exception as e:
            logger.error(f"Failed to create auth identity: {e}")
            raise RecordCreationError(
                f"Failed to create auth identity for {provider}:{provider_user_id}",
                original_error=e
            ) from e
    
    def delete(self, provider: str, provider_user_id: str) -> bool:
        """
        Delete an auth identity by provider and external ID.
        
        Args:
            provider: The auth provider name
            provider_user_id: The external provider's user ID
            
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
                .eq("provider", provider)
                .eq("provider_user_id", provider_user_id)
                .execute()
            )
            deleted = len(response.data) > 0 if response and response.data else False
            if deleted:
                logger.info(f"Deleted auth identity: {provider}:{provider_user_id}")
            return deleted
        except Exception as e:
            logger.error(
                f"Failed to delete identity {provider}:{provider_user_id}: {e}"
            )
            raise RecordDeletionError(
                f"Failed to delete auth identity: {provider}:{provider_user_id}",
                original_error=e
            ) from e


# Lazy singleton - only created when first used
auth_identity_repository = AuthIdentityRepository()
