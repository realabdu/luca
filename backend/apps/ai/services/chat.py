"""Chat service for AI insights."""

from __future__ import annotations

import json
from datetime import date

from django.conf import settings
from django.db.models import Sum
from django.utils import timezone

from apps.analytics.models import DailyMetrics
from apps.ai.models import ChatThread, ChatMessage
from apps.ai.services.rag import default_date_range, retrieve_documents, ensure_documents
from apps.ai.services.openai_client import get_openai_client


def compute_facts(organization_id: int, start_date: date, end_date: date) -> dict:
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

    return {
        "total_sales": total_sales,
        "total_spend": total_spend,
        "total_expenses": total_expenses,
        "total_orders": total_orders,
        "total_new_customers": total_new_customers,
        "net_profit": net_profit,
        "aov": aov,
        "roas": roas,
        "mer": mer,
        "net_margin": net_margin,
        "ncpa": ncpa,
        "data_points": metrics_qs.count(),
    }


def build_context(facts: dict, documents: list) -> str:
    facts_block = "\n".join([
        f"- {key}: {value}" for key, value in facts.items()
    ])

    docs_block = "\n\n".join([
        f"[Doc: {doc.doc_type}]\n{doc.content}" for doc in documents
    ])

    return (
        "You are a data assistant for an e-commerce analytics dashboard.\n"
        "Answer ONLY using the provided facts and documents.\n"
        "If a question requires missing data, respond that the data is unavailable and suggest syncing.\n"
        "Return JSON only with keys: answer (string), citations (array), follow_ups (array of strings).\n"
        "Each citation should include label, source, and data.\n\n"
        "Facts:\n"
        f"{facts_block}\n\n"
        "Documents:\n"
        f"{docs_block}\n"
    )


def parse_llm_json(raw: str) -> dict:
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {
            "answer": raw.strip(),
            "citations": [],
            "follow_ups": [],
        }


def build_response_payload(answer: str, facts: dict, documents: list) -> dict:
    citations = [
        {
            "label": "Daily metrics (aggregated)",
            "data": facts,
            "source": "daily_metrics",
        }
    ]

    for doc in documents:
        citations.append(
            {
                "label": f"{doc.doc_type} {doc.start_date}..{doc.end_date}",
                "data": doc.metadata,
                "source": f"rag:{doc.id}",
            }
        )

    return {
        "answer": answer,
        "citations": citations,
        "follow_ups": [
            "What drove the biggest change in ROAS?",
            "Which campaigns should we pause?",
            "Where are we losing margin?",
        ],
    }


def generate_chat_response(
    *,
    organization_id: int,
    thread: ChatThread,
    message: str,
    start_date: date | None = None,
    end_date: date | None = None,
) -> dict:
    if not start_date or not end_date:
        start_date, end_date = default_date_range()

    facts = compute_facts(organization_id, start_date, end_date)
    ensure_documents(organization_id, start_date, end_date)
    documents = retrieve_documents(organization_id, message, start_date, end_date)
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
        return payload

    if not settings.OPENAI_API_KEY:
        answer = "AI is not configured yet. Please set OPENAI_API_KEY."
        payload = build_response_payload(answer, facts, documents)
        ChatMessage.objects.create(
            thread=thread,
            role=ChatMessage.Role.ASSISTANT,
            content=payload["answer"],
            citations=payload["citations"],
            model=settings.OPENAI_CHAT_MODEL,
        )
        thread.last_message_at = timezone.now()
        thread.save(update_fields=["last_message_at"])
        return payload

    client = get_openai_client()
    response = client.chat.completions.create(
        model=settings.OPENAI_CHAT_MODEL,
        messages=[
            {"role": "system", "content": context},
            {"role": "user", "content": message},
        ],
        response_format={"type": "json_object"},
        temperature=0.2,
    )

    content = response.choices[0].message.content or ""
    parsed = parse_llm_json(content)

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

    return payload


def stream_chat_response(
    *,
    organization_id: int,
    thread: ChatThread,
    message: str,
    start_date: date | None = None,
    end_date: date | None = None,
) -> tuple[str, dict]:
    if not start_date or not end_date:
        start_date, end_date = default_date_range()

    facts = compute_facts(organization_id, start_date, end_date)
    ensure_documents(organization_id, start_date, end_date)
    documents = retrieve_documents(organization_id, message, start_date, end_date)
    context = build_context(facts, documents)

    if not settings.OPENAI_API_KEY:
        answer = "AI is not configured yet. Please set OPENAI_API_KEY."
        payload = build_response_payload(answer, facts, documents)
        return answer, payload

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

    content = ""
    for chunk in stream:
        delta = chunk.choices[0].delta
        if delta and delta.content:
            content += delta.content

    parsed = parse_llm_json(content)
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

    return content, payload
