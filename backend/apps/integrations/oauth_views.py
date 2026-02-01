"""OAuth views for platform connections."""

import logging

from django.shortcuts import redirect
from django.conf import settings
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.permissions import IsOrganizationMember, OrganizationRequiredMixin
from apps.integrations.services.oauth import OAuthService
from apps.integrations.models import Integration

logger = logging.getLogger(__name__)

# Platform categories for onboarding status transitions
STORE_PLATFORMS = {"salla", "shopify"}
AD_PLATFORMS = {"meta", "google", "tiktok", "snapchat"}


class OAuthConnectView(OrganizationRequiredMixin, APIView):
    """Start OAuth flow for a platform."""

    permission_classes = [IsOrganizationMember]

    def get(self, request, platform):
        """Generate authorization URL and redirect."""
        organization, error_response = self.get_organization_or_error(request)
        if error_response:
            return error_response

        try:
            oauth_service = OAuthService(platform)
            shop = request.query_params.get("shop")  # For Shopify

            auth_url = oauth_service.get_authorization_url(
                organization=organization,
                user=request.user,
                shop=shop,
            )

            return Response({"authorization_url": auth_url})
        except ValueError as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )


class OAuthCallbackView(APIView):
    """Handle OAuth callback from platforms."""

    # Callbacks don't require auth - they come from the OAuth provider
    permission_classes = []
    authentication_classes = []

    def get(self, request, platform):
        """Process OAuth callback."""
        code = request.query_params.get("code")
        state = request.query_params.get("state")
        error = request.query_params.get("error")
        shop = request.query_params.get("shop")  # For Shopify

        if error:
            logger.error(f"OAuth error for {platform}: {error}")
            return redirect(f"{settings.FRONTEND_URL}/integrations?error={error}")

        if not code or not state:
            return redirect(f"{settings.FRONTEND_URL}/integrations?error=missing_params")

        try:
            oauth_service = OAuthService(platform)
            result = oauth_service.exchange_code(
                code=code,
                state=state,
                shop=shop,
            )

            organization = result["organization"]
            tokens = result["tokens"]

            # Get account info (platform-specific)
            account_id = self._extract_account_id(platform, tokens)
            account_name = self._extract_account_name(platform, tokens, shop)

            # Create/update integration
            integration = oauth_service.create_integration(
                organization=organization,
                tokens=tokens,
                account_id=account_id,
                account_name=account_name,
                metadata={"shop": shop} if shop else None,
            )

            # Update organization onboarding status
            self._update_onboarding_status(organization, platform)

            return redirect(f"{settings.FRONTEND_URL}/integrations?connected={platform}")

        except ValueError as e:
            logger.error(f"OAuth callback error for {platform}: {e}")
            return redirect(f"{settings.FRONTEND_URL}/integrations?error={str(e)}")
        except Exception as e:
            logger.exception(f"Unexpected OAuth error for {platform}")
            return redirect(f"{settings.FRONTEND_URL}/integrations?error=unexpected_error")

    def _extract_account_id(self, platform: str, tokens: dict) -> str:
        """Extract account ID from tokens response."""
        extractors = {
            "salla": lambda t: t.get("user", {}).get("merchant", {}).get("id", ""),
            "shopify": lambda t: t.get("shop", ""),
            "meta": lambda t: t.get("ad_accounts", [{}])[0].get("id", ""),
            "google": lambda t: t.get("customer_id", ""),
            "tiktok": lambda t: str(t.get("advertiser_ids", [""])[0]),
            "snapchat": lambda t: t.get("organization_id", ""),
        }
        extractor = extractors.get(platform)
        return extractor(tokens) if extractor else ""

    def _extract_account_name(self, platform: str, tokens: dict, shop: str = None) -> str:
        """Extract account name from tokens response."""
        extractors = {
            "salla": lambda t: t.get("user", {}).get("merchant", {}).get("name", "Salla Store"),
            "shopify": lambda t: shop or "Shopify Store",
            "meta": lambda t: t.get("ad_accounts", [{}])[0].get("name", "Meta Ads Account"),
            "google": lambda t: t.get("descriptive_name", "Google Ads Account"),
            "tiktok": lambda t: t.get("advertiser_name", "TikTok Ads Account"),
            "snapchat": lambda t: t.get("organization_name", "Snapchat Ads Account"),
        }
        extractor = extractors.get(platform)
        return extractor(tokens) if extractor else f"{platform.title()} Account"

    def _update_onboarding_status(self, organization, platform: str) -> None:
        """Update organization onboarding status based on connected platform."""
        current_status = organization.onboarding_status

        if platform in STORE_PLATFORMS and current_status == "pending":
            organization.onboarding_status = "store_connected"
            organization.save(update_fields=["onboarding_status", "updated_at"])
        elif platform in AD_PLATFORMS and current_status in ("pending", "store_connected"):
            organization.onboarding_status = "ads_connected"
            organization.save(update_fields=["onboarding_status", "updated_at"])
