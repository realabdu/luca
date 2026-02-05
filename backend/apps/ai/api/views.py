"""API views for AI chat."""

from datetime import date

from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.permissions import OrganizationRequiredMixin, IsOrganizationMember, get_request_organization
from apps.ai.models import ChatThread, ChatMessage
from apps.ai.api.serializers import ChatThreadSerializer
from apps.ai.services.chat import generate_chat_response


def _parse_date(value: str | None) -> date | None:
    if not value:
        return None
    try:
        return timezone.datetime.strptime(value, "%Y-%m-%d").date()
    except ValueError:
        return None


class ChatView(OrganizationRequiredMixin, APIView):
    permission_classes = [IsOrganizationMember]

    def post(self, request):
        organization = get_request_organization(request)
        if not organization:
            return Response({"detail": "Organization required"}, status=400)

        message = request.data.get("message", "").strip()
        if not message:
            return Response({"detail": "Message is required"}, status=400)

        thread_id = request.data.get("thread_id")
        date_range = request.data.get("date_range") or {}
        start_date = _parse_date(date_range.get("start_date"))
        end_date = _parse_date(date_range.get("end_date"))

        if thread_id:
            thread = ChatThread.objects.filter(id=thread_id, organization=organization).first()
        else:
            thread = None

        if not thread:
            thread = ChatThread.objects.create(
                organization=organization,
                created_by=request.user,
                title="AI Insights",
                default_start_date=start_date,
                default_end_date=end_date,
            )

        ChatMessage.objects.create(
            thread=thread,
            role=ChatMessage.Role.USER,
            content=message,
        )

        payload = generate_chat_response(
            organization_id=organization.id,
            thread=thread,
            message=message,
            start_date=start_date,
            end_date=end_date,
        )

        return Response(
            {
                "thread_id": thread.id,
                "assistant_message": payload["answer"],
                "citations": payload["citations"],
                "follow_ups": payload["follow_ups"],
            }
        )


class ThreadDetailView(OrganizationRequiredMixin, APIView):
    permission_classes = [IsOrganizationMember]

    def get(self, request, thread_id: int):
        organization = get_request_organization(request)
        if not organization:
            return Response({"detail": "Organization required"}, status=400)

        thread = ChatThread.objects.filter(id=thread_id, organization=organization).first()
        if not thread:
            return Response({"detail": "Thread not found"}, status=404)

        serializer = ChatThreadSerializer(thread)
        return Response(serializer.data)
