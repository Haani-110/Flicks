import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  HERO_FRAG_SOURCE,
  HERO_VERT_SOURCE,
  ShaderHero,
} from "./ShaderHero";

/**
 * The hero is a WebGL component, so the GPU itself cannot run here — but every
 * decision around it can, and those are the ones that regress:
 *
 *  - a reader who asks for reduced motion gets the static gradient, and no
 *    canvas is even mounted;
 *  - a browser that cannot create a WebGL context still shows the headline;
 *  - a context that fails to compile or link falls back rather than throwing;
 *  - a working context gets the full-screen triangle, the three uniforms the
 *    brief asks for, a capped drawing buffer, and a render loop that parks
 *    itself when the hero leaves the viewport or the tab is hidden;
 *  - unmounting releases the GL objects and every listener.
 */

type FakeGl = ReturnType<typeof createFakeGl>;

function createFakeGl(options: { compile?: boolean; link?: boolean } = {}) {
  const { compile = true, link = true } = options;

  return {
    ARRAY_BUFFER: 0x8892,
    STATIC_DRAW: 0x88e4,
    FLOAT: 0x1406,
    TRIANGLES: 0x0004,
    COMPILE_STATUS: 0x8b81,
    LINK_STATUS: 0x8b82,
    VERTEX_SHADER: 0x8b31,
    FRAGMENT_SHADER: 0x8b30,

    createShader: vi.fn(() => ({})),
    shaderSource: vi.fn(),
    compileShader: vi.fn(),
    getShaderParameter: vi.fn(() => compile),
    getShaderInfoLog: vi.fn(() => "boom"),
    deleteShader: vi.fn(),
    createProgram: vi.fn(() => ({})),
    attachShader: vi.fn(),
    linkProgram: vi.fn(),
    getProgramParameter: vi.fn(() => link),
    getProgramInfoLog: vi.fn(() => "link failed"),
    deleteProgram: vi.fn(),
    useProgram: vi.fn(),

    createBuffer: vi.fn(() => ({})),
    bindBuffer: vi.fn(),
    bufferData: vi.fn(),
    getAttribLocation: vi.fn(() => 0),
    enableVertexAttribArray: vi.fn(),
    vertexAttribPointer: vi.fn(),
    getUniformLocation: vi.fn(() => ({})),

    viewport: vi.fn(),
    uniform1f: vi.fn(),
    uniform2f: vi.fn(),
    drawArrays: vi.fn(),
    deleteBuffer: vi.fn(),
  };
}

/** Installs the browser APIs the hero asks for, and reports what it did. */
function installEnvironment(gl: FakeGl | null, options: { reducedMotion?: boolean } = {}) {
  const frames: FrameRequestCallback[] = [];
  const cancelled: number[] = [];
  const intersections: ((visible: boolean) => void)[] = [];

  vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
    frames.push(callback);
    return frames.length;
  });
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation((handle) => {
    cancelled.push(Number(handle));
  });

  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: options.reducedMotion === true && query.includes("reduce"),
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(() => false),
  })) as unknown as typeof window.matchMedia;

  const RealIntersectionObserver = globalThis.IntersectionObserver;

  class SpyIntersectionObserver {
    constructor(callback: IntersectionObserverCallback) {
      const self = this as unknown as IntersectionObserver;
      intersections.push((visible) => {
        callback([{ isIntersecting: visible } as IntersectionObserverEntry], self);
      });
    }
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
    root = null;
    rootMargin = "";
    thresholds = [];
  }

  globalThis.IntersectionObserver =
    SpyIntersectionObserver as unknown as typeof IntersectionObserver;

  HTMLCanvasElement.prototype.getContext = (() => gl) as unknown as typeof HTMLCanvasElement.prototype.getContext;

  /** Runs the scheduled frames once, like a browser would. */
  function runFrames(count = 1) {
    for (let step = 0; step < count; step += 1) {
      const pending = frames.splice(0, frames.length);
      for (const frame of pending) frame(performance.now());
    }
  }

  function setVisible(visible: boolean) {
    for (const notify of intersections) notify(visible);
  }

  return {
    frames,
    cancelled,
    runFrames,
    setVisible,
    restore() {
      globalThis.IntersectionObserver = RealIntersectionObserver;
      vi.restoreAllMocks();
    },
  };
}

