"""Celery tasks for integration syncing."""

import asyncio
import logging
from datetime import date, timedelta

from celery import shared_task
from django.db import models
from django.utils import timezone

from apps.accounts.models import Organization
from apps.integrations.models import Integration, SyncLog
from apps.integrations.services.platforms import get_platform_client, ShopifyClient
from apps.campaigns.models import Campaign
from apps.analytics.models import AdSpendDaily, DailyMetrics, Expense
from apps.orders.models import Order, Refund

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3)
def sync_ad_spend_for_integration(self, integration_id: int):
    """
    Sync ad spend data for a single integration.
    """
    try:
        integration = Integration.objects.select_related("organization").get(
            id=integration_id,
            is_connected=True,
        )
    except Integration.DoesNotExist:
        logger.warning(f"Integration {integration_id} not found or not connected")
        return

    # Create sync log
    sync_log = SyncLog.objects.create(
        organization=integration.organization,
        integration=integration,
        sync_type=SyncLog.SyncType.METRICS,
        status=SyncLog.Status.IN_PROGRESS,
    )

    try:
        client = get_platform_client(integration)
        if not client:
            sync_log.mark_failed(f"No client available for {integration.platform}")
            return

        # Sync last 7 days of spend data
        end_date = date.today()
        start_date = end_date - timedelta(days=7)

        import asyncio
        spend_data = asyncio.run(client.get_daily_spend(start_date, end_date))

        records = 0
        for data in spend_data:
            AdSpendDaily.objects.update_or_create(
                organization=integration.organization,
                date=data.date,
                platform=data.platform,
                account_id=data.account_id,
                defaults={
                    "spend": data.spend,
                    "currency": data.currency,
                    "impressions": data.impressions,
                    "clicks": data.clicks,
                    "conversions": data.conversions,
                },
            )
            records += 1

        integration.last_sync_at = timezone.now()
        integration.save(update_fields=["last_sync_at"])

        sync_log.mark_success(records)
        logger.info(f"Synced {records} ad spend records for {integration}")

    except Exception as e:
        logger.error(f"Failed to sync ad spend for {integration}: {e}")
        sync_log.mark_failed(str(e))
        raise self.retry(exc=e, countdown=60 * 5)


@shared_task
def sync_all_ad_spend():
    """
    Sync ad spend for all connected ad platform integrations.
    Runs every 30 minutes.
    """
    integrations = Integration.objects.filter(
        platform__in=["meta", "google", "tiktok", "snapchat"],
        is_connected=True,
    )

    for integration in integrations:
        sync_ad_spend_for_integration.delay(integration.id)

    logger.info(f"Triggered ad spend sync for {integrations.count()} integrations")


@shared_task(bind=True, max_retries=3)
def sync_campaigns_for_integration(self, integration_id: int):
    """
    Sync campaign data for a single integration.
    """
    try:
        integration = Integration.objects.select_related("organization").get(
            id=integration_id,
            is_connected=True,
        )
    except Integration.DoesNotExist:
        logger.warning(f"Integration {integration_id} not found or not connected")
        return

    sync_log = SyncLog.objects.create(
        organization=integration.organization,
        integration=integration,
        sync_type=SyncLog.SyncType.CAMPAIGNS,
        status=SyncLog.Status.IN_PROGRESS,
    )

    try:
        client = get_platform_client(integration)
        if not client:
            sync_log.mark_failed(f"No client available for {integration.platform}")
            return

        import asyncio
        campaigns_data = asyncio.run(client.get_campaigns())

        records = 0
        for data in campaigns_data:
            Campaign.objects.update_or_create(
                organization=integration.organization,
                external_id=data.external_id,
                defaults={
                    "name": data.name,
                    "platform": integration.platform.title(),
                    "status": data.status,
                    "spend": data.spend,
                    "impressions": data.impressions,
                    "clicks": data.clicks,
                    "conversions": data.conversions,
                    "last_sync_at": timezone.now(),
                },
            )
            records += 1

        sync_log.mark_success(records)
        logger.info(f"Synced {records} campaigns for {integration}")

    except Exception as e:
        logger.error(f"Failed to sync campaigns for {integration}: {e}")
        sync_log.mark_failed(str(e))
        raise self.retry(exc=e, countdown=60 * 5)


@shared_task
def sync_all_campaigns():
    """
    Sync campaigns for all connected ad platform integrations.
    Runs every 2 hours.
    """
    integrations = Integration.objects.filter(
        platform__in=["meta", "google", "tiktok", "snapchat"],
        is_connected=True,
    )

    for integration in integrations:
        sync_campaigns_for_integration.delay(integration.id)

    logger.info(f"Triggered campaign sync for {integrations.count()} integrations")


