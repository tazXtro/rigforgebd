"""
Custom exceptions for repository layer.

These exceptions provide a clean separation between data access errors
and business logic. The service layer can catch and handle these
appropriately without knowing the underlying data store details.
"""


class RepositoryError(Exception):
    """Base exception for all repository errors."""
    
    def __init__(self, message: str, original_error: Exception = None):
        self.message = message
        self.original_error = original_error
        super().__init__(self.message)


class DatabaseConnectionError(RepositoryError):
    """Raised when unable to connect to the database."""
    pass


class RecordNotFoundError(RepositoryError):
    """Raised when a requested record does not exist."""
    pass


class RecordCreationError(RepositoryError):
    """Raised when unable to create a new record."""
    pass


class RecordUpdateError(RepositoryError):
    """Raised when unable to update an existing record."""
    pass


class RecordDeletionError(RepositoryError):
    """Raised when unable to delete a record."""
    pass
