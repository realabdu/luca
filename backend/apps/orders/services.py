"""Services for order and refund processing."""

import logging
from datetime import datetime
from decimal import Decimal
from typing import List, Optional

from django.db import transaction
from django.utils import timezone

from apps.orders.models import Order, Refund

logger = logging.getLogger(__name__)


def extract_refunds_from_order(order: Order) -> List[Refund]:
    """
    Extract refunds from an order's raw_data.

    Shopify refund data is in Order.raw_data['refunds'] array with:
    - id: refund ID
    - created_at: refund timestamp
    - transactions[].amount: refund amounts

    Returns list of Refund objects (not saved).
    """
    refunds = []
    raw_data = order.raw_data or {}
    refunds_data = raw_data.get("refunds", [])

    for refund_data in refunds_data:
        refund_id = refund_data.get("id")
        if not refund_id:
            continue

        # Parse refund date
        created_at = refund_data.get("created_at")
        if created_at:
            try:
                if isinstance(created_at, str):
                    # Handle ISO format from Shopify
                    refund_date = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
                else:
                    refund_date = created_at
            except (ValueError, TypeError):
                refund_date = order.order_date
        else:
            refund_date = order.order_date

        # Calculate total refund amount from transactions
        total_amount = Decimal("0")
        transactions = refund_data.get("transactions", [])
        for txn in transactions:
            amount = txn.get("amount")
            if amount:
                try:
                    total_amount += Decimal(str(amount))
                except (ValueError, TypeError):
                    pass

        # If no transactions, try refund_line_items
        if total_amount == 0:
            refund_line_items = refund_data.get("refund_line_items", [])
            for item in refund_line_items:
                subtotal = item.get("subtotal")
                if subtotal:
                    try:
                        total_amount += Decimal(str(subtotal))
                    except (ValueError, TypeError):
                        pass

        if total_amount > 0:
            refund = Refund(
                organization=order.organization,
                order=order,
                external_id=str(refund_id),
                refund_date=refund_date,
                amount=total_amount,
                currency=order.currency,
                raw_data=refund_data,
            )
            refunds.append(refund)

    return refunds


@transaction.atomic
def sync_refunds_for_organization(organization_id: int) -> int:
    """
    Backfill refunds from existing orders for an organization.

    Extracts refunds from Order.raw_data and creates Refund records.

    Args:
        organization_id: Organization ID to sync refunds for

    Returns:
        Number of refunds created
    """
    from apps.accounts.models import Organization

    try:
        organization = Organization.objects.get(id=organization_id)
    except Organization.DoesNotExist:
        logger.error(f"Organization {organization_id} not found")
        return 0

    orders = Order.objects.filter(organization=organization)

    created_count = 0
    for order in orders:
        refunds = extract_refunds_from_order(order)

        for refund in refunds:
            # Use get_or_create to avoid duplicates
            _, created = Refund.objects.get_or_create(
                organization=organization,
                external_id=refund.external_id,
                defaults={
                    "order": refund.order,
                    "refund_date": refund.refund_date,
                    "amount": refund.amount,
                    "currency": refund.currency,
                    "raw_data": refund.raw_data,
                },
            )
            if created:
                created_count += 1

    logger.info(f"Synced {created_count} refunds for organization {organization.name}")
    return created_count


def sync_refunds_from_order(order: Order) -> int:
    """
    Sync refunds for a single order.
    Called when an order is updated (e.g., via webhook).

    Returns:
        Number of new refunds created
    """
    refunds = extract_refunds_from_order(order)

    created_count = 0
    for refund in refunds:
        _, created = Refund.objects.get_or_create(
            organization=order.organization,
            external_id=refund.external_id,
            defaults={
                "order": refund.order,
                "refund_date": refund.refund_date,
                "amount": refund.amount,
                "currency": refund.currency,
                "raw_data": refund.raw_data,
            },
        )
        if created:
            created_count += 1

    return created_count
