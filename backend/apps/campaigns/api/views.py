"""Views for campaigns API."""

from django_filters import rest_framework as filters
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.core.permissions import IsOrganizationMember
from apps.campaigns.models import Campaign
from .serializers import CampaignSerializer


class CampaignFilter(filters.FilterSet):
    platform = filters.ChoiceFilter(choices=Campaign.Platform.choices)
    status = filters.ChoiceFilter(choices=Campaign.Status.choices)

    class Meta:
        model = Campaign
        fields = ["platform", "status"]


class CampaignViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing campaigns.
    """

    serializer_class = CampaignSerializer
    permission_classes = [IsOrganizationMember]
    filterset_class = CampaignFilter

    def get_queryset(self):
        """Return campaigns for the current organization."""
        organization = self.request.organization
        if not organization:
            return Campaign.objects.none()
        return Campaign.objects.filter(organization=organization).order_by("-spend")

    @action(detail=False, methods=["post"])
    def sync(self, request):
        """Trigger campaign sync for all connected ad platforms."""
        organization = request.organization
        if not organization:
            return Response(
                {"error": "No organization context"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # TODO: Trigger async sync task
        return Response({"status": "sync_triggered"})
