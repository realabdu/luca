"""Core app views."""

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView


class VerifyTokenView(APIView):
    """
    Verify the current JWT token and return user info.

    This endpoint is used by the frontend to verify authentication
    and get user/organization context.
    """

    def get(self, request):
        """Return current user and organization info."""
        user = request.user
        auth = request.auth or {}

        data = {
            "authenticated": True,
            "user": {
                "id": str(user.id),
                "clerk_id": user.clerk_id,
                "email": user.email,
                "name": user.name,
                "avatar_url": user.avatar_url,
            },
        }

        if request.organization:
            org = request.organization
            data["organization"] = {
                "id": str(org.id),
                "clerk_org_id": org.clerk_org_id,
                "name": org.name,
                "slug": org.slug,
                "onboarding_status": org.onboarding_status,
            }
            data["role"] = auth.get("org_role", "member")
        else:
            data["organization"] = None
            data["role"] = None

        return Response(data)
