import { Component, type ErrorInfo, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";

type Props = { children: ReactNode };
type State = { hasError: boolean };

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[flicks] route error", error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="mx-auto flex min-h-[60vh] w-full max-w-5xl items-center justify-center px-4 py-12" role="alert" aria-live="assertive">
        <div className="card w-full max-w-lg p-6 text-center sm:p-8">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#e05555]/10" aria-hidden="true">
            <AlertTriangle className="h-6 w-6 text-[#e05555]" aria-hidden="true" focusable="false" />
          </div>
          <p className="mt-4 text-sm font-medium uppercase tracking-widest text-[#e8a73e]">Flicks</p>
          <h1 className="mt-2 text-2xl font-semibold text-[#f3f1ec]">Something went wrong</h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-[#9aa1a6]">This page hit an unexpected error. You can safely return home and continue browsing.</p>
          <div className="mt-5 flex justify-center gap-2">
            <button type="button" onClick={() => window.location.reload()} className="btn btn-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8a73e] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1d2124]">Reload</button>
            <Link to="/" className="btn btn-secondary">Go home</Link>
          </div>
        </div>
      </div>
    );
  }
}
