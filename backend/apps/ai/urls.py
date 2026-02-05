from django.urls import path

from apps.ai.api.views import ChatView, ThreadDetailView

urlpatterns = [
    path("chat/", ChatView.as_view(), name="ai-chat"),
    path("threads/<int:thread_id>/", ThreadDetailView.as_view(), name="ai-thread"),
]
