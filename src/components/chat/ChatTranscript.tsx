import { useEffect, useRef, useState } from "react";
import { ArrowDown, Bot } from "lucide-react";
import type { ChatStatus, UIMessage } from "ai";
import { ChatMessage } from "./ChatMessage";

// The suggestions are part of this component's contract, and its tests import
// them from here.
// eslint-disable-next-line react/only-export-components
export const CHAT_SUGGESTIONS = [
  "What movies are available?",
  "Which one is best rated?",
  "Tell me about Dune: Part Two",
];

/** Stand-in for the assistant message that has not started streaming yet. */
const PENDING_ASSISTANT_MESSAGE: UIMessage = {
  id: "pending-assistant",
  role: "assistant",
  parts: [],
};

type ChatTranscriptProps = {
  messages: UIMessage[];
  status: ChatStatus;
  /** Called when a starter suggestion is picked. */
  onSuggestion: (text: string) => void;
};

/**
 * The scrollable conversation: empty state, messages, and the follow-along
 * behaviour (auto-scroll only while the reader is already at the bottom).
 */
export function ChatTranscript({
  messages,
  status,
  onSuggestion,
}: ChatTranscriptProps) {
  const [isAtBottom, setIsAtBottom] = useState(true);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const atBottomRef = useRef(true);

  const busy = status === "submitted" || status === "streaming";

  const scrollToBottom = (smooth = false) => {
    const element = scrollRef.current;
    if (!element) return;
    element.scrollTo({
      top: element.scrollHeight,
      behavior: smooth ? "smooth" : "auto",
    });
  };

  const handleScroll = () => {
    const element = scrollRef.current;
    if (!element) return;

    const atBottom =
      element.scrollHeight - element.scrollTop - element.clientHeight <= 80;

    atBottomRef.current = atBottom;
    setIsAtBottom(atBottom);
  };

  const jumpToLatest = () => {
    atBottomRef.current = true;
    setIsAtBottom(true);
    scrollToBottom(true);
  };

  // Follow new content only while the reader is already at the bottom.
  useEffect(() => {
    if (atBottomRef.current) scrollToBottom();
  }, [messages, status]);

  const lastMessage = messages[messages.length - 1];
  const awaitingFirstChunk =
    status === "submitted" && lastMessage?.role === "user";

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        role="log"
        aria-label="Conversation"
        aria-live="polite"
        aria-relevant="additions text"
        aria-atomic="false"
        className="h-[55vh] min-h-[320px] space-y-4 overflow-y-auto p-4 sm:p-5"
      >
        {messages.length === 0 ? (
          <EmptyState disabled={busy} onSuggestion={onSuggestion} />
        ) : (
          <>
            {messages.map((message, index) => {
              const isLast = index === messages.length - 1;

              return (
                <ChatMessage
                  key={message.id}
                  message={message}
                  pending={isLast && status === "submitted"}
                  streaming={isLast && status === "streaming"}
                />
              );
            })}

            {awaitingFirstChunk && (
              <ChatMessage message={PENDING_ASSISTANT_MESSAGE} pending />
            )}
          </>
        )}
      </div>

      {!isAtBottom && messages.length > 0 && (
        <button
          type="button"
          onClick={jumpToLatest}
          aria-label="Jump to latest message"
          className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-[#14181a] px-3 py-1.5 text-xs font-medium text-[#f3f1ec] shadow-lg ring-1 ring-[#262b2f] transition-colors hover:bg-[#242a2e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8a73e] focus-visible:ring-offset-2 focus-visible:ring-offset-[#14181a]"
        >
          <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" focusable="false" />
          Jump to latest
        </button>
      )}
    </div>
  );
}

function EmptyState({
  disabled,
  onSuggestion,
}: {
  disabled: boolean;
  onSuggestion: (text: string) => void;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#242a2e]" aria-hidden="true">
        <Bot className="h-6 w-6 text-[#e8a73e]" aria-hidden="true" focusable="false" />
      </div>

      <p className="max-w-sm text-sm text-[#9aa1a6]">
        Try one of these to get started:
      </p>

      <div className="flex flex-wrap items-center justify-center gap-2">
        {CHAT_SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => onSuggestion(suggestion)}
            disabled={disabled}
            className="rounded-full bg-[#242a2e] px-3 py-1.5 text-xs font-medium text-[#f3f1ec] transition-colors hover:bg-[#2d3438] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}
