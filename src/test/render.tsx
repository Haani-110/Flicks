import type { ReactElement, ReactNode } from "react";
import { render, type RenderOptions, type RenderResult } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { WatchlistProvider } from "@/context/WatchlistContext";

type ProvidersOptions = RenderOptions & {
  /** Initial route, for components that render <Link>. */
  route?: string;
};

/** Renders a component inside the app's providers (router + watchlist). */
export function renderWithProviders(
  ui: ReactElement,
  { route = "/", ...options }: ProvidersOptions = {},
): RenderResult {
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <MemoryRouter initialEntries={[route]}>
        <WatchlistProvider>{children}</WatchlistProvider>
      </MemoryRouter>
    );
  }

  return render(ui, { wrapper: Wrapper, ...options });
}
