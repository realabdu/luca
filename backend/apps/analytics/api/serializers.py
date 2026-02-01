"""Serializers for analytics API."""

from rest_framework import serializers

from apps.analytics.models import DailyMetrics, AdSpendDaily, PerformanceData, PlatformSpend, Metric


class DailyMetricsSerializer(serializers.ModelSerializer):
    class Meta:
        model = DailyMetrics
        fields = [
            "id",
            "date",
            "store_id",
            "revenue",
            "orders_count",
            "average_order_value",
            "new_customers_count",
            "total_spend",
            "spend_by_platform",
            "revenue_by_source",
            "net_profit",
            "roas",
            "mer",
            "net_margin",
            "ncpa",
            "last_sync_at",
            "data_source",
        ]
        read_only_fields = fields


class AdSpendDailySerializer(serializers.ModelSerializer):
    class Meta:
        model = AdSpendDaily
        fields = [
            "id",
            "date",
            "platform",
            "account_id",
            "spend",
            "currency",
            "impressions",
            "clicks",
            "conversions",
            "synced_at",
        ]
        read_only_fields = fields


class PerformanceDataSerializer(serializers.ModelSerializer):
    class Meta:
        model = PerformanceData
        fields = ["id", "date", "revenue", "spend"]
        read_only_fields = fields


class PlatformSpendSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlatformSpend
        fields = ["id", "platform", "percentage", "color"]
        read_only_fields = fields


class MetricSerializer(serializers.ModelSerializer):
    class Meta:
        model = Metric
        fields = [
            "id",
            "label",
            "value",
            "unit",
            "trend",
            "trend_label",
            "icon",
            "trend_type",
            "color",
            "order",
        ]
        read_only_fields = fields


class DashboardSerializer(serializers.Serializer):
    """Dashboard response serializer."""
    metrics = MetricSerializer(many=True)
    performance = PerformanceDataSerializer(many=True)
    platform_spend = PlatformSpendSerializer(many=True)
    daily_metrics = DailyMetricsSerializer(required=False)
