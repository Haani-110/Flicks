# Regression baseline — Phase 1 checklist

Captured at `bb0ae3e` before any change. Every item here must still exist and work at the end.
This file is a working artifact of the upgrade, not product documentation.

## Routes (src/App.tsx) — all must remain

- [ ] `/` → `Home` (ShaderHero + "Popular now" grid of all 9 catalog movies)
- [ ] `/watchlist` → `Watchlist` (saved movies, empty state, localStorage persistence)
- [ ] `/movie/:id` → `MovieDetail` (poster, meta, genres, overview, toggle, "More like this", own not-found state)
- [ ] `/health` → `HealthCheck` (fetch external URL, Loading/Success/Error, Retry, `aria-live`)
- [ ] `/assistant` → `Assistant` (streaming chat + tool cards + SendButtonDemo playground)
- [ ] `/marquee` → `Marquee` (3D configurator, quality tiers, poster fallback, `.glb` drop zone)
- [ ] `*` → `NotFound`
- [ ] `AppErrorBoundary` wraps the router; `Layout` provides skip link, header, `main#main-content`, footer

## APIs

- [ ] `POST /api/chat` — streams the AI SDK UI-message protocol from OpenRouter (`openai/gpt-4o-mini`)
  - 405 on non-POST with `Allow: POST`
  - 500 `{error:"AI is not configured."}` when `OPENROUTER_API_KEY` missing
  - 400 table (exact strings, asserted by `api/chat.test.ts`):
    `"Invalid JSON body."` · `"Request must include a messages array."` · `"messages must not be empty."`
    `"Too many messages in one request."` · `"Invalid message entry."` · `"Invalid message role."`
    `"Message parts are missing."` · `"A message is too long."` · `"At least one user message is required."`
  - `onError` returns `"AI request failed. Please try again."` and never leaks the provider cause
  - client disconnect (`req.on("close")`) aborts the upstream generation
- [ ] server tool `search_movies` (`lib/flicks-tools.ts`) — zod input schema, catalog filter by query/genre/maxRuntime

## Data flow

- [ ] `src/data/movies.ts` — 9 real movies, TMDB `w500` posters / `original` backdrops, `getMovie(id)`
- [ ] `src/data/mockMovies.ts` + `src/types/movie.ts` — unused, but retained (non-destructive rule)
- [ ] watchlist: `useWatchlist` → `localStorage["flicks-watchlist"]` (number[]), via `WatchlistContext`
- [ ] marquee config: `useMarqueeConfig` → `localStorage[MARQUEE_STORAGE_KEY]`, corrupt JSON falls back to defaults
- [ ] `CHAT_LIMITS` in `src/lib/chat-contract.ts` shared by client and server (20 history / 2000 chars / 30 messages)

## User flows (covered by tests that must stay green)

- [ ] Home → movie → add to watchlist → Watchlist → reload (still there) → remove → empty state  *(e2e/primary-flow.spec.ts)*
- [ ] Assistant: type → Enter sends → streams → tool card with catalog links → stop → retry after error  *(e2e/assistant.spec.ts)*
- [ ] Marquee: sign text → finish radio → feature a movie → reload keeps settings → pause → static poster → reject non-`.glb`  *(e2e/marquee.spec.ts)*
- [ ] SendButtonDemo playground on `/assistant`: idle/loading/success/error + retry  *(e2e comment calls it "a button playground")*

## Accessible names that are load-bearing (tests + e2e query them — do not change)

`link "Flicks home"` · `navigation "Primary"` · links `Home`/`Watchlist`/`Assistant`/`Health`/`Marquee` ·
footer text `© {year} Flicks. Foundations build.` · heading `Find your next favorite film.` ·
heading `Watchlist` · text `No movies yet` · text `{n} movie|movies` · link `Browse movies` ·
link `{title}` (movie title, poster+title pair) · img `{title} poster` ·
button `Add {title} to watchlist` / `Remove {title} from watchlist` (`aria-pressed`) ·
button `Add to watchlist` / `In watchlist` (MovieDetail) · heading `Assistant` ·
`region "Assistant chat"` · `log "Conversation"` · textbox `Ask about movies` ·
button `Send message` / `Sending message` / `Message sent` / `Send failed. Activate to retry.` ·
button `Stop generating` · `article "Your message"` / `article "Assistant message"` ·
`region "Catalog search"` · `list "Search results"` · `{count} results` ·
heading `Health Check` · button `Retry` · `group "3D premiere marquee"` · `form "Marquee controls"` ·
label `Sign text` · radio `Gold` · button `Feature Oppenheimer` · button `Pause the scene` ·
button `Use the static poster` · label `Load a .glb file` · heading `Premiere marquee` ·
`img "Premiere marquee: …"` · text `Featured: Oppenheimer (2023).` · `Page not found` + link `Go home`

## Quality gates that must pass at the end

- [ ] `npm run typecheck` → exit 0
- [ ] `npm test` → 218+ passed, 0 failed
- [ ] `npm run test:coverage` → exit 0 **without lowering any threshold** (lines ≥ 76, statements ≥ 72, branches ≥ 74, functions ≥ 70)
- [ ] `npm run build` and `npm run build:split` → succeed
- [ ] `npm run verify` → exit 0
- [ ] CI on the branch → green
