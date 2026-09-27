"use client";

import { Component, type ReactNode } from "react";

interface Props {
  fallback: ReactNode;
  children: ReactNode;
  onError?: (error: unknown) => void;
}

interface State {
  hasError: boolean;
}

/**
 * Generic error boundary: catches a render-time throw from its children
 * (e.g. a failed GLB fetch/parse, or any other runtime error) and renders
 * `fallback` instead of taking down everything above it.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    this.props.onError?.(error);
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.warn("[APEX] Falling back to procedural car body:", error);
    }
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}
