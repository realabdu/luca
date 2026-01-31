"""Celery beat schedule configuration."""

from celery.schedules import crontab

# Celery beat schedule
CELERY_BEAT_SCHEDULE = {
    # Sync ad spend every 30 minutes
    "sync-all-ad-spend": {
        "task": "apps.integrations.tasks.sync_all_ad_spend",
        "schedule": crontab(minute="*/30"),
    },
    # Sync campaigns every 2 hours
    "sync-all-campaigns": {
        "task": "apps.integrations.tasks.sync_all_campaigns",
        "schedule": crontab(minute="0", hour="*/2"),
    },
    # Calculate daily metrics every hour
    "calculate-daily-metrics": {
        "task": "apps.integrations.tasks.calculate_daily_metrics",
        "schedule": crontab(minute="5"),  # 5 minutes past every hour
    },
    # Sync orders every 15 minutes (backup to webhooks)
    "sync-all-orders": {
        "task": "apps.integrations.tasks.sync_all_orders",
        "schedule": crontab(minute="*/15"),
    },
}
