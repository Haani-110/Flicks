import { useEffect, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { ArrowDown, Bot, Square } from "lucide-react";
import {
  StatefulSendButton,
  type SendButtonState,
} from "@/components/StatefulSendButton";
import { SendButtonDemo } from "@/components/SendButtonDemo";

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
  const [sendState, setSendState] = useState<SendButtonState>("idle");

  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const atBottomRef = useRef(true);
  const lastFailedRef = useRef<string | null>(null);
  const requestIdRef = useRef(0);
  const inFlightRef = useRef(false);
  const successTimerRef = useRef<number | null>(null);

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

  const clearSuccessTimer = () => {
    if (successTimerRef.current !== null) {
      window.clearTimeout(successTimerRef.current);
      successTimerRef.current = null;
    }
  };

  // Abort any in-flight request and clear timers on unmount.
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (successTimerRef.current !== null) {
        window.clearTimeout(successTimerRef.current);
      }
    };
  }, []);

  const stop = () => {
    abortRef.current?.abort();
  };

  const send = async (text?: string) => {
    const rawValue = (text ?? input).trim();

    // Retry fallback: error state + empty composer reuses the failed message.
    const value =
      rawValue ||
      (sendState === "error" && lastFailedRef.current
        ? lastFailedRef.current
        : "");

    if (!value || inFlightRef.current || sendState === "loading") return;

    clearSuccessTimer();
    requestIdRef.current += 1;
    const currentId = requestIdRef.current;
    inFlightRef.current = true;

    setError(null);
    setSendState("loading");

    // On retry, drop the failed placeholder pair so history doesn't duplicate.
    let baseMessages = messages;
    const isRetry =
      !rawValue && sendState === "error" && lastFailedRef.current === value;

    if (isRetry && messages.length >= 2) {
      const secondLast = messages[messages.length - 2];
      const last = messages[messages.length - 1];

      if (
        secondLast.role === "user" &&
        secondLast.content === value &&
        last.role === "assistant"
      ) {
        baseMessages = messages.slice(0, -2);
      }
    }

    const userMsg: ChatMsg = {
      id: uid(),
      role: "user",
      content: value,
    };

    const assistantMsg: ChatMsg = {
      id: uid(),
      role: "assistant",
      content: "",
    };

    const next = [...baseMessages, userMsg];

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

        // IMPORTANT:
        // The backend expects AI SDK UIMessage objects with `parts`.
        body: JSON.stringify({
          messages: next
            .slice(-CLIENT_HISTORY_LIMIT)
            .map((m) => ({
              id: m.id,
              role: m.role,
              parts: [
                {
                  type: "text",
                  text: m.content,
                },
              ],
            })),
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

      if (!res.body) {
        throw new Error("Empty response from server.");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let firstChunk = true;

      for (;;) {
        if (currentId !== requestIdRef.current) return;

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
              : m,
          ),
        );
      }

      if (currentId !== requestIdRef.current) return;

      inFlightRef.current = false;
      setStatus("idle");
      setSendState("success");
      lastFailedRef.current = null;

      successTimerRef.current = window.setTimeout(() => {
        if (requestIdRef.current === currentId) {
          setSendState("idle");
        }

        successTimerRef.current = null;
      }, 1500);
    } catch (e) {
      if (currentId !== requestIdRef.current) return;

      inFlightRef.current = false;

      if (e instanceof DOMException && e.name === "AbortError") {
        // Stopped by the user — keep whatever streamed so far.
        setStatus("idle");
        setSendState("idle");
      } else {
        const message =
          e instanceof Error ? e.message : "Something went wrong.";

        setError(message);
        setSendState("error");
        lastFailedRef.current = value;

        setMessages((prev) =>
          prev.map((m) => {
            if (m.id !== assistantMsg.id) return m;
            if (m.content) return m;

            return {
              ...m,
              content:
                "Sorry, I couldn't get a response. Please try again.",
            };
          }),
        );

        setStatus("idle");
      }
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
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

  const handleInputChange = (value: string) => {
    setInput(value);

    // Typing a new message after a failure returns to idle; Retry stays
    // available via the error state while the composer is empty.
    if (sendState === "error" && value.trim()) {
      setSendState("idle");
      setError(null);
    }
  };

  // Empty-composer disabled only in idle; error stays enabled for Retry.
  // Loading/success force-disable inside the button itself.
  const sendDisabled = sendState === "idle" && !input.trim();

  const sendStatusMessage =
    sendState === "loading"
      ? "Sending message…"
      : sendState === "success"
        ? "Message sent."
        : sendState === "error"
          ? "Send failed. Press Retry to try again."
          : "";

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
                      disabled={busy || sendState === "loading"}
                      className="rounded-full bg-[#242a2e] px-3 py-1.5 text-xs font-medium text-[#f3f1ec] transition-colors hover:bg-[#2d3438] disabled:cursor-not-allowed disabled:opacity-50"
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
                m.role === "assistant" &&
                isLast &&
                status === "streaming";

              return m.role === "user" ? (
                <div key={m.id} className="flex justify-end">
                  <div className="max-w-[85%] rounded-lg bg-[#e8a73e] px-3 py-2 text-sm leading-relaxed text-[#1a1a1a]">
                    <p className="whitespace-pre-wrap break-words">
                      {m.content}
                    </p>
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
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={onKeyDown}
              rows={2}
              placeholder={
                busy ? "Waiting for response…" : "Ask about movies…"
              }
              disabled={busy}
              className="min-w-0 flex-1 resize-none rounded-md bg-[#101315] px-3 py-2 text-sm text-[#f3f1ec] ring-1 ring-[#262b2f] placeholder:text-[#9aa1a6]/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#e8a73e] disabled:opacity-60"
            />

            <div className="flex shrink-0 items-center gap-2">
              <StatefulSendButton
                state={sendState}
                type="submit"
                disabled={sendDisabled}
              />

              {busy && (
                <button
                  type="button"
                  onClick={stop}
                  aria-label="Stop generating"
                  className="btn h-10 shrink-0 bg-[#e05555] text-white hover:bg-[#c94a4a]"
                >
                  <Square className="h-4 w-4" />
                  <span className="hidden sm:inline">Stop</span>
                </button>
              )}
            </div>
          </form>

          <p className="mt-2 text-xs text-[#9aa1a6]">
            Enter to send, Shift+Enter for a new line.
          </p>

          <div aria-live="polite" role="status" className="sr-only">
            {sendStatusMessage}
          </div>
        </div>
      </div>

      <SendButtonDemo />
    </div>
  );
}
