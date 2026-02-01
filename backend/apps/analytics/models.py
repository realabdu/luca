"""Analytics models for metrics and performance data."""

from django.db import models

from apps.core.models import TimeStampedModel
from apps.accounts.models import Organization


class DailyMetrics(TimeStampedModel):
    """
    Cached daily metrics for dashboard.
    Aggregates revenue, spend, and calculated KPIs.
    """

    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="daily_metrics",
    )
    date = models.DateField(db_index=True)
    store_id = models.CharField(max_length=255, blank=True, db_index=True)

    # Revenue data (from e-commerce)
    revenue = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    orders_count = models.IntegerField(default=0)
    average_order_value = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    new_customers_count = models.IntegerField(default=0)

    # Ad spend data (aggregated from all platforms)
    total_spend = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    spend_by_platform = models.JSONField(default=dict, blank=True)

    # Revenue breakdown by source (salla, shopify, etc.)
    revenue_by_source = models.JSONField(default=dict, blank=True)

    # Calculated metrics
    net_profit = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    roas = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    mer = models.DecimalField(max_digits=8, decimal_places=2, default=0)  # Marketing Efficiency Ratio
    net_margin = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    ncpa = models.DecimalField(max_digits=10, decimal_places=2, default=0)  # New Customer Acquisition Cost

    # Sync metadata
    last_sync_at = models.DateTimeField(auto_now=True)
    data_source = models.CharField(max_length=20, default="live")

    class Meta:
        verbose_name = "Daily Metrics"
        verbose_name_plural = "Daily Metrics"
        unique_together = [("organization", "date", "store_id")]
        indexes = [
            models.Index(fields=["organization"]),
            models.Index(fields=["date"]),
            models.Index(fields=["organization", "date"]),
        ]

    def __str__(self):
        return f"{self.organization.name} - {self.date}"


class AdSpendDaily(TimeStampedModel):
    """
    Daily ad spend per platform for detailed breakdown.
    """

    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="ad_spend_daily",
    )
    date = models.DateField(db_index=True)
    platform = models.CharField(max_length=50)
    account_id = models.CharField(max_length=255)

    # Spend data
    spend = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    currency = models.CharField(max_length=3, default="SAR")

    # Performance metrics
    impressions = models.BigIntegerField(default=0)
    clicks = models.BigIntegerField(default=0)
    conversions = models.IntegerField(default=0)

    # Sync metadata
    synced_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Ad Spend Daily"
        verbose_name_plural = "Ad Spend Daily"
        unique_together = [("organization", "date", "platform", "account_id")]
        indexes = [
            models.Index(fields=["organization"]),
            models.Index(fields=["date"]),
            models.Index(fields=["platform", "date"]),
            models.Index(fields=["account_id", "date"]),
            models.Index(fields=["organization", "date"]),
        ]

    def __str__(self):
        return f"{self.platform} - {self.date} - {self.spend}"


class PerformanceData(TimeStampedModel):
    """
    Performance data for charts.
    """

    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="performance_data",
    )
    date = models.DateField(db_index=True)
    revenue = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    spend = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    class Meta:
        verbose_name = "Performance Data"
        verbose_name_plural = "Performance Data"
        unique_together = [("organization", "date")]
        indexes = [
            models.Index(fields=["organization"]),
            models.Index(fields=["date"]),
            models.Index(fields=["organization", "date"]),
        ]

    def __str__(self):
        return f"{self.organization.name} - {self.date}"


class PlatformSpend(TimeStampedModel):
    """
    Platform-level spend distribution for pie charts.
    """

    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="platform_spend",
    )
    platform = models.CharField(max_length=50)
    percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    color = models.CharField(max_length=20, default="#000000")

    class Meta:
        verbose_name = "Platform Spend"
        verbose_name_plural = "Platform Spend"
        unique_together = [("organization", "platform")]
        indexes = [
            models.Index(fields=["organization"]),
        ]

    def __str__(self):
        return f"{self.organization.name} - {self.platform}: {self.percentage}%"


class Metric(TimeStampedModel):
    """
    UI metric cards for dashboard display.
    """

    class TrendType(models.TextChoices):
        UP = "up", "Up"
        DOWN = "down", "Down"
        NEUTRAL = "neutral", "Neutral"

    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="metrics",
    )
    label = models.CharField(max_length=100)
    value = models.CharField(max_length=100)
    unit = models.CharField(max_length=20, blank=True)
    trend = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    trend_label = models.CharField(max_length=100)
    icon = models.CharField(max_length=50)
    trend_type = models.CharField(
        max_length=10,
        choices=TrendType.choices,
        default=TrendType.NEUTRAL,
    )
    color = models.CharField(max_length=20, blank=True)
    order = models.IntegerField(default=0)

    class Meta:
        verbose_name = "Metric"
        verbose_name_plural = "Metrics"
        indexes = [
            models.Index(fields=["organization"]),
            models.Index(fields=["order"]),
        ]

    def __str__(self):
        return f"{self.organization.name} - {self.label}: {self.value}"
