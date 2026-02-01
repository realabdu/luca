"""Views for analytics API."""

from datetime import date, timedelta

from django.utils import timezone
from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.permissions import (
    IsOrganizationMember,
    OrganizationRequiredMixin,
    get_request_organization,
)
from apps.analytics.models import (
    DailyMetrics,
    PerformanceData,
    PlatformSpend,
    Metric,
)
from .serializers import (
    DailyMetricsSerializer,
    PerformanceDataSerializer,
    PlatformSpendSerializer,
    MetricSerializer,
)


def parse_date(date_str: str, default: date) -> date:
    """Parse a date string in YYYY-MM-DD format, returning default on failure."""
    if not date_str:
        return default
    try:
        return timezone.datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        return default


class DailyMetricsViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for daily metrics."""

    serializer_class = DailyMetricsSerializer
    permission_classes = [IsOrganizationMember]

    def get_queryset(self):
        organization = get_request_organization(self.request)
        if not organization:
            return DailyMetrics.objects.none()

        queryset = DailyMetrics.objects.filter(organization=organization)

        start_date = self.request.query_params.get("start_date")
        end_date = self.request.query_params.get("end_date")

        if start_date:
            queryset = queryset.filter(date__gte=start_date)
        if end_date:
            queryset = queryset.filter(date__lte=end_date)

        return queryset.order_by("-date")


class DashboardView(OrganizationRequiredMixin, APIView):
    """Dashboard API endpoint returning metrics, performance data, and platform spend."""

    permission_classes = [IsOrganizationMember]

    def get(self, request):
        organization, error_response = self.get_organization_or_error(request)
        if error_response:
            return error_response

        # Parse date range with defaults
        today = timezone.now().date()
        default_start = today - timedelta(days=30)

        start_date = parse_date(request.query_params.get("start_date"), default_start)
        end_date = parse_date(request.query_params.get("end_date"), today)

        # Fetch all data for the organization
        metrics = Metric.objects.filter(organization=organization).order_by("order")
        performance = PerformanceData.objects.filter(
            organization=organization,
            date__gte=start_date,
            date__lte=end_date,
        ).order_by("date")
        platform_spend = PlatformSpend.objects.filter(organization=organization)
        today_metrics = DailyMetrics.objects.filter(
            organization=organization,
            date=end_date,
        ).first()

        return Response({
            "metrics": MetricSerializer(metrics, many=True).data,
            "performance": PerformanceDataSerializer(performance, many=True).data,
            "platform_spend": PlatformSpendSerializer(platform_spend, many=True).data,
            "daily_metrics": DailyMetricsSerializer(today_metrics).data if today_metrics else None,
            "date_range": {
                "start_date": str(start_date),
                "end_date": str(end_date),
            },
        })
