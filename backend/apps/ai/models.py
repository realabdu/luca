"""AI models for RAG documents and chat history."""

from django.conf import settings
from django.db import models
from pgvector.django import VectorField, HnswIndex

from apps.core.models import TimeStampedModel
from apps.accounts.models import Organization, User


class RagDocument(TimeStampedModel):
    class DocType(models.TextChoices):
        METRICS = "metrics_summary", "Metrics Summary"
        ORDERS = "orders_summary", "Orders Summary"
        CAMPAIGNS = "campaigns_summary", "Campaigns Summary"

    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="rag_documents",
    )
    doc_type = models.CharField(max_length=40, choices=DocType.choices)
    start_date = models.DateField(db_index=True)
    end_date = models.DateField(db_index=True)
    content = models.TextField()
    content_hash = models.CharField(max_length=64, db_index=True)
    metadata = models.JSONField(default=dict, blank=True)
    embedding = VectorField(dimensions=settings.AI_EMBEDDING_DIM, null=True, blank=True)

    class Meta:
        verbose_name = "RAG Document"
        verbose_name_plural = "RAG Documents"
        indexes = [
            models.Index(fields=["organization", "doc_type", "start_date", "end_date"]),
            HnswIndex(
                name="rag_doc_embedding_hnsw",
                fields=["embedding"],
                m=16,
                ef_construction=200,
                opclasses=["vector_cosine_ops"],
            ),
        ]

    def __str__(self) -> str:
        return f"{self.organization.name} - {self.doc_type} ({self.start_date}..{self.end_date})"


class ChatThread(TimeStampedModel):
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="chat_threads",
    )
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="chat_threads",
    )
    title = models.CharField(max_length=120, blank=True)
    default_start_date = models.DateField(null=True, blank=True)
    default_end_date = models.DateField(null=True, blank=True)
    last_message_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Chat Thread"
        verbose_name_plural = "Chat Threads"
        indexes = [
            models.Index(fields=["organization", "created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.organization.name} - {self.title or 'Untitled Thread'}"


class ChatMessage(TimeStampedModel):
    class Role(models.TextChoices):
        USER = "user", "User"
        ASSISTANT = "assistant", "Assistant"
        SYSTEM = "system", "System"

    thread = models.ForeignKey(
        ChatThread,
        on_delete=models.CASCADE,
        related_name="messages",
    )
    role = models.CharField(max_length=20, choices=Role.choices)
    content = models.TextField()
    citations = models.JSONField(default=list, blank=True)
    model = models.CharField(max_length=120, blank=True)

    class Meta:
        verbose_name = "Chat Message"
        verbose_name_plural = "Chat Messages"
        indexes = [
            models.Index(fields=["thread", "created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.thread_id} - {self.role}"
