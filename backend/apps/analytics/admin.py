from django.contrib import admin

from .models import DailyMetrics, AdSpendDaily, PerformanceData, PlatformSpend, Metric


@admin.register(DailyMetrics)
class DailyMetricsAdmin(admin.ModelAdmin):
    list_display = ["organization", "date", "revenue", "total_spend", "roas", "orders_count"]
    list_filter = ["date", "data_source"]
    search_fields = ["organization__name"]
    ordering = ["-date"]
    date_hierarchy = "date"


@admin.register(AdSpendDaily)
class AdSpendDailyAdmin(admin.ModelAdmin):
    list_display = ["organization", "date", "platform", "spend", "impressions", "clicks"]
    list_filter = ["platform", "date"]
    search_fields = ["organization__name", "platform"]
    ordering = ["-date"]
    date_hierarchy = "date"


@admin.register(PerformanceData)
class PerformanceDataAdmin(admin.ModelAdmin):
    list_display = ["organization", "date", "revenue", "spend"]
    list_filter = ["date"]
    search_fields = ["organization__name"]
    ordering = ["-date"]


@admin.register(PlatformSpend)
class PlatformSpendAdmin(admin.ModelAdmin):
    list_display = ["organization", "platform", "percentage", "color"]
    list_filter = ["platform"]
    search_fields = ["organization__name"]


@admin.register(Metric)
class MetricAdmin(admin.ModelAdmin):
    list_display = ["organization", "label", "value", "trend_type", "order"]
    list_filter = ["trend_type"]
    search_fields = ["organization__name", "label"]
    ordering = ["organization", "order"]
