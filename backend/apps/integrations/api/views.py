"""Views for integrations API."""

from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.core.permissions import (
    IsOrganizationMember,
    IsOrganizationAdmin,
    get_request_organization,
)
from apps.integrations.models import Integration, SyncLog
from .serializers import IntegrationSerializer, SyncLogSerializer


class IntegrationViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for managing integrations."""

    serializer_class = IntegrationSerializer
    permission_classes = [IsOrganizationMember]
    pagination_class = None

    def get_queryset(self):
        """Return integrations for the current organization."""
        organization = get_request_organization(self.request)
        if not organization:
            return Integration.objects.none()
        return Integration.objects.filter(organization=organization)

    @action(detail=True, methods=["post"], permission_classes=[IsOrganizationAdmin])
    def disconnect(self, request, pk=None):
        """Disconnect an integration."""
        integration = self.get_object()
        integration.is_connected = False
        integration.save(update_fields=["is_connected", "updated_at"])
        return Response({"status": "disconnected"})

    @action(detail=True, methods=["post"], permission_classes=[IsOrganizationAdmin])
    def sync(self, request, pk=None):
        """Trigger a sync for an integration."""
        integration = self.get_object()

        # Create sync log
        sync_log = SyncLog.objects.create(
            organization=integration.organization,
            integration=integration,
            sync_type=request.data.get("sync_type", "full"),
            status=SyncLog.Status.IN_PROGRESS,
        )

        # TODO: Trigger async sync task
        # For now, mark as pending
        sync_log.status = SyncLog.Status.PENDING
        sync_log.save(update_fields=["status"])

        return Response(SyncLogSerializer(sync_log).data)

    @action(detail=True, methods=["get"])
    def sync_history(self, request, pk=None):
        """Get sync history for an integration."""
        integration = self.get_object()
        sync_logs = SyncLog.objects.filter(
            integration=integration
        ).order_by("-started_at")[:20]
        serializer = SyncLogSerializer(sync_logs, many=True)
        return Response(serializer.data)
