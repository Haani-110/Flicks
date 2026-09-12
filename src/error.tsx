import { Component, type ErrorInfo, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, RotateCw, Home } from "lucide-react";

type Props = { children: ReactNode };
type State = { hasError: boolean; detail: string | null };

/**
 * The last line of defence: any render error anywhere in the app lands here
 * instead of on a blank white screen.
 *
 * `role="alert"` + `aria-live="assertive"` means a screen reader announces the
 * failure immediately. The reader gets two ways out (reload, go home) and,
 * behind a disclosure, the error's own message — enough to report a bug with,
 * without dumping a stack trace on someone who just wanted to browse movies.
 */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, detail: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, detail: error?.message ?? null };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[flicks] route error", error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div
        className="mx-auto flex min-h-[70vh] w-full max-w-5xl items-center justify-center px-4 py-12"
        role="alert"
        aria-live="assertive"
      >
        <div className="card relative w-full max-w-lg overflow-hidden p-6 text-center sm:p-8">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#e05555]/60 to-transparent"
          />

          <div
            className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#e05555]/10 ring-1 ring-[#e05555]/30"
            aria-hidden="true"
          >
            <AlertTriangle
              className="h-6 w-6 text-[#e05555]"
              aria-hidden="true"
              focusable="false"
            />
          </div>

          <p className="eyebrow mt-4">Flicks</p>

          <h1 className="mt-2 text-2xl font-semibold text-[#f3f1ec]">
            Something went wrong
          </h1>

          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[#9aa1a6]">
            This page hit an unexpected error. You can safely return home and
            continue browsing — your watchlist is untouched.
          </p>

          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="btn btn-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8a73e] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1d2124]"
            >
              <RotateCw className="h-4 w-4" aria-hidden="true" focusable="false" />
              Reload
            </button>
            <Link to="/" className="btn btn-secondary">
              <Home className="h-4 w-4" aria-hidden="true" focusable="false" />
              Go home
            </Link>
          </div>

          {this.state.detail && (
            <details className="mt-5 rounded-md border border-[#262b2f] bg-[#101315] p-3 text-left">
              <summary className="cursor-pointer text-xs font-medium text-[#9aa1a6] transition-colors hover:text-[#f3f1ec]">
                Technical detail
              </summary>
              <p className="mt-2 break-words font-mono text-[11px] leading-relaxed text-[#7d858a]">
                {this.state.detail}
              </p>
            </details>
          )}
        </div>
      </div>
    );
  }
}
