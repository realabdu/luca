from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import User, Organization, Membership, APIKey


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ["email", "name", "clerk_id", "is_active", "created_at"]
    list_filter = ["is_active", "is_staff", "created_at"]
    search_fields = ["email", "name", "clerk_id"]
    ordering = ["-created_at"]
    filter_horizontal = []

    fieldsets = (
        (None, {"fields": ("email", "clerk_id")}),
        ("Personal Info", {"fields": ("name", "avatar_url")}),
        (
            "Permissions",
            {"fields": ("is_active", "is_staff", "is_superuser")},
        ),
        ("Timestamps", {"fields": ("created_at", "updated_at")}),
    )
    readonly_fields = ["created_at", "updated_at"]

    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("email", "clerk_id", "name"),
            },
        ),
    )


@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    list_display = ["name", "slug", "clerk_org_id", "onboarding_status", "created_at"]
    list_filter = ["onboarding_status", "created_at"]
    search_fields = ["name", "slug", "clerk_org_id"]
    prepopulated_fields = {"slug": ("name",)}
    ordering = ["-created_at"]
    readonly_fields = ["created_at", "updated_at"]


@admin.register(Membership)
class MembershipAdmin(admin.ModelAdmin):
    list_display = ["user", "organization", "role", "created_at"]
    list_filter = ["role", "created_at"]
    search_fields = ["user__email", "organization__name"]
    ordering = ["-created_at"]
    readonly_fields = ["created_at", "updated_at"]


@admin.register(APIKey)
class APIKeyAdmin(admin.ModelAdmin):
    list_display = ["name", "organization", "key_prefix", "is_revoked", "last_used_at", "created_at"]
    list_filter = ["revoked_at", "created_at"]
    search_fields = ["name", "organization__name", "key_prefix"]
    ordering = ["-created_at"]
    readonly_fields = ["key_hash", "key_prefix", "created_at", "updated_at"]

    def is_revoked(self, obj):
        return obj.is_revoked
    is_revoked.boolean = True
