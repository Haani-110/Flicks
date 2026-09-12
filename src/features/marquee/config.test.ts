import { beforeEach, describe, expect, it } from "vitest";
import {
  applyConfigChange,
  clearStoredConfig,
  DEFAULT_CONFIG,
  MARQUEE_STORAGE_KEY,
  parseConfig,
  readStoredConfig,
  serializeConfig,
  writeStoredConfig,
} from "./config";

beforeEach(() => {
  localStorage.clear();
});

describe("parseConfig", () => {
  it("returns the defaults for anything that is not an object", () => {
    expect(parseConfig(null)).toEqual(DEFAULT_CONFIG);
    expect(parseConfig("chrome")).toEqual(DEFAULT_CONFIG);
    expect(parseConfig(42)).toEqual(DEFAULT_CONFIG);
  });

  it("keeps valid fields and repairs the rest", () => {
    const config = parseConfig({
      finish: "gold",
      accent: "magenta",
      centerpiece: "totally-not-real",
      signText: "now  showing",
      autoRotate: 99,
      bulbChase: "yes",
      exposure: 0.1,
    });

    expect(config.finish).toBe("gold");
    expect(config.accent).toBe("magenta");
    expect(config.centerpiece).toBe(DEFAULT_CONFIG.centerpiece);
    expect(config.signText).toBe("NOW SHOWING".slice(0, 8).trim());
    expect(config.autoRotate).toBe(2);
    expect(config.bulbChase).toBe(DEFAULT_CONFIG.bulbChase);
    expect(config.exposure).toBe(0.6);
  });

  it("ignores a config stored by an older release without a new field", () => {
    const { exposure, ...legacy } = DEFAULT_CONFIG;

    expect(exposure).toBe(1.1);
    expect(parseConfig(legacy).exposure).toBe(DEFAULT_CONFIG.exposure);
  });
});

describe("applyConfigChange", () => {
  it("normalises the sign text as it is applied", () => {
    const next = applyConfigChange(DEFAULT_CONFIG, { signText: "sold#out!!" });
    expect(next.signText).toBe("SOLD OUT");
  });

  it("clamps the sliders to their range", () => {
    expect(applyConfigChange(DEFAULT_CONFIG, { autoRotate: 12 }).autoRotate).toBe(2);
    expect(applyConfigChange(DEFAULT_CONFIG, { autoRotate: -4 }).autoRotate).toBe(0);
    expect(applyConfigChange(DEFAULT_CONFIG, { exposure: 5 }).exposure).toBe(1.8);
  });

  it("ignores a non-numeric slider value rather than storing NaN", () => {
    const next = applyConfigChange(DEFAULT_CONFIG, { autoRotate: Number.NaN });
    expect(next.autoRotate).toBe(DEFAULT_CONFIG.autoRotate);
  });
});

describe("storage", () => {
  it("round-trips a config", () => {
    writeStoredConfig({ ...DEFAULT_CONFIG, finish: "copper", signText: "MATINEE" });

    expect(JSON.parse(localStorage.getItem(MARQUEE_STORAGE_KEY) ?? "{}")).toMatchObject({
      finish: "copper",
      signText: "MATINEE",
    });
    expect(readStoredConfig()).toMatchObject({ finish: "copper", signText: "MATINEE" });
  });

  it("falls back to the defaults when storage holds junk", () => {
    localStorage.setItem(MARQUEE_STORAGE_KEY, "{not json");

    expect(readStoredConfig()).toEqual(DEFAULT_CONFIG);
  });

  it("falls back to the defaults when nothing is stored", () => {
    expect(readStoredConfig()).toEqual(DEFAULT_CONFIG);
  });

  it("forgets what was stored", () => {
    writeStoredConfig({ ...DEFAULT_CONFIG, finish: "gold" });
    clearStoredConfig();

    expect(localStorage.getItem(MARQUEE_STORAGE_KEY)).toBeNull();
    expect(readStoredConfig()).toEqual(DEFAULT_CONFIG);
  });

  it("serializes to the shape it reads back", () => {
    expect(parseConfig(JSON.parse(serializeConfig(DEFAULT_CONFIG)))).toEqual(DEFAULT_CONFIG);
  });
});
