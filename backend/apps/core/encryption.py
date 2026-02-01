"""Encryption utilities for sensitive data like OAuth tokens."""

import base64
import logging
from typing import Optional

from cryptography.fernet import Fernet, InvalidToken
from django.conf import settings

logger = logging.getLogger(__name__)


def get_fernet() -> Optional[Fernet]:
    """Get Fernet instance for encryption/decryption."""
    key = settings.ENCRYPTION_KEY
    if not key:
        logger.warning("ENCRYPTION_KEY not set. Token encryption is disabled.")
        return None

    try:
        # First try using the key directly (already base64 format)
        key_bytes = key.encode() if isinstance(key, str) else key
        return Fernet(key_bytes)
    except Exception:
        pass

    try:
        # Key might be in hex format (64 hex chars = 32 bytes)
        # Convert hex to bytes, then base64 encode for Fernet
        if len(key) == 64:
            key_bytes = bytes.fromhex(key)
            key_b64 = base64.urlsafe_b64encode(key_bytes)
            return Fernet(key_b64)
    except Exception as e:
        logger.error(f"Failed to initialize Fernet: {e}")

    return None


def encrypt_token(token: str) -> str:
    """
    Encrypt a token for secure storage.

    Returns the original token if encryption is not configured.
    """
    if not token:
        return token

    fernet = get_fernet()
    if not fernet:
        # If encryption is not configured, return as-is
        # This is for development; production should always have encryption
        return token

    try:
        encrypted = fernet.encrypt(token.encode())
        return base64.urlsafe_b64encode(encrypted).decode()
    except Exception as e:
        logger.error(f"Failed to encrypt token: {e}")
        return token


def decrypt_token(encrypted_token: str) -> str:
    """
    Decrypt an encrypted token.

    Returns the original value if decryption fails or encryption is not configured.
    """
    if not encrypted_token:
        return encrypted_token

    fernet = get_fernet()
    if not fernet:
        # If encryption is not configured, assume token is not encrypted
        return encrypted_token

    try:
        # Try to decode from base64 first
        encrypted_bytes = base64.urlsafe_b64decode(encrypted_token.encode())
        decrypted = fernet.decrypt(encrypted_bytes)
        return decrypted.decode()
    except (InvalidToken, ValueError) as e:
        # Token might not be encrypted (legacy data)
        logger.debug(f"Token decryption failed, returning as-is: {e}")
        return encrypted_token
    except Exception as e:
        logger.error(f"Unexpected error decrypting token: {e}")
        return encrypted_token


def generate_encryption_key() -> str:
    """Generate a new Fernet encryption key."""
    return Fernet.generate_key().decode()
