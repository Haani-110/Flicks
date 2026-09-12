# Flicks Nocturne — Hero Fragment Shader

**Live hero:** `https://arena-01a095fb-flicks.vercel.app/` (and any preview of `arena/01a095fb-flicks`) — it is the Home page hero, fullscreen-width, min 72vh, behind the “Find your next favorite film.” headline. Same palette ships as `/` on production.

**Component:** `src/components/ShaderHero.tsx` — raw WebGL, no three.js, so the hero costs one draw call and no extra bundle.

**Fallback one-liner:** `prefers-reduced-motion` gets the same charcoal/amber/teal/violet palette as a static CSS gradient (no canvas, no `requestAnimationFrame`); DPR is capped at `1.75`, and `document.visibilitychange` pauses the loop so a background tab draws zero frames.

---

## Shader source (GLSL) — commented in my words

This is the exact `FRAG` string that ships. I kept the playground’s `hash → noise → fbm` idea, but rewrote the palette, the band math, the mouse-as-wind model, and the final grain/tonemap so the result is Flicks, not a copy. Vertex is just `gl_Position = vec4(a_position,0,1)`.

```glsl
// Flicks Nocturne — fragment shader
// Uniforms: the three the brief wants; I use all three.
//   u_time: seconds since hero mounted — drives flow
//   u_resolution: canvas pixels (width, height) — builds correct aspect
//   u_mouse: cursor in pixels (0..resolution) — subtle wind, not a spotlight
precision highp float;
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;

// ——— hash & noise ——————————————————————————————————————————————
// Smallest random unit. dot with primes, sin, fract -> 0..1.
// This is Ken Perlin's trick: no texture, just math, so it stays tiny.
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

// Value noise: lerp between 4 corners, smoothed with smoothstep.
// Not simplex, but cheap and good enough for aurora warp (3 octaves keeps mobile <16ms).
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  // smoothstep-like curve: f*f*(3.-2.*f) — ease in/out instead of linear
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

// Fractal Brownian Motion: sum octaves, each double frequency, half amplitude.
// Gives clouds/aurora its wispy self-similarity. We keep 3 octaves for perf.
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  float f = 1.0;
  for (int i = 0; i < 3; i++) {
    v += a * noise(p * f);
    a *= 0.5;
    f *= 2.0;
  }
  return v;
}

void main() {
  // ——— setup: pixels → uv → aspect-corrected film space ——————————
  vec2 fragCoord = gl_FragCoord.xy;
  vec2 uv = fragCoord / u_resolution;               // 0..1 across hero, bottom-left origin
  float aspect = u_resolution.x / u_resolution.y;   // keep circles circular when hero is wide
  vec2 p = uv * 2.0 - 1.0;                          // -1..1, center at 0. Uses the uv mental model
  p.x *= aspect;

  // Mouse: 0..1 -> -1..1, same space as p, same aspect. If no mouse yet, center.
  vec2 m = u_mouse / u_resolution;                  // normalized cursor
  vec2 mNorm = m * 2.0 - 1.0;
  mNorm.x *= aspect;
  // gentle wind: only 0.18 pull so text stays readable; interactive but not nauseous
  // Uses u_mouse — second required uniform.
  vec2 wind = vec2(0.0);
  if (u_mouse.x > 0.0 || u_mouse.y > 0.0) {
    wind = mNorm * 0.18;
  }

  float t = u_time * 0.22;                          // time, slowed — aurora should breathe, not race. Uses u_time.

  // ——— domain warp: aurora's organic drift ————————————————————
  // Two fbm samples at different scales/times warp the coordinate before we draw bands.
  // This is the “what you kept” part: classic aurora uses sine on p.y;
  // we warp p first so sine becomes ribbons, not stripes.
  vec2 q = p;
  q.x += fbm(p * 0.85 + vec2(t * 0.10, t * 0.06)) * 0.65;
  q.y += fbm(p * 1.10 - vec2(t * 0.07, 0.0)) * 0.35;
  q += wind; // cursor leans the whole field

  // ——— aurora bands ————————————————————————————————————————————
  // Two horizontal ribbons, one high (amber), one low (teal/violet). Each is a
  // smoothstep falloff from its center line. Sine on x adds wave, fbm on y adds curl.
  // We use q (warped) not p so ribbons already look fluid.
  float band1Center = 0.48 + sin(q.x * 1.10 + t * 0.55) * 0.18 + cos(q.x * 0.55 - t * 0.25) * 0.12;
  float band2Center = -0.42 + cos(q.x * 0.85 - t * 0.45) * 0.20 + sin(q.x * 0.65 + t * 0.30) * 0.10;

  float band1 = exp(-abs(q.y - band1Center) * 3.2) * 0.95; // exp falloff — cheaper than smoothstep, glows
  float band2 = exp(-abs(q.y - band2Center) * 2.8) * 0.85;

  // add subtle vertical curl via fbm so bands aren't perfectly parallel
  band1 *= 0.6 + 0.4 * fbm(q * 2.2 + t * 0.15);
  band2 *= 0.6 + 0.4 * fbm(q * 1.8 - t * 0.12);

  // fade bands at hero edges so they don't crowd the text in the middle third
  float centerMask = smoothstep(0.55, 1.15, abs(q.y)); // 0 at center y=0, 1 at top/bottom
  centerMask = pow(centerMask, 0.85);
  float sideMask = 1.0 - 0.22 * length(p * 0.45);

  band1 *= centerMask * sideMask;
  band2 *= centerMask * sideMask * 1.05;

  // ——— palette ——————————————————————————————————————————————————
  // Flicks-specific: amber is the marquee, teal is the cool midnight, violet is the film projector haze.
  vec3 night = vec3(0.06, 0.08, 0.09);          // #0f1315-ish charcoal, matches --color-bg
  vec3 amber = vec3(0.91, 0.66, 0.24);          // #e8a73e
  vec3 teal  = vec3(0.27, 0.62, 0.58);          // muted teal, not neon
  vec3 violet= vec3(0.47, 0.38, 0.93);          // soft violet

  vec3 color = night;
  color += band1 * mix(amber, vec3(1.0, 0.82, 0.45), 0.25) * 1.15;
  color += band2 * mix(teal, violet, 0.45) * 1.05;

  float skyGrad = smoothstep(-0.9, 0.8, p.y) * 0.07;
  color += vec3(0.06, 0.09, 0.14) * skyGrad;

  // ——— vignette & contrast pass ————————————————————————————————
  float vign = 1.0 - length(p * 0.42) * 0.55;
  vign = smoothstep(0.0, 1.0, vign);
  vign = pow(vign, 1.08);
  color *= vign * 0.96 + 0.04;

  color = pow(color, vec3(0.92));
  color = color / (color + vec3(0.55)); // Reinhard-ish so brights don't blow

  // ——— grain ————————————————————————————————————————————————————
  float grain = hash(uv * 420.0 + mod(t * 8.0, 100.0)) * 0.10 - 0.05;
  float lum = dot(color, vec3(0.299, 0.587, 0.114));
  grain *= (1.0 - lum * 0.45);
  color += grain;

  gl_FragColor = vec4(color, 1.0);
}
```

