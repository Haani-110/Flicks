# Flicks

**Discover movies, save a watchlist, and ask an AI assistant to find your next
favorite film — in a UI that behaves like a shipped product, not a demo.**

[![CI](https://github.com/Haani-110/Flicks/actions/workflows/ci.yml/badge.svg)](https://github.com/Haani-110/Flicks/actions/workflows/ci.yml)
React 19 · TypeScript 5.9 · Vite 7 · Tailwind 4 · Vercel · OpenRouter (AI SDK v6) · React Three Fiber

---

## Live demo

| Environment         | URL                              | Status                     |
| ------------------- | -------------------------------- | -------------------------- |
| Production (Vercel) | https://flicks-murex.vercel.app/ | Live production deployment |
| Preview             | every push / PR                  | Vercel preview deployments |
| Local               | `http://localhost:5173`          | `npm run dev`              |

## Overview

Flicks is a movie-discovery single-page app with four surfaces:

* **Browse** — a poster grid over a local, hand-written catalogue with genre
  filters and search, each card a real link with a real poster image.
* **Film detail** — backdrop, metadata, genres and a watchlist toggle.
* **Watchlist** — saved films, persisted per device in `localStorage`.
* **Assistant** — a streaming chat with an AI that has a *server-side tool*
  (`search_movies`) over the same catalogue, so answers cite real titles with
  real links instead of hallucinating a film library.
* **Marquee** — an interactive 3D cinema facade (React Three Fiber) whose
  poster wall, accent colour and bulb-letter board are driven by the same
  catalogue and config store.
* **Health** — a diagnostics page that probes the app's own `/api/health`.

The catalogue is deliberately local and finite: it makes the AI tool
deterministic and testable. Posters and backdrops are real TMDB image URLs.

## Features

* **Streaming assistant with tools.** Answers arrive token-by-token over the
  AI SDK's UI-message stream; mid-stream the model can call `search_movies`
  and the transcript renders the call, its filters and its results as cards
  with links into the catalogue.
* **Watchlist that survives reloads**, with counts surfaced in the nav
  (visually, never inside the accessible name).
* **States everywhere.** Loading skeletons, empty states with a way out,
  error states with a retry, success flashes that return to idle — including
  on the send button itself, which is a documented little state machine.
* **3D marquee** with a configurator (finish, bulbs, brightness, centerpiece,
  wireframe), a 5×7 bulb bitmap font that explains dropped characters,
  `.glb` drop-in with a DRACO/meshopt inspector, quality tiers chosen from a
  real device probe, and a static-poster fallback that always works.
* **Accessibility as a feature:** one navigation landmark at every
  breakpoint, a disclosure menu with Escape-and-return-focus, live regions
  for chat and status, focus-visible rings, `prefers-reduced-motion` paths
  through the hero, the marquee and every animation.
* **Abuse protection around the AI** that never gets in a real reader's way
  (see [Security](#security--abuse-protection)).

## Tech stack

| Layer   | Choice                                   | Why                                         |
| ------- | ---------------------------------------- | ------------------------------------------- |
| UI      | React 19 + TypeScript (strict)           | typed contracts end to end                  |
| Build   | Vite 7, Tailwind 4                       | fast dev loop, zero-config CSS pipeline     |
| Routing | react-router 7                           | lazy route chunks, one layout shell         |
| AI      | AI SDK 6 + `@openrouter/ai-sdk-provider` | streaming, tools, provider-agnostic         |
| 3D      | three + @react-three/fiber               | the marquee, lazy-loaded                    |
| Server  | Vercel Functions (`api/*.ts`)            | chat proxy + health probe, no server to run |
| Tests   | Vitest + Testing Library, Playwright     | 352 component/API tests + browser flows     |
| Lint    | oxlint                                   | CI-gated, zero warnings                     |

## Architecture

```text
                         browser (React SPA)
   ┌──────────────────────────────────────────────────────────┐
   │  /  /watchlist  /movie/:id  /assistant  /marquee  /health │
   │        │                         │                       │
   │        │ localStorage            │ useChat (AI SDK)      │
   │        ▼                         │  GET /api/chat → token│
   │   WatchlistContext               ▼  POST + token + caps  │
   └──────────────────────────────┬───────────────────────────┘
                                  │
                     Vercel edge (headers, CSP, caching)
                                  │
               ┌───────────────────┴───────────────────┐
               │ api/chat.ts                           │
               │  method → token verify → payload caps │
               │  → rate limit → stream with timeout   │
               │        │                              │
               │        ▼                              │
               │  lib/flicks-tools.ts  search_movies   │
               │        │            (catalogue tool)  │
               │        ▼                              │
               │  OpenRouter (server-side key only)    │
               ├───────────────────────────────────────┤
               │ api/health.ts — status/build/config   │
               └───────────────────────────────────────┘
```

The model key lives **only** in the function's environment. The browser never
sees it; it earns a signed, single-use token first, and the route enforces
size and rate budgets before a single token is generated.

## Project structure

```text
api/            Vercel functions: chat.ts (AI proxy), health.ts (probe) + tests
lib/            server-side guards: rate-limit, chat-token, chat-abuse,
                flicks-tools (the model's catalogue tool) + tests
src/
  components/   shell (Layout, SiteNav, SiteFooter), Seo, posters, chat UI,
                SendButtonDemo, ShaderHero + a test per behaviour
  context/      WatchlistContext (stable-value provider)
  data/         movies.ts — the local catalogue
  features/
    marquee/    the 3D stage: scene graph, quality tiers, config store, glTF
  lib/          chat-transport (token cache + request body builder)
  pages/        Home, Watchlist, MovieDetail, Assistant, Marquee, HealthCheck,
                NotFound + tests
  test/         render helpers, fetch mocks, recorded stream fixtures
e2e/            Playwright flows (primary, assistant, marquee)
docs/           TESTING.md, REGRESSION-BASELINE.md, audit evidence
scripts/        make-og-image.mjs, make-sitemap.mjs, ci-summary.mjs
```

## Getting started

Requires Node 22+ and npm.

```bash
git clone https://github.com/Haani-110/Flicks.git
cd Flicks
npm install
cp .env.example .env.local     # then paste an OpenRouter key for the assistant
npm run dev                    # http://localhost:5173
```

Without a key every page except the assistant works; the assistant explains
that AI is not configured instead of failing mysteriously.

Other scripts:

```bash
npm test                # 352 component/API tests, jsdom, no network
npm run test:coverage   # the same suite, enforcing coverage thresholds
npm run test:e2e        # Playwright flows in real Chromium
npm run screenshots     # refresh docs/screenshots/ from the running app
npm run lint            # oxlint, warnings denied
npm run typecheck       # tsc --noEmit, strict
npm run build           # single-file build (drag-and-drop deploy)
npm run build:split     # code-split build — the one Vercel runs
npm run verify          # lint + typecheck + coverage + build
```

## Environment variables

| Variable                    | Side   | Required          | Purpose                                                                            |
| --------------------------- | ------ | ----------------- | ---------------------------------------------------------------------------------- |
| `OPENROUTER_API_KEY`        | server | for the assistant | OpenRouter key; spent only by `api/chat.ts`                                        |
| `CHAT_TOKEN_SECRET`         | server | no                | explicit signing key for chat tokens; derived from the provider key when unset     |
| `VITE_HEALTH_CHECK_API_URL` | client | no                | external URL for the health page to probe; empty means probe our own `/api/health` |

Set server variables in Vercel → Project → Settings → Environment Variables.
`.env*` files are gitignored; `.env.example` documents all three.

## Production configuration

* **Build:** Vercel runs `npm run build:split` (see `vercel.json`), so the
  first paint is ~174 kB gzip and three.js only downloads if the marquee
  approaches the viewport. The single-file `npm run build` remains for
  drag-and-drop hosting.
* **Headers:** CSP (`default-src 'self'`, TMDB images, gstatic fonts),
  HSTS with preload, `nosniff`, `DENY` framing, referrer and permissions
  policies; `no-store` on `/api/*`; immutable one-year caching on `/assets/*`
  (hashed filenames).
* **Routing:** SPA rewrite for everything except `/api/*`.
* **Metadata:** favicon + social tags in `index.html`; canonical, `og:url`,
  `og:image` and per-route titles are written at runtime by `<Seo />` from the
  origin actually serving the page. `public/og.png` (the share card) is drawn
  byte-for-byte by `scripts/make-og-image.mjs`; `sitemap.xml` is generated at
  build time from `VERCEL_PROJECT_PRODUCTION_URL` and skipped where the origin
  is unknown, so it can never name a domain the project does not serve.

## Security & abuse protection

The chat proxy is the only surface that spends money, so it is the only
surface that is fortified — deliberately lightweight, no database:

1. **Signed single-use tokens.** `GET /api/chat` issues an HMAC-signed token
   (2-minute TTL, one consumption). `POST` without a valid, unseen token is
   refused with `401`. A script that never loads the page cannot chat; a
   reader never notices.
2. **Rate limiting.** Fixed-window in-memory limiter per client with
   `429` + `Retry-After` once the budget is spent.
3. **Payload caps.** Message count, per-message bytes and total bytes are
   bounded server-side; history is re-validated rather than trusted from the
   client (`400` with a plain-language reason).
4. **Stream protection.** Upstream timeout, abort propagation and a function
   `maxDuration`, so a hung provider cannot hold a worker forever.
5. **Transport hygiene.** CSP, HSTS, nosniff, no framing, no-store on APIs;
   the key never leaves the server; `/api/health` reports only booleans.

Known, accepted limits are listed under [Known limitations](#known-limitations).

## Engineering decisions

* **Redesign, don't rebuild.** Every original route, flow and test survived
  this upgrade; the visual layer was replaced wholesale and the broken parts
  (red CI, untested shader, un-rate-limited proxy, dead linter) were repaired
  in place. `docs/REGRESSION-BASELINE.md` is the checklist that was run.
* **Coverage as a ratchet.** Thresholds in `vite.config.ts` sit a few points
  under what the suite holds (95.4% lines), so deleting tests fails CI, while
  one new component does not.
* **Tests query roles and names, never classes.** The suite survived a full
  restyle without a single selector change — the contract is the accessible
  UI.
* **The marquee degrades on purpose.** A device probe picks a quality tier;
  no WebGL, reduced motion, data-saver or weak hardware lands on a static SVG
  poster drawn from the same config, with the reason shown and a button to
  try 3D anyway.
* **Generated assets over binary ones.** The share card and the sitemap are
  scripts, so they cannot rot; the favicon is 5 lines of SVG.
* **Honest telemetry.** `/api/health` and the health page report what is
  true (build commit, provider configured) rather than a green theatre.

## Accessibility

* Landmarks: one `nav` ("Primary"), one `main`, labelled regions for chat and
  diagnostics; skip-link in the layout.
* Keyboard: disclosure menu closes on Escape and returns focus; chat submits
  on Enter, rejects empty submits; every control is a real button/link/input
  with a visible focus ring.
* Screen readers: streaming answers live in a polite `log`; the send button
  announces its state through its accessible name; the watchlist badge is
  `aria-hidden` so link names stay stable; the shader hero and marquee expose
  text alternatives and honour `prefers-reduced-motion`.
* Contrast: the palette keeps body text ≥ 7:1 and UI text ≥ 4.5:1 on the
  nocturne background.

## Performance

* Route-level code splitting; three.js, the AI client and the configurator
  never ride in the first paint (`build:split`).
* Posters: skeleton → fade-in, `loading="lazy"` below the fold, TMDB
  preconnect; fonts preconnected and subset.
* The shader hero and the marquee render loop pause off-screen and on hidden
  tabs (`IntersectionObserver` + `visibilitychange`); bulb colours update at
  ~24 Hz, not 60.
* Watchlist context value is memoized, so saving a film no longer re-renders
  every card in the grid.
* No third-party analytics, no tag managers, no runtime CSS-in-JS.

## Testing

Real commands, real results (2026-09-12, this branch):

```console
$ npm run lint        # oxlint --deny-warnings .
Found 0 warnings and 0 errors.   (124 files, 116 rules)

$ npm run typecheck   # tsc -p tsconfig.json --noEmit
(exit 0)

$ npm run test:coverage
 Test Files  46 passed (46)
      Tests  352 passed (352)
Statements   93.46%   Branches  87.93%
Functions    95.90%   Lines     95.41%   (thresholds 90/84/92/92)

$ npm run build:split
✓ built in …   (initial ≈174 kB gzip; marquee chunk lazy)
```

* **Component/API layer** — Vitest + Testing Library in jsdom: chat parts and
  states, the send-button state machine, the nav disclosure's keyboard
  contract, the scroller's follow-along rule, posters, the error boundary,
  the route table, the shader hero against a fake GL context, and the chat
  route itself with a mocked provider (no test ever calls OpenRouter).
* **Server guards** — contract tests for the limiter, the token lifecycle
  (issue/verify/expiry/replay), payload caps and every 4xx the route can
  return.
* **Browser layer** — Playwright: the watchlist flow, the assistant against a
  recorded SSE fixture (token GET included), the marquee scene in real
  Chromium.
* **CI** — every push runs lint → typecheck → coverage → build and the
  Playwright suite; a single `CI green` job gates the branch. Coverage and
  Playwright reports upload as artifacts.

See [docs/TESTING.md](docs/TESTING.md) for the full coverage map and
[docs/REGRESSION-BASELINE.md](docs/REGRESSION-BASELINE.md) for what must never
regress.

## Deployment

1. Push to `main` (or open a PR): Vercel's GitHub integration builds with
   `npm run build:split` and deploys a preview; merging deploys production.
2. Set `OPENROUTER_API_KEY` in the Vercel project settings.
3. `npm run build` (single file) remains for hosts without Node: drop
   `dist/index.html` anywhere static.

## How AI tools built this — honestly

This repository is an AI-assisted internship assignment, and the division of
labour deserves precision rather than a shrug emoji:

* **What the author directed:** the product's scope and identity (nocturne
  palette, the marquee concept, "the assistant must cite the real catalogue"),
  every acceptance criterion of this upgrade (non-destructive, production
  grade, accessible), the review of each batch, and the decision to keep the
  catalogue local and the abuse protection lightweight.
* **What the AI agent wrote:** essentially all of the code in the commits on
  the upgrade branch — the redesign, the server guards, the test suites, the
  CI wiring, this README — in an iterative loop: write → run tests → read
  failures → fix → re-run. The coverage surge, the lint cleanup and the
  production hardening exist because the agent could run the suite hundreds
  of times in a session.
* **What the agent got wrong first (and the tests caught):** duplicate
  accessible names on the demo buttons, a token check that counted its own
  handshake as traffic, an effect that captured a prop it claimed to ignore,
  a canonical URL pointing at a domain the project does not own. Each is now
  a regression test with a comment explaining the trap.
* **What no AI did:** fabricate results. Every number above is a command
  output; where something could not be verified in this environment, the
  README says so instead of inventing one.

## Known limitations

* **Catalogue is static.** Nine hand-written films; no TMDB API calls, no
  admin, no pagination. By design — it keeps the AI tool deterministic.
* **Watchlist is per-device.** `localStorage`, no accounts, no sync.
* **Rate limiter and token store are in-memory.** A Vercel cold start resets
  them and a replayed token would be accepted by a *different* instance.
  Accepted trade for zero infrastructure; the payload caps and the provider's
  own spend limits are the backstop. A platform-level WAF rule is the upgrade
  path if traffic ever warrants it.
* **SPA SEO.** Canonical/OG tags are runtime-set, so crawlers that skip
  JavaScript see only the static half of the social tags. Server-side
  rendering would fix it and would change the whole architecture; not taken.
* **No Lighthouse trace in CI.** The sandbox this upgrade ran in could not
  install browsers; bundle sizes above are Vite's own build report, measured
  locally, and the Playwright suite runs in CI where Chromium exists.

## License

MIT — see [LICENSE](LICENSE).
