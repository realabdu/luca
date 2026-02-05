'use client';

import { useCallback, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { nanoid } from 'nanoid';
import { useApiClient } from '@/providers/ApiProvider';

export interface ChatCitation {
  label: string;
  data: Record<string, unknown>;
  source: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: ChatCitation[];
  followUps?: string[];
}

interface DateRangePayload {
  start_date: string;
  end_date: string;
}

const toWsUrl = (baseUrl: string) => {
  if (!baseUrl) return '';
  if (baseUrl.startsWith('https://')) return baseUrl.replace('https://', 'wss://');
  if (baseUrl.startsWith('http://')) return baseUrl.replace('http://', 'ws://');
  return baseUrl;
};

export function useInsightsChat() {
  const apiClient = useApiClient();
  const { getToken } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [threadId, setThreadId] = useState<number | null>(null);

  const sendRest = useCallback(
    async (text: string, dateRange: DateRangePayload | undefined, assistantId: string) => {
      try {
        const response = await apiClient.post<{
          thread_id: number;
          assistant_message: string;
          citations: ChatCitation[];
          follow_ups: string[];
        }>('ai/chat/', {
          thread_id: threadId,
          message: text,
          date_range: dateRange,
        });

        setThreadId(response.thread_id);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantId
              ? {
                  ...msg,
                  content: response.assistant_message,
                  citations: response.citations,
                  followUps: response.follow_ups,
                }
              : msg
          )
        );
      } catch {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantId
              ? {
                  ...msg,
                  content: 'Something went wrong while fetching insights.',
                }
              : msg
          )
        );
      }
    },
    [apiClient, threadId]
  );

  const sendMessage = useCallback(
    async (text: string, dateRange?: DateRangePayload) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      const userMessage: ChatMessage = {
        id: nanoid(),
        role: 'user',
        content: trimmed,
      };

      const assistantId = `assistant-${nanoid()}`;
      const assistantMessage: ChatMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
      };

      setMessages((prev) => [...prev, userMessage, assistantMessage]);
      setIsStreaming(true);

      const token = await getToken();
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const wsUrl = `${toWsUrl(baseUrl)}/ws/ai-chat/`;

      try {
        if (!token) {
          await sendRest(trimmed, dateRange, assistantId);
          setIsStreaming(false);
          return;
        }
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          ws.send(
            JSON.stringify({
              token,
              thread_id: threadId,
              message: trimmed,
              date_range: dateRange,
            })
          );
        };

        ws.onmessage = (event) => {
          let data: any;
          try {
            data = JSON.parse(event.data);
          } catch {
            return;
          }
          if (data.type === 'thread' && data.thread_id) {
            setThreadId(data.thread_id);
          }
          if (data.type === 'token') {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantId
                  ? { ...msg, content: msg.content + data.text }
                  : msg
              )
            );
          }
          if (data.type === 'final') {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantId
                  ? {
                      ...msg,
                      content: data.message,
                      citations: data.citations,
                      followUps: data.follow_ups,
                    }
                  : msg
              )
            );
            setIsStreaming(false);
            ws.close();
          }
          if (data.type === 'error') {
            ws.close();
            setIsStreaming(false);
          }
        };

        ws.onerror = async () => {
          ws.close();
          await sendRest(trimmed, dateRange, assistantId);
          setIsStreaming(false);
        };
      } catch {
        await sendRest(trimmed, dateRange, assistantId);
        setIsStreaming(false);
      }
    },
    [getToken, sendRest, threadId]
  );

  return {
    messages,
    isStreaming,
    sendMessage,
  };
}
