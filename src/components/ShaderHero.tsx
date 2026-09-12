import { useEffect, useRef, useState, type ReactNode } from "react";

// Vertex: a single full-screen triangle, no UV needed — gl_FragCoord gives us pixels.
const VERT = `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

// Flicks Nocturne — aurora hero.
// Palette is Flicks' own: charcoal #101315 as night, amber #e8a73e as marquee glow,
// plus a cool teal and a muted violet so the night feels like cinema, not a template.
// Remixed from the typical sine-wave aurora: we use fbm domain-warp for organic flow,
// then let u_mouse gently tug the field so the aurora leans toward curiosity.
const FRAG = `
// Flicks Nocturne — fragment shader
// Uniforms: the three the brief asks for (time, resolution, mouse) — explains the uv/time/mouse trinity.
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
  // clamp: if u_mouse is (0,0) at start, treat as center so hero not pulled to corner
  // we detect that in JS, but guard here: if both 0, center
  vec2 mNorm = m * 2.0 - 1.0;
  mNorm.x *= aspect;
  // gentle wind: only 0.18 pull so text stays readable; interactive but not nauseous
  // Uses u_mouse — second required uniform.
  vec2 wind = vec2(0.0);
  // don't pull if mouse never moved (sentinel <0), JS sends -1,-1 initially
  if (u_mouse.x > 0.0 || u_mouse.y > 0.0) {
    wind = mNorm * 0.18;
  }

  float t = u_time * 0.22;                          // time, slowed — aurora should breathe, not race. Uses u_time.

  // ——— domain warp: aurora's organic drift ————————————————————
  // Two fbm samples at different scales/times warp the coordinate before we draw bands.
  // This is the “what you kept” part: classic aurora uses sine on p.y;
  // we warp p first so sine becomes ribbons, not stripes.
  vec2 q = p;
  q.x += fbm(p * 0.85 + vec2(t * 0.10, t * 0.06)) * 0.65; // warp x a bit more — horizontal shear
  q.y += fbm(p * 1.10 - vec2(t * 0.07, 0.0)) * 0.35;
  q += wind; // cursor leans the whole field

  // ——— aurora bands ————————————————————————————————————————————
  // Two horizontal ribbons, one high (amber), one low (teal/violet). Each is a
  // smoothstep falloff from its center line. Sine on x adds wave, fbm on y adds curl.
  // We use q (warped) not p so ribbons already look fluid.
  float band1Center = 0.48 + sin(q.x * 1.10 + t * 0.55) * 0.18 + cos(q.x * 0.55 - t * 0.25) * 0.12;
  float band2Center = -0.42 + cos(q.x * 0.85 - t * 0.45) * 0.20 + sin(q.x * 0.65 + t * 0.30) * 0.10;

  // width controls glow softness; narrower = sharper cinema light leaks
  float band1 = exp(-abs(q.y - band1Center) * 3.2) * 0.95; // exp falloff — cheaper than smoothstep, glows
  float band2 = exp(-abs(q.y - band2Center) * 2.8) * 0.85;

  // add subtle vertical curl via fbm so bands aren't perfectly parallel
  band1 *= 0.6 + 0.4 * fbm(q * 2.2 + t * 0.15);
  band2 *= 0.6 + 0.4 * fbm(q * 1.8 - t * 0.12);

  // fade bands at hero edges so they don't crowd the text in the middle third
  // center where headline lives should stay darker for contrast
  float centerMask = smoothstep(0.55, 1.15, abs(q.y)); // 0 at center y=0, 1 at top/bottom
  centerMask = pow(centerMask, 0.85);
  // also vignette sides: keep corners dark so posters below pop
  float sideMask = 1.0 - 0.22 * length(p * 0.45);

  band1 *= centerMask * sideMask;
  band2 *= centerMask * sideMask * 1.05; // lower band a touch stronger

  // ——— palette ——————————————————————————————————————————————————
  // Flicks-specific: amber is the marquee, teal is the cool midnight, violet is the film projector haze.
  vec3 night = vec3(0.06, 0.08, 0.09);          // #0f1315-ish charcoal, matches --color-bg
  vec3 amber = vec3(0.91, 0.66, 0.24);          // #e8a73e
  vec3 teal  = vec3(0.27, 0.62, 0.58);          // muted teal, not neon
  vec3 violet= vec3(0.47, 0.38, 0.93);          // soft violet

  vec3 color = night;
  // mix aurora colors: high band warm, low band cool. Multiplying keeps it filmic, not candy.
  color += band1 * mix(amber, vec3(1.0, 0.82, 0.45), 0.25) * 1.15; // amber dominant, slight lift
  color += band2 * mix(teal, violet, 0.45) * 1.05;

  // subtle sky gradient: darker at zenith, barely lifts near horizon so hero never looks flat
  float skyGrad = smoothstep(-0.9, 0.8, p.y) * 0.07;
  color += vec3(0.06, 0.09, 0.14) * skyGrad;

  // ——— vignette & contrast pass ————————————————————————————————
  // Strong, soft vignette keeps headline readable — text lives in the least-bright oval.
  float vign = 1.0 - length(p * 0.42) * 0.55;
  vign = smoothstep(0.0, 1.0, vign);
  vign = pow(vign, 1.08);
  color *= vign * 0.96 + 0.04; // keep a floor so shadows not crushed

  // gentle filmic contrast curve (not ACES, just a cheap lift) — lifts midtones, keeps text contrast
  color = pow(color, vec3(0.92)); // slight gamma lift, then tonemap
  color = color / (color + vec3(0.55)); // Reinhard-ish so brights don't blow

  // ——— grain ————————————————————————————————————————————————————
  // Last pass: monochrome grain breaks banding and sells “film”. Not animated too fast (flicker).
  float grain = hash(uv * 420.0 + mod(t * 8.0, 100.0)) * 0.10 - 0.05; // ±0.05, hash on uv*420 gives fine sprinkle
  // less grain where aurora is brightest — keep glow clean
  float lum = dot(color, vec3(0.299, 0.587, 0.114));
  grain *= (1.0 - lum * 0.45);
  color += grain;

  gl_FragColor = vec4(color, 1.0);
}
`;

function createShader(gl: WebGLRenderingContext, type: number, src: string) {
  const s = gl.createShader(type);
  if (!s) throw new Error("createShader failed");
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(s) ?? "unknown";
    gl.deleteShader(s);
    throw new Error("Shader compile: " + log);
  }
  return s;
}

function createProgram(gl: WebGLRenderingContext, vertSrc: string, fragSrc: string) {
  const vs = createShader(gl, gl.VERTEX_SHADER, vertSrc);
  const fs = createShader(gl, gl.FRAGMENT_SHADER, fragSrc);
  const prog = gl.createProgram();
  if (!prog) throw new Error("createProgram failed");
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(prog) ?? "unknown";
    gl.deleteProgram(prog);
    throw new Error("Program link: " + log);
  }
  return prog;
}

export function ShaderHero({ children }: { children: ReactNode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [reduced, setReduced] = useState(false);

  // respect OS setting — fallback is a static CSS gradient (see below), no canvas work.
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(m.matches);
    update();
    m.addEventListener("change", update);
    return () => m.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (reduced) return;

    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const gl =
      (canvas.getContext("webgl", {
        antialias: false,
        alpha: false,
        depth: false,
        stencil: false,
        premultipliedAlpha: false,
        powerPreference: "low-power",
      }) as WebGLRenderingContext | null) ??
      (canvas.getContext("experimental-webgl") as WebGLRenderingContext | null);

    if (!gl) return;

    let prog: WebGLProgram | null = null;
    try {
      prog = createProgram(gl, VERT, FRAG);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn("[shader] failed", e);
      return;
    }

    const program = prog;
    gl.useProgram(program);

    // full-screen triangle: three vertices that overshoot NDC
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW
    );
    const loc = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(program, "u_time");
    const uRes = gl.getUniformLocation(program, "u_resolution");
    const uMouse = gl.getUniformLocation(program, "u_mouse");

    // DPR capped — requirement says cap, we use 1.75 like the marquee tier logic
    const getDPR = () => Math.min(window.devicePixelRatio || 1, 1.75);

    let w = 0;
    let h = 0;
    let dpr = getDPR();

    const resize = () => {
      if (!container || !canvas) return;
      const rect = container.getBoundingClientRect();
      // CSS pixels
      const cssW = Math.max(1, Math.floor(rect.width));
      const cssH = Math.max(1, Math.floor(rect.height));
      dpr = getDPR();
      w = Math.floor(cssW * dpr);
      h = Math.floor(cssH * dpr);
      // respect capped DPR but don't grow unbounded on zoom
      w = Math.min(w, 2560);
      h = Math.min(h, 1440);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        // keep style size in sync so canvas doesn't stretch
        canvas.style.width = cssW + "px";
        canvas.style.height = cssH + "px";
      }
      gl.viewport(0, 0, w, h);
      gl.uniform2f(uRes, w, h);
    };

    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(container);
    window.addEventListener("resize", resize);

    // mouse: track in canvas pixels (same units as u_resolution)
    let mouseX = -1;
    let mouseY = -1;
    let targetX = -1;
    let targetY = -1;

    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      // e.client relative to viewport, canvas rect is hero bounds
      const x = e.clientX - rect.left;
      const y = rect.height - (e.clientY - rect.top); // flip Y: gl_FragCoord origin bottom-left
      // store CSS px, convert to device px on update
      targetX = x * dpr;
      targetY = y * dpr;
      // clamp to hero so leaving hero doesn't slingshot
      targetX = Math.max(0, Math.min(targetX, w));
      targetY = Math.max(0, Math.min(targetY, h));
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 0) return;
      const t = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      const x = t.clientX - rect.left;
      const y = rect.height - (t.clientY - rect.top);
      targetX = Math.max(0, Math.min(x * dpr, w));
      targetY = Math.max(0, Math.min(y * dpr, h));
    };

    // Scoped to the hero: a pointer moving anywhere else on the page has
    // nothing to do with this light.
    container.addEventListener("mousemove", onMouseMove, { passive: true });
    container.addEventListener("touchmove", onTouchMove, { passive: true });

    let raf = 0;
    let start = performance.now();
    // Two independent reasons not to draw: the tab is hidden, or the hero has
    // been scrolled out of the page. Either one parks the loop.
    let hidden = document.hidden;
    let offscreen = false;

    const paused = () => hidden || offscreen;

    const startLoop = () => {
      // Resume from where the clock left off so time doesn't jump.
      start = performance.now() - (lastT * 1000);
      if (!reduced && !paused()) tick();
    };

    const onVis = () => {
      hidden = document.hidden;
      if (!paused()) startLoop();
      else cancelAnimationFrame(raf);
    };
    document.addEventListener("visibilitychange", onVis);

    // The marquee already does this; the hero is the other GPU consumer, and
    // without it a reader who scrolls down to the grid keeps paying for a
    // full-bleed fbm shader at up to 2560x1440 that nobody can see.
    let io: IntersectionObserver | undefined;
    if (typeof IntersectionObserver === "function") {
      io = new IntersectionObserver(
        (entries) => {
          offscreen = !entries.some((entry) => entry.isIntersecting);
          if (offscreen) cancelAnimationFrame(raf);
          else startLoop();
        },
        { threshold: 0 },
      );
      io.observe(container);
    }

    let lastT = 0;
    let mx = -1;
    let my = -1;

    const tick = () => {
      if (paused() || reduced) return;
      const now = performance.now();
      const t = (now - start) / 1000;
      lastT = t;

      // lerp mouse so aurora drifts, not snaps — feels like wind, not cursor
      if (targetX >= 0) {
        if (mx < 0) {
          mx = targetX;
          my = targetY;
        } else {
          mx += (targetX - mx) * 0.05;
          my += (targetY - my) * 0.05;
        }
      } else {
        // no mouse yet: center-ish so hero not dead
        if (mx < 0) {
          mx = w * 0.5;
          my = h * 0.32;
        }
      }
      // keep inside; if still sentinel, let shader see sentinel and ignore
      const hasMouse = targetX >= 0;
      mouseX = hasMouse ? mx : -1;
      mouseY = hasMouse ? my : -1;

      // u_resolution is written by resize() — the drawing buffer only changes
      // size there, so re-uploading it every frame was wasted work.
      gl.uniform1f(uTime, t);
      gl.uniform2f(uMouse, mouseX, mouseY);

      gl.drawArrays(gl.TRIANGLES, 0, 3);
      raf = requestAnimationFrame(tick);
    };

    // initial paint before any mouse
    gl.uniform1f(uTime, 0);
    gl.uniform2f(uMouse, -1, -1);
    gl.uniform2f(uRes, w, h);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVis);
      container.removeEventListener("mousemove", onMouseMove);
      container.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("resize", resize);
      ro.disconnect();
      io?.disconnect();
      gl.deleteBuffer(buf);
      gl.deleteProgram(program);
    };
  }, [reduced]);

  // Reduced-motion fallback: the SAME palette as a static gradient, no animation, no extra cost.
  // We don't render the canvas at all — the hero is still beautiful and still, per brief.
  if (reduced) {
    return (
      <div
        ref={containerRef}
        className="relative overflow-hidden rounded-2xl border border-[#262b2f] bg-[#0a0f13]"
        style={{
          // static twin of the shader palette: charcoal → teal/amber hints, same vignette feel
          background:
            "radial-gradient(120% 90% at 50% 0%, rgba(232,167,62,0.18) 0%, transparent 52%)," +
            "radial-gradient(110% 85% at 50% 100%, rgba(39,98,88,0.28) 0%, transparent 55%)," +
            "radial-gradient(90% 75% at 18% 50%, rgba(71,56,147,0.16) 0%, transparent 62%)," +
            "linear-gradient(180deg, #0a0f13 0%, #0d1419 45%, #0a0f13 100%)",
        }}
        role="img"
        aria-label="Flicks hero — cinematic night, static for reduced motion"
      >
        {/* same vignette as shader fallback */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(80% 70% at 50% 42%, transparent 38%, rgba(0,0,0,0.55) 92%)",
          }}
          aria-hidden="true"
        />
        <div className="relative p-6 sm:p-10 lg:p-12">{children}</div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden rounded-2xl border border-[#262b2f] bg-[#0a0f13] isolate"
      style={{ minHeight: "min(72vh, 640px)" }}
      aria-label="Flicks hero — interactive aurora canvas"
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
      />
      {/* contrast scrim — keeps headline readable per brief */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(16,19,21,0.22) 0%, rgba(16,19,21,0.08) 28%, rgba(16,19,21,0.52) 88%)," +
            "radial-gradient(78% 66% at 50% 44%, transparent 42%, rgba(0,0,0,0.56) 92%)",
        }}
        aria-hidden="true"
      />
      {/* subtle noise overlay in CSS as extra grain backup if WebGL grain is lost */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035] mix-blend-soft-light"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E\")",
        }}
        aria-hidden="true"
      />
      <div className="relative p-6 sm:p-10 lg:p-12">{children}</div>
    </div>
  );
}

// Export raw GLSL for the deliverable doc (kept in sync with FRAG)
export const HERO_FRAG_SOURCE = FRAG;
export const HERO_VERT_SOURCE = VERT;
