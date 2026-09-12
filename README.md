# Flicks

Flicks is a movie discovery application built with React, TypeScript, Vite, and an AI assistant powered by OpenRouter and the AI SDK.

## AI Movie Search Tool

The Flicks AI assistant includes a server-side tool called `search_movies`.

The tool allows the AI assistant to search the Flicks movie catalog using optional keywords, genres, and runtime limits.

### Tool name

`search_movies`

### Tool schema

The tool uses a typed Zod schema with the following parameters:

| Parameter | Type | Required | Description |
|---|---|---|---|
| `query` | `string` | No | Keyword to search in movie titles or descriptions |
| `genre` | `string` | No | Movie genre such as Action, Drama, Comedy, Sci-Fi, Adventure, Crime, or History |
| `maxRuntime` | `number` | No | Maximum movie runtime in minutes |

Example tool input:

```json
{
  "query": "space",
  "genre": "Sci-Fi",
  "maxRuntime": 150
}

## Premiere marquee (3D)

`/marquee` is an interactive 3D cinema facade, built with React Three Fiber. It is the capstone's
"what if the watchlist had a foyer" page: the poster wall is drawn from the app's own catalog.

Run `npm run dev` and open `/marquee`, or `npm run dev -- --host` and reach it from a phone on the
same network. Everything below was measured on this repository.

**What you can do**

- **Orbit and zoom** — one finger (or the mouse) orbits, two fingers pinch to zoom. Panning is off
  on purpose, so a drag never steals the page scroll.
- **Dress the marquee** — finish (chrome / gold / copper / matte), bulb colour, brightness, the
  centerpiece on the pedestal (film reel / projector / film can), and an X-ray wireframe toggle.
- **Spell anything** on the letter board. The board is a 5x7 bulb matrix with its own font; it
  drops characters it cannot draw and says so, and tells you how many of the 47 bulb columns the
  word uses.
- **Feature a movie** from the catalog: the title goes on the board, the accent colour changes, and
  the poster wall highlights it. Clicking a poster in the scene does the same thing.
- **Drop in your own `.glb`** — it lands on the pedestal, auto-centred and scaled, with a status
  line reporting meshes, materials, size and whether it is DRACO/meshopt compressed. DRACO and
  meshopt decoders are imported only for files that use them.
- **Pause the scene** or switch to the static poster at any time; the settings survive a reload.

**How it is built**

| Piece | Choice |
| --- | --- |
| Renderer | `three` + `@react-three/fiber`, no component library |
| Geometry | Procedural — facade, canopy, pedestal, reel/projector/film can and the bulb board are all built in code |
| Lighting | Ambient + hemisphere + a shadow-casting key light, two coloured rims, and a studio environment baked at runtime from three's `RoomEnvironment` via `PMREMGenerator` (no HDR download) |
| Reflections | The generated environment map, intensity per part |
| Posters | Painted at runtime with the 2D canvas API from catalog data, uploaded as 256x384 textures |
| Interaction | `OrbitControls` (imperative), pointer-tracked follow spot, scroll-driven world offset, bulb chase/threshold twinkle |

### Performance note (FE-10 lens)

**Bundle.** The scene is a lazy chunk. Measured with `npm run build:split`:

| Chunk | Raw | gzip |
| --- | ---: | ---: |
| Initial app (`index-*.js`) + CSS | 587 kB | **174 kB** |
| `marquee-viewport` (three + R3F + scene) | 946 kB | **254 kB** — only fetched when the stage reaches the viewport |
| `GLTFLoader` | 46 kB | 14 kB — only when a file is dropped |
| `DRACOLoader` + meshopt decoder | 34 kB | 10 kB — only for compressed models |

The repo's default build is still the single-file one (`npm run build`): 3.37 MB / **940 kB gzip**
for `index.html`. That is the capstone's drag-and-drop deploy, and it comes at a price now — with
`inlineDynamicImports` there is no chunk to defer, so three.js *and* the DRACO wasm (as a base64
data URL) ride along with the first paint for every visitor, including the ones who never open the
marquee.

`npm run build:split` is the answer for this feature: **174 kB gzip** for the first paint, then
254 kB gzip only if the stage actually reaches the viewport, 14 kB only if someone drops a model,
and 10 kB only if that model is compressed. That is the build I would deploy.

**Model size: zero.** Nothing is downloaded to draw the marquee — no GLB, no HDR, no textures, no
font. The letter board is a bitmap font in source, the posters are painted in the browser. The only
network cost of the page is the chunk above.

**Frame cost.** The board is the expensive part, and it is deliberately cheap:

- 245 bulbs for the default `FLICKS` sign (329 for a full 8-character word), and all of them are
  three instanced meshes — approximately 33k triangles at full quality, 12k on the lite tier.
- Per-bulb colour is written back at ~24 Hz, not 60: a light chase does not need every frame.
- Device pixel ratio is capped at 1.75 (1.0 on lite), `antialias` and shadows are off on lite, and
  the sphere tessellation drops from 10x6 to 6x4.
- The render loop only runs while the stage is on screen **and** the tab is visible; scrolling past
  it or pausing sets `frameloop="never"` instead of rendering frames nobody sees.
- The canvas only mounts after `IntersectionObserver` says the stage is near the viewport — so the
  chunk and the WebGL context are not created for a visitor who never scrolls to it.
- The live readout on the canvas (fps / draw calls / triangles) is sampled inside the render loop,
  so any device can be checked rather than guessed at.

**Responsibility.** The page renders a static SVG poster first — drawn from the same config, with
the same bulb matrix and accent colour — and upgrades to the canvas only when the device can take
it. `prefers-reduced-motion`, a missing WebGL context, data saver, ≤4 GB of memory or <4 logical
cores all land on the poster or the lite tier, and the reason is shown next to it. There is always
a button to try the 3D scene anyway, another to go back to the poster, and a scene that throws
falls back to the poster instead of blanking the page. Everything the scene can do through mouse,
touch or drag also exists as a real form control: labelled radios, checkboxes, sliders, buttons and
a file input.

**What I would add with more time**

1. **A real compressed model as the default centerpiece** — generate the reel as a DRACO-compressed
   `.glb` (with a meshopt variant) and ship it as the demo, so the compressed path is exercised on
   first load rather than only by dropped files. The loaders and the inspector are already there.
2. **Per-movie marquee presets** — save the finish, accent and sign text alongside the watchlist, so
   a saved film remembers how it looked in the foyer.
3. **Post-processing, gated by tier** — a single bloom pass would make the bulbs glow for real; it
   belongs behind the full tier and a measured frame-time check before switching on.
4. **Scene-graph tests** — `@react-three/test-renderer` can assert the tree and interactions without
   a GPU, which would move the scene out of the coverage exclusion list.
5. **A frame-time budget in CI** — record the fps readout during the Playwright run and fail if the
   scene drops below a floor, so a regression in geometry or shaders is caught like any other.
6. **WebGPU renderer path** with a WebGL fallback, once the browser support is boring.

## Testing

The project ships a Vitest + React Testing Library suite for components, hooks and the AI route,
and a Playwright flow test that walks the primary journey in a real browser. Both run on every
push and a failing job blocks merging.

```bash
npm test              # unit + component tests
npm run test:coverage # with coverage thresholds
npm run test:e2e      # Playwright: the watchlist flow, the assistant, the marquee
npm run build         # single-file production build (the deployed one)
npm run build:split   # code-split build, for deploying the 3D route lazily
npm run verify        # typecheck + coverage + production build (what CI gates on)
```

See [docs/TESTING.md](docs/TESTING.md) for what is covered, how the AI route is mocked (no test
ever calls OpenRouter), the role/label query policy, and the CI evidence.
