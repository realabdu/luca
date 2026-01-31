"""Onboarding URLs."""

from django.urls import path

from .onboarding_views import OnboardingStatusView, CompleteOnboardingView

urlpatterns = [
    path("status/", OnboardingStatusView.as_view(), name="onboarding-status"),
    path("complete/", CompleteOnboardingView.as_view(), name="onboarding-complete"),
]
