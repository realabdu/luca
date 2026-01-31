from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from django.views import defaults as default_views
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

from config.health_views import (
    simple_health_check,
    detailed_health_check,
    readiness_check,
    liveness_check,
)

urlpatterns = [
    # Health check endpoints
    path("health/", include("health_check.urls")),
    path("api/health/", simple_health_check, name="api-health-simple"),
    path("api/health/detailed/", detailed_health_check, name="api-health-detailed"),
    path("api/health/ready/", readiness_check, name="api-health-ready"),
    path("api/health/live/", liveness_check, name="api-health-live"),
    # Django Admin
    path(settings.ADMIN_URL, admin.site.urls),
    # API
    path("api/v1/", include("config.api_router")),
    # API Documentation
    path("api/schema/", SpectacularAPIView.as_view(), name="api-schema"),
    path(
        "api/docs/",
        SpectacularSwaggerView.as_view(url_name="api-schema"),
        name="api-docs",
    ),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)


if settings.DEBUG:
    urlpatterns += [
        path(
            "400/",
            default_views.bad_request,
            kwargs={"exception": Exception("Bad Request!")},
        ),
        path(
            "403/",
            default_views.permission_denied,
            kwargs={"exception": Exception("Permission Denied")},
        ),
        path(
            "404/",
            default_views.page_not_found,
            kwargs={"exception": Exception("Page not Found")},
        ),
        path("500/", default_views.server_error),
    ]
    if "debug_toolbar" in settings.INSTALLED_APPS:
        import debug_toolbar

        urlpatterns = [path("__debug__/", include(debug_toolbar.urls))] + urlpatterns
