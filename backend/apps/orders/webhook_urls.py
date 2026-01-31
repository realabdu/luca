"""Webhook URLs for order events from e-commerce platforms."""

from django.urls import path

from .webhooks import SallaWebhookView, ShopifyWebhookView

urlpatterns = [
    path("salla/", SallaWebhookView.as_view(), name="salla-webhook"),
    path("shopify/", ShopifyWebhookView.as_view(), name="shopify-webhook"),
]
