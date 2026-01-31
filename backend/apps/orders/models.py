"""Order models."""

from django.db import models

from apps.core.models import TimeStampedModel
from apps.accounts.models import Organization


class Order(TimeStampedModel):
    """
    Cached orders from e-commerce platforms (Salla, Shopify).
    This is the ground truth for revenue data.
    """

    class Source(models.TextChoices):
        SALLA = "salla", "Salla"
        ZID = "zid", "Zid"
        SHOPIFY = "shopify", "Shopify"

    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="orders",
    )
    external_id = models.CharField(max_length=255, db_index=True)
    store_id = models.CharField(max_length=255, db_index=True)
    source = models.CharField(
        max_length=20,
        choices=Source.choices,
    )

    # Order details
    order_date = models.DateTimeField(db_index=True)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3, default="SAR")
    status = models.CharField(max_length=50)  # completed, cancelled, refunded, etc.

    # Customer info
    customer_id = models.CharField(max_length=255, blank=True)
    customer_email = models.EmailField(blank=True)
    is_new_customer = models.BooleanField(null=True, blank=True)

    # Attribution (linked from pixel events)
    attributed_platform = models.CharField(max_length=50, blank=True)
    attributed_click_id = models.CharField(max_length=255, blank=True)
    attribution_confidence = models.DecimalField(
        max_digits=3, decimal_places=2, null=True, blank=True
    )

    # Sync metadata
    synced_at = models.DateTimeField(auto_now=True)
    raw_data = models.JSONField(default=dict, blank=True)

    class Meta:
        verbose_name = "Order"
        verbose_name_plural = "Orders"
        unique_together = [("organization", "external_id", "source")]
        indexes = [
            models.Index(fields=["organization"]),
            models.Index(fields=["external_id"]),
            models.Index(fields=["store_id"]),
            models.Index(fields=["order_date"]),
            models.Index(fields=["source"]),
            models.Index(fields=["organization", "order_date"]),
        ]

    def __str__(self):
        return f"{self.external_id} - {self.total_amount} {self.currency}"
