from django.contrib import admin

from .models import Campaign


@admin.register(Campaign)
class CampaignAdmin(admin.ModelAdmin):
    list_display = ["name", "organization", "platform", "status", "spend", "revenue", "roas", "last_sync_at"]
    list_filter = ["platform", "status", "created_at"]
    search_fields = ["name", "external_id", "organization__name"]
    ordering = ["-created_at"]
    readonly_fields = ["created_at", "updated_at"]
