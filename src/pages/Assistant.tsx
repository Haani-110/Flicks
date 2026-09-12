import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import type { ChatStatus, UIMessage } from "ai";
import { SendButtonDemo } from "@/components/SendButtonDemo";
import { type SendButtonState } from "@/components/StatefulSendButton";
import { ChatComposer } from "@/components/chat/ChatComposer";
import { ChatTranscript } from "@/components/chat/ChatTranscript";
import { describeChatError } from "@/lib/chat-errors";
import { createChatTransport } from "@/lib/chat-transport";

/** How long the "Sent" confirmation stays on the send button. */
const SUCCESS_FLASH_MS = 1200;

/**
 * The Flicks assistant.
 *
 * The chat streams the AI SDK UI message protocol from /api/chat, so replies
 * arrive as message parts (text, tool calls, tool results) that the transcript
 * renders. Nothing here talks to a model provider directly: the API key lives
 * server-side in the route.
 */
export function Assistant() {
  const transport = useMemo(() => createChatTransport(), []);
  const [sendState, setSendState] = useState<SendButtonState>("idle");

  const stoppedRef = useRef(false);
  const previousStatusRef = useRef<ChatStatus>("ready");

  const {
    messages,
    sendMessage,
    regenerate,
    stop,
    status,
    error,
    clearError,
  } = useChat<UIMessage>({ transport });

  const busy = status === "submitted" || status === "streaming";

  // Fold the transport status into the send-button state machine:
  // submitted/streaming -> loading, error -> error, finished -> short success flash.
  useEffect(() => {
    const previous = previousStatusRef.current;
    previousStatusRef.current = status;

    if (status === "submitted" || status === "streaming") {
      setSendState("loading");
      return;
    }

    if (status === "error") {
      setSendState("error");
      return;
    }

    const justFinished = previous === "submitted" || previous === "streaming";

    if (!justFinished) return;

    // A stopped stream is not a sent message: no "Sent" flash for aborts.
    if (stoppedRef.current) {
      stoppedRef.current = false;
      setSendState("idle");
      return;
    }

    setSendState("success");

    const timer = window.setTimeout(() => {
      setSendState((current) => (current === "success" ? "idle" : current));
    }, SUCCESS_FLASH_MS);

    return () => window.clearTimeout(timer);
  }, [status]);

  const handleSend = (text: string) => {
    stoppedRef.current = false;
    clearError();
    void sendMessage({ text });
  };

  const handleStop = () => {
    stoppedRef.current = true;
    stop();
  };

  const handleRetry = () => {
    stoppedRef.current = false;
    clearError();
    void regenerate();
  };

  const errorMessage = error ? describeChatError(error) : null;

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

      <section
        aria-label="Assistant chat"
        className="card flex flex-col overflow-hidden"
      >
        <ChatTranscript
          messages={messages}
          status={status}
          onSuggestion={handleSend}
        />

        <ChatComposer
          onSend={handleSend}
          onStop={handleStop}
          onRetry={handleRetry}
          busy={busy}
          sendState={sendState}
          errorMessage={errorMessage}
        />
      </section>

      <SendButtonDemo />
    </div>
  );
}
