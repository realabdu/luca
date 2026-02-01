"""Serializers for campaigns API."""

from rest_framework import serializers

from apps.campaigns.models import Campaign


class CampaignSerializer(serializers.ModelSerializer):
    # Convert Decimal fields to float for frontend compatibility
    spend = serializers.FloatField()
    revenue = serializers.FloatField()
    roas = serializers.FloatField()
    cpa = serializers.FloatField()

    class Meta:
        model = Campaign
        fields = [
            "id",
            "external_id",
            "name",
            "platform",
            "status",
            "spend",
            "revenue",
            "roas",
            "cpa",
            "impressions",
            "clicks",
            "conversions",
            "last_sync_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields
