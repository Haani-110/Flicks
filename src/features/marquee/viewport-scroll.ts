/**
 * How far the stage has travelled through the viewport, as -1..1.
 *
 * 0 when the element is centred, negative while it is still below the fold and
 * positive once it has moved above the middle of the screen. The scene uses it
 * to pull the marquee down and turn it as the page scrolls, so the value is
 * clamped — a fast flick should not launch the model out of frame.
 */
export function scrollProgress(
  elementTop: number,
  elementHeight: number,
  viewportHeight: number,
): number {
  const center = elementTop + elementHeight / 2;
  const progress = (viewportHeight / 2 - center) / Math.max(viewportHeight, 1);

  return Math.max(-1, Math.min(1, progress));
}
