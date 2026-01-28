"""
Custom exceptions for builds repositories.

These exceptions provide clear error categories for the service layer
to handle appropriately.
"""


class RepositoryError(Exception):
    """Base exception for repository errors."""
    
    def __init__(self, message: str, original_error: Exception = None):
        super().__init__(message)
        self.original_error = original_error


class RecordNotFoundError(RepositoryError):
    """Raised when a record is not found."""
    pass


class RecordCreationError(RepositoryError):
    """Raised when record creation fails."""
    pass


class RecordUpdateError(RepositoryError):
    """Raised when record update fails."""
    pass


class RecordDeletionError(RepositoryError):
    """Raised when record deletion fails."""
    pass


class DuplicateRecordError(RepositoryError):
    """Raised when trying to create a duplicate record."""
    pass
