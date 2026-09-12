import { useEffect, useMemo, useState } from "react";
import { CanvasTexture, SRGBColorSpace } from "three";
import type { Movie } from "@/data/movies";
import type { FinishKey } from "../config";
import { movieAccent, movieTagline } from "../movie-style";
import { surface } from "../materials";

type PosterRailProps = {
  movies: Movie[];
  finish: FinishKey;
  wireframe: boolean;
  featuredId?: string | number;
  onSelect: (movie: Movie) => void;
};

const PANEL = { width: 0.72, height: 1.05 };
const TEXTURE = { width: 256, height: 384 };

/**
 * The wall of posters, drawn with the 2D canvas API and uploaded as textures.
 *
 * No poster files are fetched: each panel is painted at runtime from data the
 * app already has (title, genre, runtime, year) and cached in a texture, which
 * costs one 256x384 upload per poster and nothing over the network.
 */
function PosterTexture({ movie }: { movie: Movie }) {
  return useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = TEXTURE.width;
    canvas.height = TEXTURE.height;
    const context = canvas.getContext("2d");
    const accent = movieAccent(movie);

    if (!context) return new CanvasTexture(canvas);

    const gradient = context.createLinearGradient(0, 0, TEXTURE.width, TEXTURE.height);
    gradient.addColorStop(0, accent);
    gradient.addColorStop(0.55, "#101416");
    gradient.addColorStop(1, "#0a0d0f");
    context.fillStyle = gradient;
    context.fillRect(0, 0, TEXTURE.width, TEXTURE.height);

    // Spotlight glow behind the title.
    const glow = context.createRadialGradient(128, 120, 8, 128, 120, 150);
    glow.addColorStop(0, `${accent}66`);
    glow.addColorStop(1, "transparent");
    context.fillStyle = glow;
    context.fillRect(0, 0, TEXTURE.width, TEXTURE.height);

    context.strokeStyle = "rgba(255,255,255,0.14)";
    context.lineWidth = 3;
    context.strokeRect(12, 12, TEXTURE.width - 24, TEXTURE.height - 24);

    context.fillStyle = "#f3f1ec";
    context.font = "bold 30px system-ui, -apple-system, Segoe UI, sans-serif";
    context.textBaseline = "top";

    const words = movie.title.split(/\s+/);
    let line = "";
    let y = 210;
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (context.measureText(candidate).width > TEXTURE.width - 44 && line) {
        context.fillText(line, 22, y);
        y += 34;
        line = word;
      } else {
        line = candidate;
      }
    }
    if (line) context.fillText(line, 22, y);

    context.fillStyle = "rgba(243,241,236,0.72)";
    context.font = "20px system-ui, -apple-system, Segoe UI, sans-serif";
    context.fillText(movieTagline(movie), 22, y + 46);
    context.fillText(String(movie.year), 22, y + 74);

    context.fillStyle = accent;
    context.font = "bold 22px system-ui, -apple-system, Segoe UI, sans-serif";
    context.fillText("F", 22, 24);

    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    texture.needsUpdate = true;
    return texture;
  }, [movie]);
}

function Poster({
  movie,
  finish,
  wireframe,
  featured,
  onSelect,
}: {
  movie: Movie;
  finish: FinishKey;
  wireframe: boolean;
  featured: boolean;
  onSelect: (movie: Movie) => void;
}) {
  const texture = PosterTexture({ movie });
  const [hovered, setHovered] = useState(false);
  const accent = movieAccent(movie);

  useEffect(() => () => texture.dispose(), [texture]);

  const lift = featured ? 0.06 : hovered ? 0.03 : 0;

  return (
    <group position={[0, lift, 0]}>
      <mesh
        castShadow
        onClick={(event) => {
          event.stopPropagation();
          onSelect(movie);
        }}
        onPointerOver={(event) => {
          event.stopPropagation();
          setHovered(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = "";
        }}
      >
        <boxGeometry args={[PANEL.width, PANEL.height, 0.035]} />
        <meshStandardMaterial {...surface(finish, wireframe, 0.8)} color={featured ? accent : "#1b2024"} />
      </mesh>

      <mesh position={[0, 0, 0.021]}>
        <planeGeometry args={[PANEL.width - 0.08, PANEL.height - 0.1]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>

      {featured && (
        <mesh position={[0, -PANEL.height / 2 - 0.06, 0]}>
          <boxGeometry args={[PANEL.width, 0.03, 0.03]} />
          <meshBasicMaterial color={accent} toneMapped={false} />
        </mesh>
      )}
    </group>
  );
}

export function PosterRail({ movies, finish, wireframe, featuredId, onSelect }: PosterRailProps) {
  return (
    <group>
      {movies.map((movie, index) => (
        <group
          key={movie.id}
          position={[2.35 + index * 1.05, PANEL.height / 2 + 0.16, 0.1 + index * 0.62]}
          rotation={[0, -0.3 - index * 0.1, 0]}
        >
          <Poster
            movie={movie}
            finish={finish}
            wireframe={wireframe}
            featured={String(featuredId) === String(movie.id)}
            onSelect={onSelect}
          />
        </group>
      ))}
    </group>
  );
}
