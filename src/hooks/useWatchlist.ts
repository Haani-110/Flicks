import { useCallback, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "flicks-watchlist";

function readStorage(): number[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((n) => typeof n === "number") : [];
  } catch {
    return [];
  }
}

export function useWatchlist() {
  const [ids, setIds] = useState<number[]>(readStorage);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  }, [ids]);

  const toggle = useCallback((movieId: number) => {
    setIds((prev) =>
      prev.includes(movieId) ? prev.filter((id) => id !== movieId) : [...prev, movieId]
    );
  }, []);

  const remove = useCallback((movieId: number) => {
    setIds((prev) => prev.filter((id) => id !== movieId));
  }, []);

  // A stable object identity: WatchlistProvider puts this straight into the
  // context, so a re-render that does not change `ids` no longer invalidates
  // the memo and re-renders every card in the grid.
  return useMemo(() => ({ ids, toggle, remove }), [ids, toggle, remove]);
}
