import { useEffect, useRef, useState } from "react";
import { StatefulSendButton, type SendButtonState } from "./StatefulSendButton";

type DemoMode = "random" | "success" | "error";

/**
 * Both buttons in this playground used to announce themselves as "Send
 * message" in every state, because that is the component's default. They do
 * different things, so they now say so.
 */
const PRIMARY_STATUS_LABELS: Record<SendButtonState, string> = {
  idle: "Run a simulated send",
  loading: "Simulated send in flight",
  success: "Simulated send succeeded",
  error: "Simulated send failed. Activate to retry.",
};

const COMPACT_STATUS_LABELS: Record<SendButtonState, string> = {
  idle: "Run the compact simulated action",
  loading: "Compact action in flight",
  success: "Compact action finished",
  error: "Compact action failed. Activate to retry.",
};

/** Simulated async send: random delay, ~20% failure on "random". Demo only. */
function fakeSend(mode: DemoMode): Promise<void> {
  const delay = 900 + Math.random() * 900;
  return new Promise((resolve, reject) => {
    window.setTimeout(() => {
      if (mode === "success") resolve();
      else if (mode === "error") reject(new Error("Forced demo failure."));
      else if (Math.random() < 0.2) reject(new Error("Random demo failure."));
      else resolve();
    }, delay);
  });
}

export function SendButtonDemo() {
  const [demoState, setDemoState] = useState<SendButtonState>("idle");
  const [attempts, setAttempts] = useState(0);
  const [lastOutcome, setLastOutcome] = useState<string | null>(null);
  const [regenState, setRegenState] = useState<SendButtonState>("idle");

  const reqRef = useRef(0);
  const regenReqRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const regenTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      if (regenTimerRef.current !== null)
        window.clearTimeout(regenTimerRef.current);
    };
  }, []);

  const runDemo = async (mode: DemoMode) => {
    if (demoState === "loading" || demoState === "success") return;
    // Unreachable in practice: the only pending timer is the success flash, and
    // the guard above already returned for that state. Kept as a belt-and-braces
    // clear so a future state can never leave a timer running behind it.
    /* istanbul ignore next -- defensive */
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    reqRef.current += 1;
    const id = reqRef.current;
    setDemoState("loading");
    setLastOutcome(null);
    setAttempts((a) => a + 1);
    try {
      await fakeSend(mode);
      if (reqRef.current !== id) return;
      setDemoState("success");
      setLastOutcome(
        mode === "random"
          ? "Simulated send succeeded."
          : "Forced success — deterministic."
      );
      timerRef.current = window.setTimeout(() => {
        if (reqRef.current === id) setDemoState("idle");
        timerRef.current = null;
      }, 1500);
    } catch {
      if (reqRef.current !== id) return;
      setDemoState("error");
      setLastOutcome(
        mode === "random"
          ? "Simulated send failed (20% path). Press Retry."
          : "Forced error — deterministic. Press Retry."
      );
    }
  };

  const runRegen = async () => {
    if (regenState === "loading" || regenState === "success") return;
    /* istanbul ignore next -- defensive, see runDemo */
    if (regenTimerRef.current !== null) {
      window.clearTimeout(regenTimerRef.current);
      regenTimerRef.current = null;
    }
    regenReqRef.current += 1;
    const id = regenReqRef.current;
    setRegenState("loading");
    try {
      await fakeSend("random");
      if (regenReqRef.current !== id) return;
      setRegenState("success");
      regenTimerRef.current = window.setTimeout(() => {
        if (regenReqRef.current === id) setRegenState("idle");
        regenTimerRef.current = null;
      }, 1300);
    } catch {
      if (regenReqRef.current !== id) return;
      setRegenState("error");
    }
  };

  const demoBusy = demoState === "loading" || demoState === "success";

  return (
    <section aria-label="Send button playground" className="card space-y-5 p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-base font-semibold text-[#f3f1ec] sm:text-lg">
          Send button playground
        </h2>
        <span className="rounded-full bg-[#242a2e] px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-[#9aa1a6]">
          Demo only
        </span>
      </div>
      <p className="max-w-2xl text-sm text-[#9aa1a6]">
        Simulated sends for the motion assignment — the primary button fails
        about 20% of the time. The real chat above is unaffected.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <StatefulSendButton
          state={demoState}
          type="button"
          onClick={() => runDemo("random")}
          statusLabels={PRIMARY_STATUS_LABELS}
        />
        <button
          type="button"
          onClick={() => runDemo("success")}
          disabled={demoBusy}
          className="rounded-md border border-[#262b2f] bg-[#14181a] px-3 py-2 text-xs font-medium text-[#f3f1ec] transition-colors hover:bg-[#242a2e] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Force Success
        </button>
        <button
          type="button"
          onClick={() => runDemo("error")}
          disabled={demoBusy}
          className="rounded-md border border-[#262b2f] bg-[#14181a] px-3 py-2 text-xs font-medium text-[#f3f1ec] transition-colors hover:bg-[#242a2e] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Force Error
        </button>
      </div>

      <div className="text-xs text-[#9aa1a6]" aria-live="polite">
        {attempts === 0 ? (
          <span>No simulated sends yet.</span>
        ) : (
          <span>
            Attempts: {attempts}
            {lastOutcome ? ` — ${lastOutcome}` : ""}
          </span>
        )}
      </div>

      <div className="space-y-2 border-t border-[#262b2f] pt-4">
        <p className="text-xs font-medium uppercase tracking-wide text-[#9aa1a6]">
          Same motion system, compact size
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <StatefulSendButton
            state={regenState}
            size="sm"
            type="button"
            onClick={runRegen}
            idleLabel="Regenerate"
            loadingLabel="Working…"
            successLabel="Done"
            errorLabel="Retry"
            statusLabels={COMPACT_STATUS_LABELS}
          />
          <p className="text-xs text-[#9aa1a6]">
            Independent simulated action reusing the button component.
          </p>
        </div>
      </div>

      <div className="space-y-1.5 border-t border-[#262b2f] pt-4">
        <h3 className="text-sm font-semibold text-[#f3f1ec]">Motion decisions</h3>
        <p className="max-w-3xl text-xs leading-relaxed text-[#9aa1a6] sm:text-sm">
          Hover and press use short 90–150ms transitions so feedback feels
          immediate and never lags behind the pointer. Loading and success use
          slightly longer 200–300ms fades so each state change can be perceived
          without feeling sluggish. All motion uses transform and opacity so
          state changes stay on the compositor and never shift layout. When
          prefers-reduced-motion is set, movement and the error shake are
          removed while labels, colors, and icons still communicate every
          state. The shake is brief (350ms) and decorative only — the red
          error color, Retry label, and alert text carry the failure meaning.
        </p>
      </div>
    </section>
  );
}
