"""Onboarding API views."""

from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.permissions import (
    IsOrganizationMember,
    IsOrganizationAdmin,
    OrganizationRequiredMixin,
)
from apps.integrations.models import Integration


STORE_PLATFORMS = {"salla", "shopify"}
ADS_PLATFORMS = {"meta", "google", "tiktok", "snapchat"}


class OnboardingStatusView(OrganizationRequiredMixin, APIView):
    """Get onboarding status for the current organization."""

    permission_classes = [IsOrganizationMember]

    def get(self, request):
        organization, error_response = self.get_organization_or_error(request)
        if error_response:
            return error_response

        integrations = set(
            Integration.objects.filter(
                organization=organization,
                is_connected=True,
            ).values_list("platform", flat=True)
        )

        return Response({
            "status": organization.onboarding_status,
            "completed_at": organization.onboarding_completed_at,
            "has_store_connected": bool(integrations & STORE_PLATFORMS),
            "has_ads_connected": bool(integrations & ADS_PLATFORMS),
            "connected_integrations": list(integrations),
        })


class CompleteOnboardingView(OrganizationRequiredMixin, APIView):
    """Mark onboarding as complete."""

    permission_classes = [IsOrganizationAdmin]

    def post(self, request):
        organization, error_response = self.get_organization_or_error(request)
        if error_response:
            return error_response

        organization.onboarding_status = "completed"
        organization.onboarding_completed_at = timezone.now()
        organization.save(update_fields=["onboarding_status", "onboarding_completed_at", "updated_at"])

        return Response({
            "status": "completed",
            "completed_at": organization.onboarding_completed_at,
        })
