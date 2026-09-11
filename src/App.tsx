import { BrowserRouter, Routes, Route } from "react-router-dom";
import { WatchlistProvider } from "@/context/WatchlistContext";
import { Layout } from "@/components/Layout";
import { Home } from "@/pages/Home";
import { Watchlist } from "@/pages/Watchlist";
import { MovieDetail } from "@/pages/MovieDetail";
import { HealthCheck } from "@/pages/HealthCheck";
import { NotFound } from "@/pages/NotFound";

export default function App() {
  return (
    <BrowserRouter>
      <WatchlistProvider>
        <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/watchlist" element={<Watchlist />} />
          <Route path="/movie/:id" element={<MovieDetail />} />
          <Route path="/health" element={<HealthCheck />} />
          <Route path="*" element={<NotFound />} />
        </Route>
        </Routes>
      </WatchlistProvider>
    </BrowserRouter>
  );
}
