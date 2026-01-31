"""Views for accounts API."""

from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.core.permissions import IsOrganizationMember, IsOrganizationAdmin
from apps.accounts.models import Organization, Membership, APIKey
from .serializers import (
    OrganizationSerializer,
    OrganizationSettingsSerializer,
    MembershipSerializer,
    APIKeySerializer,
    APIKeyCreateSerializer,
    APIKeyCreateResponseSerializer,
)


class OrganizationViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for managing organizations.
    """

    serializer_class = OrganizationSerializer
    permission_classes = [IsOrganizationMember]

    def get_queryset(self):
        """Return organizations the user is a member of."""
        user = self.request.user
        org_ids = Membership.objects.filter(user=user).values_list(
            "organization_id", flat=True
        )
        return Organization.objects.filter(id__in=org_ids)

    @action(detail=False, methods=["get"])
    def current(self, request):
        """Get the current organization from the JWT context."""
        organization = request.organization
        if not organization:
            return Response(
                {"error": "No organization context"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = self.get_serializer(organization)
        return Response(serializer.data)

    @action(detail=False, methods=["patch"], permission_classes=[IsOrganizationAdmin])
    def settings(self, request):
        """Update organization settings."""
        organization = request.organization
        if not organization:
            return Response(
                {"error": "No organization context"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = OrganizationSettingsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Merge with existing settings
        settings = organization.settings or {}
        settings.update(serializer.validated_data)
        organization.settings = settings
        organization.save(update_fields=["settings", "updated_at"])

        return Response(OrganizationSerializer(organization).data)

    @action(detail=False, methods=["get"])
    def members(self, request):
        """Get members of the current organization."""
        organization = request.organization
        if not organization:
            return Response(
                {"error": "No organization context"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        memberships = Membership.objects.filter(
            organization=organization
        ).select_related("user")
        serializer = MembershipSerializer(memberships, many=True)
        return Response(serializer.data)


class MembershipViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing memberships.
    """

    serializer_class = MembershipSerializer
    permission_classes = [IsOrganizationMember]

    def get_queryset(self):
        """Return memberships for the current organization."""
        organization = self.request.organization
        if not organization:
            return Membership.objects.none()
        return Membership.objects.filter(organization=organization).select_related("user")


class APIKeyViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing API keys.
    """

    permission_classes = [IsOrganizationAdmin]

    def get_serializer_class(self):
        if self.action == "create":
            return APIKeyCreateSerializer
        return APIKeySerializer

    def get_queryset(self):
        """Return API keys for the current organization."""
        organization = self.request.organization
        if not organization:
            return APIKey.objects.none()
        return APIKey.objects.filter(
            organization=organization,
            revoked_at__isnull=True,
        ).select_related("created_by")

    def create(self, request, *args, **kwargs):
        """Create a new API key."""
        if not request.organization:
            return Response(
                {"error": "No organization context"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        api_key = serializer.save()

        # Return the key (only shown once)
        response_serializer = APIKeyCreateResponseSerializer(api_key)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def revoke(self, request, pk=None):
        """Revoke an API key."""
        api_key = self.get_object()
        api_key.revoked_at = timezone.now()
        api_key.save(update_fields=["revoked_at"])
        return Response({"status": "revoked"})