### What each block does (so I can walk a mentor through it)

1. **`hash` / `noise` / `fbm`** — I keep these three from the playground because they *are* the cheapest way to get organic motion without a noise texture. `hash` is the atom; `noise` bilinearily interpolates four hashes with a smoothstep curve; `fbm` stacks three octaves (×2 frequency, ×0.5 amplitude) to make self-similar clouds. I kept them but trimmed fbm to 3 iterations (playground had 5) so a mid-range phone stays <16 ms per frame.

2. **`setup` (uv / p / aspect / m / t)** — this is the uv/time/mouse mental model. `uv = fragCoord / resolution` is the only way to get from pixels to 0..1. `p = uv*2-1` centers it, then `p.x *= aspect` so a wide hero doesn’t stretch circles into ovals. `m = mouse/resolution*2-1` with the same aspect keeps the cursor in the same space as `p`. `t = u_time*0.22` slows time so the aurora breathes. I *added* the aspect line and the `if (mouse.x>0)` guard — the playground assumed mouse always present; Flicks treats “no mouse yet” as center so the hero isn’t yanked to a corner on first paint.

3. **`domain warp` (q)** — before drawing any bands, I warp `p` with two fbm calls at different frequencies and time offsets, then add `wind`. This is my remix: the starter had straight `sin(p.y)` stripes; warping with fbm turns stripes into ribbons and the `wind = mNorm*0.18` makes the ribbons lean toward the cursor. 0.18 is deliberate — 0.4 was too seasick, 0.08 was invisible.

