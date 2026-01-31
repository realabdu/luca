"""Views for orders API."""

from rest_framework import viewsets

from apps.core.permissions import IsOrganizationMember
from apps.orders.models import Order
from .serializers import OrderSerializer


class OrderViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing orders.
    """

    serializer_class = OrderSerializer
    permission_classes = [IsOrganizationMember]

    def get_queryset(self):
        organization = self.request.organization
        if not organization:
            return Order.objects.none()

        queryset = Order.objects.filter(organization=organization)

        # Filter by source
        source = self.request.query_params.get("source")
        if source:
            queryset = queryset.filter(source=source)

        # Filter by status
        status = self.request.query_params.get("status")
        if status:
            queryset = queryset.filter(status=status)

        # Filter by date range
        start_date = self.request.query_params.get("start_date")
        end_date = self.request.query_params.get("end_date")

        if start_date:
            queryset = queryset.filter(order_date__gte=start_date)
        if end_date:
            queryset = queryset.filter(order_date__lte=end_date)

        return queryset.order_by("-order_date")
