"""Views for attribution API."""

from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.core.permissions import IsOrganizationMember, get_request_organization
from apps.accounts.models import APIKey
from apps.attribution.models import PixelEvent, ClickTracking, AttributionEvent
from .serializers import (
    PixelEventSerializer,
    PixelEventCreateSerializer,
    ClickTrackingSerializer,
    AttributionEventSerializer,
)


class PixelEventViewSet(viewsets.ModelViewSet):
    """
    ViewSet for pixel events.
    Supports both authenticated access and API key access for the tracking pixel.
    """

    def get_permissions(self):
        if self.action == "create":
            return [AllowAny()]
        return [IsOrganizationMember()]

    def get_serializer_class(self):
        if self.action == "create":
            return PixelEventCreateSerializer
        return PixelEventSerializer

    def get_queryset(self):
        organization = get_request_organization(self.request)
        if not organization:
            return PixelEvent.objects.none()
        return PixelEvent.objects.filter(organization=organization).order_by("-timestamp")

    def create(self, request, *args, **kwargs):
        """Create pixel event from tracking pixel."""
        # Get API key from header or query param
        api_key = request.headers.get("X-API-Key") or request.query_params.get("api_key")
        if not api_key:
            return Response(
                {"error": "API key required"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        # Verify API key
        api_key_obj = APIKey.verify_key(api_key)
        if not api_key_obj:
            return Response(
                {"error": "Invalid API key"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        # Update last used
        api_key_obj.last_used_at = timezone.now()
        api_key_obj.save(update_fields=["last_used_at"])

        # Validate data
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        # Create pixel event
        pixel_event = PixelEvent.objects.create(
            organization=api_key_obj.organization,
            timestamp=data.get("timestamp") or timezone.now(),
            ip_address=self._get_client_ip(request),
            user_agent=request.headers.get("User-Agent", ""),
            **{k: v for k, v in data.items() if k != "timestamp"},
        )

        return Response(
            PixelEventSerializer(pixel_event).data,
            status=status.HTTP_201_CREATED,
        )

    def _get_client_ip(self, request):
        """Extract client IP from request."""
        x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
        if x_forwarded_for:
            return x_forwarded_for.split(",")[0].strip()
        return request.META.get("REMOTE_ADDR")


class ClickTrackingViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for click tracking data."""

    serializer_class = ClickTrackingSerializer
    permission_classes = [IsOrganizationMember]

    def get_queryset(self):
        organization = get_request_organization(self.request)
        if not organization:
            return ClickTracking.objects.none()
        return ClickTracking.objects.filter(organization=organization).order_by("-timestamp")


class AttributionEventViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for attribution events."""

    serializer_class = AttributionEventSerializer
    permission_classes = [IsOrganizationMember]

    def get_queryset(self):
        organization = get_request_organization(self.request)
        if not organization:
            return AttributionEvent.objects.none()

        queryset = AttributionEvent.objects.filter(organization=organization)

        # Filter by source
        source = self.request.query_params.get("source")
        if source:
            queryset = queryset.filter(source=source)

        # Filter by date range
        start_date = self.request.query_params.get("start_date")
        end_date = self.request.query_params.get("end_date")

        if start_date:
            queryset = queryset.filter(timestamp__gte=start_date)
        if end_date:
            queryset = queryset.filter(timestamp__lte=end_date)

        return queryset.order_by("-timestamp")
