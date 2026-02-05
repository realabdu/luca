"""WebSocket consumers for AI chat."""

from datetime import date

from channels.generic.websocket import JsonWebsocketConsumer
from django.utils import timezone

from apps.accounts.models import Organization
from apps.core.authentication import ClerkJWTAuthentication
from apps.ai.models import ChatThread, ChatMessage
from apps.ai.services.chat import (
    compute_facts,
    build_context,
    build_response_payload,
    parse_llm_json,
)
from apps.ai.services.openai_client import get_openai_client
from apps.ai.services.rag import default_date_range, retrieve_documents, ensure_documents
from django.conf import settings


class AIChatConsumer(JsonWebsocketConsumer):
    """Streams AI chat responses over WebSocket."""

    def connect(self):
        self.user = None
        self.organization = None
        self.accept()

    def _authenticate(self, token: str) -> bool:
        if not token:
            return False

        auth = ClerkJWTAuthentication()
        try:
            payload = auth._verify_token(token)
        except Exception:
            return False

        clerk_id = payload.get("sub")
        org_id = payload.get("org_id")
        if not clerk_id or not org_id:
            return False

        user = auth._get_or_create_user(clerk_id, payload)
        try:
            organization = Organization.objects.get(clerk_org_id=org_id)
        except Organization.DoesNotExist:
            return False

        self.user = user
        self.organization = organization
        return True

    def receive_json(self, content, **kwargs):
        if not self.organization:
            token = content.get("token")
            if not self._authenticate(token):
                self.send_json({"type": "error", "message": "Unauthorized"})
                self.close()
                return

        message = (content.get("message") or "").strip()
        if not message:
            self.send_json({"type": "error", "message": "Message is required"})
            return

        date_range = content.get("date_range") or {}
        start_date = self._parse_date(date_range.get("start_date"))
        end_date = self._parse_date(date_range.get("end_date"))

        thread_id = content.get("thread_id")
        thread = None
        if thread_id:
            thread = ChatThread.objects.filter(id=thread_id, organization=self.organization).first()
        if not thread:
            thread = ChatThread.objects.create(
                organization=self.organization,
                created_by=self.user,
                title="AI Insights",
                default_start_date=start_date,
                default_end_date=end_date,
            )

        ChatMessage.objects.create(
            thread=thread,
            role=ChatMessage.Role.USER,
            content=message,
        )

        self.send_json({"type": "thread", "thread_id": thread.id})

        if not start_date or not end_date:
            start_date, end_date = default_date_range()

        facts = compute_facts(self.organization.id, start_date, end_date)
        ensure_documents(self.organization.id, start_date, end_date)
        documents = retrieve_documents(self.organization.id, message, start_date, end_date)
        context = build_context(facts, documents)

        if facts.get("data_points", 0) == 0:
            payload = build_response_payload(
                "I don't have any metrics for that date range yet. Try syncing your data and ask again.",
                facts,
                documents,
            )
            ChatMessage.objects.create(
                thread=thread,
                role=ChatMessage.Role.ASSISTANT,
                content=payload["answer"],
                citations=payload["citations"],
                model=settings.OPENAI_CHAT_MODEL,
            )
            thread.last_message_at = timezone.now()
            thread.save(update_fields=["last_message_at"])
            self.send_json({
                "type": "final",
                "message": payload["answer"],
                "citations": payload["citations"],
                "follow_ups": payload["follow_ups"],
            })
            return

        if not settings.OPENAI_API_KEY:
            payload = build_response_payload(
                "AI is not configured yet. Please set OPENAI_API_KEY.",
                facts,
                documents,
            )
            ChatMessage.objects.create(
                thread=thread,
                role=ChatMessage.Role.ASSISTANT,
                content=payload["answer"],
                citations=payload["citations"],
                model=settings.OPENAI_CHAT_MODEL,
            )
            thread.last_message_at = timezone.now()
            thread.save(update_fields=["last_message_at"])
            self.send_json({
                "type": "final",
                "message": payload["answer"],
                "citations": payload["citations"],
                "follow_ups": payload["follow_ups"],
            })
            return

        client = get_openai_client()
        stream = client.chat.completions.create(
            model=settings.OPENAI_CHAT_MODEL,
            messages=[
                {"role": "system", "content": context},
                {"role": "user", "content": message},
            ],
            response_format={"type": "json_object"},
            temperature=0.2,
            stream=True,
        )

        content_accum = ""
        for chunk in stream:
            delta = chunk.choices[0].delta
            if delta and delta.content:
                content_accum += delta.content
                self.send_json({"type": "token", "text": delta.content})

        parsed = parse_llm_json(content_accum)
        payload = build_response_payload(parsed.get("answer", ""), facts, documents)
        payload["follow_ups"] = parsed.get("follow_ups", payload["follow_ups"])

        ChatMessage.objects.create(
            thread=thread,
            role=ChatMessage.Role.ASSISTANT,
            content=payload["answer"],
            citations=payload["citations"],
            model=settings.OPENAI_CHAT_MODEL,
        )

        thread.last_message_at = timezone.now()
        thread.save(update_fields=["last_message_at"])

        self.send_json({
            "type": "final",
            "message": payload["answer"],
            "citations": payload["citations"],
            "follow_ups": payload["follow_ups"],
        })

    @staticmethod
    def _parse_date(value: str | None) -> date | None:
        if not value:
            return None
        try:
            return timezone.datetime.strptime(value, "%Y-%m-%d").date()
        except ValueError:
            return None
