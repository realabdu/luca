"""Serializers for orders API."""

from rest_framework import serializers

from apps.orders.models import Order


class OrderSerializer(serializers.ModelSerializer):
    class Meta:
        model = Order
        fields = [
            "id",
            "external_id",
            "store_id",
            "source",
            "order_date",
            "total_amount",
            "currency",
            "status",
            "customer_id",
            "customer_email",
            "is_new_customer",
            "attributed_platform",
            "attribution_confidence",
            "synced_at",
            "created_at",
        ]
        read_only_fields = fields
