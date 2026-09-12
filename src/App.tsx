import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { WatchlistProvider } from "@/context/WatchlistContext";
import { Layout } from "@/components/Layout";
import { Seo } from "@/components/Seo";
import { AppErrorBoundary } from "@/error";
import { RouteFallback } from "@/components/RouteFallback";

/**
 * Every route is its own chunk.
 *
 * `Home` stays eager — it is the landing route, so splitting it would trade a
 * parallel download for a serial one and make the first paint *worse*. The
 * rest are lazy, which keeps the AI SDK client, zod, the chat UI, three.js and
 * the marquee configurator out of the bundle a first-time reader pays for.
 * `Marquee` was already lazy at the viewport level; this lifts the split to the
 * page so the configurator, the pixel font and the quality probing defer too.
 */
const Home = lazy(() => import("@/pages/Home").then((m) => ({ default: m.Home })));
const Watchlist = lazy(() =>
  import("@/pages/Watchlist").then((m) => ({ default: m.Watchlist })),
);
const MovieDetail = lazy(() =>
  import("@/pages/MovieDetail").then((m) => ({ default: m.MovieDetail })),
);
const HealthCheck = lazy(() =>
  import("@/pages/HealthCheck").then((m) => ({ default: m.HealthCheck })),
);
const Assistant = lazy(() =>
  import("@/pages/Assistant").then((m) => ({ default: m.Assistant })),
);
const Marquee = lazy(() =>
  import("@/pages/Marquee").then((m) => ({ default: m.Marquee })),
);
const NotFound = lazy(() =>
  import("@/pages/NotFound").then((m) => ({ default: m.NotFound })),
);

export default function App() {
  return (
    <AppErrorBoundary>
      <BrowserRouter>
        <Seo />
        <WatchlistProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route
                path="/"
                element={
                  <Suspense fallback={<RouteFallback />}>
                    <Home />
                  </Suspense>
                }
              />
              <Route
                path="/watchlist"
                element={
                  <Suspense fallback={<RouteFallback />}>
                    <Watchlist />
                  </Suspense>
                }
              />
              <Route
                path="/movie/:id"
                element={
                  <Suspense fallback={<RouteFallback variant="detail" />}>
                    <MovieDetail />
                  </Suspense>
                }
              />
              <Route
                path="/health"
                element={
                  <Suspense fallback={<RouteFallback />}>
                    <HealthCheck />
                  </Suspense>
                }
              />
              <Route
                path="/assistant"
                element={
                  <Suspense fallback={<RouteFallback variant="chat" />}>
                    <Assistant />
                  </Suspense>
                }
              />
              <Route
                path="/marquee"
                element={
                  <Suspense fallback={<RouteFallback variant="stage" />}>
                    <Marquee />
                  </Suspense>
                }
              />
              <Route
                path="*"
                element={
                  <Suspense fallback={<RouteFallback />}>
                    <NotFound />
                  </Suspense>
                }
              />
            </Route>
          </Routes>
        </WatchlistProvider>
      </BrowserRouter>
    </AppErrorBoundary>
  );
}
