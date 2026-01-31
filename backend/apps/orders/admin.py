from django.contrib import admin

from .models import Order


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ["external_id", "organization", "source", "total_amount", "currency", "status", "order_date"]
    list_filter = ["source", "status", "order_date"]
    search_fields = ["external_id", "organization__name", "customer_email"]
    ordering = ["-order_date"]
    date_hierarchy = "order_date"
    readonly_fields = ["created_at", "updated_at", "synced_at"]
