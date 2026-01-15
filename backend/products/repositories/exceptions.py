"""
Custom exceptions for products repositories.

These exceptions provide a clean separation between database errors
and service layer error handling.
"""


class ProductRepositoryError(Exception):
    """Base exception for product repository errors."""
    
    def __init__(self, message: str, original_error: Exception = None):
        super().__init__(message)
        self.message = message
        self.original_error = original_error
    
    def __str__(self):
        if self.original_error:
            return f"{self.message} (Original: {self.original_error})"
        return self.message


class ProductNotFoundError(ProductRepositoryError):
    """Raised when a product is not found."""
    pass


class ProductCreationError(ProductRepositoryError):
    """Raised when product creation fails."""
    pass


class ProductUpdateError(ProductRepositoryError):
    """Raised when product update fails."""
    pass


class RetailerNotFoundError(ProductRepositoryError):
    """Raised when a retailer is not found."""
    pass


class PriceCreationError(ProductRepositoryError):
    """Raised when price record creation fails."""
    pass


class PriceUpdateError(ProductRepositoryError):
    """Raised when price record update fails."""
    pass
