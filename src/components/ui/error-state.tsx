import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  /** Plain-language explanation of what failed and what to do next. */
  message: string;
  onRetry?: () => void;
}

/**
 * Shared failed-fetch state. Uses only design-system tokens so a failed
 * request reads as a recoverable problem, never as "no data yet".
 */
export function ErrorState({ message, onRetry = () => window.location.reload() }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center rounded-lg border border-destructive/30 bg-destructive/5 px-6 py-12 text-center"
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
        <AlertCircle className="h-7 w-7 text-destructive" aria-hidden="true" />
      </div>
      <h2 className="text-base font-semibold text-foreground">We couldn't load this</h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{message}</p>
      <Button variant="outline" size="sm" className="mt-5" onClick={onRetry}>
        <RefreshCw className="h-4 w-4" aria-hidden="true" />
        Try again
      </Button>
    </div>
  );
}

/**
 * Some data hooks do not surface their query's `error` yet. This observes the
 * matching React Query cache entries so pages can show ErrorState instead of
 * an empty state. It is read-only: fetching and mutation logic are untouched.
 */
export function useQueryError(...keyPrefixes: string[]): Error | null {
  const queryClient = useQueryClient();
  const cache = queryClient.getQueryCache();

  for (const prefix of keyPrefixes) {
    const failed = cache
      .findAll({ queryKey: [prefix] })
      .find((query) => query.state.status === "error");
    if (failed?.state.error) return failed.state.error as Error;
  }

  return null;
}
