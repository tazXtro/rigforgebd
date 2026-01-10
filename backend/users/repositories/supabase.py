"""
User repository for Supabase data access.

This module handles all direct Supabase queries for user data.
Follows clean architecture principles:
    - Only raw data access (select, insert, update, delete)
    - Returns dictionaries/lists, never domain objects
    - No business logic
    - No HTTP logic
"""

from typing import Optional


class UserRepository:
    """
    Repository for user data persistence in Supabase.
    
    All methods return raw data (dicts/lists) and handle only
    database operations. Business logic belongs in services.py.
    
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
        """
        response = (
            self.client
            .table(self.TABLE_NAME)
            .select("*")
            .eq("email", email)
            .maybe_single()
            .execute()
        )
        return response.data
    
    def get_by_id(self, user_id: str) -> Optional[dict]:
        """
        Retrieve a user by their ID.
        
        Args:
            user_id: The user's UUID
            
        Returns:
            User data dict or None if not found
        """
        response = (
            self.client
            .table(self.TABLE_NAME)
            .select("*")
            .eq("id", user_id)
            .maybe_single()
            .execute()
        )
        return response.data
    
    def create(self, user_data: dict) -> dict:
        """
        Create a new user in the database.
        
        Args:
            user_data: Dict containing user fields (email, display_name, avatar_url)
            
        Returns:
            The created user data including generated ID and timestamps
        """
        response = (
            self.client
            .table(self.TABLE_NAME)
            .insert(user_data)
            .execute()
        )
        return response.data[0] if response.data else None
    
    def update(self, email: str, update_data: dict) -> Optional[dict]:
        """
        Update an existing user by email.
        
        Args:
            email: The user's email address
            update_data: Dict containing fields to update
            
        Returns:
            The updated user data or None if not found
        """
        response = (
            self.client
            .table(self.TABLE_NAME)
            .update(update_data)
            .eq("email", email)
            .execute()
        )
        return response.data[0] if response.data else None
    
    def delete(self, email: str) -> bool:
        """
        Delete a user by email.
        
        Args:
            email: The user's email address
            
        Returns:
            True if deleted, False if not found
        """
        response = (
            self.client
            .table(self.TABLE_NAME)
            .delete()
            .eq("email", email)
            .execute()
        )
        return len(response.data) > 0 if response.data else False


# Lazy singleton - only created when first used
user_repository = UserRepository()

