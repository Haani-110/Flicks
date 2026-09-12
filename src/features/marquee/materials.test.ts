import { describe, expect, it } from "vitest";
import { FINISHES, FINISH_KEYS } from "./config";
import { CARPET_COLOR, FLOOR_COLOR, structure, surface, WALL_COLOR } from "./materials";

describe("surface", () => {
  it("reads its look from the chosen finish", () => {
    for (const finish of FINISH_KEYS) {
      const props = surface(finish, false);

      expect(props.color).toBe(FINISHES[finish].color);
      expect(props.metalness).toBe(FINISHES[finish].metalness);
      expect(props.roughness).toBe(FINISHES[finish].roughness);
      expect(props.wireframe).toBe(false);
    }
  });

  it("passes the x-ray toggle through", () => {
    expect(surface("chrome", true).wireframe).toBe(true);
  });

  it("lets a part ask for less environment reflection", () => {
    expect(surface("gold", false, 0.5).envMapIntensity).toBe(0.5);
    expect(surface("gold", false).envMapIntensity).toBe(1);
  });

  it("keeps a polished finish polished and a matte one matte", () => {
    expect(surface("chrome", false).roughness).toBeLessThan(surface("matte", false).roughness);
    expect(surface("chrome", false).metalness).toBe(1);
  });
});

describe("structure", () => {
  it("is the rougher, less reflective variant of the same finish", () => {
    const base = surface("chrome", false);
    const part = structure("chrome", false);

    expect(part.color).toBe(base.color);
    expect(part.roughness).toBeGreaterThan(base.roughness);
    expect(part.envMapIntensity).toBeLessThan(base.envMapIntensity);
  });

  it("never pushes roughness past fully diffuse", () => {
    expect(structure("matte", false).roughness).toBeLessThanOrEqual(1);
  });
});

describe("palette", () => {
  it("keeps the room darker than the carpet", () => {
    expect(FLOOR_COLOR).not.toBe(WALL_COLOR);
    expect(CARPET_COLOR).toMatch(/^#[0-9a-f]{6}$/i);
  });
});
