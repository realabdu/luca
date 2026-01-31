"""Account models for multi-tenant organization management."""

import hashlib
import secrets
from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager

from apps.core.models import TimeStampedModel


class UserManager(BaseUserManager):
    """Custom user manager for Clerk-based authentication."""

    def create_user(self, clerk_id, email, **extra_fields):
        if not clerk_id:
            raise ValueError("Users must have a Clerk ID")
        if not email:
            raise ValueError("Users must have an email address")

        email = self.normalize_email(email)
        user = self.model(clerk_id=clerk_id, email=email, **extra_fields)
        user.save(using=self._db)
        return user


class User(AbstractBaseUser, TimeStampedModel):
    """
    User model synced from Clerk.

    Users are authenticated via Clerk JWTs, so we don't store passwords.
    """

    clerk_id = models.CharField(max_length=255, unique=True, db_index=True)
    email = models.EmailField(max_length=255, unique=True, db_index=True)
    name = models.CharField(max_length=255, blank=True)
    avatar_url = models.URLField(max_length=500, blank=True)

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    is_superuser = models.BooleanField(default=False)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["clerk_id"]

    class Meta:
        verbose_name = "User"
        verbose_name_plural = "Users"
        indexes = [
            models.Index(fields=["clerk_id"]),
            models.Index(fields=["email"]),
        ]

    def __str__(self):
        return self.email

    def has_perm(self, perm, obj=None):
        return self.is_superuser

    def has_module_perms(self, app_label):
        return self.is_superuser


class Organization(TimeStampedModel):
    """
    Organization (tenant) model.

    Each organization represents a separate tenant with its own
    integrations, campaigns, and data.
    """

    class OnboardingStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        STORE_CONNECTED = "store_connected", "Store Connected"
        ADS_CONNECTED = "ads_connected", "Ads Connected"
        COMPLETED = "completed", "Completed"

    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True, db_index=True)
    clerk_org_id = models.CharField(
        max_length=255, unique=True, null=True, blank=True, db_index=True
    )

    settings = models.JSONField(
        default=dict,
        blank=True,
        help_text="Organization settings (timezone, currency, attribution_window)",
    )

    onboarding_status = models.CharField(
        max_length=20,
        choices=OnboardingStatus.choices,
        default=OnboardingStatus.PENDING,
    )
    onboarding_completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Organization"
        verbose_name_plural = "Organizations"
        indexes = [
            models.Index(fields=["slug"]),
            models.Index(fields=["clerk_org_id"]),
            models.Index(fields=["onboarding_status"]),
        ]

    def __str__(self):
        return self.name

    @property
    def timezone(self):
        return self.settings.get("timezone", "UTC")

    @property
    def currency(self):
        return self.settings.get("currency", "SAR")

    @property
    def attribution_window(self):
        return self.settings.get("attribution_window", 7)


class Membership(TimeStampedModel):
    """
    Membership linking users to organizations with role.
    """

    class Role(models.TextChoices):
        ADMIN = "admin", "Admin"
        MEMBER = "member", "Member"

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="memberships",
    )
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="memberships",
    )
    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.MEMBER,
    )

    class Meta:
        verbose_name = "Membership"
        verbose_name_plural = "Memberships"
        unique_together = [("user", "organization")]
        indexes = [
            models.Index(fields=["user"]),
            models.Index(fields=["organization"]),
            models.Index(fields=["user", "organization"]),
        ]

    def __str__(self):
        return f"{self.user.email} - {self.organization.name} ({self.role})"


class APIKey(TimeStampedModel):
    """
    API Key for pixel tracking and webhook authentication.
    """

    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="api_keys",
    )
    name = models.CharField(max_length=255)
    key_hash = models.CharField(max_length=64, unique=True, db_index=True)
    key_prefix = models.CharField(max_length=8)
    permissions = models.JSONField(default=list)
    last_used_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_api_keys",
    )
    revoked_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "API Key"
        verbose_name_plural = "API Keys"
        indexes = [
            models.Index(fields=["organization"]),
            models.Index(fields=["key_hash"]),
        ]

    def __str__(self):
        return f"{self.name} ({self.key_prefix}...)"

    @property
    def is_revoked(self):
        return self.revoked_at is not None

    @classmethod
    def generate_key(cls):
        """Generate a new API key."""
        key = secrets.token_urlsafe(32)
        return key

    @classmethod
    def hash_key(cls, key: str) -> str:
        """Hash an API key for storage."""
        return hashlib.sha256(key.encode()).hexdigest()

    @classmethod
    def create_key(cls, organization, name, created_by, permissions=None):
        """Create a new API key and return both the key and the model."""
        key = cls.generate_key()
        key_hash = cls.hash_key(key)
        key_prefix = key[:8]

        api_key = cls.objects.create(
            organization=organization,
            name=name,
            key_hash=key_hash,
            key_prefix=key_prefix,
            permissions=permissions or [],
            created_by=created_by,
        )

        # Return both the model and the raw key (only shown once)
        return api_key, key

    @classmethod
    def verify_key(cls, key: str):
        """Verify an API key and return the associated APIKey object."""
        key_hash = cls.hash_key(key)
        try:
            api_key = cls.objects.select_related("organization").get(
                key_hash=key_hash,
                revoked_at__isnull=True,
            )
            return api_key
        except cls.DoesNotExist:
            return None
