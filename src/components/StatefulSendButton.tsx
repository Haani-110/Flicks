import { AlertTriangle, Check, Loader2, Send } from "lucide-react";
import type { MouseEventHandler } from "react";
import { cn } from "@/utils/cn";

export type SendButtonState = "idle" | "loading" | "success" | "error";

type StatefulSendButtonProps = {
  /** Controlled business state. Hover/focus/pressed are handled in CSS. */
  state: SendButtonState;
  /** Extra disabled reason (e.g. empty input). Loading/success force-disable internally. */
  disabled?: boolean;
  type?: "button" | "submit";
  onClick?: MouseEventHandler<HTMLButtonElement>;
  className?: string;
  size?: "md" | "sm";
  idleLabel?: string;
  loadingLabel?: string;
  successLabel?: string;
  errorLabel?: string;
};

const SR_STATUS: Record<SendButtonState, string> = {
  idle: "Send message",
  loading: "Sending message",
  success: "Message sent",
  error: "Send failed. Activate to retry.",
};

/**
 * Reusable stateful send button for the Flicks Assistant.
 * All state layers share one grid cell so the button never resizes
 * between states — transitions use transform/opacity only.
 */
export function StatefulSendButton({
  state,
  disabled = false,
  type = "button",
  onClick,
  className,
  size = "md",
  idleLabel = "Send",
  loadingLabel = "Sending…",
  successLabel = "Sent",
  errorLabel = "Retry",
}: StatefulSendButtonProps) {
  // Guarantee no duplicate submissions even if a parent forgets to disable.
  // The success flash stays clickable: in a chat, the next message comes
  // straight after the previous answer landed.
  const isDisabled = disabled || state === "loading";

  return (
    <button
      type={type}
      disabled={isDisabled}
      onClick={onClick}
      data-state={state}
      aria-busy={state === "loading"}
      aria-label={SR_STATUS[state]}
      className={cn("send-btn", size === "sm" && "send-btn-sm", className)}
    >
      <span className="send-btn-stack" aria-hidden="true">
        <span className="send-btn-layer" data-active={state === "idle"}>
          <Send className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">{idleLabel}</span>
        </span>
        <span className="send-btn-layer" data-active={state === "loading"}>
          <Loader2 className="send-btn-spinner h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">{loadingLabel}</span>
        </span>
        <span className="send-btn-layer" data-active={state === "success"}>
          <Check className="send-btn-check h-4 w-4 shrink-0" strokeWidth={3} />
          <span className="hidden sm:inline">{successLabel}</span>
        </span>
        <span className="send-btn-layer" data-active={state === "error"}>
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">{errorLabel}</span>
        </span>
      </span>
    </button>
  );
}
