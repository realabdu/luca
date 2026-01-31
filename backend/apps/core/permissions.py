"""Custom permissions for the API."""

from rest_framework import permissions


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
    """

    message = "You must be an admin of the organization to perform this action."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        if not hasattr(request, "organization") or request.organization is None:
            return False

        # Check auth info for org_role
        auth = request.auth or {}
        return auth.get("org_role") == "admin"


class AllowPixelTracking(permissions.BasePermission):
    """
    Permission for pixel tracking endpoints.
    Allows unauthenticated requests but requires API key.
    """

    def has_permission(self, request, view):
        # Check for API key in header or query param
        api_key = request.headers.get("X-API-Key") or request.GET.get("api_key")
        return bool(api_key)
