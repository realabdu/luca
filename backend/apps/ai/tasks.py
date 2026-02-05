"""Celery tasks for RAG document building."""

from datetime import date, timedelta

from celery import shared_task
from django.utils import timezone

from apps.accounts.models import Organization
from apps.ai.services.rag import build_rag_documents


@shared_task
def build_rag_documents_for_org(organization_id: int, start_date: str | None = None, end_date: str | None = None):
    if start_date and end_date:
        start = date.fromisoformat(start_date)
        end = date.fromisoformat(end_date)
    else:
        end = timezone.now().date()
        start = end - timedelta(days=30)

    build_rag_documents(organization_id, start, end)


@shared_task
def build_rag_documents_nightly():
    end = timezone.now().date()
    start = end - timedelta(days=30)

    for org in Organization.objects.all():
        build_rag_documents(org.id, start, end)
