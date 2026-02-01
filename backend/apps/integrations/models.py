"""Integration models for OAuth credentials and sync tracking."""

import secrets
from django.db import models
from django.utils import timezone

from apps.core.models import TimeStampedModel
from apps.core.encryption import encrypt_token, decrypt_token
from apps.accounts.models import Organization, User


class Integration(TimeStampedModel):
    """
    Platform integration with OAuth credentials.
    """

    class Platform(models.TextChoices):
        SALLA = "salla", "Salla"
        SHOPIFY = "shopify", "Shopify"
        META = "meta", "Meta"
        GOOGLE = "google", "Google"
        TIKTOK = "tiktok", "TikTok"
        SNAPCHAT = "snapchat", "Snapchat"

    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="integrations",
    )
    platform = models.CharField(
        max_length=20,
        choices=Platform.choices,
    )

    # OAuth tokens (encrypted)
    _access_token = models.TextField(db_column="access_token")
    _refresh_token = models.TextField(db_column="refresh_token", blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    # Account info
    account_id = models.CharField(max_length=255)
    account_name = models.CharField(max_length=255)

    # Status
    is_connected = models.BooleanField(default=True)
    last_sync_at = models.DateTimeField(null=True, blank=True)

    # Platform-specific metadata
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        verbose_name = "Integration"
        verbose_name_plural = "Integrations"
        unique_together = [("organization", "platform")]
        indexes = [
            models.Index(fields=["platform"]),
            models.Index(fields=["is_connected"]),
            models.Index(fields=["account_id"]),
        ]

    def __str__(self):
        return f"{self.organization.name} - {self.get_platform_display()}"

    @property
    def access_token(self):
        return decrypt_token(self._access_token)

    @access_token.setter
    def access_token(self, value):
        self._access_token = encrypt_token(value)

    @property
    def refresh_token(self):
        if not self._refresh_token:
            return None
        return decrypt_token(self._refresh_token)

    @refresh_token.setter
    def refresh_token(self, value):
        if value:
            self._refresh_token = encrypt_token(value)
        else:
            self._refresh_token = ""

    @property
    def is_token_expired(self):
        if not self.expires_at:
            return False
        return timezone.now() > self.expires_at


class OAuthState(TimeStampedModel):
    """
    OAuth state for multi-tenant OAuth flows.
    """

    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="oauth_states",
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="oauth_states",
    )
    platform = models.CharField(max_length=20)
    state = models.CharField(max_length=255, unique=True, db_index=True)
    expires_at = models.DateTimeField()

    class Meta:
        verbose_name = "OAuth State"
        verbose_name_plural = "OAuth States"

    def __str__(self):
        return f"{self.platform} - {self.state[:8]}..."

    @property
    def is_expired(self):
        return timezone.now() > self.expires_at

    @classmethod
    def create_state(cls, organization, user, platform, expires_in_minutes=10):
        """Create a new OAuth state."""
        state = secrets.token_urlsafe(32)
        expires_at = timezone.now() + timezone.timedelta(minutes=expires_in_minutes)

        oauth_state = cls.objects.create(
            organization=organization,
            user=user,
            platform=platform,
            state=state,
            expires_at=expires_at,
        )
        return oauth_state


class SyncLog(TimeStampedModel):
    """
    Sync history and error tracking.
    """

    class SyncType(models.TextChoices):
        CAMPAIGNS = "campaigns", "Campaigns"
        EVENTS = "events", "Events"
        ORDERS = "orders", "Orders"
        METRICS = "metrics", "Metrics"
        FULL = "full", "Full"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        IN_PROGRESS = "in_progress", "In Progress"
        SUCCESS = "success", "Success"
        FAILED = "failed", "Failed"

    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="sync_logs",
    )
    integration = models.ForeignKey(
        Integration,
        on_delete=models.CASCADE,
        related_name="sync_logs",
    )
    sync_type = models.CharField(
        max_length=20,
        choices=SyncType.choices,
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )
    records_processed = models.IntegerField(default=0)
    error_message = models.TextField(blank=True)
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Sync Log"
        verbose_name_plural = "Sync Logs"
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["started_at"]),
        ]

    def __str__(self):
        return f"{self.integration} - {self.sync_type} ({self.status})"

    def mark_success(self, records_processed=0):
        self.status = self.Status.SUCCESS
        self.records_processed = records_processed
        self.completed_at = timezone.now()
        self.save(update_fields=["status", "records_processed", "completed_at"])

    def mark_failed(self, error_message):
        self.status = self.Status.FAILED
        self.error_message = error_message
        self.completed_at = timezone.now()
        self.save(update_fields=["status", "error_message", "completed_at"])
