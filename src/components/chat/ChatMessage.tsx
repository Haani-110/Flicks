import type { ReactNode } from "react";
import type { UIMessage } from "ai";
import { cn } from "@/utils/cn";
import {
  isDataUIPart,
  isFileUIPart,
  isReasoningUIPart,
  isSourcePart,
  isTextUIPart,
  isToolUIPart,
  messageHasContent,
  partKey,
  type ChatPart,
  type ChatSourcePart,
} from "./parts";
import { ToolCallCard } from "./ToolCallCard";

type ChatMessageProps = {
  message: UIMessage;
  /** Request accepted, no content yet: show the thinking state. */
  pending?: boolean;
  /** Tokens are arriving for this message: show the streaming caret. */
  streaming?: boolean;
};

/**
 * Renders one chat message and every part type the assistant can produce.
 * Content is found by role and name (article + parts), never by CSS class, so
 * restyling the chat cannot break its tests.
 */
export function ChatMessage({
  message,
  pending = false,
  streaming = false,
}: ChatMessageProps) {
  const isUser = message.role === "user";
  const hasContent = messageHasContent(message);
  const showPlaceholder = !isUser && !hasContent && (pending || streaming);

  const lastTextIndex = findLastTextPart(message.parts);
  const sources = message.parts.filter(isSourcePart);

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <article
        aria-label={isUser ? "Your message" : "Assistant message"}
        aria-busy={streaming ? true : undefined}
        className={cn(
          "text-sm leading-relaxed",
          isUser
            ? "max-w-[85%] rounded-lg bg-[#e8a73e] px-3 py-2 text-[#1a1a1a]"
            : "mr-auto max-w-[95%] space-y-2 rounded-lg bg-[#242a2e] px-3 py-2 text-[#f3f1ec]",
        )}
      >
        {showPlaceholder && <ThinkingIndicator />}

        {message.parts.map((part, index) => (
          <PartView
            key={partKey(part, index)}
            part={part}
            showStreamingCursor={
              streaming && index === lastTextIndex && isTextUIPart(part)
            }
          />
        ))}

        {!hasContent && !showPlaceholder && (
          <p className="text-xs italic text-[#9aa1a6]">
            No response was generated.
          </p>
        )}

        {sources.length > 0 && <SourceList sources={sources} />}
      </article>
    </div>
  );
}

function PartView({
  part,
  showStreamingCursor,
}: {
  part: ChatPart;
  showStreamingCursor: boolean;
}) {
  if (isTextUIPart(part)) {
    return (
      <p className="whitespace-pre-wrap break-words">
        {part.text}
        {showStreamingCursor && <StreamingCursor />}
      </p>
    );
  }

  if (isReasoningUIPart(part)) {
    return (
      <section
        aria-label="Model reasoning"
        className="rounded-md bg-[#14181a]/60 px-2 py-1.5 text-xs text-[#9aa1a6]"
      >
        <p className="whitespace-pre-wrap break-words">{part.text}</p>
      </section>
    );
  }

  if (isToolUIPart(part)) {
    return <ToolCallCard part={part} />;
  }

  if (isFileUIPart(part)) {
    return (
      <p>
        <a href={part.url} className="underline decoration-dotted">
          {part.filename ?? part.mediaType}
        </a>
      </p>
    );
  }

  if (isDataUIPart(part)) {
    return <DataPartView part={part} />;
  }

  if (part.type === "step-start") {
    return <hr aria-label="Assistant step" className="border-[#262b2f]" />;
  }

  // Sources are collected into a single list; anything else unknown is ignored
  // so a server-side part type the UI does not know yet cannot blank the chat.
  return null;
}

function DataPartView({ part }: { part: ChatPart }) {
  if (!isDataUIPart(part)) return null;

  const data = part.data as Record<string, unknown> | undefined;
  const message = [data?.label, data?.message].find(
    (value): value is string => typeof value === "string" && value.trim().length > 0,
  );

  if (!message) return null;

  return <p className="text-xs text-[#9aa1a6]">{message}</p>;
}

function SourceList({ sources }: { sources: ChatSourcePart[] }) {
  return (
    <ul aria-label="Sources" className="space-y-1 text-xs text-[#9aa1a6]">
      {sources.map((source) =>
        source.type === "source-url" ? (
          <li key={source.sourceId}>
            <a href={source.url} className="underline decoration-dotted">
              {source.title ?? source.url}
            </a>
          </li>
        ) : (
          <li key={source.sourceId}>
            {source.title}
            {source.filename ? ` (${source.filename})` : ""}
          </li>
        ),
      )}
    </ul>
  );
}

export function ThinkingIndicator() {
  return (
    <span
      role="status"
      aria-label="Assistant is thinking"
      className="flex items-center gap-1.5 py-1"
    >
      <Dot delay="0ms" />
      <Dot delay="150ms" />
      <Dot delay="300ms" />
    </span>
  );
}

function Dot({ delay }: { delay: string }) {
  return (
    <span
      className="h-2 w-2 animate-bounce rounded-full bg-[#9aa1a6]"
      style={{ animationDelay: delay }}
    />
  );
}

export function StreamingCursor(): ReactNode {
  return (
    <span
      aria-hidden="true"
      className="ml-1 inline-block h-3.5 w-1.5 animate-pulse bg-[#e8a73e]"
    />
  );
}

/** Index of the last text part, or -1. Written by hand: the TS target is ES2020. */
function findLastTextPart(parts: ChatPart[]): number {
  for (let index = parts.length - 1; index >= 0; index -= 1) {
    if (isTextUIPart(parts[index])) return index;
  }

  return -1;
}
