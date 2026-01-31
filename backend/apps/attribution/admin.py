from django.contrib import admin

from .models import PixelEvent, ClickTracking, AttributionEvent


@admin.register(PixelEvent)
class PixelEventAdmin(admin.ModelAdmin):
    list_display = ["organization", "event_type", "timestamp", "platform", "attribution_status"]
    list_filter = ["event_type", "platform", "attribution_status", "timestamp"]
    search_fields = ["organization__name", "session_id", "click_id", "order_id"]
    ordering = ["-timestamp"]
    date_hierarchy = "timestamp"


@admin.register(ClickTracking)
class ClickTrackingAdmin(admin.ModelAdmin):
    list_display = ["organization", "platform", "click_id", "timestamp", "converted"]
    list_filter = ["platform", "converted", "timestamp"]
    search_fields = ["organization__name", "click_id", "session_id"]
    ordering = ["-timestamp"]


@admin.register(AttributionEvent)
class AttributionEventAdmin(admin.ModelAdmin):
    list_display = ["organization", "source", "amount", "status", "timestamp"]
    list_filter = ["source", "status", "event_type", "timestamp"]
    search_fields = ["organization__name", "order_id", "event_id"]
    ordering = ["-timestamp"]
