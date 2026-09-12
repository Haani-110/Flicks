import type { FinishKey } from "./config";
import { FINISHES } from "./config";

export type SurfaceProps = {
  color: string;
  metalness: number;
  roughness: number;
  wireframe: boolean;
  envMapIntensity: number;
};

/**
 * Turns the panel's finish choice into material props.
 *
 * One place decides how a finish looks, so the facade, the canopy, the
 * centerpiece and the poster frames all agree.
 */
export function surface(finish: FinishKey, wireframe: boolean, envMapIntensity = 1): SurfaceProps {
  const preset = FINISHES[finish];

  return {
    color: preset.color,
    metalness: preset.metalness,
    roughness: preset.roughness,
    wireframe,
    envMapIntensity,
  };
}

/** Slightly rougher, darker variant used for structural parts. */
export function structure(finish: FinishKey, wireframe: boolean): SurfaceProps {
  const props = surface(finish, wireframe, 0.7);
  return { ...props, roughness: Math.min(1, props.roughness + 0.25) };
}

export const FLOOR_COLOR = "#0e1214";
export const WALL_COLOR = "#171c1f";
export const CARPET_COLOR = "#4a121b";
