"""Serializers for integrations API."""

from rest_framework import serializers

from apps.integrations.models import Integration, SyncLog


class IntegrationSerializer(serializers.ModelSerializer):
    platform_display = serializers.CharField(
        source="get_platform_display", read_only=True
    )

    class Meta:
        model = Integration
        fields = [
            "id",
            "platform",
            "platform_display",
            "account_id",
            "account_name",
            "is_connected",
            "last_sync_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "platform",
            "platform_display",
            "account_id",
            "account_name",
            "is_connected",
            "last_sync_at",
            "created_at",
            "updated_at",
        ]


class SyncLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = SyncLog
        fields = [
            "id",
            "sync_type",
            "status",
            "records_processed",
            "error_message",
            "started_at",
            "completed_at",
        ]
        read_only_fields = fields
