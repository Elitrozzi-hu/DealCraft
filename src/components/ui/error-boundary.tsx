import { Component, type ErrorInfo, type ReactNode } from "react";
import { useT } from "@/i18n";

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}


export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Local-debugging surface; a real deployment would report this to telemetry.
    console.error("Unhandled UI error:", error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.error) {
      return this.props.fallback ?? <DefaultFallback />;
    }
    return this.props.children;
  }
}

function DefaultFallback() {
  const t = useT();
  return (
    <div className="grid min-h-screen place-items-center bg-bg p-6">
      <div className="w-[420px] max-w-full rounded-2xl border border-line bg-panel p-6 text-center shadow-[0_4px_20px_rgba(15,27,61,0.06)]">
        <div className="text-[16px] font-extrabold text-ink">
          {t("ui.errorBoundary.title")}
        </div>
        <p className="mt-1.5 text-[13px] text-cold">
          {t("ui.errorBoundary.body")}
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-4 h-10 rounded-xl border-2 border-violet bg-violet px-5 text-[14px] font-bold text-white transition-colors hover:border-[#1f49e5] hover:bg-[#1f49e5]"
        >
          {t("ui.errorBoundary.reload")}
        </button>
      </div>
    </div>
  );
}
