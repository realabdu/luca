"""OAuth URLs for integrations."""

from django.urls import path

from .oauth_views import (
    OAuthConnectView,
    OAuthCallbackView,
)

urlpatterns = [
    path("<str:platform>/connect/", OAuthConnectView.as_view(), name="oauth-connect"),
    path("<str:platform>/callback/", OAuthCallbackView.as_view(), name="oauth-callback"),
]
