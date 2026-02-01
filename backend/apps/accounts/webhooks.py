"""Clerk webhook handlers for user and organization sync."""

import logging

from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import User, Organization, Membership

logger = logging.getLogger(__name__)


def extract_user_info(data: dict) -> dict:
    """Extract user information from Clerk webhook data."""
    first_name = data.get("first_name", "")
    last_name = data.get("last_name", "")
    return {
        "clerk_id": data.get("id"),
        "email": data.get("email_addresses", [{}])[0].get("email_address", ""),
        "name": f"{first_name} {last_name}".strip(),
        "avatar_url": data.get("image_url", ""),
    }


class ClerkWebhookView(APIView):
    """
    Handle Clerk webhooks for user and organization sync.

    Clerk sends webhooks for:
    - user.created, user.updated, user.deleted
    - organization.created, organization.updated, organization.deleted
    - organizationMembership.created, organizationMembership.updated, organizationMembership.deleted
    """

    permission_classes = [AllowAny]

    # Map event types to handlers (updated events use same handler as created)
    EVENT_HANDLERS = {
        "user.created": "_handle_user_upsert",
        "user.updated": "_handle_user_upsert",
        "user.deleted": "_handle_user_deleted",
        "organization.created": "_handle_org_upsert",
        "organization.updated": "_handle_org_upsert",
        "organization.deleted": "_handle_org_deleted",
        "organizationMembership.created": "_handle_membership_upsert",
        "organizationMembership.updated": "_handle_membership_upsert",
        "organizationMembership.deleted": "_handle_membership_deleted",
    }

    def post(self, request):
        """Process Clerk webhook."""
        # TODO: Verify webhook signature using svix
        try:
            event_type = request.data.get("type")
            data = request.data.get("data", {})

            logger.info(f"Received Clerk webhook: {event_type}")

            handler_name = self.EVENT_HANDLERS.get(event_type)
            if handler_name:
                handler = getattr(self, handler_name)
                handler(data)
                return Response({"status": "processed"})

            logger.warning(f"Unhandled Clerk webhook type: {event_type}")
            return Response({"status": "ignored"})

        except Exception as e:
            logger.error(f"Error processing Clerk webhook: {e}")
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def _handle_user_upsert(self, data):
        """Handle user.created and user.updated events."""
        user_info = extract_user_info(data)
        clerk_id = user_info.pop("clerk_id")

        User.objects.update_or_create(clerk_id=clerk_id, defaults=user_info)
        logger.info(f"Created/updated user: {user_info['email']}")

    def _handle_user_deleted(self, data):
        """Handle user.deleted event."""
        clerk_id = data.get("id")
        User.objects.filter(clerk_id=clerk_id).update(is_active=False)
        logger.info(f"Deactivated user: {clerk_id}")

    def _handle_org_upsert(self, data):
        """Handle organization.created and organization.updated events."""
        clerk_org_id = data.get("id")
        name = data.get("name", "")
        slug = data.get("slug", "")

        Organization.objects.update_or_create(
            clerk_org_id=clerk_org_id,
            defaults={"name": name, "slug": slug},
        )
        logger.info(f"Created/updated organization: {name}")

    def _handle_org_deleted(self, data):
        """Handle organization.deleted event."""
        clerk_org_id = data.get("id")
        Organization.objects.filter(clerk_org_id=clerk_org_id).update(clerk_org_id=None)
        logger.info(f"Deleted organization: {clerk_org_id}")

    def _handle_membership_upsert(self, data):
        """Handle organizationMembership.created and updated events."""
        org_data = data.get("organization", {})
        user_data = data.get("public_user_data", {})
        role = data.get("role", "member")

        try:
            organization = Organization.objects.get(clerk_org_id=org_data.get("id"))
            user = User.objects.get(clerk_id=user_data.get("user_id"))

            Membership.objects.update_or_create(
                user=user,
                organization=organization,
                defaults={"role": "admin" if role == "admin" else "member"},
            )
            logger.info(f"Created/updated membership: {user.email} -> {organization.name}")
        except (Organization.DoesNotExist, User.DoesNotExist) as e:
            logger.warning(f"Could not create membership: {e}")

    def _handle_membership_deleted(self, data):
        """Handle organizationMembership.deleted event."""
        org_data = data.get("organization", {})
        user_data = data.get("public_user_data", {})

        try:
            organization = Organization.objects.get(clerk_org_id=org_data.get("id"))
            user = User.objects.get(clerk_id=user_data.get("user_id"))

            Membership.objects.filter(user=user, organization=organization).delete()
            logger.info(f"Deleted membership: {user.email} -> {organization.name}")
        except (Organization.DoesNotExist, User.DoesNotExist) as e:
            logger.warning(f"Could not delete membership: {e}")
