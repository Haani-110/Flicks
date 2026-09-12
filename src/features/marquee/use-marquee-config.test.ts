import { beforeEach, describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { DEFAULT_CONFIG, MARQUEE_STORAGE_KEY, readStoredConfig } from "./config";
import { useMarqueeConfig } from "./use-marquee-config";

beforeEach(() => {
  localStorage.clear();
});

describe("useMarqueeConfig", () => {
  it("starts from the shipped defaults", () => {
    const { result } = renderHook(() => useMarqueeConfig());

    expect(result.current.config).toEqual(DEFAULT_CONFIG);
    expect(result.current.dirty).toBe(false);
  });

  it("starts from what was stored last time", () => {
    localStorage.setItem(
      MARQUEE_STORAGE_KEY,
      JSON.stringify({ ...DEFAULT_CONFIG, finish: "copper", bulbChase: false }),
    );

    const { result } = renderHook(() => useMarqueeConfig());

    expect(result.current.config.finish).toBe("copper");
    expect(result.current.config.bulbChase).toBe(false);
    expect(result.current.dirty).toBe(true);
  });

  it("applies and persists a change", () => {
    const { result } = renderHook(() => useMarqueeConfig());

    act(() => result.current.update({ finish: "gold", signText: "sold#out" }));

    expect(result.current.config.finish).toBe("gold");
    expect(result.current.config.signText).toBe("SOLD OUT");
    expect(result.current.dirty).toBe(true);
    expect(readStoredConfig().finish).toBe("gold");
  });

  it("keeps changes valid even when a caller passes nonsense", () => {
    const { result } = renderHook(() => useMarqueeConfig());

    act(() => result.current.update({ autoRotate: 50 }));

    expect(result.current.config.autoRotate).toBe(2);
  });

  it("forgets everything on reset", () => {
    const { result } = renderHook(() => useMarqueeConfig());

    act(() => result.current.update({ finish: "matte", centerpiece: "film-can" }));
    expect(result.current.dirty).toBe(true);

    act(() => result.current.reset());

    expect(result.current.config).toEqual(DEFAULT_CONFIG);
    expect(result.current.dirty).toBe(false);
    expect(readStoredConfig()).toEqual(DEFAULT_CONFIG);
  });
});
