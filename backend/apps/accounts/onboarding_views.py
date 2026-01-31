"""Onboarding API views."""

from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.permissions import IsOrganizationMember, IsOrganizationAdmin
from apps.integrations.models import Integration


class OnboardingStatusView(APIView):
    """Get onboarding status for the current organization."""

    permission_classes = [IsOrganizationMember]

    def get(self, request):
        organization = request.organization
        if not organization:
            return Response(
                {"error": "No organization context"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Get connected integrations
        integrations = Integration.objects.filter(
            organization=organization,
            is_connected=True,
        ).values_list("platform", flat=True)

        has_store = any(p in ["salla", "shopify"] for p in integrations)
        has_ads = any(p in ["meta", "google", "tiktok", "snapchat"] for p in integrations)

        return Response({
            "status": organization.onboarding_status,
            "completed_at": organization.onboarding_completed_at,
            "has_store_connected": has_store,
            "has_ads_connected": has_ads,
            "connected_integrations": list(integrations),
        })


class CompleteOnboardingView(APIView):
    """Mark onboarding as complete."""

    permission_classes = [IsOrganizationAdmin]

    def post(self, request):
        organization = request.organization
        if not organization:
            return Response(
                {"error": "No organization context"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        organization.onboarding_status = "completed"
        organization.onboarding_completed_at = timezone.now()
        organization.save(update_fields=["onboarding_status", "onboarding_completed_at", "updated_at"])

        return Response({
            "status": "completed",
            "completed_at": organization.onboarding_completed_at,
        })
