"""Views for campaigns API."""

from django_filters import rest_framework as filters
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.core.permissions import (
    IsOrganizationMember,
    OrganizationRequiredMixin,
    get_request_organization,
)
from apps.campaigns.models import Campaign
from .serializers import CampaignSerializer


class CampaignFilter(filters.FilterSet):
    platform = filters.ChoiceFilter(choices=Campaign.Platform.choices)
    status = filters.ChoiceFilter(choices=Campaign.Status.choices)

    class Meta:
        model = Campaign
        fields = ["platform", "status"]


class CampaignViewSet(OrganizationRequiredMixin, viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing campaigns."""

    serializer_class = CampaignSerializer
    permission_classes = [IsOrganizationMember]
    filterset_class = CampaignFilter

    def get_queryset(self):
        """Return campaigns for the current organization."""
        organization = get_request_organization(self.request)
        if not organization:
            return Campaign.objects.none()
        return Campaign.objects.filter(organization=organization).order_by("-spend")

    @action(detail=False, methods=["post"])
    def sync(self, request):
        """Trigger campaign sync for all connected ad platforms."""
        organization, error_response = self.get_organization_or_error(request)
        if error_response:
            return error_response

        # TODO: Trigger async sync task
        return Response({"status": "sync_triggered"})