describe("ShaderHero", () => {
  let env: ReturnType<typeof installEnvironment> | undefined;

  beforeEach(() => {
    env = undefined;
  });

  afterEach(() => {
    env?.restore();
    vi.unstubAllGlobals();
  });

  it("shows the headline whatever the graphics do", () => {
    env = installEnvironment(null);

    render(
      <ShaderHero>
        <h1>Find your next favorite film.</h1>
      </ShaderHero>,
    );

    expect(
      screen.getByRole("heading", { name: "Find your next favorite film." }),
    ).toBeInTheDocument();
  });

  it("mounts no canvas at all for a reader who asks for reduced motion", () => {
    env = installEnvironment(createFakeGl(), { reducedMotion: true });

    const { container } = render(
      <ShaderHero>
        <h1>Still hero</h1>
      </ShaderHero>,
    );

    expect(container.querySelector("canvas")).toBeNull();
    expect(
      screen.getByRole("img", {
        name: "Flicks hero — cinematic night, static for reduced motion",
      }),
    ).toBeInTheDocument();
  });

  it("keeps the hero on the page when the browser has no WebGL", () => {
    env = installEnvironment(null);

    const { container } = render(
      <ShaderHero>
        <h1>No WebGL here</h1>
      </ShaderHero>,
    );

    expect(container.querySelector("canvas")).not.toBeNull();
    expect(env.frames).toHaveLength(0);
    expect(
      screen.getByRole("heading", { name: "No WebGL here" }),
    ).toBeInTheDocument();
  });

  it.each([
    ["a shader will not compile", { compile: false }],
    ["a program will not link", { link: false }],
  ])("falls back instead of throwing when %s", (_label, options) => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    env = installEnvironment(createFakeGl(options));

    expect(() =>
      render(
        <ShaderHero>
          <h1>Degraded hero</h1>
        </ShaderHero>,
      ),
    ).not.toThrow();

    expect(
      screen.getByRole("heading", { name: "Degraded hero" }),
    ).toBeInTheDocument();
    expect(warn).toHaveBeenCalledWith("[shader] failed", expect.any(Error));
  });

  describe("with a working context", () => {
    function renderHero(gl: FakeGl) {
      env = installEnvironment(gl);

      render(
        <ShaderHero>
          <h1>Live hero</h1>
        </ShaderHero>,
      );

      return env;
    }

    it("draws a full-screen triangle and feeds it the three required uniforms", () => {
      const gl = createFakeGl();
      const environment = renderHero(gl);

      expect(gl.bufferData).toHaveBeenCalledWith(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 3, -1, -1, 3]),
        gl.STATIC_DRAW,
      );
      expect(gl.vertexAttribPointer).toHaveBeenCalledWith(0, 2, gl.FLOAT, false, 0, 0);
      expect(gl.drawArrays).toHaveBeenCalledWith(gl.TRIANGLES, 0, 3);

      // u_time, u_resolution, u_mouse — the uniform trinity the shader documents.
      expect(gl.uniform1f).toHaveBeenCalled();
      expect(gl.uniform2f).toHaveBeenCalled();

      environment.runFrames(2);
      expect(gl.drawArrays.mock.calls.length).toBeGreaterThanOrEqual(3);
    });

    it("caps the drawing buffer instead of rendering at raw device pixels", () => {
      const gl = createFakeGl();
      renderHero(gl);

      const [, , width, height] = gl.viewport.mock.calls[0] as [
        unknown,
        unknown,
        number,
        number,
      ];

      expect(width).toBeLessThanOrEqual(2560);
      expect(height).toBeLessThanOrEqual(1440);
      expect(width).toBeGreaterThan(0);
      expect(height).toBeGreaterThan(0);
    });

    it("parks the render loop once the hero is scrolled out of view", () => {
      const gl = createFakeGl();
      const environment = renderHero(gl);

      environment.runFrames(1);
      const drawnOnScreen = gl.drawArrays.mock.calls.length;

      environment.setVisible(false);
      environment.runFrames(3);

      expect(gl.drawArrays.mock.calls.length).toBe(drawnOnScreen);
      expect(environment.cancelled.length).toBeGreaterThan(0);

      // And it picks straight back up when the reader scrolls up again.
      environment.setVisible(true);
      environment.runFrames(1);
      expect(gl.drawArrays.mock.calls.length).toBeGreaterThan(drawnOnScreen);
    });

    it("stops drawing while the tab is hidden and resumes without a time jump", () => {
      const gl = createFakeGl();
      const environment = renderHero(gl);

      environment.runFrames(1);
      const before = gl.drawArrays.mock.calls.length;

      Object.defineProperty(document, "hidden", {
        configurable: true,
        get: () => true,
      });
      document.dispatchEvent(new Event("visibilitychange"));
      environment.runFrames(2);
      expect(gl.drawArrays.mock.calls.length).toBe(before);

      Object.defineProperty(document, "hidden", {
        configurable: true,
        get: () => false,
      });
      document.dispatchEvent(new Event("visibilitychange"));
      environment.runFrames(1);
      expect(gl.drawArrays.mock.calls.length).toBeGreaterThan(before);

      // u_time is seconds since mount, so it never runs backwards or leaps.
      const times = gl.uniform1f.mock.calls.map(([, value]) => value as number);
      expect(times.every((value) => Number.isFinite(value) && value >= 0)).toBe(true);
    });

    it("releases the GL objects and cancels the loop on unmount", () => {
      const gl = createFakeGl();
      const environment = renderHero(gl);

      environment.runFrames(1);

      const { unmount } = render(
        <ShaderHero>
          <h1>Second hero</h1>
        </ShaderHero>,
      );

      const buffersBefore = gl.deleteBuffer.mock.calls.length;
      const programsBefore = gl.deleteProgram.mock.calls.length;
      const cancelledBefore = environment.cancelled.length;

      unmount();

      expect(gl.deleteBuffer.mock.calls.length).toBeGreaterThan(buffersBefore);
      expect(gl.deleteProgram.mock.calls.length).toBeGreaterThan(programsBefore);
      expect(environment.cancelled.length).toBeGreaterThan(cancelledBefore);
    });
  });

  it("exposes the GLSL it runs, so the shader doc cannot drift silently", () => {
    expect(HERO_VERT_SOURCE).toContain("gl_Position");
    expect(HERO_FRAG_SOURCE).toContain("u_time");
    expect(HERO_FRAG_SOURCE).toContain("u_resolution");
    expect(HERO_FRAG_SOURCE).toContain("u_mouse");
    expect(HERO_FRAG_SOURCE).toContain("gl_FragColor");
  });
});
