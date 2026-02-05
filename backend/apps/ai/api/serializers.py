"""Serializers for AI chat."""

from rest_framework import serializers

from apps.ai.models import ChatMessage, ChatThread


class ChatMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatMessage
        fields = ["id", "role", "content", "citations", "created_at"]


class ChatThreadSerializer(serializers.ModelSerializer):
    messages = ChatMessageSerializer(many=True, read_only=True)

    class Meta:
        model = ChatThread
        fields = [
            "id",
            "title",
            "default_start_date",
            "default_end_date",
            "created_at",
            "messages",
        ]
