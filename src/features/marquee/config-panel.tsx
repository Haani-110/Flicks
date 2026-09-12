import { useEffect, useId, useMemo, useState } from "react";
import type { Movie } from "@/data/movies";
import {
  ACCENTS,
  ACCENT_KEYS,
  AUTO_ROTATE_RANGE,
  CENTERPIECES,
  EXPOSURE_RANGE,
  CENTERPIECE_KEYS,
  FINISHES,
  FINISH_KEYS,
  BOARD_COLUMNS,
  type MarqueeConfig,
} from "./config";
import { explainSignText, signColumns } from "./pixel-font";

type ConfigPanelProps = {
  config: MarqueeConfig;
  onChange: (change: Partial<MarqueeConfig>) => void;
  onReset: () => void;
  /** False when the config already matches the defaults. */
  dirty: boolean;
  /** Catalog used by the "feature a movie" list. */
  movies: Movie[];
  featuredId?: string | number;
  onFeatureMovie: (movie: Movie) => void;
};

/** Words the "surprise me" button draws from — all fit the board. */
const SIGN_WORDS = ["FLICKS", "PREMIERE", "NOW SHOWING", "SOLD OUT", "MATINEE", "DOUBLE BILL"] as const;

const fieldsetClass = "rounded-lg border border-[#262b2f] bg-[#14181a] p-4";
const legendClass = "px-1 text-xs font-semibold uppercase tracking-wide text-[#9aa1a6]";
const radioRowClass =
  "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-[#e7e4dd] transition-colors hover:bg-[#1d2226]";
const inputClass =
  "w-full rounded-md border border-[#2f3639] bg-[#0f1214] px-3 py-2 text-sm text-[#f3f1ec] outline-none focus-visible:ring-2 focus-visible:ring-[#e8a73e]";

/**
 * The configurator.
 *
 * Native form controls with real labels: radios for the finish, swatches,
 * centerpiece and orbit speed, a text field for the letter board, checkboxes
 * for the motion toggles. Every control is reachable by keyboard and named for
 * assistive tech, so the tests can drive it the way a person would.
 */
