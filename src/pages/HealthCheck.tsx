import { useCallback, useEffect, useState } from "react";

type Todo = {
  userId: number;
  id: number;
  title: string;
  completed: boolean;
};

type Status = "idle" | "loading" | "success" | "error";

const DEFAULT_URL = "https://jsonplaceholder.typicode.com/todos/1";

function getHealthUrl(): string {
  const envUrl =
    typeof import.meta.env.VITE_HEALTH_CHECK_API_URL === "string" &&
    import.meta.env.VITE_HEALTH_CHECK_API_URL.trim().length > 0
      ? import.meta.env.VITE_HEALTH_CHECK_API_URL.trim()
      : "";
  return envUrl || DEFAULT_URL;
}

export function HealthCheck() {
  const [status, setStatus] = useState<Status>("idle");
  const [data, setData] = useState<Todo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState<string>(DEFAULT_URL);

  const fetchHealth = useCallback(async () => {
    const endpoint = getHealthUrl();
    setUrl(endpoint);
    setStatus("loading");
    setError(null);
    try {
      const res = await fetch(endpoint);
      if (!res.ok) {
        throw new Error(`Request failed with status ${res.status}`);
      }
      const json = (await res.json()) as Todo;
      setData(json);
      setStatus("success");
    } catch (e) {
      setData(null);
      setError(e instanceof Error ? e.message : "Unknown error");
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-widest text-[#e8a73e]">
          Diagnostics
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-[#f3f1ec] sm:text-3xl">
          Health Check
        </h1>
        <p className="max-w-xl text-sm text-[#9aa1a6] sm:text-base">
          Verifies the app can reach its external API endpoint.
        </p>
      </header>

      <div className="card p-5 sm:p-6">
        <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wide text-[#9aa1a6]">
              Endpoint
            </dt>
            <dd className="mt-1 break-all font-mono text-[#f3f1ec]">{url}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-[#9aa1a6]">
              Status
            </dt>
            <dd className="mt-1" aria-live="polite" aria-atomic="true">
              <StatusBadge status={status} />
            </dd>
          </div>
        </dl>

        <div className="mt-6" aria-live="polite" aria-atomic="false">
          {status === "loading" && (
            <div className="space-y-2" role="status" aria-label="Loading health check">
              <div className="h-4 w-2/3 animate-pulse rounded bg-[#242a2e]" aria-hidden="true" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-[#242a2e]" aria-hidden="true" />
              <div className="h-4 w-3/4 animate-pulse rounded bg-[#242a2e]" aria-hidden="true" />
              <span className="sr-only">Loading health check data</span>
            </div>
          )}

          {status === "success" && data && (
            <div className="space-y-3">
              <h2 className="text-sm font-medium text-[#f3f1ec]">
                Fetched data
              </h2>
              <pre className="overflow-x-auto rounded-md bg-[#101315] p-4 text-xs leading-relaxed text-[#f3f1ec] ring-1 ring-[#262b2f]" tabIndex={0} aria-label="Fetched health check data">
{JSON.stringify(data, null, 2)}
              </pre>
            </div>
          )}

          {status === "error" && (
            <div className="rounded-md border border-[#e05555]/40 bg-[#e05555]/10 p-4 text-sm text-[#f3f1ec]" role="alert">
              <p className="font-medium text-[#e05555]">Request failed</p>
              <p className="mt-1 text-[#9aa1a6]">{error ?? "Unknown error"}</p>
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={fetchHealth}
            className="btn btn-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8a73e] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1d2124]"
            disabled={status === "loading"}
            aria-busy={status === "loading"}
          >
            {status === "loading" ? "Fetching…" : "Retry"}
          </button>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: Status }) {
  const map: Record<Status, { label: string; className: string }> = {
    idle: {
      label: "Idle",
      className: "bg-[#242a2e] text-[#9aa1a6]",
    },
    loading: {
      label: "Loading…",
      className: "bg-[#e8a73e]/20 text-[#e8a73e]",
    },
    success: {
      label: "OK",
      className: "bg-emerald-500/15 text-emerald-400",
    },
    error: {
      label: "Error",
      className: "bg-[#e05555]/15 text-[#e05555]",
    },
  };
  const { label, className } = map[status];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${className}`}
    >
      {label}
    </span>
  );
}
