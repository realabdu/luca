"""Attribution models for tracking and events."""

from django.db import models

from apps.core.models import TimeStampedModel
from apps.accounts.models import Organization


class PixelEvent(TimeStampedModel):
    """
    Luca Pixel events for first-party tracking.
    """

    class EventType(models.TextChoices):
        PAGE_VIEW = "page_view", "Page View"
        ADD_TO_CART = "add_to_cart", "Add to Cart"
        BEGIN_CHECKOUT = "begin_checkout", "Begin Checkout"
        PURCHASE = "purchase", "Purchase"

    class AttributionStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        MATCHED = "matched", "Matched"
        UNMATCHED = "unmatched", "Unmatched"

    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="pixel_events",
    )
    store_id = models.CharField(max_length=255, db_index=True)
    event_type = models.CharField(max_length=50)
    timestamp = models.DateTimeField(db_index=True)

    # Session data
    session_id = models.CharField(max_length=255, blank=True, db_index=True)
    session_started_at = models.DateTimeField(null=True, blank=True)
    session_page_views = models.IntegerField(default=0)

    # Attribution data (from click tracking)
    platform = models.CharField(max_length=50, blank=True)  # meta, snapchat, tiktok, google
    click_id = models.CharField(max_length=255, blank=True, db_index=True)  # fbclid, sccid, ttclid, gclid
    click_timestamp = models.DateTimeField(null=True, blank=True)
    landing_page = models.URLField(max_length=2000, blank=True)
    utm_source = models.CharField(max_length=255, blank=True)
    utm_medium = models.CharField(max_length=255, blank=True)
    utm_campaign = models.CharField(max_length=255, blank=True)
    attribution_method = models.CharField(max_length=50, blank=True)  # click_id, utm, referrer, unknown

    # Page data
    page_url = models.URLField(max_length=2000, blank=True)
    page_path = models.CharField(max_length=500, blank=True)
    page_referrer = models.URLField(max_length=2000, blank=True)
    page_title = models.CharField(max_length=500, blank=True)

    # Event-specific data
    event_data = models.JSONField(default=dict, blank=True)

    # For purchase events
    order_id = models.CharField(max_length=255, blank=True, db_index=True)
    order_value = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    customer_email = models.EmailField(blank=True)
    is_new_customer = models.BooleanField(null=True, blank=True)

    # Metadata
    pixel_version = models.CharField(max_length=20, blank=True)
    user_agent = models.TextField(blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)

    # Attribution status
    attribution_status = models.CharField(
        max_length=20,
        choices=AttributionStatus.choices,
        default=AttributionStatus.PENDING,
    )
    matched_order_id = models.CharField(max_length=255, blank=True)
    match_confidence = models.DecimalField(max_digits=3, decimal_places=2, null=True, blank=True)

    class Meta:
        verbose_name = "Pixel Event"
        verbose_name_plural = "Pixel Events"
        indexes = [
            models.Index(fields=["organization"]),
            models.Index(fields=["store_id"]),
            models.Index(fields=["event_type"]),
            models.Index(fields=["timestamp"]),
            models.Index(fields=["session_id"]),
            models.Index(fields=["click_id"]),
            models.Index(fields=["order_id"]),
            models.Index(fields=["attribution_status"]),
            models.Index(fields=["organization", "timestamp"]),
        ]

    def __str__(self):
        return f"{self.event_type} - {self.timestamp}"


class ClickTracking(TimeStampedModel):
    """
    Click tracking data for attribution window matching.
    """

    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="click_tracking",
    )
    store_id = models.CharField(max_length=255, db_index=True)
    platform = models.CharField(max_length=50)  # meta, snapchat, tiktok, google
    click_id = models.CharField(max_length=255, db_index=True)
    timestamp = models.DateTimeField(db_index=True)
    landing_page = models.URLField(max_length=2000)
    referrer = models.URLField(max_length=2000, blank=True)

    # UTM parameters
    utm_source = models.CharField(max_length=255, blank=True)
    utm_medium = models.CharField(max_length=255, blank=True)
    utm_campaign = models.CharField(max_length=255, blank=True)
    utm_content = models.CharField(max_length=255, blank=True)
    utm_term = models.CharField(max_length=255, blank=True)

    # Session info
    session_id = models.CharField(max_length=255, blank=True)

    # Conversion tracking
    converted = models.BooleanField(default=False)
    conversion_order_id = models.CharField(max_length=255, blank=True)
    conversion_timestamp = models.DateTimeField(null=True, blank=True)
    conversion_value = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)

    # Metadata
    user_agent = models.TextField(blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)

    class Meta:
        verbose_name = "Click Tracking"
        verbose_name_plural = "Click Tracking"
        indexes = [
            models.Index(fields=["organization"]),
            models.Index(fields=["store_id"]),
            models.Index(fields=["platform"]),
            models.Index(fields=["click_id"]),
            models.Index(fields=["timestamp"]),
            models.Index(fields=["converted"]),
            models.Index(fields=["organization", "timestamp"]),
        ]

    def __str__(self):
        return f"{self.platform} - {self.click_id}"


class AttributionEvent(TimeStampedModel):
    """
    Attribution events for analytics.
    """

    class Source(models.TextChoices):
        META = "Meta", "Meta"
        GOOGLE = "Google", "Google"
        TIKTOK = "TikTok", "TikTok"
        SNAPCHAT = "Snapchat", "Snapchat"
        X = "X", "X"
        KLAVIYO = "Klaviyo", "Klaviyo"
        SALLA = "salla", "Salla"
        SHOPIFY = "shopify", "Shopify"

    class Status(models.TextChoices):
        PAID = "Paid", "Paid"
        PENDING = "Pending", "Pending"

    class EventType(models.TextChoices):
        PURCHASE = "purchase", "Purchase"
        REFUND = "refund", "Refund"
        ADD_TO_CART = "add_to_cart", "Add to Cart"
        CHECKOUT = "checkout", "Checkout"
        PAGE_VIEW = "page_view", "Page View"

    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="attribution_events",
    )
    timestamp = models.DateTimeField(db_index=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    source = models.CharField(max_length=50, choices=Source.choices)
    campaign = models.CharField(max_length=500, blank=True)
    creative_url = models.URLField(max_length=2000, blank=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )

    # Event details
    event_type = models.CharField(
        max_length=20,
        choices=EventType.choices,
        blank=True,
    )
    event_id = models.CharField(max_length=255, blank=True, db_index=True)
    order_id = models.CharField(max_length=255, blank=True, db_index=True)
    currency = models.CharField(max_length=3, default="SAR")
    customer_email = models.EmailField(blank=True)
    customer_id = models.CharField(max_length=255, blank=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        verbose_name = "Attribution Event"
        verbose_name_plural = "Attribution Events"
        indexes = [
            models.Index(fields=["organization"]),
            models.Index(fields=["source"]),
            models.Index(fields=["timestamp"]),
            models.Index(fields=["status"]),
            models.Index(fields=["order_id"]),
            models.Index(fields=["event_id"]),
            models.Index(fields=["organization", "timestamp"]),
        ]

    def __str__(self):
        return f"{self.source} - {self.amount} ({self.status})"
