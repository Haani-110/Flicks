# Testing

The suite has two layers, both wired into CI:

| Layer | Tool | Where it runs | Command |
| --- | --- | --- | --- |
| Components, hooks, pages, `api/` route | Vitest + React Testing Library (jsdom) | Node, no browser | `npm test` |
| Primary user flow | Playwright (Chromium) | Real browser against the Vite dev server | `npm run test:e2e` |

```bash
npm test              # run the unit/component suite once
npm run test:watch    # same, in watch mode
npm run test:coverage # suite + coverage, enforces the thresholds below
npm run test:e2e      # Playwright; installs nothing, expects a browser to exist
npm run test:e2e:install # one-off `playwright install chromium` for a new machine
npm run verify        # typecheck + coverage + production build, what CI gates on
```

## What is covered

`98 tests across 18 files` at the time of writing (`docs/evidence/vitest-results.json`).

- **Chat message renderer** (`src/components/chat/ChatMessage.test.tsx`) — every part type the UI
  knows about (text, reasoning, tool call, source, file, data) plus the assistant in
  **pending**, **streaming**, and **error** states.
- **Validated form** (`src/components/chat/ChatComposer.test.tsx`) — labels, validation messages,
  disabled/loading states, keyboard submission.
- **Tool result** (`src/components/chat/ToolCallCard.test.tsx`) — pending input, running,
  success with results, empty results, failed search.
- **The AI route itself** (`api/chat.test.ts`) — method validation, missing key, the 400 table,
  the UI-message stream the browser parses, a catalog tool round-trip, and provider failures
  surfacing as an in-stream error rather than a leaked stack trace.
- **Pages and flows** — assistant chat (including sending, retry after error, watchlist actions),
  home, movie detail, watchlist, layout, health check.
- **One end-to-end flow** (`e2e/primary-flow.spec.ts`) — home → movie detail → add to watchlist →
  watchlist page → reload → remove, in a real browser. `e2e/assistant.spec.ts` walks the chat
  against a mocked route.

## Query policy: roles and labels only

Tests never query by test id, class name, or DOM structure. They use
`getByRole` / `getByLabelText` / `getByText`, so refactors that keep the UI accessible keep the
tests green. Two experiments back this up:

- `docs/evidence/02-suite-survives-class-rename.txt` — every `className` in `src/` renamed
  (`text-xs` → `renamed-text-xs` …): **18 files / 98 tests still pass**.
- `docs/evidence/01-failing-suite.txt` — the empty-result branch removed from `ToolCallCard`
  (a real behaviour regression, not a styling one): **the suite fails** at
  `ToolCallCard > explains an empty result set instead of showing an empty list`.

Accessible names are part of the contract: the chat region is
`region "Assistant chat"`, the tool result is `region "Catalog search"`, the send button reports
`Send message` / `Sending message` / `Message sent` / `Send failed. Activate to retry.`, and the
nav is `navigation "Primary"`.

## The AI route is always mocked

No test ever talks to OpenRouter. Three independent mechanisms:

1. **Unit/component tests** — `src/test/setup.ts` replaces global `fetch` with a stub that
   *throws* for anything not explicitly mocked, so a forgotten mock fails the test instead of
   reaching the network. `mockChatRoute()` (`src/test/mock-chat-route.ts`) then returns scripted
   responses and records every request for assertions. `src/test/network-guard.test.ts` proves the
   guard is active.
2. **Route tests** — `api/chat.test.ts` mocks the provider module (`@openrouter/ai-sdk-provider`)
   with the AI SDK's `MockLanguageModelV3`, and calls the route handler directly. The real
   validation, tool execution, and stream encoding run.
3. **Playwright** — specs intercept `**/api/chat` with `buildChatStreamSse()`
   (`src/test/fixtures/chat-stream.ts`) and abort `**/openrouter.ai/**`.

Streams in tests are built with the same encoder helpers the SDK expects
(`src/test/ui-message-stream.ts`); `src/test/ui-message-stream.test.ts` parses the fixtures with
the SDK's own `parseJsonEventStream` + `uiMessageChunkSchema`, so a fixture that drifts from the
UI message protocol fails in one place instead of mysteriously breaking the chat tests.

## Coverage

`vite.config.ts` fails the run below these thresholds (statements / branches / functions / lines):

```
72 / 74 / 70 / 76
```

They sit a couple of points under today's numbers (76.29 / 78.77 / 75.43 / 79.84), so deleting
tests fails CI while ordinary work does not. Coverage is measured on `src/**` only — `api/` and
`lib/` have their own contract tests and would otherwise skew the percentage.

## CI

`.github/workflows/ci.yml` runs on every push (and PRs to `main`):

- **Unit & component tests** — `npm ci`, `npm run typecheck`, `npm run test:coverage`,
  uploads the `coverage` artifact, then `npm run build`.
- **End-to-end tests** — `npm ci`, `npx playwright install --with-deps chromium`,
  `npm run test:e2e`, uploads the `playwright-report` artifact (report and traces on failure).
- **CI green** — a gate job that needs both and fails if either did. Require *only* this check in
  branch protection: it is the single status that means "all tests passed".

The unit job also publishes the per-file test totals and the coverage summary onto the run page
(`scripts/ci-summary.mjs`), so a green run states what it verified instead of hiding it in a log.

## Evidence

`docs/evidence/` holds the artifacts referenced above:

- `ci-green.png` — the green run (all checks successful, 98 tests passing, both jobs, artifacts).
- `ci-blocks-merge.png` — the red run that blocked the branch, with the failing annotation and the
  fix that followed.
- `passing-run/`, `failing-run/` — the raw GitHub Actions API responses the two images are drawn
  from, plus `render-evidence.py` to draw them again.
- `vitest-results.json` — the suite totals/coverage the images quote.

The sandbox that produced these has no browser, so the images are rendered from the Actions API
responses rather than screen-captured; every number in them can be checked against the JSON files
next to them and against the run URLs printed at the bottom of each image.
