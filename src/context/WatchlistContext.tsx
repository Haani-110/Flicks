import { createContext, useContext, useMemo } from "react";
import type { ReactNode } from "react";
import { useWatchlist } from "@/hooks/useWatchlist";

type WatchlistContextValue = ReturnType<typeof useWatchlist>;

const WatchlistContext = createContext<WatchlistContextValue | null>(null);

export function WatchlistProvider({ children }: { children: ReactNode }) {
  const watchlist = useWatchlist();
  const value = useMemo(() => watchlist, [watchlist]);
  return (
    <WatchlistContext.Provider value={value}>
      {children}
    </WatchlistContext.Provider>
  );
}

export function useWatchlistContext() {
  const ctx = useContext(WatchlistContext);
  if (!ctx) {
    throw new Error("useWatchlistContext must be used within WatchlistProvider");
  }
  return ctx;
}
