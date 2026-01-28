"""
Storage service layer for build images.

This module contains business logic for handling build image storage.
"""

import logging
from typing import Optional

from builds.repositories.storage import build_storage_repository
from builds.repositories.exceptions import (
    RepositoryError,
    RecordCreationError,
    RecordDeletionError,
)

logger = logging.getLogger(__name__)


class BuildStorageService:
    """
    Service layer for build image storage operations.
    
    Handles image upload validation, processing, and storage.
    """
    
    # Maximum file size in bytes (5MB)
    MAX_FILE_SIZE = 5 * 1024 * 1024
    
    # Allowed content types
    ALLOWED_CONTENT_TYPES = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
        "image/webp",
    ]
    
    def __init__(self, storage_repo=None):
        self.storage_repo = storage_repo or build_storage_repository
    
    def _validate_base64_size(self, base64_data: str) -> bool:
        """
        Validate that the base64 data doesn't exceed max file size.
        
        Base64 encoding increases size by ~33%, so we account for that.
        """
        # Remove data URL prefix if present
        if "," in base64_data:
            base64_content = base64_data.split(",", 1)[1]
        else:
            base64_content = base64_data
        
        # Calculate approximate decoded size
        # Base64 encodes 3 bytes into 4 characters
        decoded_size = len(base64_content) * 3 / 4
        
        return decoded_size <= self.MAX_FILE_SIZE
    
    def _get_content_type_from_base64(self, base64_data: str) -> Optional[str]:
        """Extract content type from base64 data URL."""
        if base64_data.startswith("data:") and ";" in base64_data:
            return base64_data.split(":")[1].split(";")[0]
        return None
    
    def upload_build_image(
        self,
        image_data: str,
        author_id: str,
    ) -> dict:
        """
        Upload a build image to storage.
        
        Args:
            image_data: Base64-encoded image data (with data URL prefix)
            author_id: The user ID of the build author
            
        Returns:
            Dict with 'success', 'url' or 'error'
        """
        try:
            # Validate input
            if not image_data:
                return {
                    "success": False,
                    "error": "No image data provided",
                }
            
            if not author_id:
                return {
                    "success": False,
                    "error": "Author ID is required",
                }
            
            # Validate content type
            content_type = self._get_content_type_from_base64(image_data)
            if content_type and content_type not in self.ALLOWED_CONTENT_TYPES:
                return {
                    "success": False,
                    "error": f"Invalid image type. Allowed types: {', '.join(self.ALLOWED_CONTENT_TYPES)}",
                }
            
            # Validate file size
            if not self._validate_base64_size(image_data):
                max_mb = self.MAX_FILE_SIZE / (1024 * 1024)
                return {
                    "success": False,
                    "error": f"Image size exceeds maximum allowed size ({max_mb}MB)",
                }
            
            # Upload to storage
            public_url = self.storage_repo.upload_base64_image(
                base64_data=image_data,
                author_id=author_id,
            )
            
            return {
                "success": True,
                "url": public_url,
            }
            
        except RecordCreationError as e:
            logger.error(f"Failed to upload build image: {e}")
            return {
                "success": False,
                "error": "Failed to upload image to storage",
            }
        except Exception as e:
            logger.error(f"Unexpected error uploading build image: {e}")
            return {
                "success": False,
                "error": "An unexpected error occurred",
            }
    
    def delete_build_image(self, image_url: str) -> dict:
        """
        Delete a build image from storage.
        
        Args:
            image_url: The public URL of the image to delete
            
        Returns:
            Dict with 'success' and optional 'error'
        """
        try:
            # Check if this is a storage URL (not an external URL)
            if "supabase" not in image_url or "build-images" not in image_url:
                # Not a storage URL, nothing to delete
                return {"success": True}
            
            success = self.storage_repo.delete_image(image_url)
            return {"success": success}
            
        except RecordDeletionError as e:
            logger.error(f"Failed to delete build image: {e}")
            return {
                "success": False,
                "error": "Failed to delete image from storage",
            }
        except Exception as e:
            logger.error(f"Unexpected error deleting build image: {e}")
            return {
                "success": False,
                "error": "An unexpected error occurred",
            }


# Singleton instance
build_storage_service = BuildStorageService()
