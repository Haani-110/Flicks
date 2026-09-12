import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import { useWatchlist } from "@/hooks/useWatchlist";

type WatchlistContextValue = ReturnType<typeof useWatchlist>;

const WatchlistContext = createContext<WatchlistContextValue | null>(null);

export function WatchlistProvider({ children }: { children: ReactNode }) {
  // `useWatchlist` already returns a memoized value; wrapping it in another
  // memo keyed on itself recomputed on every render and defeated the point.
  const value = useWatchlist();

  return (
    <WatchlistContext.Provider value={value}>
      {children}
    </WatchlistContext.Provider>
  );
}

// The provider and its accessor are one contract; splitting them across files
// would only add an import hop.
// eslint-disable-next-line react/only-export-components
export function useWatchlistContext() {
  const ctx = useContext(WatchlistContext);
  if (!ctx) {
    throw new Error("useWatchlistContext must be used within WatchlistProvider");
  }
  return ctx;
}