@shared_task
def calculate_daily_metrics():
    """
    Calculate and cache daily metrics for all organizations.
    Runs hourly.
    """
    today = date.today()

    for org in Organization.objects.filter(onboarding_status="completed"):
        try:
            calculate_daily_metrics_for_org.delay(org.id, str(today))
        except Exception as e:
            logger.error(f"Failed to trigger metrics calculation for {org}: {e}")

    logger.info("Triggered daily metrics calculation for all organizations")


def get_expenses_for_date(organization, target_date: date) -> tuple:
    """
    Get total expenses for a specific date.
    Includes one-time expenses on this date and recurring expenses.

    Returns tuple of (total_expenses, expenses_breakdown)
    """
    from decimal import Decimal

    expenses_breakdown = {}
    total_expenses = Decimal("0")

    # One-time expenses on this date
    one_time_expenses = Expense.objects.filter(
        organization=organization,
        expense_date=target_date,
        recurrence=Expense.RecurrenceType.ONE_TIME,
        is_active=True,
    )

    for exp in one_time_expenses:
        total_expenses += exp.amount
        exp_type = exp.expense_type
        if exp_type not in expenses_breakdown:
            expenses_breakdown[exp_type] = Decimal("0")
        expenses_breakdown[exp_type] += exp.amount

    # Daily recurring expenses (started on or before this date)
    daily_expenses = Expense.objects.filter(
        organization=organization,
        expense_date__lte=target_date,
        recurrence=Expense.RecurrenceType.DAILY,
        is_active=True,
    ).filter(
        # Either no end date or end date >= target_date
        models.Q(recurrence_end_date__isnull=True) |
        models.Q(recurrence_end_date__gte=target_date)
    )

    for exp in daily_expenses:
        total_expenses += exp.amount
        exp_type = exp.expense_type
        if exp_type not in expenses_breakdown:
            expenses_breakdown[exp_type] = Decimal("0")
        expenses_breakdown[exp_type] += exp.amount

    # Monthly recurring expenses
    monthly_expenses = Expense.objects.filter(
        organization=organization,
        expense_date__day=target_date.day,
        expense_date__lte=target_date,
        recurrence=Expense.RecurrenceType.MONTHLY,
        is_active=True,
    ).filter(
        models.Q(recurrence_end_date__isnull=True) |
        models.Q(recurrence_end_date__gte=target_date)
    )

    for exp in monthly_expenses:
        total_expenses += exp.amount
        exp_type = exp.expense_type
        if exp_type not in expenses_breakdown:
            expenses_breakdown[exp_type] = Decimal("0")
        expenses_breakdown[exp_type] += exp.amount

    # Convert breakdown to float for JSON serialization
    expenses_breakdown = {k: float(v) for k, v in expenses_breakdown.items()}

    return total_expenses, expenses_breakdown


@shared_task
def calculate_daily_metrics_for_org(organization_id: int, date_str: str):
    """
    Calculate daily metrics for a single organization.
    Aggregates orders from all sources (Salla, Shopify, etc.)

    Calculations:
    - Gross Revenue = sum of order totals placed this day
    - Total Refunds = sum of refunds processed this day (by refund date)
    - Total Sales = Gross Revenue - Total Refunds
    - Total Expenses = one-time + recurring expenses for this day
    - Net Profit = Total Sales - Total Expenses - Ad Spend
    """
    from django.db import models as django_models

    try:
        organization = Organization.objects.get(id=organization_id)
    except Organization.DoesNotExist:
        return

    target_date = date.fromisoformat(date_str)

    # 1. Gross revenue from orders placed this day
    # Include various status values from different platforms:
    # - Shopify: paid, partially_paid
    # - Salla: completed, delivered, shipped, processing, etc.
    # Exclude cancelled/refunded orders
    excluded_statuses = ["cancelled", "canceled", "refunded", "voided", "failed"]
    orders = Order.objects.filter(
        organization=organization,
        order_date__date=target_date,
    ).exclude(status__in=excluded_statuses)

    gross_revenue = sum(o.total_amount for o in orders)
    orders_count = orders.count()
    new_customers = orders.filter(is_new_customer=True).count()
    avg_order_value = gross_revenue / orders_count if orders_count > 0 else 0

    # Calculate revenue breakdown by source
    revenue_by_source = {}
    for order in orders:
        source = order.source or "unknown"
        if source not in revenue_by_source:
            revenue_by_source[source] = 0
        revenue_by_source[source] += float(order.total_amount)

    # 2. Refunds processed this day (by refund date, not order date)
    refunds = Refund.objects.filter(
        organization=organization,
        refund_date__date=target_date,
    )
    total_refunds = sum(r.amount for r in refunds)

    # 3. Total Sales = Gross Revenue - Refunds
    total_sales = float(gross_revenue) - float(total_refunds)

    # 4. Get expenses for this day (one-time + recurring)
    total_expenses, expenses_breakdown = get_expenses_for_date(organization, target_date)

    # 5. Get ad spend for the day
    ad_spend = AdSpendDaily.objects.filter(
        organization=organization,
        date=target_date,
    )

    total_spend = sum(s.spend for s in ad_spend)
    spend_by_platform = {}
    for s in ad_spend:
        spend_by_platform[s.platform] = float(s.spend)

    # 6. Net Profit = Total Sales - Expenses - Ad Spend
    net_profit = total_sales - float(total_expenses) - float(total_spend)

    # Calculate other metrics
    # ROAS and MER are based on total_sales (revenue after refunds)
    roas = total_sales / float(total_spend) if total_spend > 0 else 0
    mer = total_sales / float(total_spend) if total_spend > 0 else 0
    net_margin = net_profit / total_sales * 100 if total_sales > 0 else 0
    ncpa = float(total_spend) / new_customers if new_customers > 0 else 0

    # Update or create daily metrics
    DailyMetrics.objects.update_or_create(
        organization=organization,
        date=target_date,
        store_id="",
        defaults={
            "gross_revenue": gross_revenue,
            "revenue": total_sales,  # Now represents total_sales for backward compatibility
            "total_refunds": total_refunds,
            "orders_count": orders_count,
            "average_order_value": avg_order_value,
            "new_customers_count": new_customers,
            "total_expenses": total_expenses,
            "expenses_breakdown": expenses_breakdown,
            "total_spend": total_spend,
            "spend_by_platform": spend_by_platform,
            "revenue_by_source": revenue_by_source,
            "net_profit": net_profit,
            "roas": roas,
            "mer": mer,
            "net_margin": net_margin,
            "ncpa": ncpa,
            "data_source": "calculated",
        },
    )

    logger.info(f"Calculated daily metrics for {organization} on {target_date}")


