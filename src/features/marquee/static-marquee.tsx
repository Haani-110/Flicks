import { useId } from "react";
import { ACCENTS, FINISHES, type MarqueeConfig } from "./config";
import { signMatrix } from "./pixel-font";

type StaticMarqueeProps = {
  config: MarqueeConfig;
  /** Shown by assistive tech in place of the canvas description. */
  description?: string;
  className?: string;
};

const BOARD = { x: 210, y: 96, cell: 16, bulb: 4.6 };
const CANOPY = { x: 150, y: 300, width: 500, height: 44 };

/**
 * The no-WebGL poster.
 *
 * It is not a screenshot: it draws the same bulb matrix the 3D sign uses, in the
 * same colours, from the same config. So a reader on a low-power phone (or with
 * reduced motion) still sees their own sign text and accent colour, and the
 * fallback can never drift out of sync with the real thing.
 */
export function StaticMarquee({ config, description, className }: StaticMarqueeProps) {
  const accent = ACCENTS[config.accent].color;
  const finish = FINISHES[config.finish];
  const board = signMatrix(config.signText);
  const topBulb = "#fff6de";

  const signWidth = board.cols * BOARD.cell;
  const signLeft = BOARD.x + (288 - signWidth) / 2;

  const canopyBulbs = Array.from({ length: 21 }, (_, index) => CANOPY.x + 20 + index * 23);
  const descriptionId = useId();
  const descriptionText =
    description ??
    "Static illustration of the 3D premiere marquee, drawn from the same settings.";

  return (
    <svg
      viewBox="0 0 800 500"
      role="img"
      aria-label={`Premiere marquee: a cinema facade in ${finish.label.toLowerCase()} with a ${ACCENTS[config.accent].label.toLowerCase()} letter board spelling “${config.signText}”.`}
      aria-describedby={descriptionId}
      className={className}
    >
      <desc id={descriptionId}>{descriptionText}</desc>

      <defs>
        <radialGradient id="spot" cx="50%" cy="18%" r="72%">
          <stop offset="0%" stopColor={accent} stopOpacity="0.28" />
          <stop offset="60%" stopColor={accent} stopOpacity="0.05" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1b2124" />
          <stop offset="100%" stopColor="#080a0b" />
        </linearGradient>
        <linearGradient id="metal" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={finish.color} stopOpacity="0.95" />
          <stop offset="55%" stopColor={finish.color} stopOpacity="0.45" />
          <stop offset="100%" stopColor={finish.color} stopOpacity="0.85" />
        </linearGradient>
        <filter id="glow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="4.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <rect width="800" height="500" fill="#0b0e10" />
      <rect y="330" width="800" height="170" fill="url(#floor)" />
      <rect width="800" height="360" fill="url(#spot)" />

      {/* Facade wall */}
      <rect x="130" y="60" width="540" height="280" rx="10" fill="#14181a" stroke="#252b2f" />
      <rect x="150" y="80" width="500" height="240" rx="8" fill="#101416" stroke="#1f2529" />

      {/* Letter board */}
      <rect x={BOARD.x - 24} y={BOARD.y - 20} width="336" height={board.rows * BOARD.cell + 40} rx="8"
        fill="#0a0c0d" stroke="#2b3237" />
      {board.cells.flatMap((row, rowIndex) =>
        row.map((lit, colIndex) => (
          <circle
            key={`${rowIndex}-${colIndex}`}
            cx={signLeft + colIndex * BOARD.cell + BOARD.cell / 2}
            cy={BOARD.y + rowIndex * BOARD.cell + BOARD.cell / 2}
            r={lit ? BOARD.bulb : BOARD.bulb - 1.4}
            fill={lit ? accent : "#2f373c"}
            filter={lit ? "url(#glow)" : undefined}
          />
        )),
      )}

      {/* Canopy with its bulb strip */}
      <path
        d={`M${CANOPY.x - 30} ${CANOPY.y} h${CANOPY.width + 60} l-34 ${CANOPY.height} h-${CANOPY.width - 8} z`}
        fill="url(#metal)"
        stroke="#2b3237"
      />
      {canopyBulbs.map((cx) => (
        <circle key={cx} cx={cx} cy={CANOPY.y + 44} r="4.4" fill={topBulb} filter="url(#glow)" />
      ))}

      {/* Columns */}
      {[200, 600].map((cx) => (
        <rect key={cx} x={cx - 11} y={CANOPY.y + 40} width="22" height="130" rx="6" fill="url(#metal)" />
      ))}

      {/* Carpet */}
      <path d="M232 470 h336 l-58 -100 h-220 z" fill="#4a121b" opacity="0.85" />

      {/* Film reel centerpiece */}
      <g transform="translate(400 404)">
        <circle r="46" fill="none" stroke="url(#metal)" strokeWidth="7" />
        <circle r="41" fill="#12171a" />
        {[0, 60, 120, 180, 240, 300].map((angle) => (
          <rect
            key={angle}
            x="-4"
            y="-38"
            width="8"
            height="24"
            rx="3"
            fill="url(#metal)"
            transform={`rotate(${angle})`}
          />
        ))}
        <circle r="11" fill="url(#metal)" />
        <circle r="4" fill="#0b0e10" />
      </g>

      {/* Follow-spot cone */}
      <path d="M400 0 L520 470 L280 470 Z" fill={accent} opacity="0.05" />
    </svg>
  );
}
