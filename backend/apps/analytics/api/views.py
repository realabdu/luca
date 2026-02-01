"""Views for analytics API."""

from datetime import date, timedelta
from decimal import Decimal

from django.db.models import Sum
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

        # Fetch daily metrics for the date range
        daily_metrics_qs = DailyMetrics.objects.filter(
            organization=organization,
            date__gte=start_date,
            date__lte=end_date,
        ).order_by("date")

        today_metrics = DailyMetrics.objects.filter(
            organization=organization,
            date=end_date,
        ).first()

        # Build performance data from DailyMetrics
        performance_data = [
            {
                "id": dm.id,
                "date": str(dm.date),
                "revenue": float(dm.revenue or 0),
                "spend": float(dm.total_spend or 0),
            }
            for dm in daily_metrics_qs
        ]

        # Calculate aggregate metrics for the period
        aggregates = daily_metrics_qs.aggregate(
            total_revenue=Sum("revenue"),
            total_orders=Sum("orders_count"),
            total_spend=Sum("total_spend"),
            total_new_customers=Sum("new_customers_count"),
        )

        total_revenue = aggregates["total_revenue"] or Decimal("0")
        total_orders = aggregates["total_orders"] or 0
        total_spend = aggregates["total_spend"] or Decimal("0")
        total_new_customers = aggregates["total_new_customers"] or 0

        # Calculate derived metrics
        aov = total_revenue / total_orders if total_orders > 0 else Decimal("0")
        roas = total_revenue / total_spend if total_spend > 0 else Decimal("0")

        # Build metrics cards
        metrics_data = [
            {
                "id": 1,
                "label": "Total Revenue",
                "value": f"{total_revenue:,.0f}",
                "unit": "SAR",
                "trend": 0,
                "trend_label": "",
                "icon": "dollar-sign",
                "trend_type": "neutral",
                "color": "green",
                "order": 1,
            },
            {
                "id": 2,
                "label": "Total Orders",
                "value": str(total_orders),
                "unit": "",
                "trend": 0,
                "trend_label": "",
                "icon": "shopping-cart",
                "trend_type": "neutral",
                "color": "blue",
                "order": 2,
            },
            {
                "id": 3,
                "label": "Average Order Value",
                "value": f"{aov:,.0f}",
                "unit": "SAR",
                "trend": 0,
                "trend_label": "",
                "icon": "trending-up",
                "trend_type": "neutral",
                "color": "purple",
                "order": 3,
            },
            {
                "id": 4,
                "label": "New Customers",
                "value": str(total_new_customers),
                "unit": "",
                "trend": 0,
                "trend_label": "",
                "icon": "users",
                "trend_type": "neutral",
                "color": "orange",
                "order": 4,
            },
        ]

        # Build platform spend breakdown from revenue_by_source
        platform_spend_data = []
        if today_metrics and today_metrics.revenue_by_source:
            total = sum(today_metrics.revenue_by_source.values())
            colors = {"shopify": "#96bf48", "salla": "#004CFF", "other": "#888888"}
            for idx, (platform, amount) in enumerate(today_metrics.revenue_by_source.items()):
                percentage = (amount / total * 100) if total > 0 else 0
                platform_spend_data.append({
                    "id": idx + 1,
                    "platform": platform.capitalize(),
                    "percentage": round(percentage, 1),
                    "color": colors.get(platform.lower(), "#888888"),
                })

        return Response({
            "metrics": metrics_data,
            "performance": performance_data,
            "platform_spend": platform_spend_data,
            "daily_metrics": DailyMetricsSerializer(today_metrics).data if today_metrics else None,
            "date_range": {
                "start_date": str(start_date),
                "end_date": str(end_date),
            },
        })
