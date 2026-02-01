"""Custom permissions for the API."""

from rest_framework import permissions, status
from rest_framework.response import Response

from apps.accounts.models import Membership


NO_ORG_ERROR_RESPONSE = Response(
    {"error": "No organization context"},
    status=status.HTTP_400_BAD_REQUEST,
)


def get_request_organization(request):
    """Get organization from request, returning None if not present."""
    return getattr(request, "organization", None)


class OrganizationRequiredMixin:
    """
    Mixin that provides a helper method for requiring organization context.

    Use in views that need to validate organization context and return
    a consistent error response when it's missing.
    """

    def get_organization_or_error(self, request):
        """
        Get organization from request or return error response.

        Returns:
            tuple: (organization, None) if organization exists
                   (None, Response) if organization is missing
        """
        organization = get_request_organization(request)
        if not organization:
            return None, NO_ORG_ERROR_RESPONSE
        return organization, None


class IsOrganizationMember(permissions.BasePermission):
    """
    Permission that requires the user to be a member of an organization.
    """

    message = "You must be a member of an organization to access this resource."

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and hasattr(request, "organization")
            and request.organization is not None
        )


class IsOrganizationAdmin(permissions.BasePermission):
    """
    Permission that requires the user to be an admin of the organization.

    Checks the Membership table in the database rather than relying on
    JWT claims, which may not always include org_role.
    """

    message = "You must be an admin of the organization to perform this action."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        if not hasattr(request, "organization") or request.organization is None:
            return False

        # Check membership in database
        try:
            membership = Membership.objects.get(
                user=request.user,
                organization=request.organization,
            )
            return membership.role == Membership.Role.ADMIN
        except Membership.DoesNotExist:
            return False


class AllowPixelTracking(permissions.BasePermission):
    """
    Permission for pixel tracking endpoints.
    Allows unauthenticated requests but requires API key.
    """

    def has_permission(self, request, view):
        # Check for API key in header or query param
        api_key = request.headers.get("X-API-Key") or request.GET.get("api_key")
        return bool(api_key)
