import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  /** Called with a human-readable reason; the caller falls back to the poster. */
  onError: (message: string) => void;
  fallback: ReactNode;
};

type State = { failed: boolean };

/**
 * Keeps a broken canvas from taking the page with it.
 *
 * WebGL can fail at any point — driver reset, context loss on a backgrounded
 * phone, a GPU the browser has blocklisted — and when it does the reader should
 * get the poster and a sentence, not a blank page.
 */
export class SceneErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[flicks] marquee scene failed", error, info);
    this.props.onError(
      "The 3D scene stopped on this device, so the poster is showing instead.",
    );
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
