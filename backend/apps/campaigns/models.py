"""Campaign models."""

from django.db import models

from apps.core.models import TimeStampedModel
from apps.accounts.models import Organization


class Campaign(TimeStampedModel):
    """
    Campaign data synced from ad platforms.
    """

    class Platform(models.TextChoices):
        META = "Meta", "Meta"
        GOOGLE = "Google", "Google"
        TIKTOK = "TikTok", "TikTok"
        SNAPCHAT = "Snapchat", "Snapchat"
        X = "X", "X"
        KLAVIYO = "Klaviyo", "Klaviyo"

    class Status(models.TextChoices):
        ACTIVE = "Active", "Active"
        PAUSED = "Paused", "Paused"
        LEARNING = "Learning", "Learning"
        INACTIVE = "Inactive", "Inactive"

    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="campaigns",
    )
    external_id = models.CharField(max_length=255, db_index=True)
    name = models.CharField(max_length=500)
    platform = models.CharField(
        max_length=20,
        choices=Platform.choices,
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.INACTIVE,
    )

    # Metrics
    spend = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    revenue = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    roas = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    cpa = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    impressions = models.BigIntegerField(default=0)
    clicks = models.BigIntegerField(default=0)
    conversions = models.IntegerField(default=0)

    last_sync_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Campaign"
        verbose_name_plural = "Campaigns"
        unique_together = [("organization", "external_id")]
        indexes = [
            models.Index(fields=["organization"]),
            models.Index(fields=["platform"]),
            models.Index(fields=["status"]),
            models.Index(fields=["external_id"]),
            models.Index(fields=["organization", "platform"]),
        ]

    def __str__(self):
        return f"{self.name} ({self.platform})"
