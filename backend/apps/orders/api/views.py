"""Views for orders API."""

from rest_framework import viewsets

from apps.core.permissions import IsOrganizationMember, get_request_organization
from apps.orders.models import Order
from .serializers import OrderSerializer


class OrderViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing orders."""

    serializer_class = OrderSerializer
    permission_classes = [IsOrganizationMember]

    def get_queryset(self):
        organization = get_request_organization(self.request)
        if not organization:
            return Order.objects.none()

        queryset = Order.objects.filter(organization=organization)

        # Apply filters from query params
        filters = {
            "source": self.request.query_params.get("source"),
            "status": self.request.query_params.get("status"),
        }

        for field, value in filters.items():
            if value:
                queryset = queryset.filter(**{field: value})

        # Filter by date range
        start_date = self.request.query_params.get("start_date")
        end_date = self.request.query_params.get("end_date")

        if start_date:
            queryset = queryset.filter(order_date__gte=start_date)
        if end_date:
            queryset = queryset.filter(order_date__lte=end_date)

        return queryset.order_by("-order_date")
