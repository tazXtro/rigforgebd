"""
Storage repository for Supabase Storage operations.

This module handles all direct Supabase Storage operations for build images.
Follows clean architecture principles:
    - Only storage access (upload, download, delete)
    - Returns URLs/paths, never domain objects
    - Raises custom exceptions on errors
    - No business logic
    - No HTTP logic
"""

import logging
import uuid
import base64
from typing import Optional
from datetime import datetime

from builds.repositories.exceptions import (
    RepositoryError,
    RecordCreationError,
    RecordDeletionError,
)

logger = logging.getLogger(__name__)


class BuildStorageRepository:
    """
    Repository for build image storage in Supabase Storage.
    
    Handles upload, retrieval, and deletion of build images.
    Uses the 'build-images' bucket in Supabase Storage.
    """
    
    BUCKET_NAME = "build-images"
    _client = None
    
    @property
    def client(self):
        """Lazy-load the Supabase client on first access."""
        if self._client is None:
            from core.infrastructure.supabase.client import get_supabase_client
            self._client = get_supabase_client()
        return self._client
    
    def _get_storage_bucket(self):
        """Get the storage bucket instance."""
        return self.client.storage.from_(self.BUCKET_NAME)
    
    def _generate_unique_filename(self, original_filename: str, author_id: str) -> str:
        """
        Generate a unique filename for storage.
        
        Format: {author_id}/{timestamp}_{uuid}.{extension}
        This ensures uniqueness and organizes files by user.
        """
        # Extract extension from original filename
        extension = original_filename.split(".")[-1].lower() if "." in original_filename else "jpg"
        
        # Validate extension
        allowed_extensions = ["jpg", "jpeg", "png", "gif", "webp"]
        if extension not in allowed_extensions:
            extension = "jpg"
        
        # Generate unique filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        unique_id = str(uuid.uuid4())[:8]
        
        return f"{author_id}/{timestamp}_{unique_id}.{extension}"
    
    def upload_image(
        self,
        file_data: bytes,
        original_filename: str,
        author_id: str,
        content_type: str = "image/jpeg",
    ) -> str:
        """
        Upload an image to Supabase Storage.
        
        Args:
            file_data: The image file data as bytes
            original_filename: Original filename for extension detection
            author_id: Author's user ID for organizing files
            content_type: MIME type of the image
            
        Returns:
            The public URL of the uploaded image
            
        Raises:
            RecordCreationError: On upload failure
        """
        try:
            # Generate unique storage path
            storage_path = self._generate_unique_filename(original_filename, author_id)
            
            # Upload to Supabase Storage
            bucket = self._get_storage_bucket()
            response = bucket.upload(
                path=storage_path,
                file=file_data,
                file_options={
                    "content-type": content_type,
                    "upsert": "false",
                }
            )
            
            # Get the public URL
            public_url = bucket.get_public_url(storage_path)
            
            logger.info(f"Successfully uploaded image: {storage_path}")
            return public_url
            
        except Exception as e:
            logger.error(f"Failed to upload image: {e}")
            raise RecordCreationError(
                f"Failed to upload image: {str(e)}",
                original_error=e
            ) from e
    
    def upload_base64_image(
        self,
        base64_data: str,
        author_id: str,
    ) -> str:
        """
        Upload a base64-encoded image to Supabase Storage.
        
        Args:
            base64_data: Base64-encoded image data (with or without data URL prefix)
            author_id: Author's user ID for organizing files
            
        Returns:
            The public URL of the uploaded image
            
        Raises:
            RecordCreationError: On upload failure
        """
        try:
            # Parse base64 data URL if present
            content_type = "image/jpeg"
            extension = "jpg"
            
            if base64_data.startswith("data:"):
                # Extract content type and base64 data
                # Format: data:image/png;base64,iVBORw0KGgo...
                header, base64_content = base64_data.split(",", 1)
                
                # Extract mime type
                if ":" in header and ";" in header:
                    content_type = header.split(":")[1].split(";")[0]
                    
                    # Map content type to extension
                    type_to_ext = {
                        "image/jpeg": "jpg",
                        "image/jpg": "jpg",
                        "image/png": "png",
                        "image/gif": "gif",
                        "image/webp": "webp",
                    }
                    extension = type_to_ext.get(content_type, "jpg")
            else:
                base64_content = base64_data
            
            # Decode base64 to bytes
            file_data = base64.b64decode(base64_content)
            
            # Generate filename and upload
            filename = f"image.{extension}"
            return self.upload_image(file_data, filename, author_id, content_type)
            
        except Exception as e:
            logger.error(f"Failed to upload base64 image: {e}")
            raise RecordCreationError(
                f"Failed to upload base64 image: {str(e)}",
                original_error=e
            ) from e
    
    def delete_image(self, image_url: str) -> bool:
        """
        Delete an image from Supabase Storage.
        
        Args:
            image_url: The public URL of the image to delete
            
        Returns:
            True if deleted successfully, False otherwise
            
        Raises:
            RecordDeletionError: On delete failure
        """
        try:
            # Extract the storage path from the public URL
            # URL format: https://{project}.supabase.co/storage/v1/object/public/build-images/{path}
            if self.BUCKET_NAME not in image_url:
                logger.warning(f"Image URL doesn't contain bucket name: {image_url}")
                return False
            
            # Extract path after bucket name
            bucket_marker = f"{self.BUCKET_NAME}/"
            path_start = image_url.find(bucket_marker)
            if path_start == -1:
                logger.warning(f"Could not extract path from URL: {image_url}")
                return False
            
            storage_path = image_url[path_start + len(bucket_marker):]
            
            # Delete from storage
            bucket = self._get_storage_bucket()
            bucket.remove([storage_path])
            
            logger.info(f"Successfully deleted image: {storage_path}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to delete image: {e}")
            raise RecordDeletionError(
                f"Failed to delete image: {str(e)}",
                original_error=e
            ) from e
    
    def get_signed_url(self, storage_path: str, expires_in: int = 3600) -> Optional[str]:
        """
        Get a signed URL for a private image.
        
        Args:
            storage_path: The path in storage
            expires_in: URL expiration time in seconds (default 1 hour)
            
        Returns:
            Signed URL or None on failure
        """
        try:
            bucket = self._get_storage_bucket()
            response = bucket.create_signed_url(storage_path, expires_in)
            return response.get("signedURL")
        except Exception as e:
            logger.error(f"Failed to get signed URL: {e}")
            return None


# Singleton instance
build_storage_repository = BuildStorageRepository()
