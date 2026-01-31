"""Serializers for attribution API."""

from rest_framework import serializers

from apps.attribution.models import PixelEvent, ClickTracking, AttributionEvent


class PixelEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = PixelEvent
        fields = [
            "id",
            "store_id",
            "event_type",
            "timestamp",
            "session_id",
            "platform",
            "click_id",
            "landing_page",
            "utm_source",
            "utm_medium",
            "utm_campaign",
            "page_url",
            "order_id",
            "order_value",
            "attribution_status",
            "match_confidence",
            "created_at",
        ]
        read_only_fields = fields


class PixelEventCreateSerializer(serializers.Serializer):
    """Serializer for creating pixel events (from tracking pixel)."""
    store_id = serializers.CharField()
    event_type = serializers.CharField()
    timestamp = serializers.DateTimeField(required=False)
    session_id = serializers.CharField(required=False, allow_blank=True)
    session_started_at = serializers.DateTimeField(required=False)
    session_page_views = serializers.IntegerField(required=False, default=0)

    # Attribution
    platform = serializers.CharField(required=False, allow_blank=True)
    click_id = serializers.CharField(required=False, allow_blank=True)
    click_timestamp = serializers.DateTimeField(required=False)
    landing_page = serializers.URLField(required=False, allow_blank=True)
    utm_source = serializers.CharField(required=False, allow_blank=True)
    utm_medium = serializers.CharField(required=False, allow_blank=True)
    utm_campaign = serializers.CharField(required=False, allow_blank=True)
    attribution_method = serializers.CharField(required=False, allow_blank=True)

    # Page data
    page_url = serializers.URLField(required=False, allow_blank=True)
    page_path = serializers.CharField(required=False, allow_blank=True)
    page_referrer = serializers.URLField(required=False, allow_blank=True)
    page_title = serializers.CharField(required=False, allow_blank=True)

    # Event data
    event_data = serializers.JSONField(required=False, default=dict)

    # Purchase data
    order_id = serializers.CharField(required=False, allow_blank=True)
    order_value = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    customer_email = serializers.EmailField(required=False, allow_blank=True)
    is_new_customer = serializers.BooleanField(required=False)

    # Metadata
    pixel_version = serializers.CharField(required=False, allow_blank=True)


class ClickTrackingSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClickTracking
        fields = [
            "id",
            "store_id",
            "platform",
            "click_id",
            "timestamp",
            "landing_page",
            "utm_source",
            "utm_medium",
            "utm_campaign",
            "converted",
            "conversion_order_id",
            "conversion_value",
            "created_at",
        ]
        read_only_fields = fields


class AttributionEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = AttributionEvent
        fields = [
            "id",
            "timestamp",
            "amount",
            "source",
            "campaign",
            "status",
            "event_type",
            "event_id",
            "order_id",
            "currency",
            "created_at",
        ]
        read_only_fields = fields
