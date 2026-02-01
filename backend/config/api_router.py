from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.accounts.api.views import (
    OrganizationViewSet,
    MembershipViewSet,
    APIKeyViewSet,
)
from apps.integrations.api.views import IntegrationViewSet
from apps.campaigns.api.views import CampaignViewSet
from apps.analytics.api.views import (
    DailyMetricsViewSet,
    DashboardView,
)
from apps.attribution.api.views import (
    PixelEventViewSet,
    ClickTrackingViewSet,
    AttributionEventViewSet,
)
from apps.orders.api.views import OrderViewSet
from apps.integrations.api.sync_views import SyncTriggerView, SyncStatusView

router = DefaultRouter()

# Accounts
router.register("organizations", OrganizationViewSet, basename="organization")
router.register("members", MembershipViewSet, basename="membership")
router.register("api-keys", APIKeyViewSet, basename="apikey")

# Integrations
router.register("integrations", IntegrationViewSet, basename="integration")

# Campaigns
router.register("campaigns", CampaignViewSet, basename="campaign")

# Analytics
router.register("daily-metrics", DailyMetricsViewSet, basename="dailymetrics")

# Attribution
router.register("pixel-events", PixelEventViewSet, basename="pixelevent")
router.register("click-tracking", ClickTrackingViewSet, basename="clicktracking")
router.register("attribution-events", AttributionEventViewSet, basename="attributionevent")

# Orders
router.register("orders", OrderViewSet, basename="order")

urlpatterns = [
    path("", include(router.urls)),
    # Auth
    path("auth/", include("apps.core.urls")),
    # Dashboard
    path("dashboard/", DashboardView.as_view(), name="dashboard"),
    # Sync
    path("sync/trigger/", SyncTriggerView.as_view(), name="sync-trigger"),
    path("sync/status/", SyncStatusView.as_view(), name="sync-status"),
    # Integrations OAuth
    path("integrations/", include("apps.integrations.urls")),
    # Webhooks
    path("webhooks/", include("apps.orders.webhook_urls")),
    path("webhooks/clerk/", include("apps.accounts.webhook_urls")),
    # Onboarding
    path("onboarding/", include("apps.accounts.onboarding_urls")),
]
