"""RAG document building and retrieval helpers."""

from __future__ import annotations

import hashlib
from datetime import date, timedelta

from django.conf import settings
from django.db.models import Sum
from django.utils import timezone
from pgvector.django import CosineDistance

from apps.analytics.models import DailyMetrics
from apps.campaigns.models import Campaign
from apps.orders.models import Order, Refund
from apps.ai.models import RagDocument
from .openai_client import get_openai_client


def default_date_range() -> tuple[date, date]:
    end_date = timezone.now().date()
    start_date = end_date - timedelta(days=30)
    return start_date, end_date


def _hash_content(content: str) -> str:
    return hashlib.sha256(content.encode("utf-8")).hexdigest()


def _build_metrics_content(organization_id: int, start_date: date, end_date: date) -> tuple[str, dict]:
    metrics_qs = DailyMetrics.objects.filter(
        organization_id=organization_id,
        date__gte=start_date,
        date__lte=end_date,
    )

    aggregates = metrics_qs.aggregate(
        total_gross_revenue=Sum("gross_revenue"),
        total_revenue=Sum("revenue"),
        total_refunds=Sum("total_refunds"),
        total_orders=Sum("orders_count"),
        total_spend=Sum("total_spend"),
        total_expenses=Sum("total_expenses"),
        total_new_customers=Sum("new_customers_count"),
    )

    total_sales = float(aggregates["total_revenue"] or 0)
    total_spend = float(aggregates["total_spend"] or 0)
    total_expenses = float(aggregates["total_expenses"] or 0)
    total_orders = int(aggregates["total_orders"] or 0)
    total_new_customers = int(aggregates["total_new_customers"] or 0)

    net_profit = total_sales - total_spend - total_expenses
    aov = total_sales / total_orders if total_orders > 0 else 0
    roas = total_sales / total_spend if total_spend > 0 else 0
    mer = (total_spend / total_sales * 100) if total_sales > 0 else 0
    net_margin = (net_profit / total_sales * 100) if total_sales > 0 else 0
    ncpa = total_spend / total_new_customers if total_new_customers > 0 else 0

    content = (
        "Metrics summary for the selected period:\n"
        f"Total sales: {total_sales:,.2f} SAR\n"
        f"Total spend: {total_spend:,.2f} SAR\n"
        f"Total expenses: {total_expenses:,.2f} SAR\n"
        f"Net profit: {net_profit:,.2f} SAR\n"
        f"Total orders: {total_orders}\n"
        f"New customers: {total_new_customers}\n"
        f"Average order value: {aov:,.2f} SAR\n"
        f"ROAS: {roas:.2f}\n"
        f"MER: {mer:.1f}%\n"
        f"Net margin: {net_margin:.1f}%\n"
        f"NCPA: {ncpa:,.2f} SAR\n"
    )

    metadata = {
        "total_sales": total_sales,
        "total_spend": total_spend,
        "total_expenses": total_expenses,
        "net_profit": net_profit,
        "total_orders": total_orders,
        "new_customers": total_new_customers,
        "aov": aov,
        "roas": roas,
        "mer": mer,
        "net_margin": net_margin,
        "ncpa": ncpa,
    }

    return content, metadata


def _build_orders_content(organization_id: int, start_date: date, end_date: date) -> tuple[str, dict]:
    orders = Order.objects.filter(
        organization_id=organization_id,
        order_date__date__gte=start_date,
        order_date__date__lte=end_date,
    )

    refunds = Refund.objects.filter(
        organization_id=organization_id,
        refund_date__date__gte=start_date,
        refund_date__date__lte=end_date,
    )

    total_orders = orders.count()
    total_revenue = float(orders.aggregate(total=Sum("total_amount"))['total'] or 0)
    total_refunds = float(refunds.aggregate(total=Sum("amount"))['total'] or 0)
    new_customers = orders.filter(is_new_customer=True).count()

    source_breakdown = {}
    for source in orders.values_list("source", flat=True):
        source_breakdown[source] = source_breakdown.get(source, 0) + 1

    content = (
        "Orders summary for the selected period:\n"
        f"Total orders: {total_orders}\n"
        f"Total order revenue: {total_revenue:,.2f} SAR\n"
        f"Refunds: {total_refunds:,.2f} SAR\n"
        f"New customers: {new_customers}\n"
        f"Orders by source: {source_breakdown}\n"
    )

    metadata = {
        "total_orders": total_orders,
        "total_revenue": total_revenue,
        "total_refunds": total_refunds,
        "new_customers": new_customers,
        "orders_by_source": source_breakdown,
    }

    return content, metadata


