'use client';

import { useMemo, useState } from 'react';
import { Bot } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { useInsightsChat } from '@/hooks/use-insights-chat';
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import { Message, MessageContent, MessageResponse } from '@/components/ai-elements/message';
import type { DateRange } from '@/components/dashboard/DateRangeSelector';

interface InsightsChatPanelProps {
  dateRange: DateRange;
  className?: string;
}

export default function InsightsChatPanel({ dateRange, className }: InsightsChatPanelProps) {
  const { messages, isStreaming, sendMessage } = useInsightsChat();
  const [input, setInput] = useState('');

  const apiDateRange = useMemo(() => {
    const formatDate = (value: Date) => {
      const year = value.getFullYear();
      const month = String(value.getMonth() + 1).padStart(2, '0');
      const day = String(value.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    return {
      start_date: formatDate(dateRange.startDate),
      end_date: formatDate(dateRange.endDate),
    };
  }, [dateRange]);

  const rangeLabel = useMemo(() => {
    const start = dateRange.startDate.toLocaleDateString();
    const end = dateRange.endDate.toLocaleDateString();
    return `${start} - ${end}`;
  }, [dateRange]);

  const handleSubmit = async () => {
    if (!input.trim()) return;
    const text = input;
    setInput('');
    await sendMessage(text, apiDateRange);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  };

  const suggestions = [
    'Why did ROAS change this month?',
    'Which campaigns are hurting margin?',
    'What should I focus on next week?',
  ];

  return (
    <div className={cn('flex h-full flex-col rounded-xl border border-border-light bg-white', className)}>
      <div className="flex items-center justify-between border-b border-border-light px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Bot className="size-4" />
          AI Insights
        </div>
        <span className="text-xs text-text-muted">{rangeLabel}</span>
      </div>

      <div className="flex-1 overflow-hidden">
        <Conversation className="h-full">
          <ConversationContent>
            {messages.length === 0 ? (
              <ConversationEmptyState
                title="Ask about your store"
                description="Get deeper insights from your metrics, orders, and campaigns."
                icon={<Bot className="size-6" />}
              >
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      className="rounded-full border border-border-light px-3 py-1 text-xs text-text-muted hover:text-text"
                      onClick={() => setInput(suggestion)}
                      type="button"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </ConversationEmptyState>
            ) : (
              messages.map((message) => (
                <Message key={message.id} from={message.role}>
                  <MessageContent>
                    {message.role === 'assistant' ? (
                      <MessageResponse>{message.content}</MessageResponse>
                    ) : (
                      <p>{message.content}</p>
                    )}
                  </MessageContent>
                  {message.citations && message.citations.length > 0 && (
                    <div className="flex flex-wrap gap-2 text-[11px] text-text-muted">
                      {message.citations.map((citation) => (
                        <span
                          key={citation.source}
                          className="rounded-full border border-border-light px-2 py-1"
                        >
                          {citation.label}
                        </span>
                      ))}
                    </div>
                  )}
                  {message.followUps && message.followUps.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {message.followUps.map((followUp) => (
                        <button
                          key={followUp}
                          className="rounded-full bg-secondary px-3 py-1 text-xs text-foreground"
                          onClick={() => setInput(followUp)}
                          type="button"
                        >
                          {followUp}
                        </button>
                      ))}
                    </div>
                  )}
                </Message>
              ))
            )}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
      </div>

      <div className="border-t border-border-light p-3">
        <div className="flex items-end gap-2">
          <textarea
            className="min-h-[48px] flex-1 resize-none rounded-lg border border-border-light px-3 py-2 text-sm outline-none focus:border-black"
            placeholder="Ask about ROAS, net profit, or campaigns..."
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
          />
          <Button onClick={handleSubmit} disabled={isStreaming || !input.trim()}>
            {isStreaming ? 'Thinking...' : 'Send'}
          </Button>
        </div>
      </div>
    </div>
  );
}
