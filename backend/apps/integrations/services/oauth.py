"""OAuth service for platform integrations."""

import logging
from dataclasses import dataclass
from typing import Optional
from urllib.parse import urlencode

import httpx
from django.conf import settings
from django.utils import timezone

from apps.accounts.models import Organization, User
from apps.integrations.models import Integration, OAuthState

logger = logging.getLogger(__name__)


@dataclass
class OAuthConfig:
    """OAuth configuration for a platform."""
    client_id: str
    client_secret: str
    authorize_url: str
    token_url: str
    scopes: list[str]
    redirect_uri: str


class OAuthService:
    """Service for handling OAuth flows."""

    PLATFORM_CONFIGS = {
        "salla": {
            "authorize_url": "https://accounts.salla.sa/oauth2/auth",
            "token_url": "https://accounts.salla.sa/oauth2/token",
            "scopes": ["offline_access"],
        },
        "shopify": {
            "authorize_url": "https://{shop}.myshopify.com/admin/oauth/authorize",
            "token_url": "https://{shop}.myshopify.com/admin/oauth/access_token",
            "scopes": ["read_orders", "read_products", "read_customers"],
        },
        "meta": {
            "authorize_url": "https://www.facebook.com/v18.0/dialog/oauth",
            "token_url": "https://graph.facebook.com/v18.0/oauth/access_token",
            "scopes": ["ads_read", "business_management"],
        },
        "google": {
            "authorize_url": "https://accounts.google.com/o/oauth2/v2/auth",
            "token_url": "https://oauth2.googleapis.com/token",
            "scopes": ["https://www.googleapis.com/auth/adwords"],
        },
        "tiktok": {
            "authorize_url": "https://business-api.tiktok.com/open_api/v1.3/oauth/authorize/",
            "token_url": "https://business-api.tiktok.com/open_api/v1.3/oauth/access_token/",
            "scopes": ["advertiser.basic.read", "advertiser.report.read"],
        },
        "snapchat": {
            "authorize_url": "https://accounts.snapchat.com/login/oauth2/authorize",
            "token_url": "https://accounts.snapchat.com/login/oauth2/access_token",
            "scopes": ["snapchat-marketing-api"],
        },
    }

    def __init__(self, platform: str):
        self.platform = platform
        self.config = self._get_config()

    def _get_config(self) -> OAuthConfig:
        """Get OAuth configuration for the platform."""
        platform_config = self.PLATFORM_CONFIGS.get(self.platform)
        if not platform_config:
            raise ValueError(f"Unsupported platform: {self.platform}")

        # Get credentials from settings
        client_id = getattr(settings, f"{self.platform.upper()}_CLIENT_ID", "")
        client_secret = getattr(settings, f"{self.platform.upper()}_CLIENT_SECRET", "")

        # Use API URL for OAuth callbacks - callback goes directly to Django
        redirect_uri = f"{settings.API_URL}/api/v1/integrations/{self.platform}/callback/"

        return OAuthConfig(
            client_id=client_id,
            client_secret=client_secret,
            authorize_url=platform_config["authorize_url"],
            token_url=platform_config["token_url"],
            scopes=platform_config["scopes"],
            redirect_uri=redirect_uri,
        )

    def get_authorization_url(
        self,
        organization: Organization,
        user: User,
        shop: Optional[str] = None,
    ) -> str:
        """Generate OAuth authorization URL."""
        # Create OAuth state
        oauth_state = OAuthState.create_state(
            organization=organization,
            user=user,
            platform=self.platform,
        )

        # Build authorization URL
        params = {
            "client_id": self.config.client_id,
            "redirect_uri": self.config.redirect_uri,
            "response_type": "code",
            "scope": " ".join(self.config.scopes),
            "state": oauth_state.state,
        }

        authorize_url = self.config.authorize_url
        if self.platform == "shopify" and shop:
            # Normalize shop name - strip .myshopify.com if included
            shop_name = shop.replace(".myshopify.com", "").strip()
            authorize_url = authorize_url.replace("{shop}", shop_name)

        return f"{authorize_url}?{urlencode(params)}"

    def exchange_code(
        self,
        code: str,
        state: str,
        shop: Optional[str] = None,
    ) -> dict:
        """Exchange authorization code for tokens."""
        # Verify state
        try:
            oauth_state = OAuthState.objects.select_related(
                "organization", "user"
            ).get(state=state)
        except OAuthState.DoesNotExist:
            raise ValueError("Invalid OAuth state")

        if oauth_state.is_expired:
            raise ValueError("OAuth state expired")

        # Exchange code for tokens
        token_url = self.config.token_url
        if self.platform == "shopify" and shop:
            # Normalize shop name - strip .myshopify.com if included
            shop_name = shop.replace(".myshopify.com", "").strip()
            token_url = token_url.replace("{shop}", shop_name)

        data = {
            "client_id": self.config.client_id,
            "client_secret": self.config.client_secret,
            "code": code,
            "redirect_uri": self.config.redirect_uri,
            "grant_type": "authorization_code",
        }

        response = httpx.post(token_url, data=data)
        response.raise_for_status()
        tokens = response.json()

        # Clean up OAuth state
        oauth_state.delete()

        return {
            "organization": oauth_state.organization,
            "user": oauth_state.user,
            "tokens": tokens,
        }

    def create_integration(
        self,
        organization: Organization,
        tokens: dict,
        account_id: str,
        account_name: str,
        metadata: Optional[dict] = None,
    ) -> Integration:
        """Create or update integration with tokens."""
        access_token = tokens.get("access_token")
        refresh_token = tokens.get("refresh_token")
        expires_in = tokens.get("expires_in")

        expires_at = None
        if expires_in:
            expires_at = timezone.now() + timezone.timedelta(seconds=expires_in)

        integration, created = Integration.objects.update_or_create(
            organization=organization,
            platform=self.platform,
            defaults={
                "account_id": account_id,
                "account_name": account_name,
                "is_connected": True,
                "expires_at": expires_at,
                "metadata": metadata or {},
            },
        )

        # Set tokens (encrypted)
        integration.access_token = access_token
        if refresh_token:
            integration.refresh_token = refresh_token
        integration.save()

        return integration

    def refresh_tokens(self, integration: Integration) -> bool:
        """Refresh OAuth tokens."""
        if not integration.refresh_token:
            logger.warning(f"No refresh token for {integration}")
            return False

        data = {
            "client_id": self.config.client_id,
            "client_secret": self.config.client_secret,
            "refresh_token": integration.refresh_token,
            "grant_type": "refresh_token",
        }

        try:
            response = httpx.post(self.config.token_url, data=data)
            response.raise_for_status()
            tokens = response.json()

            integration.access_token = tokens.get("access_token")
            if tokens.get("refresh_token"):
                integration.refresh_token = tokens.get("refresh_token")

            expires_in = tokens.get("expires_in")
            if expires_in:
                integration.expires_at = timezone.now() + timezone.timedelta(
                    seconds=expires_in
                )

            integration.save()
            return True

        except Exception as e:
            logger.error(f"Failed to refresh tokens for {integration}: {e}")
            return False