def _build_campaigns_content(organization_id: int, start_date: date, end_date: date) -> tuple[str, dict]:
    campaigns = Campaign.objects.filter(organization_id=organization_id)
    if campaigns.filter(last_sync_at__isnull=False).exists():
        campaigns = campaigns.filter(
            last_sync_at__date__gte=start_date,
            last_sync_at__date__lte=end_date,
        )

    total_spend = float(campaigns.aggregate(total=Sum("spend"))['total'] or 0)
    total_revenue = float(campaigns.aggregate(total=Sum("revenue"))['total'] or 0)
    avg_roas = float(campaigns.aggregate(total=Sum("roas"))['total'] or 0)
    count = campaigns.count() or 1
    avg_roas = avg_roas / count

    top_campaigns = list(
        campaigns.order_by("-spend")
        .values("name", "platform", "spend", "roas", "conversions")[:5]
    )

    content = (
        "Campaigns summary for the selected period:\n"
        f"Total campaign spend: {total_spend:,.2f} SAR\n"
        f"Total campaign revenue: {total_revenue:,.2f} SAR\n"
        f"Average ROAS across campaigns: {avg_roas:.2f}\n"
        f"Top campaigns by spend: {top_campaigns}\n"
    )

    metadata = {
        "total_spend": total_spend,
        "total_revenue": total_revenue,
        "avg_roas": avg_roas,
        "top_campaigns": top_campaigns,
    }

    return content, metadata


def build_rag_documents(organization_id: int, start_date: date, end_date: date) -> list[RagDocument]:
    documents = []

    builders = [
        (RagDocument.DocType.METRICS, _build_metrics_content),
        (RagDocument.DocType.ORDERS, _build_orders_content),
        (RagDocument.DocType.CAMPAIGNS, _build_campaigns_content),
    ]

    client = get_openai_client() if settings.OPENAI_API_KEY else None

    for doc_type, builder in builders:
        content, metadata = builder(organization_id, start_date, end_date)
        content_hash = _hash_content(content)

        existing = RagDocument.objects.filter(
            organization_id=organization_id,
            doc_type=doc_type,
            start_date=start_date,
            end_date=end_date,
        ).first()

        should_reembed = existing is None or existing.content_hash != content_hash or existing.embedding is None

        doc, _ = RagDocument.objects.update_or_create(
            organization_id=organization_id,
            doc_type=doc_type,
            start_date=start_date,
            end_date=end_date,
            defaults={
                "content": content,
                "content_hash": content_hash,
                "metadata": metadata,
            },
        )

        if not client:
            documents.append(doc)
            continue

        if should_reembed:
            embedding = client.embeddings.create(
                model=settings.OPENAI_EMBEDDING_MODEL,
                input=content,
            ).data[0].embedding
            doc.embedding = embedding
            doc.save(update_fields=["embedding", "content_hash", "content", "metadata", "updated_at"])

        documents.append(doc)

    return documents


def ensure_documents(organization_id: int, start_date: date, end_date: date) -> list[RagDocument]:
    existing = RagDocument.objects.filter(
        organization_id=organization_id,
        start_date=start_date,
        end_date=end_date,
    )
    if existing.exists():
        if settings.OPENAI_API_KEY and existing.filter(embedding__isnull=True).exists():
            return build_rag_documents(organization_id, start_date, end_date)
        return list(existing)

    return build_rag_documents(organization_id, start_date, end_date)


def retrieve_documents(organization_id: int, query: str, start_date: date, end_date: date, k: int = 4) -> list[RagDocument]:
    if not settings.OPENAI_API_KEY:
        return []

    client = get_openai_client()
    embedding = client.embeddings.create(
        model=settings.OPENAI_EMBEDDING_MODEL,
        input=query,
    ).data[0].embedding

    return list(
        RagDocument.objects.filter(
            organization_id=organization_id,
            start_date=start_date,
            end_date=end_date,
            embedding__isnull=False,
        )
        .order_by(CosineDistance("embedding", embedding))
        .all()[:k]
    )
