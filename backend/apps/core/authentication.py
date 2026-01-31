"""Clerk JWT Authentication for Django REST Framework."""

import logging
from typing import Optional, Tuple

import httpx
import jwt
from django.conf import settings
from django.core.cache import cache
from rest_framework import authentication, exceptions

from apps.accounts.models import User, Organization

logger = logging.getLogger(__name__)

JWKS_CACHE_KEY = "clerk_jwks"
JWKS_CACHE_TTL = 3600  # 1 hour


class ClerkJWTAuthentication(authentication.BaseAuthentication):
    """
    Clerk JWT Authentication.

    Validates JWT tokens from Clerk and returns the corresponding user.
    Also extracts organization context from the token.
    """

    def authenticate(self, request) -> Optional[Tuple[User, dict]]:
        """
        Authenticate the request and return a tuple of (user, auth_info).
        """
        auth_header = request.headers.get("Authorization", "")

        if not auth_header.startswith("Bearer "):
            return None

        token = auth_header[7:]

        try:
            payload = self._verify_token(token)
        except exceptions.AuthenticationFailed:
            raise
        except Exception as e:
            logger.error(f"Token verification failed: {e}")
            raise exceptions.AuthenticationFailed("Invalid token")

        # Extract user info
        clerk_id = payload.get("sub")
        if not clerk_id:
            raise exceptions.AuthenticationFailed("Invalid token: missing sub claim")

        # Get or create user
        user = self._get_or_create_user(clerk_id, payload)

        # Extract organization context
        org_id = payload.get("org_id")
        org_slug = payload.get("org_slug")
        org_role = payload.get("org_role")

        auth_info = {
            "clerk_id": clerk_id,
            "org_id": org_id,
            "org_slug": org_slug,
            "org_role": org_role,
            "token": token,
        }

        # Attach organization to request for later use
        if org_id:
            try:
                organization = Organization.objects.get(clerk_org_id=org_id)
                request.organization = organization
            except Organization.DoesNotExist:
                # Organization might not be synced yet
                request.organization = None
        else:
            request.organization = None

        return (user, auth_info)

    def _verify_token(self, token: str) -> dict:
        """Verify the JWT token using Clerk's JWKS."""
        clerk_domain = settings.CLERK_DOMAIN
        if not clerk_domain:
            raise exceptions.AuthenticationFailed("Clerk domain not configured")

        # Get JWKS
        jwks = self._get_jwks(clerk_domain)

        # Decode token header to get kid
        try:
            unverified_header = jwt.get_unverified_header(token)
        except jwt.exceptions.DecodeError:
            raise exceptions.AuthenticationFailed("Invalid token format")

        kid = unverified_header.get("kid")
        if not kid:
            raise exceptions.AuthenticationFailed("Token missing kid header")

        # Find the matching key
        key = None
        for jwk in jwks.get("keys", []):
            if jwk.get("kid") == kid:
                key = jwt.algorithms.RSAAlgorithm.from_jwk(jwk)
                break

        if not key:
            # Refresh JWKS and try again
            cache.delete(JWKS_CACHE_KEY)
            jwks = self._get_jwks(clerk_domain)
            for jwk in jwks.get("keys", []):
                if jwk.get("kid") == kid:
                    key = jwt.algorithms.RSAAlgorithm.from_jwk(jwk)
                    break

        if not key:
            raise exceptions.AuthenticationFailed("No matching key found")

        # Verify the token
        try:
            payload = jwt.decode(
                token,
                key,
                algorithms=["RS256"],
                options={"verify_aud": False},
            )
        except jwt.ExpiredSignatureError:
            raise exceptions.AuthenticationFailed("Token has expired")
        except jwt.InvalidTokenError as e:
            raise exceptions.AuthenticationFailed(f"Invalid token: {e}")

        return payload

    def _get_jwks(self, clerk_domain: str) -> dict:
        """Get Clerk JWKS, with caching."""
        jwks = cache.get(JWKS_CACHE_KEY)
        if jwks:
            return jwks

        jwks_url = f"https://{clerk_domain}/.well-known/jwks.json"

        try:
            response = httpx.get(jwks_url, timeout=10)
            response.raise_for_status()
            jwks = response.json()
        except Exception as e:
            logger.error(f"Failed to fetch JWKS: {e}")
            raise exceptions.AuthenticationFailed("Failed to fetch JWKS")

        cache.set(JWKS_CACHE_KEY, jwks, JWKS_CACHE_TTL)
        return jwks

    def _get_or_create_user(self, clerk_id: str, payload: dict) -> User:
        """Get or create a user from Clerk data."""
        try:
            user = User.objects.get(clerk_id=clerk_id)
            return user
        except User.DoesNotExist:
            pass

        # Create user from token data
        # Note: Full user sync happens via Clerk webhooks
        email = payload.get("email", f"{clerk_id}@clerk.temp")

        user = User.objects.create(
            clerk_id=clerk_id,
            email=email,
            name=payload.get("name", ""),
        )

        return user
