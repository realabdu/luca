"""Celery tasks for integration syncing."""

import asyncio
import logging
from datetime import date, timedelta

from celery import shared_task
from django.utils import timezone

from apps.accounts.models import Organization
from apps.integrations.models import Integration, SyncLog
from apps.integrations.services.platforms import get_platform_client, ShopifyClient
from apps.campaigns.models import Campaign
from apps.analytics.models import AdSpendDaily, DailyMetrics
from apps.orders.models import Order

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


@shared_task
def calculate_daily_metrics_for_org(organization_id: int, date_str: str):
    """
    Calculate daily metrics for a single organization.
    Aggregates orders from all sources (Salla, Shopify, etc.)
    """
    try:
        organization = Organization.objects.get(id=organization_id)
    except Organization.DoesNotExist:
        return

    target_date = date.fromisoformat(date_str)

    # Get orders for the day
    orders = Order.objects.filter(
        organization=organization,
        order_date__date=target_date,
        status__in=["completed", "paid"],
    )

    revenue = sum(o.total_amount for o in orders)
    orders_count = orders.count()
    new_customers = orders.filter(is_new_customer=True).count()
    avg_order_value = revenue / orders_count if orders_count > 0 else 0

    # Calculate revenue breakdown by source
    revenue_by_source = {}
    for order in orders:
        source = order.source or "unknown"
        if source not in revenue_by_source:
            revenue_by_source[source] = 0
        revenue_by_source[source] += float(order.total_amount)

    # Get ad spend for the day
    ad_spend = AdSpendDaily.objects.filter(
        organization=organization,
        date=target_date,
    )

    total_spend = sum(s.spend for s in ad_spend)
    spend_by_platform = {}
    for s in ad_spend:
        spend_by_platform[s.platform] = float(s.spend)

    # Calculate metrics
    roas = float(revenue) / float(total_spend) if total_spend > 0 else 0
    mer = float(revenue) / float(total_spend) if total_spend > 0 else 0
    net_profit = float(revenue) - float(total_spend)
    net_margin = net_profit / float(revenue) * 100 if revenue > 0 else 0
    ncpa = float(total_spend) / new_customers if new_customers > 0 else 0

    # Update or create daily metrics
    DailyMetrics.objects.update_or_create(
        organization=organization,
        date=target_date,
        store_id="",
        defaults={
            "revenue": revenue,
            "orders_count": orders_count,
            "average_order_value": avg_order_value,
            "new_customers_count": new_customers,
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
def sync_orders_for_integration(self, integration_id: int):
    """
    Sync orders for a single e-commerce integration (Shopify).

    On first run (no last_sync_at), syncs last 7 days.
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
            # First sync: get last 7 days
            since = timezone.now() - timedelta(days=7)

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
