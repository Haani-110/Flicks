import { describe, expect, it } from "vitest";
import { decideQuality, hasWebGL, probeDevice, renderSettings, type DeviceProbe } from "./quality";

const CAPABLE: DeviceProbe = {
  reducedMotion: false,
  webgl: true,
  deviceMemory: 8,
  hardwareConcurrency: 8,
  saveData: false,
};

describe("decideQuality", () => {
  it("gives a capable device the full scene", () => {
    const decision = decideQuality(CAPABLE);

    expect(decision.tier).toBe("full");
    expect(decision.reasons).toEqual(["capable device, no reduced-motion preference"]);
  });

  it("always honours reduced motion, even on a fast machine", () => {
    const decision = decideQuality({ ...CAPABLE, reducedMotion: true });

    expect(decision.tier).toBe("static");
    expect(decision.reasons).toContain("reduced motion is requested");
  });

  it("falls back to the poster when there is no WebGL", () => {
    const decision = decideQuality({ ...CAPABLE, webgl: false });

    expect(decision.tier).toBe("static");
    expect(decision.reasons.join(" ")).toContain("WebGL");
  });

  it("drops to lite on a device with little memory", () => {
    expect(decideQuality({ ...CAPABLE, deviceMemory: 2 }).tier).toBe("lite");
    expect(decideQuality({ ...CAPABLE, deviceMemory: 2 }).reasons).toContain("only 2 GB of memory");
  });

  it("drops to lite on a device with few cores", () => {
    const decision = decideQuality({ ...CAPABLE, hardwareConcurrency: 2 });

    expect(decision.tier).toBe("lite");
    expect(decision.reasons).toContain("2 logical cores");
  });

  it("drops to lite when the reader is saving data", () => {
    const decision = decideQuality({ ...CAPABLE, saveData: true });

    expect(decision.tier).toBe("lite");
    expect(decision.reasons).toContain("data saver is on");
  });

  it("drops to lite on a slow connection", () => {
    expect(decideQuality({ ...CAPABLE, effectiveType: "2g" }).tier).toBe("lite");
    expect(decideQuality({ ...CAPABLE, effectiveType: "slow-2g" }).tier).toBe("lite");
    expect(decideQuality({ ...CAPABLE, effectiveType: "4g" }).tier).toBe("full");
  });

  it("treats a browser that reports nothing as capable", () => {
    const unknown = decideQuality({
      reducedMotion: false,
      webgl: true,
      saveData: false,
    });

    expect(unknown.tier).toBe("full");
  });
});

describe("renderSettings", () => {
  it("spends on the full tier and saves on lite", () => {
    const full = renderSettings("full");
    const lite = renderSettings("lite");

    expect(full.shadows).toBe(true);
    expect(full.antialias).toBe(true);
    expect(full.dpr[1]).toBeGreaterThan(1);
    expect(full.bulbSegments[0]).toBeGreaterThan(lite.bulbSegments[0]);

    expect(lite.shadows).toBe(false);
    expect(lite.antialias).toBe(false);
    expect(lite.dpr[1]).toBeLessThanOrEqual(1);
    expect(lite.posterPanels).toBeLessThan(full.posterPanels);
  });

  it("never asks for more than two device pixels per pixel", () => {
    expect(renderSettings("full").dpr[1]).toBeLessThanOrEqual(2);
    expect(renderSettings("lite").dpr[0]).toBeGreaterThan(0);
  });
});

describe("probing the device", () => {
  it("reports no WebGL in jsdom, which is why the poster is the default here", () => {
    expect(hasWebGL()).toBe(false);
  });

  it("describes the device without throwing when hints are missing", () => {
    const probe = probeDevice();

    expect(probe).toMatchObject({ reducedMotion: false, saveData: false, webgl: false });
    expect(decideQuality(probe).tier).toBe("static");
  });
});
