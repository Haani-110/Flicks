import { useEffect, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { ArrowDown, Bot, Send, Square } from "lucide-react";

type Role = "user" | "assistant";
type ChatMsg = { id: string; role: Role; content: string };
type Status = "idle" | "thinking" | "streaming";

/** Mirrors CHAT_LIMITS.maxHistoryMessages on the server. */
const CLIENT_HISTORY_LIMIT = 20;

const SUGGESTIONS = [
  "What movies are available?",
  "Which one is best rated?",
  "Tell me about Dune: Part Two",
];

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function Assistant() {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const atBottomRef = useRef(true);

  const busy = status !== "idle";

  const scrollToBottom = (smooth = false) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
  };

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight <= 80;
    atBottomRef.current = atBottom;
    setIsAtBottom(atBottom);
  };

  const jumpToLatest = () => {
    atBottomRef.current = true;
    setIsAtBottom(true);
    scrollToBottom(true);
  };

  // Follow new content only while the user is already at the bottom.
  useEffect(() => {
    if (atBottomRef.current) scrollToBottom();
  }, [messages, status]);

  // Abort any in-flight request on unmount.
  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const stop = () => {
    abortRef.current?.abort();
  };

  const send = async (text?: string) => {
    const value = (text ?? input).trim();
    if (!value || busy) return;

    setError(null);
    const userMsg: ChatMsg = { id: uid(), role: "user", content: value };
    const assistantMsg: ChatMsg = { id: uid(), role: "assistant", content: "" };
    const next = [...messages, userMsg];

    setMessages([...next, assistantMsg]);
    setInput("");
    setStatus("thinking");
    atBottomRef.current = true;
    setIsAtBottom(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next
            .slice(-CLIENT_HISTORY_LIMIT)
            .map((m) => ({ role: m.role, content: m.content })),
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        let detail = "";
        try {
          const data = (await res.json()) as { error?: string };
          detail = data?.error ?? "";
        } catch {
          /* non-JSON error body */
        }
        throw new Error(detail || `Request failed (${res.status})`);
      }
      if (!res.body) throw new Error("Empty response from server.");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let firstChunk = true;

      for (;;) {
        const { done, value: chunk } = await reader.read();
        if (done) break;
        const text = decoder.decode(chunk, { stream: true });
        if (!text) continue;
        if (firstChunk) {
          firstChunk = false;
          setStatus("streaming");
        }
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsg.id
              ? { ...m, content: m.content + text }
              : m
          )
        );
      }
      setStatus("idle");
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        // Stopped by the user — keep whatever streamed so far.
        setStatus("idle");
      } else {
        const message = e instanceof Error ? e.message : "Something went wrong.";
        setError(message);
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id !== assistantMsg.id) return m;
            if (m.content) return m;
            return {
              ...m,
              content: "Sorry, I couldn't get a response. Please try again.",
            };
          })
        );
        setStatus("idle");
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    send();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-widest text-[#e8a73e]">
          AI
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-[#f3f1ec] sm:text-3xl">
          Assistant
        </h1>
        <p className="max-w-xl text-sm text-[#9aa1a6] sm:text-base">
          Ask about the Flicks catalog. Responses stream in real time.
        </p>
      </header>

      <div className="card flex flex-col overflow-hidden">
        <div className="relative">
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            role="log"
            aria-label="Conversation"
            className="h-[55vh] min-h-[320px] space-y-4 overflow-y-auto p-4 sm:p-5"
          >
            {messages.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#242a2e]">
                  <Bot className="h-6 w-6 text-[#e8a73e]" />
                </div>
                <p className="max-w-sm text-sm text-[#9aa1a6]">
                  Try one of these to get started:
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => send(s)}
                      className="rounded-full bg-[#242a2e] px-3 py-1.5 text-xs font-medium text-[#f3f1ec] transition-colors hover:bg-[#2d3438]"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => {
              const isLast = i === messages.length - 1;
              const showThinking =
                m.role === "assistant" &&
                isLast &&
                status === "thinking" &&
                !m.content;
              const showCursor =
                m.role === "assistant" && isLast && status === "streaming";
              return m.role === "user" ? (
                <div key={m.id} className="flex justify-end">
                  <div className="max-w-[85%] rounded-lg bg-[#e8a73e] px-3 py-2 text-sm leading-relaxed text-[#1a1a1a]">
                    <p className="whitespace-pre-wrap break-words">{m.content}</p>
                  </div>
                </div>
              ) : (
                <div key={m.id} className="flex justify-start">
                  <div className="mr-auto max-w-[95%] rounded-lg bg-[#242a2e] px-3 py-2 text-sm leading-relaxed text-[#f3f1ec]">
                    {showThinking ? (
                      <span
                        className="flex items-center gap-1.5 py-1"
                        role="status"
                        aria-label="Thinking"
                      >
                        <span
                          className="h-2 w-2 animate-bounce rounded-full bg-[#9aa1a6]"
                          style={{ animationDelay: "0ms" }}
                        />
                        <span
                          className="h-2 w-2 animate-bounce rounded-full bg-[#9aa1a6]"
                          style={{ animationDelay: "150ms" }}
                        />
                        <span
                          className="h-2 w-2 animate-bounce rounded-full bg-[#9aa1a6]"
                          style={{ animationDelay: "300ms" }}
                        />
                      </span>
                    ) : (
                      <p className="whitespace-pre-wrap break-words">
                        {m.content}
                        {showCursor && (
                          <span
                            className="ml-1 inline-block h-3.5 w-1.5 animate-pulse bg-[#e8a73e]"
                            aria-hidden="true"
                          />
                        )}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {!isAtBottom && messages.length > 0 && (
            <button
              type="button"
              onClick={jumpToLatest}
              className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-[#14181a] px-3 py-1.5 text-xs font-medium text-[#f3f1ec] shadow-lg ring-1 ring-[#262b2f] transition-colors hover:bg-[#242a2e]"
            >
              <ArrowDown className="h-3.5 w-3.5" />
              Jump to latest
            </button>
          )}
        </div>

        <div className="border-t border-[#262b2f] p-3 sm:p-4">
          {error && (
            <div
              role="alert"
              className="mb-3 rounded-md border border-[#e05555]/40 bg-[#e05555]/10 px-3 py-2 text-xs text-[#f3f1ec]"
            >
              {error}
            </div>
          )}
          <form onSubmit={onSubmit} className="flex items-end gap-2">
            <label htmlFor="assistant-input" className="sr-only">
              Ask about movies
            </label>
            <textarea
              id="assistant-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              rows={2}
              placeholder={
                busy ? "Waiting for response…" : "Ask about movies…"
              }
              disabled={busy}
              className="min-w-0 flex-1 resize-none rounded-md bg-[#101315] px-3 py-2 text-sm text-[#f3f1ec] ring-1 ring-[#262b2f] placeholder:text-[#9aa1a6]/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#e8a73e] disabled:opacity-60"
            />
            {busy ? (
              <button
                type="button"
                onClick={stop}
                aria-label="Stop generating"
                className="btn shrink-0 bg-[#e05555] text-white hover:bg-[#c94a4a]"
              >
                <Square className="h-4 w-4" />
                <span className="hidden sm:inline">Stop</span>
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim()}
                aria-label="Send message"
                className="btn btn-primary shrink-0 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                <span className="hidden sm:inline">Send</span>
              </button>
            )}
          </form>
          <p className="mt-2 text-xs text-[#9aa1a6]">
            Enter to send, Shift+Enter for a new line.
          </p>
        </div>
      </div>
    </div>
  );
}
