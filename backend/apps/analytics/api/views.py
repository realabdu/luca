"""Views for analytics API."""

from datetime import timedelta

from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.permissions import IsOrganizationMember
from apps.analytics.models import (
    DailyMetrics,
    AdSpendDaily,
    PerformanceData,
    PlatformSpend,
    Metric,
)
from .serializers import (
    DailyMetricsSerializer,
    AdSpendDailySerializer,
    PerformanceDataSerializer,
    PlatformSpendSerializer,
    MetricSerializer,
)


class DailyMetricsViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for daily metrics.
    """

    serializer_class = DailyMetricsSerializer
    permission_classes = [IsOrganizationMember]

    def get_queryset(self):
        organization = self.request.organization
        if not organization:
            return DailyMetrics.objects.none()

        queryset = DailyMetrics.objects.filter(organization=organization)

        # Filter by date range
        start_date = self.request.query_params.get("start_date")
        end_date = self.request.query_params.get("end_date")

        if start_date:
            queryset = queryset.filter(date__gte=start_date)
        if end_date:
            queryset = queryset.filter(date__lte=end_date)

        return queryset.order_by("-date")


class DashboardView(APIView):
    """
    Dashboard API endpoint.
    Returns all metrics, performance data, and platform spend.
    """

    permission_classes = [IsOrganizationMember]

    def get(self, request):
        organization = request.organization
        if not organization:
            return Response(
                {"error": "No organization context"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Get date range from params or default to last 30 days
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=30)

        start_date_param = request.query_params.get("start_date")
        end_date_param = request.query_params.get("end_date")

        if start_date_param:
            try:
                start_date = timezone.datetime.strptime(start_date_param, "%Y-%m-%d").date()
            except ValueError:
                pass

        if end_date_param:
            try:
                end_date = timezone.datetime.strptime(end_date_param, "%Y-%m-%d").date()
            except ValueError:
                pass

        # Get metrics cards
        metrics = Metric.objects.filter(
            organization=organization
        ).order_by("order")

        # Get performance data for chart
        performance = PerformanceData.objects.filter(
            organization=organization,
            date__gte=start_date,
            date__lte=end_date,
        ).order_by("date")

        # Get platform spend distribution
        platform_spend = PlatformSpend.objects.filter(
            organization=organization
        )

        # Get today's metrics
        today_metrics = DailyMetrics.objects.filter(
            organization=organization,
            date=end_date,
        ).first()

        data = {
            "metrics": MetricSerializer(metrics, many=True).data,
            "performance": PerformanceDataSerializer(performance, many=True).data,
            "platform_spend": PlatformSpendSerializer(platform_spend, many=True).data,
            "daily_metrics": DailyMetricsSerializer(today_metrics).data if today_metrics else None,
            "date_range": {
                "start_date": str(start_date),
                "end_date": str(end_date),
            },
        }

        return Response(data)
