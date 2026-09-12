import { useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type { Movie } from "@/data/movies";
import type { MarqueeConfig } from "./config";
import type { CompressionKind } from "./gltf-inspect";
import type { RenderSettings } from "./quality";
import { MarqueeScene } from "./scene/marquee-scene";
import { scrollProgress } from "./viewport-scroll";

export type DroppedModel = {
  buffer: ArrayBuffer;
  fileName: string;
  compression: CompressionKind;
};

export type MarqueeViewportProps = {
  config: MarqueeConfig;
  settings: RenderSettings;
  movies: Movie[];
  featuredId?: string | number;
  onSelectMovie: (movie: Movie) => void;
  /** False parks the render loop entirely (offscreen, hidden tab, paused). */
  active: boolean;
  dropped?: DroppedModel | null;
  onModelLoaded?: (triangles: number) => void;
  onModelError?: (message: string) => void;
};

type Stats = { fps: number; drawCalls: number; triangles: number };

const CAMERA = { position: [0, 2.15, 6.6] as [number, number, number], fov: 42, near: 0.1, far: 60 };

/**
 * The canvas host.
 *
 * Everything expensive lives behind this component's dynamic import, and the
 * render loop only runs while the section is on screen in a visible tab. The
 * canvas is capped at 1.75x device pixels (1x on the lite tier) because the
 * scene is fill-rate bound on a phone, not vertex bound.
 */
export default function MarqueeViewport({
  config,
  settings,
  movies,
  featuredId,
  onSelectMovie,
  active,
  dropped,
  onModelLoaded,
  onModelError,
}: MarqueeViewportProps) {
  const container = useRef<HTMLDivElement>(null);
  const scrollRef = useRef(0);
  const [stats, setStats] = useState<Stats>({ fps: 0, drawCalls: 0, triangles: 0 });

  // Scroll moves the world rather than the camera, so orbiting stays responsive.
  useEffect(() => {
    const element = container.current;
    if (!element) return;

    const update = () => {
      const rect = element.getBoundingClientRect();
      scrollRef.current = scrollProgress(rect.top, rect.height, window.innerHeight);
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);

    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <div ref={container} className="relative h-full w-full">
      <Canvas
        dpr={settings.dpr}
        shadows={settings.shadows}
        frameloop={active ? "always" : "never"}
        camera={CAMERA}
        gl={{
          antialias: settings.antialias,
          powerPreference: "high-performance",
          alpha: false,
          stencil: false,
        }}
        onCreated={({ gl }) => {
          gl.toneMappingExposure = config.exposure;
        }}
      >
        <Exposure value={config.exposure} />
        <MarqueeScene
          config={config}
          settings={settings}
          movies={movies}
          featuredId={featuredId}
          onSelectMovie={onSelectMovie}
          scrollRef={scrollRef}
          dropped={dropped}
          onModelLoaded={onModelLoaded}
          onModelError={onModelError}
        />
        <FrameStats onStats={setStats} />
      </Canvas>

      <p
        aria-hidden="true"
        className="pointer-events-none absolute bottom-2 right-3 rounded bg-black/45 px-2 py-1 font-mono text-[10px] text-[#9aa1a6] backdrop-blur"
      >
        {stats.fps} fps · {stats.drawCalls} draws · {(stats.triangles / 1000).toFixed(1)}k tris
      </p>
    </div>
  );
}

/** Keeps the renderer's exposure in step with the brightness slider. */
function Exposure({ value }: { value: number }) {
  const gl = useThree((state) => state.gl);

  useEffect(() => {
    gl.toneMappingExposure = value;
  }, [gl, value]);

  return null;
}

/**
 * Reports frame rate and draw calls twice a second. Sampled from the render
 * loop rather than measured with a timer, so it reflects real frames.
 */
function FrameStats({ onStats }: { onStats: (stats: Stats) => void }) {
  const gl = useThree((state) => state.gl);
  const accumulator = useRef({ frames: 0, time: 0 });

  useFrame((_, delta) => {
    const current = accumulator.current;
    current.frames += 1;
    current.time += delta;

    if (current.time < 0.5) return;

    onStats({
      fps: Math.round(current.frames / current.time),
      drawCalls: gl.info.render.calls,
      triangles: gl.info.render.triangles,
    });
    current.frames = 0;
    current.time = 0;
  });

  return null;
}
