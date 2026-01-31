"""Webhook handlers for e-commerce order events."""

import hashlib
import hmac
import logging
from datetime import datetime

from django.conf import settings
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import Organization
from apps.integrations.models import Integration
from apps.orders.models import Order
from apps.analytics.models import DailyMetrics
from apps.attribution.models import AttributionEvent

logger = logging.getLogger(__name__)


class SallaWebhookView(APIView):
    """Handle Salla webhooks for order events."""

    permission_classes = [AllowAny]

    def post(self, request):
        """Process Salla webhook."""
        try:
            event = request.data.get("event")
            data = request.data.get("data", {})
            merchant = request.data.get("merchant", {})

            logger.info(f"Received Salla webhook: {event}")

            if event in ["order.created", "order.updated"]:
                self._handle_order(data, merchant)
                return Response({"status": "processed"})

            return Response({"status": "ignored"})

        except Exception as e:
            logger.error(f"Error processing Salla webhook: {e}")
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def _handle_order(self, data, merchant):
        """Handle order created/updated event."""
        merchant_id = str(merchant.get("id", ""))

        # Find integration by account_id
        try:
            integration = Integration.objects.select_related("organization").get(
                platform="salla",
                account_id=merchant_id,
                is_connected=True,
            )
        except Integration.DoesNotExist:
            logger.warning(f"No Salla integration found for merchant: {merchant_id}")
            return

        organization = integration.organization
        order_id = str(data.get("id", ""))

        # Parse order date
        order_date_str = data.get("created_at") or data.get("date", {}).get("date")
        if order_date_str:
            try:
                order_date = datetime.fromisoformat(order_date_str.replace("Z", "+00:00"))
            except ValueError:
                order_date = timezone.now()
        else:
            order_date = timezone.now()

        # Get customer info
        customer = data.get("customer", {})

        # Create or update order
        Order.objects.update_or_create(
            organization=organization,
            external_id=order_id,
            source=Order.Source.SALLA,
            defaults={
                "store_id": merchant_id,
                "order_date": order_date,
                "total_amount": data.get("total", {}).get("amount", 0),
                "currency": data.get("total", {}).get("currency", "SAR"),
                "status": data.get("status", {}).get("name", "pending"),
                "customer_id": str(customer.get("id", "")),
                "customer_email": customer.get("email", ""),
                "raw_data": data,
            },
        )

        # Create attribution event
        AttributionEvent.objects.create(
            organization=organization,
            timestamp=order_date,
            amount=data.get("total", {}).get("amount", 0),
            source="salla",
            status="Paid" if data.get("payment", {}).get("status") == "paid" else "Pending",
            event_type="purchase",
            event_id=f"salla_{order_id}",
            order_id=order_id,
            currency=data.get("total", {}).get("currency", "SAR"),
            customer_email=customer.get("email", ""),
            customer_id=str(customer.get("id", "")),
        )

        logger.info(f"Processed Salla order: {order_id}")


class ShopifyWebhookView(APIView):
    """Handle Shopify webhooks for order events."""

    permission_classes = [AllowAny]

    def post(self, request):
        """Process Shopify webhook."""
        try:
            # Get shop domain from header
            shop_domain = request.headers.get("X-Shopify-Shop-Domain", "")

            # Verify webhook (optional but recommended)
            # self._verify_webhook(request)

            topic = request.headers.get("X-Shopify-Topic", "")
            data = request.data

            logger.info(f"Received Shopify webhook: {topic} from {shop_domain}")

            if topic in ["orders/create", "orders/updated", "orders/paid"]:
                self._handle_order(data, shop_domain)
                return Response({"status": "processed"})

            return Response({"status": "ignored"})

        except Exception as e:
            logger.error(f"Error processing Shopify webhook: {e}")
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def _handle_order(self, data, shop_domain):
        """Handle order created/updated event."""
        # Find integration by shop domain
        try:
            integration = Integration.objects.select_related("organization").get(
                platform="shopify",
                account_id=shop_domain.replace(".myshopify.com", ""),
                is_connected=True,
            )
        except Integration.DoesNotExist:
            logger.warning(f"No Shopify integration found for shop: {shop_domain}")
            return

        organization = integration.organization
        order_id = str(data.get("id", ""))

        # Parse order date
        order_date_str = data.get("created_at")
        if order_date_str:
            try:
                order_date = datetime.fromisoformat(order_date_str.replace("Z", "+00:00"))
            except ValueError:
                order_date = timezone.now()
        else:
            order_date = timezone.now()

        # Get customer info
        customer = data.get("customer", {})

        # Create or update order
        Order.objects.update_or_create(
            organization=organization,
            external_id=order_id,
            source=Order.Source.SHOPIFY,
            defaults={
                "store_id": shop_domain,
                "order_date": order_date,
                "total_amount": float(data.get("total_price", 0)),
                "currency": data.get("currency", "USD"),
                "status": data.get("financial_status", "pending"),
                "customer_id": str(customer.get("id", "")),
                "customer_email": customer.get("email", ""),
                "raw_data": data,
            },
        )

        # Create attribution event
        AttributionEvent.objects.create(
            organization=organization,
            timestamp=order_date,
            amount=float(data.get("total_price", 0)),
            source="shopify",
            status="Paid" if data.get("financial_status") == "paid" else "Pending",
            event_type="purchase",
            event_id=f"shopify_{order_id}",
            order_id=order_id,
            currency=data.get("currency", "USD"),
            customer_email=customer.get("email", ""),
            customer_id=str(customer.get("id", "")),
        )

        logger.info(f"Processed Shopify order: {order_id}")

    def _verify_webhook(self, request):
        """Verify Shopify webhook signature."""
        hmac_header = request.headers.get("X-Shopify-Hmac-Sha256", "")
        secret = getattr(settings, "SHOPIFY_WEBHOOK_SECRET", "")

        if not secret:
            return  # Skip verification if not configured

        calculated = hmac.new(
            secret.encode(),
            request.body,
            hashlib.sha256,
        ).digest()

        import base64
        calculated_b64 = base64.b64encode(calculated).decode()

        if not hmac.compare_digest(calculated_b64, hmac_header):
            raise ValueError("Invalid webhook signature")
