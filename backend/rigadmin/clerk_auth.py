"""
Clerk JWT authentication utilities.

This module provides functions to verify Clerk JWT tokens using PyJWT
with Clerk's public key (PEM format). It extracts the user's email from
verified token claims for admin authorization.

Security features:
- RS256 signature verification
- Token expiration validation
- Authorized parties (azp) validation
- Not-before (nbf) validation
"""

import logging
from typing import Optional

import jwt
from django.conf import settings

logger = logging.getLogger(__name__)


class ClerkAuthError(Exception):
    """Base exception for Clerk authentication errors."""
    pass


class TokenMissingError(ClerkAuthError):
    """Raised when Authorization header is missing or malformed."""
    pass


class TokenExpiredError(ClerkAuthError):
    """Raised when the JWT token has expired."""
    pass


class TokenInvalidError(ClerkAuthError):
    """Raised when the JWT token is invalid."""
    pass


class UnauthorizedPartyError(ClerkAuthError):
    """Raised when the azp claim doesn't match allowed parties."""
    pass


def get_verified_user_email(request) -> Optional[str]:
    """
    Extract and verify Clerk JWT from request, return user's email.
    
    Extracts the Bearer token from the Authorization header, verifies it
    using Clerk's public key, and returns the user's primary email address.
    
    Args:
        request: Django REST framework request object
        
    Returns:
        The user's email address if token is valid, None otherwise
        
    Note:
        This function catches all exceptions and returns None for invalid tokens.
        Use get_verified_user_email_or_raise() if you need specific error handling.
    """
    try:
        return get_verified_user_email_or_raise(request)
    except ClerkAuthError as e:
        logger.debug(f"Clerk auth failed: {e}")
        return None
    except Exception as e:
        logger.warning(f"Unexpected error during Clerk auth: {e}")
        return None


def get_verified_user_email_or_raise(request) -> str:
    """
    Extract and verify Clerk JWT from request, return user's email or raise.
    
    Same as get_verified_user_email() but raises specific exceptions
    for different error cases instead of returning None.
    
    Args:
        request: Django REST framework request object
        
    Returns:
        The user's email address
        
    Raises:
        TokenMissingError: Authorization header missing or malformed
        TokenExpiredError: JWT token has expired
        TokenInvalidError: JWT token is invalid
        UnauthorizedPartyError: azp claim doesn't match allowed parties
    """
    # Get Authorization header
    auth_header = request.headers.get("Authorization", "")
    
    if not auth_header:
        raise TokenMissingError("Authorization header is missing")
    
    if not auth_header.startswith("Bearer "):
        raise TokenMissingError("Authorization header must start with 'Bearer '")
    
    token = auth_header[7:]  # Remove 'Bearer ' prefix
    
    if not token:
        raise TokenMissingError("Bearer token is empty")
    
    # Get public key from settings
    public_key = getattr(settings, "CLERK_PEM_PUBLIC_KEY", None)
    if not public_key:
        logger.error("CLERK_PEM_PUBLIC_KEY is not configured in settings")
        raise TokenInvalidError("Server authentication not configured")
    
    try:
        # Verify and decode the token
        # leeway accounts for clock skew between Clerk servers and this server
        decoded = jwt.decode(
            token,
            public_key,
            algorithms=["RS256"],
            leeway=60,  # Allow 60 seconds of clock skew
            options={
                "verify_aud": False,  # Clerk doesn't use standard 'aud' claim
                "verify_exp": True,
                "verify_nbf": True,
                "require": ["exp", "sub"],
            }
        )
    except jwt.ExpiredSignatureError:
        raise TokenExpiredError("Token has expired")
    except jwt.InvalidTokenError as e:
        raise TokenInvalidError(f"Invalid token: {e}")
    
    # Validate authorized parties (azp claim) if present
    azp = decoded.get("azp")
    if azp:
        authorized_parties = getattr(settings, "CLERK_AUTHORIZED_PARTIES", [])
        if isinstance(authorized_parties, str):
            authorized_parties = [p.strip() for p in authorized_parties.split(",")]
        
        if authorized_parties and azp not in authorized_parties:
            logger.warning(f"Unauthorized party: {azp}")
            raise UnauthorizedPartyError(f"Unauthorized party: {azp}")
    
    # Extract email from claims
    # Clerk includes email in 'email' claim for users with verified emails
    email = decoded.get("email")
    
    if not email:
        # Fallback: try other possible claim names
        email = decoded.get("primary_email") or decoded.get("email_addresses", [{}])[0].get("email_address")
    
    if not email:
        logger.warning(f"No email found in token claims. Available claims: {list(decoded.keys())}")
        raise TokenInvalidError("Token does not contain email claim")
    
    return email


def get_clerk_user_id(request) -> Optional[str]:
    """
    Extract and verify Clerk JWT, return the Clerk user ID (sub claim).
    
    Args:
        request: Django REST framework request object
        
    Returns:
        The Clerk user ID if token is valid, None otherwise
    """
    try:
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return None
        
        token = auth_header[7:]
        public_key = getattr(settings, "CLERK_PEM_PUBLIC_KEY", None)
        
        if not public_key:
            return None
        
        decoded = jwt.decode(
            token,
            public_key,
            algorithms=["RS256"],
            options={"verify_aud": False}
        )
        
        return decoded.get("sub")
    except Exception:
        return None
