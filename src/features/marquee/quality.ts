/**
 * How much 3D this device should get.
 *
 * The experience ships three tiers, and the *cheap* one is the default when the
 * device or the reader asks for less: a static poster costs nothing, a lite
 * canvas drops shadows and half the pixels, and only a capable device with no
 * reduced-motion preference gets the full scene.
 *
 * The decisions live in a pure function so they can be tested without a GPU.
 */

export type QualityTier = "full" | "lite" | "static";

export type DeviceProbe = {
  /** `matchMedia("(prefers-reduced-motion: reduce)")`. */
  reducedMotion: boolean;
  /** WebGL 2/1 context could be created — or unknown if we could not ask. */
  webgl: boolean;
  /** `navigator.deviceMemory` in GB, when the browser reports it. */
  deviceMemory?: number;
  /** `navigator.hardwareConcurrency` (logical cores). */
  hardwareConcurrency?: number;
  /** `navigator.connection.saveData`. */
  saveData: boolean;
  /** Effective connection type, e.g. "3g". */
  effectiveType?: string;
};

export type QualityDecision = {
  tier: QualityTier;
  /** Human-readable reasons, shown in the UI and asserted in tests. */
  reasons: string[];
};

/** Cores/memory below this get the lite scene. */
export const LOW_POWER_CORES = 4;
export const LOW_POWER_MEMORY_GB = 4;

export function decideQuality(probe: DeviceProbe): QualityDecision {
  const reasons: string[] = [];

  if (probe.reducedMotion) {
    reasons.push("reduced motion is requested");
    return { tier: "static", reasons };
  }

  if (!probe.webgl) {
    reasons.push("this browser cannot create a WebGL context");
    return { tier: "static", reasons };
  }

  if (probe.saveData) reasons.push("data saver is on");
  if (probe.effectiveType && /^(slow-)?2g$/.test(probe.effectiveType)) {
    reasons.push(`network is ${probe.effectiveType}`);
  }
  if (probe.deviceMemory !== undefined && probe.deviceMemory < LOW_POWER_MEMORY_GB) {
    reasons.push(`only ${probe.deviceMemory} GB of memory`);
  }
  if (
    probe.hardwareConcurrency !== undefined &&
    probe.hardwareConcurrency > 0 &&
    probe.hardwareConcurrency < LOW_POWER_CORES
  ) {
    reasons.push(`${probe.hardwareConcurrency} logical cores`);
  }

  if (reasons.length > 0) {
    return { tier: "lite", reasons };
  }

  return { tier: "full", reasons: ["capable device, no reduced-motion preference"] };
}

/** Reads what the browser will tell us, without throwing where APIs are missing. */
export function probeDevice(): DeviceProbe {
  if (typeof window === "undefined") {
    return { reducedMotion: false, webgl: false, saveData: false };
  }

  const navigatorWithHints = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean; effectiveType?: string };
  };

  return {
    reducedMotion:
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    webgl: hasWebGL(),
    deviceMemory: navigatorWithHints.deviceMemory,
    hardwareConcurrency: navigatorWithHints.hardwareConcurrency,
    saveData: navigatorWithHints.connection?.saveData === true,
    effectiveType: navigatorWithHints.connection?.effectiveType,
  };
}

/**
 * Creates and immediately discards a context. Browsers cap the number of live
 * WebGL contexts, so leaking a probe context can kill the real one.
 */
export function hasWebGL(): boolean {
  if (typeof document === "undefined") return false;

  try {
    const canvas = document.createElement("canvas");
    const context =
      canvas.getContext("webgl2") ??
      canvas.getContext("webgl") ??
      canvas.getContext("experimental-webgl");

    if (!context) return false;

    const lose = (context as WebGLRenderingContext).getExtension?.("WEBGL_lose_context");
    lose?.loseContext();
    return true;
  } catch {
    return false;
  }
}

export type RenderSettings = {
  dpr: [number, number];
  antialias: boolean;
  shadows: boolean;
  shadowMapSize: number;
  /** Posters drawn on the rail (each one is a painted 256x384 texture). */
  posterPanels: number;
  /** Sphere tessellation for the bulbs — the scene's only real vertex cost. */
  bulbSegments: [number, number];
  environmentIntensity: number;
};

export function renderSettings(tier: QualityTier): RenderSettings {
  if (tier === "lite") {
    return {
      dpr: [0.75, 1],
      antialias: false,
      shadows: false,
      shadowMapSize: 512,
      posterPanels: 3,
      bulbSegments: [6, 4],
      environmentIntensity: 0.5,
    };
  }

  return {
    dpr: [1, 1.75],
    antialias: true,
    shadows: true,
    shadowMapSize: 1024,
    posterPanels: 4,
    bulbSegments: [10, 6],
    environmentIntensity: 0.9,
  };
}
