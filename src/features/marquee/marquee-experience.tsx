import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { movies as catalog, type Movie } from "@/data/movies";
import { ConfigPanel } from "./config-panel";
import { DropZone } from "./drop-zone";
import { inspectGltfFile, describeInspection, type GltfReport } from "./gltf-inspect";
import { accentKeyFor, boardTextFor, movieAccent } from "./movie-style";
import { decideQuality, probeDevice, renderSettings, type QualityDecision } from "./quality";
import { SceneErrorBoundary } from "./scene-error-boundary";
import { StaticMarquee } from "./static-marquee";
import { useMarqueeConfig } from "./use-marquee-config";
import type { DroppedModel } from "./marquee-viewport";

// The heavy module — three.js, the loaders, the whole scene — is only fetched
// when a capable device actually gets to the stage.
const MarqueeViewport = lazy(() => import("./marquee-viewport"));

type MarqueeExperienceProps = {
  /** Catalog to draw posters from; defaults to the app's movie list. */
  movies?: Movie[];
};

export function MarqueeExperience({ movies = catalog }: MarqueeExperienceProps) {
  const { config, update, reset, dirty } = useMarqueeConfig();

  const [decision, setDecision] = useState<QualityDecision | null>(null);
  const [forced, setForced] = useState(false);
  const [optedOut, setOptedOut] = useState(false);
  const [paused, setPaused] = useState(false);
  const [onScreen, setOnScreen] = useState(false);
  const [tabVisible, setTabVisible] = useState(true);
  const [dropped, setDropped] = useState<DroppedModel | null>(null);
  const [modelStatus, setModelStatus] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [featured, setFeatured] = useState<Movie | null>(null);

  const stage = useRef<HTMLDivElement>(null);

  // Probing creates a WebGL context, so it happens after paint, once. Until it
  // answers, the poster is on screen — the cheapest possible first frame.
  useEffect(() => {
    setDecision(decideQuality(probeDevice()));
  }, []);

  useEffect(() => {
    const element = stage.current;
    if (!element || typeof IntersectionObserver === "undefined") {
      setOnScreen(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => setOnScreen(entries.some((entry) => entry.isIntersecting)),
      { rootMargin: "240px 0px" },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const updateVisibility = () => setTabVisible(document.visibilityState !== "hidden");
    updateVisibility();
    document.addEventListener("visibilitychange", updateVisibility);
    return () => document.removeEventListener("visibilitychange", updateVisibility);
  }, []);

  const tier = decision?.tier ?? "static";
  const wants3D = !optedOut && (forced || tier !== "static");
  const settings = useMemo(() => renderSettings(tier === "static" ? "lite" : tier), [tier]);
  // The canvas (and its chunk) only loads when the stage is actually near the
  // viewport; after that it stays mounted and the loop is parked instead.
  const mounted = wants3D && onScreen;
  const active = mounted && tabVisible && !paused;

  const featureMovie = useCallback(
    (movie: Movie) => {
      const accent = accentKeyFor(movieAccent(movie));
      setFeatured(movie);
      update({ signText: boardTextFor(movie), ...(accent ? { accent } : {}) });
    },
    [update],
  );

  const handleFiles = useCallback((files: File[]) => {
    const file = files[0];
    if (!file) return;

    setProblem(null);
    setModelStatus(`Reading ${file.name}…`);

    void (async () => {
      const buffer = await file.arrayBuffer();
      const report: GltfReport = inspectGltfFile(file.name, buffer);

      if (!report.ok) {
        setModelStatus(null);
        setProblem(report.message);
        return;
      }

      setDropped({ buffer, fileName: report.fileName, compression: report.compression });
      setModelStatus(`${report.fileName} loaded — ${describeInspection(report)}.`);
    })();
  }, []);

  const stageDescription =
    "An interactive 3D cinema facade: a letter board of bulbs, a canopy, a poster wall and a " +
    "centerpiece on a pedestal. Everything it can do has a control in the panel next to it.";

  return (
    <section aria-labelledby="marquee-stage-heading" className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="marquee-stage-heading" className="text-xl font-semibold text-[#f3f1ec]">
            The stage
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-[#9aa1a6]">
            Drag to orbit, pinch or scroll to zoom, and click a poster to feature that film.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-full border border-[#2f3639] px-2.5 py-1 text-[11px] uppercase tracking-wide text-[#9aa1a6]">
            {tier === "static" ? "poster" : `${tier} quality`}
          </span>
          {mounted && (
            <button
              type="button"
              onClick={() => setPaused((value) => !value)}
              className="rounded-md border border-[#2f3639] px-2.5 py-1.5 text-xs text-[#e7e4dd] transition-colors hover:border-[#e8a73e]"
            >
              {paused ? "Resume the scene" : "Pause the scene"}
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setForced(false);
              setOptedOut(!optedOut);
            }}
            className="rounded-md border border-[#2f3639] px-2.5 py-1.5 text-xs text-[#e7e4dd] transition-colors hover:border-[#e8a73e]"
          >
            {optedOut ? "Start the 3D scene" : "Use the static poster"}
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="space-y-3">
          <div
            ref={stage}
            role="group"
            aria-label="3D premiere marquee"
            aria-describedby="marquee-stage-description"
            className="relative aspect-[16/10] w-full overflow-hidden rounded-xl border border-[#262b2f] bg-[#06080a]"
          >
            <p id="marquee-stage-description" className="sr-only">
              {stageDescription}
            </p>

            {mounted ? (
              <SceneErrorBoundary
                fallback={<StaticMarquee config={config} className="h-full w-full" />}
                onError={(message) => {
                  setProblem(message);
                  setForced(false);
                  setOptedOut(true);
                }}
              >
                <DropZone onFiles={handleFiles}>
                  <Suspense
                    fallback={
                      <div className="flex h-full w-full items-center justify-center text-sm text-[#9aa1a6]">
                        Warming up the projector…
                      </div>
                    }
                  >
                    <MarqueeViewport
                      config={config}
                      settings={settings}
                      movies={movies}
                      featuredId={featured?.id}
                      onSelectMovie={featureMovie}
                      active={active}
                      dropped={dropped}
                      onModelLoaded={(triangles) =>
                        setModelStatus((current) =>
                          current ? `${current} ${triangles.toLocaleString()} triangles.` : current,
                        )
                      }
                      onModelError={(message) => setProblem(message)}
                    />
                  </Suspense>
                </DropZone>
              </SceneErrorBoundary>
            ) : (
              <StaticMarquee config={config} className="h-full w-full" />
            )}

            {wants3D && !mounted && (
              <p className="absolute inset-x-3 bottom-3 rounded-lg border border-[#262b2f] bg-black/60 px-3 py-2 text-xs text-[#c9c4b8] backdrop-blur">
                The scene loads when this section reaches the viewport.
              </p>
            )}

            {!wants3D && (
              <div className="absolute inset-x-3 bottom-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#262b2f] bg-black/60 p-3 backdrop-blur">
                <p className="text-xs text-[#c9c4b8]">
                  {decision?.tier === "static" && !forced
                    ? `Showing the poster: ${decision.reasons.join(", ")}.`
                    : "Showing the poster."}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setOptedOut(false);
                    setForced(true);
                  }}
                  className="rounded-md bg-[#e8a73e] px-3 py-1.5 text-xs font-semibold text-[#1a1a1a]"
                >
                  Start the 3D scene anyway
                </button>
              </div>
            )}

            {paused && mounted && (
              <p className="absolute inset-x-3 top-3 rounded-md border border-[#2f3639] bg-black/60 px-3 py-1.5 text-xs text-[#c9c4b8] backdrop-blur">
                Scene paused — the render loop is off until you resume.
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            <p className="text-[#9aa1a6]">
              {active
                ? "Rendering."
                : wants3D
                  ? onScreen
                    ? "Idle until the tab is visible."
                    : "Idle while off screen."
                  : "No rendering."}
            </p>
            {dropped && (
              <button
                type="button"
                onClick={() => {
                  setDropped(null);
                  setModelStatus(null);
                }}
                className="rounded-md border border-[#2f3639] px-2 py-1 text-[#e7e4dd] transition-colors hover:border-[#e8a73e]"
              >
                Back to the marquee’s own centerpiece
              </button>
            )}
          </div>

          {modelStatus && (
            <p role="status" className="text-xs text-[#c9c4b8]">
              {modelStatus}
            </p>
          )}
          {problem && (
            <p role="alert" className="rounded-md border border-[#e05555]/40 bg-[#e05555]/10 px-3 py-2 text-xs text-[#ffd9d9]">
              {problem}
            </p>
          )}
          <p role="status" aria-live="polite" className="text-xs text-[#9aa1a6]">
            {featured
              ? `Featured: ${featured.title} (${featured.year}).`
              : "No film featured yet."}
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-[#f3f1ec]">Configurator</h2>
          <ConfigPanel
            config={config}
            onChange={update}
            onReset={reset}
            dirty={dirty}
            movies={movies}
            featuredId={featured?.id}
            onFeatureMovie={featureMovie}
          />
        </div>
      </div>
    </section>
  );
}
