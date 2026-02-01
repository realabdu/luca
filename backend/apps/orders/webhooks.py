"""Webhook handlers for e-commerce order events."""

import base64
import hashlib
import hmac
import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from typing import Optional

from django.conf import settings
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.integrations.models import Integration
from apps.orders.models import Order
from apps.attribution.models import AttributionEvent

logger = logging.getLogger(__name__)


def parse_iso_datetime(date_str: Optional[str]) -> datetime:
    """Parse ISO datetime string, returning current time on failure."""
    if not date_str:
        return timezone.now()
    try:
        return datetime.fromisoformat(date_str.replace("Z", "+00:00"))
    except ValueError:
        return timezone.now()


@dataclass
class OrderData:
    """Normalized order data from webhook."""

    order_id: str
    store_id: str
    order_date: datetime
    total_amount: float
    currency: str
    status: str
    customer_id: str
    customer_email: str
    is_paid: bool
    raw_data: dict


class BaseOrderWebhookView(APIView, ABC):
    """Base class for e-commerce order webhooks."""

    permission_classes = [AllowAny]
    platform: str = ""
    order_source: str = ""

    def post(self, request):
        """Process webhook request."""
        try:
            event_name = self.get_event_name(request)
            logger.info(f"Received {self.platform} webhook: {event_name}")

            if not self.is_order_event(event_name):
                return Response({"status": "ignored"})

            order_data = self.extract_order_data(request)
            if order_data:
                self.process_order(order_data)
                return Response({"status": "processed"})

            return Response({"status": "ignored"})

        except Exception as e:
            logger.error(f"Error processing {self.platform} webhook: {e}")
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @abstractmethod
    def get_event_name(self, request) -> str:
        """Extract event name from request."""
        pass

    @abstractmethod
    def is_order_event(self, event_name: str) -> bool:
        """Check if this is an order event we should process."""
        pass

    @abstractmethod
    def extract_order_data(self, request) -> Optional[OrderData]:
        """Extract normalized order data from request."""
        pass

    @abstractmethod
    def get_account_id(self, request) -> str:
        """Get account ID for integration lookup."""
        pass

    def get_integration(self, account_id: str) -> Optional[Integration]:
        """Find integration by platform and account ID."""
        try:
            return Integration.objects.select_related("organization").get(
                platform=self.platform,
                account_id=account_id,
                is_connected=True,
            )
        except Integration.DoesNotExist:
            logger.warning(f"No {self.platform} integration found for: {account_id}")
            return None

    def process_order(self, order_data: OrderData) -> None:
        """Create or update order and attribution event."""
        integration = self.get_integration(order_data.store_id)
        if not integration:
            return

        organization = integration.organization

        # Create or update order
        Order.objects.update_or_create(
            organization=organization,
            external_id=order_data.order_id,
            source=self.order_source,
            defaults={
                "store_id": order_data.store_id,
                "order_date": order_data.order_date,
                "total_amount": order_data.total_amount,
                "currency": order_data.currency,
                "status": order_data.status,
                "customer_id": order_data.customer_id,
                "customer_email": order_data.customer_email,
                "raw_data": order_data.raw_data,
            },
        )

        # Create attribution event
        AttributionEvent.objects.create(
            organization=organization,
            timestamp=order_data.order_date,
            amount=order_data.total_amount,
            source=self.platform,
            status="Paid" if order_data.is_paid else "Pending",
            event_type="purchase",
            event_id=f"{self.platform}_{order_data.order_id}",
            order_id=order_data.order_id,
            currency=order_data.currency,
            customer_email=order_data.customer_email,
            customer_id=order_data.customer_id,
        )

        logger.info(f"Processed {self.platform} order: {order_data.order_id}")


class SallaWebhookView(BaseOrderWebhookView):
    """Handle Salla webhooks for order events."""

    platform = "salla"
    order_source = Order.Source.SALLA

    def get_event_name(self, request) -> str:
        return request.data.get("event", "")

    def is_order_event(self, event_name: str) -> bool:
        return event_name in ["order.created", "order.updated"]

    def get_account_id(self, request) -> str:
        merchant = request.data.get("merchant", {})
        return str(merchant.get("id", ""))

    def extract_order_data(self, request) -> Optional[OrderData]:
        data = request.data.get("data", {})
        merchant = request.data.get("merchant", {})
        customer = data.get("customer", {})

        merchant_id = str(merchant.get("id", ""))
        if not merchant_id:
            return None

        order_date_str = data.get("created_at") or data.get("date", {}).get("date")

        return OrderData(
            order_id=str(data.get("id", "")),
            store_id=merchant_id,
            order_date=parse_iso_datetime(order_date_str),
            total_amount=data.get("total", {}).get("amount", 0),
            currency=data.get("total", {}).get("currency", "SAR"),
            status=data.get("status", {}).get("name", "pending"),
            customer_id=str(customer.get("id", "")),
            customer_email=customer.get("email", ""),
            is_paid=data.get("payment", {}).get("status") == "paid",
            raw_data=data,
        )


class ShopifyWebhookView(BaseOrderWebhookView):
    """Handle Shopify webhooks for order events."""

    platform = "shopify"
    order_source = Order.Source.SHOPIFY

    def post(self, request):
        """Process webhook request with signature verification."""
        if not self.verify_webhook(request):
            return Response({"error": "Invalid signature"}, status=status.HTTP_401_UNAUTHORIZED)
        return super().post(request)

    def get_event_name(self, request) -> str:
        return request.headers.get("X-Shopify-Topic", "")

    def is_order_event(self, event_name: str) -> bool:
        return event_name in ["orders/create", "orders/updated", "orders/paid"]

    def get_account_id(self, request) -> str:
        shop_domain = request.headers.get("X-Shopify-Shop-Domain", "")
        return shop_domain.replace(".myshopify.com", "")

    def extract_order_data(self, request) -> Optional[OrderData]:
        data = request.data
        customer = data.get("customer", {})
        shop_domain = request.headers.get("X-Shopify-Shop-Domain", "")

        if not shop_domain:
            return None

        return OrderData(
            order_id=str(data.get("id", "")),
            store_id=shop_domain.replace(".myshopify.com", ""),
            order_date=parse_iso_datetime(data.get("created_at")),
            total_amount=float(data.get("total_price", 0)),
            currency=data.get("currency", "USD"),
            status=data.get("financial_status", "pending"),
            customer_id=str(customer.get("id", "")),
            customer_email=customer.get("email", ""),
            is_paid=data.get("financial_status") == "paid",
            raw_data=data,
        )

    def verify_webhook(self, request) -> bool:
        """Verify Shopify webhook signature."""
        hmac_header = request.headers.get("X-Shopify-Hmac-Sha256", "")
        secret = getattr(settings, "SHOPIFY_WEBHOOK_SECRET", "")

        if not secret:
            return True  # Skip verification if not configured

        calculated = hmac.new(
            secret.encode(),
            request.body,
            hashlib.sha256,
        ).digest()
        calculated_b64 = base64.b64encode(calculated).decode()

        return hmac.compare_digest(calculated_b64, hmac_header)
