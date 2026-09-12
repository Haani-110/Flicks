import { useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { Square } from "lucide-react";
import {
  StatefulSendButton,
  type SendButtonState,
} from "@/components/StatefulSendButton";
import { CHAT_LIMITS, chatInputSchema } from "@/lib/chat-contract";

export type ChatComposerProps = {
  /** Called with the validated (trimmed) message text. */
  onSend: (text: string) => void;
  /** Aborts the in-flight response. */
  onStop: () => void;
  /** Re-sends the last message after a failure, from the empty composer. */
  onRetry: () => void;
  /** A request is in flight: the composer locks and offers Stop. */
  busy: boolean;
  sendState: SendButtonState;
  /** Human-readable message when the route or the stream failed. */
  errorMessage?: string | null;
};

const INPUT_ID = "assistant-input";
const ERROR_ID = "assistant-input-error";
const HINT_ID = "assistant-input-hint";

/**
 * The assistant's only form. Every submit runs through the shared Zod schema,
 * so invalid input produces an accessible error instead of a silent no-op.
 */
export function ChatComposer({
  onSend,
  onStop,
  onRetry,
  busy,
  sendState,
  errorMessage = null,
}: ChatComposerProps) {
  const [value, setValue] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const trimmedLength = value.trim().length;
  /** After a failure the empty composer turns the send button into Retry. */
  const isRetry = sendState === "error" && trimmedLength === 0;
  const describedBy = validationError ? ERROR_ID : HINT_ID;

  const submit = () => {
    if (isRetry) {
      setValidationError(null);
      onRetry();
      return;
    }

    const parsed = chatInputSchema.safeParse({ message: value });

    if (!parsed.success) {
      setValidationError(
        parsed.error.issues[0]?.message ?? "That message cannot be sent.",
      );
      return;
    }

    setValidationError(null);
    setValue("");
    onSend(parsed.data.message);
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    submit();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  };

  const onChange = (next: string) => {
    setValue(next);

    // Clear a stale complaint as soon as the input is valid again.
    if (validationError && chatInputSchema.safeParse({ message: next }).success) {
      setValidationError(null);
    }
  };

  const sendStatusMessage =
    sendState === "loading"
      ? "Sending message…"
      : sendState === "success"
        ? "Message sent."
        : sendState === "error"
          ? "Send failed. Press Retry to try again."
          : "";

  return (
    <div className="border-t border-[#262b2f] p-3 sm:p-4">
      {errorMessage && (
        <div
          role="alert"
          className="mb-3 rounded-md border border-[#e05555]/40 bg-[#e05555]/10 px-3 py-2 text-xs text-[#f3f1ec]"
        >
          {errorMessage}
        </div>
      )}

      <form onSubmit={onSubmit} className="flex items-end gap-2" noValidate>
        <label htmlFor={INPUT_ID} className="sr-only">
          Ask about movies
        </label>

        <textarea
          id={INPUT_ID}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={onKeyDown}
          rows={2}
          aria-describedby={describedBy}
          aria-invalid={validationError ? true : undefined}
          placeholder={busy ? "Waiting for response…" : "Ask about movies…"}
          disabled={busy}
          className="min-w-0 flex-1 resize-none rounded-md bg-[#101315] px-3 py-2 text-sm text-[#f3f1ec] ring-1 ring-[#262b2f] placeholder:text-[#9aa1a6]/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#e8a73e] disabled:opacity-60"
        />

        <div className="flex shrink-0 items-center gap-2">
          <StatefulSendButton state={sendState} type="submit" disabled={busy} />

          {busy && (
            <button
              type="button"
              onClick={onStop}
              aria-label="Stop generating"
              className="btn h-10 shrink-0 bg-[#e05555] text-white hover:bg-[#c94a4a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e05555] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1d2124]"
            >
              <Square className="h-4 w-4" aria-hidden="true" focusable="false" />
              <span className="hidden sm:inline">Stop</span>
            </button>
          )}
        </div>
      </form>

      {validationError && (
        <p
          id={ERROR_ID}
          role="alert"
          className="mt-2 text-xs font-medium text-[#e05555]"
        >
          {validationError}
        </p>
      )}

      <p
        id={HINT_ID}
        className="mt-2 flex items-center justify-between gap-3 text-xs text-[#9aa1a6]"
      >
        <span>Enter to send, Shift+Enter for a new line.</span>
        <span aria-hidden="true">
          {trimmedLength} / {CHAT_LIMITS.maxMessageChars} characters
        </span>
      </p>

      <div
        aria-live="polite"
        role="status"
        aria-label="Sending status"
        className="sr-only"
      >
        {sendStatusMessage}
      </div>
    </div>
  );
}
