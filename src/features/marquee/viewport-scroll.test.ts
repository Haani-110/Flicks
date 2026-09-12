import { describe, expect, it } from "vitest";
import { scrollProgress } from "./viewport-scroll";

describe("scrollProgress", () => {
  it("is zero when the stage is centred in the viewport", () => {
    expect(scrollProgress(300, 400, 1000)).toBeCloseTo(0);
  });

  it("is negative while the stage is still below the fold", () => {
    expect(scrollProgress(900, 400, 1000)).toBeLessThan(0);
  });

  it("is positive once the stage has moved above the middle", () => {
    expect(scrollProgress(-200, 400, 1000)).toBeGreaterThan(0);
  });

  it("clamps fast scrolls so the scene cannot be thrown out of frame", () => {
    expect(scrollProgress(-9_000, 400, 1000)).toBe(1);
    expect(scrollProgress(9_000, 400, 1000)).toBe(-1);
  });

  it("reports no offset rather than a division by zero", () => {
    expect(scrollProgress(0, 0, 0)).toBe(0);
    expect(Number.isNaN(scrollProgress(0, 0, 0))).toBe(false);
  });
});