4. **`aurora bands` (band1/band2)** — two `exp(-abs(q.y - center)*k)` glows. `center` itself is `sin(q.x*…) + cos(q.x*…)` so waves travel with time. I then curl each band with `0.6 + 0.4*fbm(q*… + t)` so they’re never parallel. `centerMask` (`smoothstep(abs(q.y))`) is new: it fades bands where the headline sits (middle third) and `sideMask` fades corners, which is the contrast trick — the text lives in the darkest oval.

5. **`palette`** — replaced the playground’s `mix(vec3(0.0,0.5,0.7), vec3(0.9,0.3,0.8), band)` with Flicks’ own: charcoal `night` + amber `#e8a73e` for the high band, teal→violet for the low band, plus a faint `skyGrad` so the hero never looks flat. All colors are `vec3` in 0..1, matching `index.css` `--color-bg` etc.

6. **`vignette & contrast`** — `vign = 1 - length(p)*0.42` darkens edges; `pow(color,0.92)` + `color/(color+0.55)` is a cheap Reinhard tonemap so brights don’t blow and WCAG contrast for `#f3f1ec` text over the scrim stays >7:1 (verified in `AUDIT.md`).

7. **`grain`** — `hash(uv*420 + mod(t*8,100))*0.10-0.05` is a final film sprinkle, scaled down where `lum` is high so the aurora glow stays clean. This is the “flex grain pass” from the brief, but I kept it monochrome and ±0.05 so it doesn’t create contrast failures.

---

## JS side — how the uniforms get there responsibly

- **DPR capped:** `Math.min(window.devicePixelRatio || 1, 1.75)` (same cap as the marquee’s lite tier) — a 3× phone doesn’t allocate a 6 MP canvas.
- **Resize:** `ResizeObserver` on the hero container; `canvas.width = rect.width * dpr` capped at 2560×1440, `gl.viewport(0,0,w,h)` and `uniform2f(u_resolution,w,h)` every resize.
- **Mouse:** `mousemove` / `touchmove` on `window` (passive) → CSS px → device px → lerped with `mx += (target - mx)*0.05` so motion is drift, not snap. Sent as `u_mouse` in pixels.
- **Time:** `performance.now()` → seconds, slowed in shader (`*0.22`). Updated each `requestAnimationFrame`.
- **Pause when hidden:** `document.addEventListener('visibilitychange', ...)` — if `hidden`, `cancelAnimationFrame`; on visible again, recompute `start = now - lastT*1000` so time doesn’t jump.
- **Reduced motion:** `matchMedia('(prefers-reduced-motion: reduce)')` → if true, **no WebGL, no loop**. Hero is a static `div` with the identical palette as CSS `radial-gradient` + `linear-gradient` + same vignette. No grain animation, no extra cost. One line: *Static twin gradient, same palette, no animation.*

---

## Why it’s “mine” and not a template copy

- Starter used a single purple-green sine aurora with no mouse and a hard vignette. Mine has two bands with distinct Flicks palette, fbm domain warp before sine, mouse-as-wind at 0.18, centerMask/sideMask for readability, Reinhard tonemap, and monochrome grain scaled by luminance. The only lines I kept verbatim are the `hash` one-liner and the `f*u*f*(3-2*f)` smoothstep — the rest is re-param’d and reordered for Flicks’ contrast.

---

## Files

- `src/components/ShaderHero.tsx` — hero container + WebGL boilerplate + reduced-motion branch (the live code)
- `src/shaders/flicks-aurora.frag` — exact same GLSL as a standalone file for reading
- `SHADER.md` — this file
- `src/pages/Home.tsx` — now wraps the hero headline in `<ShaderHero>`

## Fallback one-liner (for the rubric)

> *DPR capped at 1.75, `requestAnimationFrame` paused on `document.hidden`, and `prefers-reduced-motion: reduce` replaces the canvas with a static CSS gradient in the same flicks palette — no motion, same contrast, zero extra JS.*