@shared_task(bind=True, max_retries=3)
def sync_orders_for_integration(self, integration_id: int, days: int = 30):
    """
    Sync orders for a single e-commerce integration (Shopify).

    On first run (no last_sync_at), syncs last `days` days (default 30).
    On subsequent runs, syncs incrementally from last_sync_at.
    """
    try:
        integration = Integration.objects.select_related("organization").get(
            id=integration_id,
            is_connected=True,
        )
    except Integration.DoesNotExist:
        logger.warning(f"Integration {integration_id} not found or not connected")
        return

    # Only handle Shopify for now
    if integration.platform != "shopify":
        logger.info(f"Skipping non-Shopify integration: {integration.platform}")
        return

    sync_log = SyncLog.objects.create(
        organization=integration.organization,
        integration=integration,
        sync_type=SyncLog.SyncType.ORDERS,
        status=SyncLog.Status.IN_PROGRESS,
    )

    try:
        client = ShopifyClient(integration)

        # Determine sync start date
        if integration.last_sync_at:
            since = integration.last_sync_at
        else:
            # First sync: get last `days` days (default 30)
            since = timezone.now() - timedelta(days=days)

        # Fetch orders from Shopify
        orders_data = asyncio.run(client.get_orders(since=since))

        # Track affected dates for metrics recalculation
        affected_dates = set()
        records = 0

        for order_data in orders_data:
            Order.objects.update_or_create(
                organization=integration.organization,
                external_id=order_data.external_id,
                source="shopify",
                defaults={
                    "store_id": order_data.store_id,
                    "order_date": order_data.order_date,
                    "total_amount": order_data.total_amount,
                    "currency": order_data.currency,
                    "status": order_data.status,
                    "customer_id": order_data.customer_id,
                    "customer_email": order_data.customer_email,
                    "is_new_customer": order_data.is_new_customer,
                    "raw_data": order_data.raw_data,
                },
            )
            records += 1
            affected_dates.add(order_data.order_date.date())

        # Update last sync timestamp
        integration.last_sync_at = timezone.now()
        integration.save(update_fields=["last_sync_at"])

        sync_log.mark_success(records)
        logger.info(f"Synced {records} orders for {integration}")

        # Trigger metrics recalculation for affected dates
        for affected_date in affected_dates:
            calculate_daily_metrics_for_org.delay(
                integration.organization.id,
                str(affected_date),
            )

    except Exception as e:
        logger.error(f"Failed to sync orders for {integration}: {e}")
        sync_log.mark_failed(str(e))
        raise self.retry(exc=e, countdown=60 * 5)


@shared_task
def sync_all_orders():
    """
    Sync orders from all connected e-commerce integrations.
    Runs every 15 minutes.

    Note: Most orders come via webhooks. This is a backup sync
    to catch any missed orders.
    """
    integrations = Integration.objects.filter(
        platform__in=["salla", "shopify"],
        is_connected=True,
    )

    for integration in integrations:
        if integration.platform == "shopify":
            sync_orders_for_integration.delay(integration.id)
        else:
            # TODO: Implement Salla order sync
            logger.info(f"Order sync not yet implemented for {integration.platform}")

    logger.info(f"Triggered order sync for {integrations.count()} integrations")
