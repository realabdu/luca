"""Serializers for accounts API."""

from rest_framework import serializers

from apps.accounts.models import User, Organization, Membership, APIKey


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "clerk_id", "email", "name", "avatar_url", "created_at"]
        read_only_fields = ["id", "clerk_id", "created_at"]


class OrganizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = [
            "id",
            "name",
            "slug",
            "clerk_org_id",
            "settings",
            "onboarding_status",
            "onboarding_completed_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "clerk_org_id", "created_at", "updated_at"]


class OrganizationSettingsSerializer(serializers.Serializer):
    timezone = serializers.CharField(required=False)
    currency = serializers.CharField(required=False)
    attribution_window = serializers.IntegerField(required=False, min_value=1, max_value=30)


class MembershipSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = Membership
        fields = ["id", "user", "role", "created_at"]
        read_only_fields = ["id", "user", "created_at"]


class APIKeySerializer(serializers.ModelSerializer):
    created_by_email = serializers.CharField(source="created_by.email", read_only=True)

    class Meta:
        model = APIKey
        fields = [
            "id",
            "name",
            "key_prefix",
            "permissions",
            "last_used_at",
            "created_by_email",
            "revoked_at",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "key_prefix",
            "last_used_at",
            "created_by_email",
            "revoked_at",
            "created_at",
        ]


class APIKeyCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = APIKey
        fields = ["name", "permissions"]

    def create(self, validated_data):
        request = self.context.get("request")
        organization = request.organization
        user = request.user

        api_key, raw_key = APIKey.create_key(
            organization=organization,
            name=validated_data["name"],
            created_by=user,
            permissions=validated_data.get("permissions", []),
        )

        # Attach raw key to instance for response
        api_key._raw_key = raw_key
        return api_key


class APIKeyCreateResponseSerializer(serializers.ModelSerializer):
    key = serializers.SerializerMethodField()

    class Meta:
        model = APIKey
        fields = ["id", "name", "key", "key_prefix", "permissions", "created_at"]

    def get_key(self, obj):
        return getattr(obj, "_raw_key", None)