export function ConfigPanel({
  config,
  onChange,
  onReset,
  dirty,
  movies,
  featuredId,
  onFeatureMovie,
}: ConfigPanelProps) {
  const signFieldId = useId();
  const signHintId = `${signFieldId}-hint`;
  const signStatusId = `${signFieldId}-status`;
  const [draft, setDraft] = useState(config.signText);

  // The panel owns the raw text so a dropped character can be explained before
  // it disappears; the config keeps the normalised version.
  // The raw draft follows external normalisation (the "surprise me" and
  // bulb-column paths rewrite the sign text from outside the panel).
  useEffect(() => {
    // eslint-disable-next-line react/set-state-in-effect
    setDraft(config.signText);
  }, [config.signText]);

  const explanation = useMemo(() => explainSignText(draft), [draft]);
  const columns = signColumns(explanation.normalized.length);

  const surprise = () => {
    const pick = <T,>(list: readonly T[]) => list[Math.floor(Math.random() * list.length)];
    const word = pick(SIGN_WORDS);

    setDraft(word);
    onChange({
      finish: pick(FINISH_KEYS),
      accent: pick(ACCENT_KEYS),
      centerpiece: pick(CENTERPIECE_KEYS),
      signText: word,
    });
  };

  return (
    <form
      aria-label="Marquee controls"
      className="space-y-4"
      onSubmit={(event) => event.preventDefault()}
    >
      <fieldset className={fieldsetClass}>
        <legend className={legendClass}>Finish</legend>
        <div className="grid grid-cols-2 gap-1">
          {FINISH_KEYS.map((key) => (
            <label key={key} className={radioRowClass}>
              <input
                type="radio"
                name="marquee-finish"
                value={key}
                checked={config.finish === key}
                onChange={() => onChange({ finish: key })}
                className="accent-[#e8a73e]"
              />
              {FINISHES[key].label}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className={fieldsetClass}>
        <legend className={legendClass}>Bulb colour</legend>
        <div className="grid grid-cols-2 gap-1">
          {ACCENT_KEYS.map((key) => (
            <label key={key} className={radioRowClass}>
              <input
                type="radio"
                name="marquee-accent"
                value={key}
                checked={config.accent === key}
                onChange={() => onChange({ accent: key })}
                className="accent-[#e8a73e]"
              />
              <span
                aria-hidden="true"
                className="h-3.5 w-3.5 rounded-full border border-black/40"
                style={{ backgroundColor: ACCENTS[key].color }}
              />
              {ACCENTS[key].label}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className={fieldsetClass}>
        <legend className={legendClass}>Centerpiece</legend>
        <div className="grid gap-1">
          {CENTERPIECE_KEYS.map((key) => (
            <label key={key} className={radioRowClass}>
              <input
                type="radio"
                name="marquee-centerpiece"
                value={key}
                checked={config.centerpiece === key}
                onChange={() => onChange({ centerpiece: key })}
                className="accent-[#e8a73e]"
              />
              {CENTERPIECES[key].label}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className={fieldsetClass}>
        <legend className={legendClass}>Letter board</legend>
        <label htmlFor={signFieldId} className="mb-1 block text-sm text-[#e7e4dd]">
          Sign text
        </label>
        <input
          id={signFieldId}
          className={inputClass}
          value={draft}
          inputMode="text"
          autoComplete="off"
          spellCheck={false}
          aria-describedby={`${signHintId} ${signStatusId}`}
          onChange={(event) => {
            setDraft(event.target.value);
            onChange({ signText: event.target.value });
          }}
        />
        <p id={signHintId} className="mt-1 text-xs text-[#9aa1a6]">
          Eight characters fit on the board: A–Z, 0–9 and basic punctuation.
        </p>
        <p id={signStatusId} className="mt-1 text-xs text-[#c9c4b8]" role="status">
          {explanation.normalized
            ? `The board spells “${explanation.normalized}” using ${columns} of ${BOARD_COLUMNS} bulb columns.`
            : "The board is blank."}
          {explanation.dropped.length > 0
            ? ` Dropped: ${explanation.dropped.join(" ")}.`
            : ""}
          {explanation.truncated ? " The rest did not fit." : ""}
        </p>
      </fieldset>

      <fieldset className={fieldsetClass}>
        <legend className={legendClass}>Motion</legend>
        <label htmlFor="marquee-auto-rotate" className="block text-sm text-[#e7e4dd]">
          Auto-rotate (revolutions per minute)
        </label>
        <div className="mt-2 flex items-center gap-3">
          <input
            id="marquee-auto-rotate"
            type="range"
            min={AUTO_ROTATE_RANGE.min}
            max={AUTO_ROTATE_RANGE.max}
            step={AUTO_ROTATE_RANGE.step}
            value={config.autoRotate}
            aria-describedby="marquee-auto-rotate-value"
            onChange={(event) => onChange({ autoRotate: Number(event.target.value) })}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-[#2f3639] accent-[#e8a73e]"
          />
          <span id="marquee-auto-rotate-value" className="w-20 shrink-0 font-mono text-xs text-[#9aa1a6]">
            {config.autoRotate.toFixed(2)} rpm
          </span>
        </div>

        <div className="mt-4">
          <label htmlFor="marquee-exposure" className="block text-sm text-[#e7e4dd]">
            Brightness
          </label>
          <div className="mt-2 flex items-center gap-3">
            <input
              id="marquee-exposure"
              type="range"
              min={EXPOSURE_RANGE.min}
              max={EXPOSURE_RANGE.max}
              step={EXPOSURE_RANGE.step}
              value={config.exposure}
              aria-describedby="marquee-exposure-value"
              onChange={(event) => onChange({ exposure: Number(event.target.value) })}
              className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-[#2f3639] accent-[#e8a73e]"
            />
            <span id="marquee-exposure-value" className="w-20 shrink-0 font-mono text-xs text-[#9aa1a6]">
              {config.exposure.toFixed(2)}x
            </span>
          </div>
        </div>

        <div className="mt-3 grid gap-1">
          <label className={radioRowClass}>
            <input
              type="checkbox"
              checked={config.bulbChase}
              onChange={(event) => onChange({ bulbChase: event.target.checked })}
              className="accent-[#e8a73e]"
            />
            Bulb chase
          </label>
          <label className={radioRowClass}>
            <input
              type="checkbox"
              checked={config.followCursor}
              onChange={(event) => onChange({ followCursor: event.target.checked })}
              className="accent-[#e8a73e]"
            />
            Follow the pointer
          </label>
          <label className={radioRowClass}>
            <input
              type="checkbox"
              checked={config.wireframe}
              onChange={(event) => onChange({ wireframe: event.target.checked })}
              className="accent-[#e8a73e]"
            />
            X-ray the metal
          </label>
        </div>
      </fieldset>

      <fieldset className={fieldsetClass}>
        <legend className={legendClass}>Feature a movie</legend>
        <p className="mb-2 text-xs text-[#9aa1a6]">
          Puts the title on the letter board and takes its accent colour.
        </p>
        <div className="flex flex-wrap gap-2">
          {movies.map((movie) => (
            <button
              key={movie.id}
              type="button"
              aria-label={`Feature ${movie.title}`}
              aria-pressed={String(featuredId) === String(movie.id)}
              onClick={() => onFeatureMovie(movie)}
              className={[
                "rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors",
                String(featuredId) === String(movie.id)
                  ? "border-[#e8a73e] bg-[#e8a73e]/15 text-[#f3f1ec]"
                  : "border-[#2f3639] text-[#c9c4b8] hover:border-[#e8a73e] hover:text-[#f3f1ec]",
              ].join(" ")}
            >
              {movie.title}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={surprise}
          className="rounded-md border border-[#2f3639] px-3 py-2 text-sm text-[#e7e4dd] transition-colors hover:border-[#e8a73e]"
        >
          Surprise me
        </button>
        <button
          type="button"
          onClick={onReset}
          disabled={!dirty}
          className="rounded-md border border-[#2f3639] px-3 py-2 text-sm text-[#e7e4dd] transition-colors hover:border-[#e8a73e] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Reset settings
        </button>
      </div>
    </form>
  );
}
