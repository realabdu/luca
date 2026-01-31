"""Clerk webhook handlers for user and organization sync."""

import json
import logging

from django.conf import settings
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import User, Organization, Membership

logger = logging.getLogger(__name__)


class ClerkWebhookView(APIView):
    """
    Handle Clerk webhooks for user and organization sync.

    Clerk sends webhooks for:
    - user.created, user.updated, user.deleted
    - organization.created, organization.updated, organization.deleted
    - organizationMembership.created, organizationMembership.updated, organizationMembership.deleted
    """

    permission_classes = [AllowAny]

    def post(self, request):
        """Process Clerk webhook."""
        # TODO: Verify webhook signature using svix
        # For now, we'll process all webhooks

        try:
            event_type = request.data.get("type")
            data = request.data.get("data", {})

            logger.info(f"Received Clerk webhook: {event_type}")

            handler = self._get_handler(event_type)
            if handler:
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

    def _get_handler(self, event_type):
        """Get the handler function for an event type."""
        handlers = {
            "user.created": self._handle_user_created,
            "user.updated": self._handle_user_updated,
            "user.deleted": self._handle_user_deleted,
            "organization.created": self._handle_org_created,
            "organization.updated": self._handle_org_updated,
            "organization.deleted": self._handle_org_deleted,
            "organizationMembership.created": self._handle_membership_created,
            "organizationMembership.updated": self._handle_membership_updated,
            "organizationMembership.deleted": self._handle_membership_deleted,
        }
        return handlers.get(event_type)

    def _handle_user_created(self, data):
        """Handle user.created event."""
        clerk_id = data.get("id")
        email = data.get("email_addresses", [{}])[0].get("email_address", "")
        first_name = data.get("first_name", "")
        last_name = data.get("last_name", "")
        name = f"{first_name} {last_name}".strip()
        avatar_url = data.get("image_url", "")

        User.objects.update_or_create(
            clerk_id=clerk_id,
            defaults={
                "email": email,
                "name": name,
                "avatar_url": avatar_url,
            },
        )
        logger.info(f"Created/updated user: {email}")

    def _handle_user_updated(self, data):
        """Handle user.updated event."""
        self._handle_user_created(data)

    def _handle_user_deleted(self, data):
        """Handle user.deleted event."""
        clerk_id = data.get("id")
        User.objects.filter(clerk_id=clerk_id).update(is_active=False)
        logger.info(f"Deactivated user: {clerk_id}")

    def _handle_org_created(self, data):
        """Handle organization.created event."""
        clerk_org_id = data.get("id")
        name = data.get("name", "")
        slug = data.get("slug", "")

        Organization.objects.update_or_create(
            clerk_org_id=clerk_org_id,
            defaults={
                "name": name,
                "slug": slug,
            },
        )
        logger.info(f"Created/updated organization: {name}")

    def _handle_org_updated(self, data):
        """Handle organization.updated event."""
        self._handle_org_created(data)

    def _handle_org_deleted(self, data):
        """Handle organization.deleted event."""
        clerk_org_id = data.get("id")
        # Soft delete by clearing clerk_org_id
        Organization.objects.filter(clerk_org_id=clerk_org_id).update(
            clerk_org_id=None
        )
        logger.info(f"Deleted organization: {clerk_org_id}")

    def _handle_membership_created(self, data):
        """Handle organizationMembership.created event."""
        org_data = data.get("organization", {})
        user_data = data.get("public_user_data", {})
        role = data.get("role", "member")

        clerk_org_id = org_data.get("id")
        clerk_user_id = user_data.get("user_id")

        try:
            organization = Organization.objects.get(clerk_org_id=clerk_org_id)
            user = User.objects.get(clerk_id=clerk_user_id)

            Membership.objects.update_or_create(
                user=user,
                organization=organization,
                defaults={
                    "role": "admin" if role == "admin" else "member",
                },
            )
            logger.info(f"Created/updated membership: {user.email} -> {organization.name}")
        except (Organization.DoesNotExist, User.DoesNotExist) as e:
            logger.warning(f"Could not create membership: {e}")

    def _handle_membership_updated(self, data):
        """Handle organizationMembership.updated event."""
        self._handle_membership_created(data)

    def _handle_membership_deleted(self, data):
        """Handle organizationMembership.deleted event."""
        org_data = data.get("organization", {})
        user_data = data.get("public_user_data", {})

        clerk_org_id = org_data.get("id")
        clerk_user_id = user_data.get("user_id")

        try:
            organization = Organization.objects.get(clerk_org_id=clerk_org_id)
            user = User.objects.get(clerk_id=clerk_user_id)

            Membership.objects.filter(user=user, organization=organization).delete()
            logger.info(f"Deleted membership: {user.email} -> {organization.name}")
        except (Organization.DoesNotExist, User.DoesNotExist) as e:
            logger.warning(f"Could not delete membership: {e}")
