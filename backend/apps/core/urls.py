"""Core app URL configuration."""

from django.urls import path

from .views import VerifyTokenView

urlpatterns = [
    path("verify-token/", VerifyTokenView.as_view(), name="verify-token"),
]
