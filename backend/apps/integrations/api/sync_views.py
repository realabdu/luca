"""Sync API views."""

from datetime import timedelta

from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.permissions import (
    IsOrganizationMember,
    OrganizationRequiredMixin,
)
from apps.integrations.models import Integration, SyncLog
from apps.integrations.tasks import sync_orders_for_integration, calculate_daily_metrics_for_org


class SyncTriggerView(OrganizationRequiredMixin, APIView):
    """Trigger a sync for all connected integrations."""

    permission_classes = [IsOrganizationMember]

    def post(self, request):
        organization, error_response = self.get_organization_or_error(request)
        if error_response:
            return error_response

        force = request.data.get("force", False)
        days = request.data.get("days", 30)  # Default to 30 days

        # Get all connected integrations
        integrations = Integration.objects.filter(
            organization=organization,
            is_connected=True,
        )

        if not integrations.exists():
            return Response(
                {"success": False, "message": "No connected integrations found"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Trigger sync for each integration
        synced_count = 0
        for integration in integrations:
            try:
                # Run sync synchronously for immediate feedback
                # Use .run() to call bound task directly with proper self binding
                sync_orders_for_integration.run(integration.id, days=days)
                synced_count += 1
            except Exception as e:
                # Log error but continue with other integrations
                pass

        # Recalculate metrics for all days in the requested range
        # Always calculate even if sync_orders didn't run (e.g., for Salla which uses webhooks)
        today = timezone.now().date()
        for i in range(days):
            target_date = today - timedelta(days=i)
            calculate_daily_metrics_for_org.run(organization.id, str(target_date))

        return Response({
            "success": True,
            "message": f"Synced {synced_count} integration(s)",
        })


class SyncStatusView(OrganizationRequiredMixin, APIView):
    """Get current sync status."""

    permission_classes = [IsOrganizationMember]

    def get(self, request):
        organization, error_response = self.get_organization_or_error(request)
        if error_response:
            return error_response

        # Get latest sync log
        latest_sync = SyncLog.objects.filter(
            organization=organization,
        ).order_by("-started_at").first()

        if not latest_sync:
            return Response({
                "status": "idle",
                "last_sync_at": None,
            })

        # Check if there's a sync in progress
        in_progress = SyncLog.objects.filter(
            organization=organization,
            status=SyncLog.Status.IN_PROGRESS,
        ).exists()

        return Response({
            "status": "running" if in_progress else "idle",
            "last_sync_at": latest_sync.completed_at.isoformat() if latest_sync.completed_at else None,
        })
