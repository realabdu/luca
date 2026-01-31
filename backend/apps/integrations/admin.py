from django.contrib import admin

from .models import Integration, OAuthState, SyncLog


@admin.register(Integration)
class IntegrationAdmin(admin.ModelAdmin):
    list_display = ["organization", "platform", "account_name", "is_connected", "last_sync_at", "created_at"]
    list_filter = ["platform", "is_connected", "created_at"]
    search_fields = ["organization__name", "account_name", "account_id"]
    ordering = ["-created_at"]
    readonly_fields = ["created_at", "updated_at"]


@admin.register(OAuthState)
class OAuthStateAdmin(admin.ModelAdmin):
    list_display = ["platform", "organization", "user", "expires_at", "created_at"]
    list_filter = ["platform", "created_at"]
    search_fields = ["organization__name", "user__email", "state"]
    ordering = ["-created_at"]
    readonly_fields = ["created_at", "updated_at"]


@admin.register(SyncLog)
class SyncLogAdmin(admin.ModelAdmin):
    list_display = ["integration", "sync_type", "status", "records_processed", "started_at", "completed_at"]
    list_filter = ["sync_type", "status", "started_at"]
    search_fields = ["integration__organization__name", "integration__platform"]
    ordering = ["-started_at"]
    readonly_fields = ["created_at", "updated_at", "started_at"]
