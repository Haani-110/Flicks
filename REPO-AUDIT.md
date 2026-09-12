# Flicks — Full Repository Audit

**Date:** 2026-09-12 (UTC)
**Repository:** [`Haani-110/Flicks`](https://github.com/Haani-110/Flicks) — public, no license, no description, no topics
**Audited at:** `main` @ [`bb0ae3e`](https://github.com/Haani-110/Flicks/commit/bb0ae3ea96d1c2d80c9540cbfb68ab3cd8eaeb7f) — *"hero: ship Flicks Nocturne — fullscreen aurora fragment shader"*
**Audit branch:** `arena/01a09647-flicks` (working copy identical to `main`; clean tree)
**Auditor:** Agent Mode (Arena)
**Scope:** engineering health, CI, tests, security, dependencies, performance/bundle, accessibility, code hygiene, documentation, repository governance

> This is an **engineering audit of the whole repository**. It complements — and where necessary corrects — the existing [`AUDIT.md`](AUDIT.md), which is a scoped *accessibility & performance* report written one commit earlier (at `048e608`, branch `arena/01a095fb-flicks`) and now partly stale. See [§10](#10-documentation--evidence-integrity).

---

## 1. Executive summary

Flicks is a small (≈10.9 k lines of TS/TSX/CSS across 140 tracked files), well-structured React 19 + Vite 7 + TypeScript SPA with a Vercel serverless AI route and an unusually ambitious 3D feature. The engineering instincts are good and visible: a strict TS config, a network-blocking test setup, a coverage ratchet, a role/label-only query policy, quality-tier gating for WebGL, and an API route that keeps the provider key server-side.

**But the default branch is red right now, and the two most important safety nets the docs claim exist do not.**

Three findings dominate everything else:

1. **`main` fails CI.** The coverage ratchet in `vite.config.ts` requires 76 % lines; the suite currently measures **74.57 %**. `npm run verify` exits **1** locally, and GitHub run [`34702536252`](https://github.com/Haani-110/Flicks/actions/runs/34702536252) on `main` is **failure** — the `unit` job dies at *Component tests with coverage*, the `Build` step is skipped, and the `CI green` gate fails. Every test still passes (218/218); only the threshold blocks.
2. **The red build is self-inflicted and one file explains it.** `src/components/ShaderHero.tsx` was added in the last commit with **no test**: it alone accounts for **136 of the 226 uncovered lines** (13.92 % covered). Removing or covering it flips CI green.
3. **Nothing actually blocks a merge.** `GET /repos/Haani-110/Flicks/rules/branches/main` returns `[]` and `/rulesets` returns `[]` — there are **no branch-protection rules and no rulesets**. `README.md` ("a failing job blocks merging") and `AUDIT.md` ("require *CI green* and every test job is required too, so a red suite blocks merging") both assert a guarantee that is not configured. The last two commits were pushed straight to `main`, one of them red.

Also material: **no linter runs anywhere** (`.oxlintrc.json` is committed but `oxlint` is not a dependency, there is no `lint` script, and no CI step); **4 high-severity dependency advisories**; **no rate limiting on an unauthenticated LLM proxy**; roughly **518 lines of dead code** (181 TS/TSX + 337 never-imported CSS) plus a 185-line demo component rendered on a production page; and an **unclosed code fence in `README.md`** that swallows the bottom third of the file.

### Scorecard

| Area | Grade | One-line verdict |
|---|:--:|---|
| CI & branch health | **F** | `main` is red; the "blocks merge" guarantee is not configured |
| Type safety | **A** | `tsc --noEmit` clean; `strict`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch` |
| Test suite | **B−** | 218/218 pass, excellent isolation policy — but the coverage gate fails and 13 files have no test |
| Lint & static analysis | **D** | Config committed, tool not installed, nothing runs |
| Security (app code) | **B+** | Key server-side, no `dangerouslySetInnerHTML`/`eval`, provider errors not leaked |
| Security (abuse & posture) | **C−** | No rate limit on the LLM proxy, client-controlled history, no security headers |
| Dependencies | **C** | 7 advisories (4 high); major-version drift on `ai`, `vite`, `typescript` |
| Performance & bundle | **B−** | Marquee lazy-loading is genuinely good; the *default* build ships 940 kB gzip of HTML |
| Accessibility | **A−** | Independently re-verified: contrast 6.2–16.5:1, landmarks, live regions, keyboard parity |
| Code hygiene | **C+** | ~350 dead lines, duplicate `Movie` type, design tokens defined but unused |
| Documentation | **C** | Deep but stale and partly self-contradictory; README rendering broken |
| Repository governance | **D** | No LICENSE on a public repo, no PR review, no Dependabot, no issue/PR templates |

### Findings by severity

| # | Sev | Finding | Where |
|---:|:--:|---|---|
| F-01 | 🔴 Critical | `main` fails CI: coverage 74.57 % lines vs 76 % threshold | `vite.config.ts:96`, run `34702536252` |
| F-02 | 🔴 Critical | No branch protection / rulesets — docs claim a merge gate that does not exist | GitHub repo settings |
| F-03 | 🔴 Critical | `ShaderHero.tsx` shipped untested; 136 uncovered lines = the whole regression | `src/components/ShaderHero.tsx` |
| F-04 | 🟠 High | No linter installed or run despite committed `.oxlintrc.json` | `package.json`, `.github/workflows/ci.yml` |
| F-05 | 🟠 High | 4 high-severity advisories (`vite`, `path-to-regexp`, `undici`, `@vercel/node`) | `npm audit` |
| F-06 | 🟠 High | Unauthenticated, un-rate-limited LLM proxy → token-cost abuse | `api/chat.ts` |
| F-07 | 🟠 High | Default `npm run build` ships a 3.39 MB / 947 kB-gzip single HTML file | `vite.config.ts:19`, `package.json:8` |
| F-08 | 🟠 High | README code fence never closed — bottom third of the file renders as a code block | `README.md:27` |
| F-09 | 🟠 High | No `LICENSE` on a public repository | repo root |
| F-10 | 🟡 Medium | Demo component with a simulated 20 % failure rate rendered on production `/assistant` | `src/pages/Assistant.tsx:132` |
| F-11 | 🟡 Medium | 518 lines of dead code (two orphan layouts, mock data, duplicate `Movie` type, 4 never-imported CSS files) + a demo widget on a prod page | see §7 |
| F-12 | 🟡 Medium | Client fully controls conversation history → fabricated assistant/tool parts (prompt injection) | `api/chat.ts:73-113` |
| F-13 | 🟡 Medium | `/health` fetches `jsonplaceholder.typicode.com` by default; URL is env-controlled with no allow-list | `src/pages/HealthCheck.tsx:12` |
| F-14 | 🟡 Medium | `WatchlistContext` memo is a no-op; whole grid re-renders on every toggle | `src/context/WatchlistContext.tsx:11` |
| F-15 | 🟡 Medium | Hero shader renders 60 fps forever — no `IntersectionObserver` gate (unlike the marquee) | `src/components/ShaderHero.tsx:325-360` |
| F-16 | 🟡 Medium | Design tokens defined in `@theme` but 337 hardcoded hex literals used instead | `src/index.css:3-17` |
| F-17 | 🟡 Medium | Artificial 500 ms `setTimeout` left in a production tool path | `lib/flicks-tools.ts:52` |
| F-18 | 🟡 Medium | `AUDIT.md` is stale and self-contradictory; cites a non-existent JSON artifact | `AUDIT.md` |
| F-19 | 🔵 Low | Routes are not lazy-loaded — chat/AI SDK rides in the initial chunk for `/` visitors | `src/App.tsx:4-10` |
| F-20 | 🔵 Low | Remote font hotlinked to a versioned `fonts.gstatic.com` path | `src/index.css:26` |
| F-21 | 🔵 Low | No favicon, OG/Twitter tags, `robots.txt`, `sitemap.xml`, or `public/` directory | `index.html` |
| F-22 | 🔵 Low | `rel="canonical"` (`flicks.vercel.app`) ≠ repo homepage (`flicks-murex.vercel.app`) | `index.html:8` |
| F-23 | 🔵 Low | No security or cache-control headers for `/assets/*` | `vercel.json` |
| F-24 | 🔵 Low | `server.allowedHosts: true` disables Vite's host check | `vite.config.ts:51` |
| F-25 | 🔵 Low | Major-version drift: `ai` 6→7, `vite` 7→8, `typescript` 5.9→7.0, `@openrouter/ai-sdk-provider` 2→3 | `npm outdated` |
| F-26 | 🔵 Low | Package identity is the scaffold default (`react-vite-tailwind`, `0.0.0`) | `package.json:2-4` |
| F-27 | 🔵 Low | No Dependabot/Renovate, no `npm audit` step, no CodeQL in CI | `.github/` |
| F-28 | 🔵 Low | `.env.example` omits `OPENROUTER_API_KEY`; README has no setup section | `.env.example` |
| F-29 | 🔵 Low | `zod` available but the API route hand-rolls validation | `api/chat.ts:52-113` |
| F-30 | 🔵 Low | `aria-label` on a role-less `<div>` in the hero (ignored by AT) | `src/components/ShaderHero.tsx:411,437` |
| F-31 | 🔵 Low | `trigger`/`messageId` accepted from client but never validated or used | `src/lib/chat-transport.ts:9-13` |
| F-32 | 🔵 Low | Duplicate DRACO decoder assets emitted (~1.28 MB raw, ~325 kB gzip) | `dist/assets/` |

---

## 2. Method — what was actually executed

Nothing in this report is inferred from reading alone. Every number below was produced in this checkout:

```bash
npm ci                      # 351 packages, 8 s, clean from lockfile
npm run typecheck           # exit 0
npm test                    # exit 0 — 32 files, 218 tests passed
npm run test:coverage       # exit 1 — lines 74.57 % < 76 % threshold
npm run verify              # exit 1 — fails at the coverage step
npm run build               # dist/index.html 3,389.58 kB / gzip 947.59 kB
npm run build:split         # 13 assets; initial JS+CSS ≈ 173 kB gzip
npm audit / npm outdated    # 7 advisories (1 low, 2 moderate, 4 high); 15 outdated
gzip -c <asset> | wc -c     # per-asset transfer sizes in §6
gh run list / gh run view   # CI history and the failing run on main
gh api .../rules/branches/main  # [] — no branch protection
```

Static analysis: `grep` sweeps for `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `new Function`, `document.write`, `as any`, `@ts-ignore`, `console.*`, `localStorage`, secret-shaped strings, external URLs, import-graph reachability (to prove dead code), and orphan CSS. Contrast ratios were recomputed from the palette with the WCAG 2.x relative-luminance formula. Build output was inspected to confirm the initial chunk contains **no** three.js/R3F code (`grep -c WebGLRenderer dist/assets/index-*.js` → `0`).

**What could not be run here:** the Playwright suite (Chromium cannot be downloaded in this sandbox — `npx playwright install chromium` fails with a network error) and Lighthouse (no Chrome binary). For e2e I rely on the CI record: run `34702536252` shows **End-to-end tests ✓ in 44 s, 6 passed**. Lighthouse/WAVE numbers are taken from the project's own `AUDIT.md` and are flagged as unverified-in-this-session.

---

## 3. Repository snapshot

| Dimension | Value |
|---|---|
| Tracked files | 140 (`package-lock.json` excluded from LOC) |
| Working tree size | 6.5 MB, of which **5.5 MB is PNG evidence** in `docs/` |
| Source LOC (TS/TSX/CSS) | 10,868 |
| Largest source file | `src/components/ShaderHero.tsx` — 465 lines |
| Commits on `main` | 12, all authored **2026-09-12** between 10:54 and 15:07 UTC |
| Merged pull requests | 1 of 1 (`#1`, from `arena/01a0953e-flicks`) |
| Open issues | 0 |
| Stack | React 19.2.6 · Vite 7.3.2 · TypeScript 5.9.3 · Tailwind 4.1.17 · three 0.186 + R3F 9.7 · AI SDK (`ai` 6.0.280) · Vitest 5 · Playwright 1.63 |
| Runtime | Node 22 (CI and sandbox: v22.22.3) |
| Deploy | Vercel — `vercel.json` runs `npm run build:split`, SPA rewrite for non-`/api/` paths |
| Routes | `/` `/watchlist` `/movie/:id` `/health` `/assistant` `/marquee` `*`→NotFound |

**Architecture.** Three layers, cleanly separated:

- `src/` — the SPA. Feature-foldered for the marquee (`src/features/marquee/`), flat elsewhere.
- `lib/` — server-only AI config and tools (`flicks-ai.ts`, `flicks-tools.ts`). Imported by `api/`, never by `src/`.
- `api/chat.ts` — Vercel function streaming the AI SDK UI-message protocol from OpenRouter.

The shared contract lives in `src/lib/chat-contract.ts` and is imported by **both** sides, which is the right call — limits cannot drift. One structural wrinkle: `lib/` imports *upward* from `src/` (`../src/data/movies.js`, `../src/lib/chat-contract.js`). It works because Vercel traces the dependency graph, but it means the "server-only" layer is not actually independent of the client tree.

---

## 4. CI & branch health 🔴

### 4.1 `main` is red

```
gh run list --limit 3
completed  failure  hero: ship Flicks Nocturne …  CI  main                    push  34702536252
completed  failure  hero: ship Flicks Nocturne …  CI  arena/01a095fb-flicks   push  34701283725
completed  success  audit: incorporate live preview scores …                  push  34700771021
```

Run `34702536252` job breakdown:

| Job | Result | Detail |
|---|:--:|---|
| Unit & component tests | ❌ 56 s | Typecheck ✓ → **Component tests with coverage ✗ (exit 1)** → Summarize ✓ → Upload coverage ✓ → **Build skipped** |
| End-to-end tests | ✅ 44 s | 6 passed |
| CI green (gate) | ❌ 2 s | `test "${{ needs.unit.result }}" = "success"` fails |

Reproduced locally, identically:

```
=============================== Coverage summary ===============================
Statements   : 73.02% ( 720/986 )      threshold 72  ✓
Branches     : 76.73% ( 498/649 )      threshold 74  ✓
Functions    : 83.12% ( 202/243 )      threshold 70  ✓
Lines        : 74.57% ( 663/889 )      threshold 76  ✗  ERROR
```

`npm run verify` → **exit 1**. The documented "what CI gates on" command does not pass on the default branch.

Two aggravating details:

- **The `Build` step never runs** when coverage fails, because it has no `if: always()`. So a red coverage gate also silently removes build verification from the signal. Moving `Build` before the coverage step (or adding `if: always()` + a separate gate) would keep both signals independent.
- **The ratchet was set at headroom ~1.4 points.** The config comment says *"a couple of points below the level the suite holds today"* — but lines landed at 74.57 % against a 76 % bar, i.e. the threshold was set **above** the measured value for at least one metric. Statements (73.02 vs 72) and branches (76.73 vs 74) do have the intended slack; lines does not.

### 4.2 The single cause: an untested 465-line component

Per-file uncovered lines (`coverage/coverage-summary.json`), sorted by impact:

| File | Lines % | Uncovered | Total | Note |
|---|---:|---:|---:|---|
| `src/components/ShaderHero.tsx` | **13.92** | **136** | 158 | added in `bb0ae3e`, no test |
| `src/components/SendButtonDemo.tsx` | 25.39 | 47 | 63 | demo, rendered in prod |
| `src/components/chat/ChatTranscript.tsx` | 73.33 | 8 | 30 | tested via `Assistant.test.tsx` |
| `src/error.tsx` | **0** | 6 | 6 | error boundary never rendered in a test |
| `src/components/Header.tsx` | **0** | 4 | 4 | **dead code** |
| `src/features/marquee/quality.ts` | 91.42 | 3 | 35 | |
| `src/components/chat/ToolCallCard.tsx` | 94.11 | 3 | 51 | |
| `src/features/marquee/gltf-inspect.ts` | 95.08 | 3 | 61 | |
| `src/hooks/useWatchlist.ts` | 87.5 | 2 | 16 | |
| `src/App.tsx` | **0** | 1 | 1 | **the router is never mounted in a test** |
| `src/components/AppLayout.tsx` | **0** | 1 | 1 | **dead code** |
| `src/data/mockMovies.ts` | **0** | 1 | 1 | **dead code** |
| `src/pages/NotFound.tsx` | **0** | 1 | 1 | never rendered in a test |

**Total uncovered: 226 lines.** `ShaderHero.tsx` is 60 % of that on its own.

Three ways back to green, in order of preference:

1. **Test the hero's decision logic** (reduced-motion branch, no-WebGL early return, cleanup). ~40 lines of test on the `reduced` path plus a `getContext` stub gets most of it; the file is already 13.92 % because jsdom returns `null` from `getContext`, so the whole GL block is dead in tests.
2. **Exclude it the way the scene is excluded.** `vite.config.ts` already excludes `marquee-viewport.tsx` and `scene/**` with a written justification ("needs a GPU"). The hero shader has exactly the same constraint and no equivalent exclusion — an inconsistency in the project's own stated policy.
3. **Delete the dead files** (`Header.tsx`, `AppLayout.tsx`, `mockMovies.ts` → 6 lines) and add a trivial `App.test.tsx` / `NotFound.test.tsx`. Small, but free.

Option 1 + 3 is the honest fix; option 2 alone is legitimate *if* the exclusion comment explains it, and it is what the repo already does elsewhere.

### 4.3 The merge gate does not exist 🔴

```
$ gh api repos/Haani-110/Flicks/rules/branches/main
[]
$ gh api repos/Haani-110/Flicks/rulesets
[]
```

(The legacy `/branches/main/protection` endpoint returns 403 for this token, but `rules/branches/main` is readable and aggregates both classic protection and rulesets — an empty array means **no rules of any kind** apply to `main`.)

Yet the documentation asserts the opposite, twice:

- `README.md`: *"Both run on every push and **a failing job blocks merging**."*
- `.github/workflows/ci.yml` comment: *"Single gate for branch protection: **require "CI green"** and every test job is required too, so a red suite blocks merging."*
- `docs/ci-blocks-merge.png` (324 kB) exists as evidence for a setting that is not currently enabled.

Consequence, demonstrated: commits `c0860c0` and `d40d33d` (from branch `arena/01a095fb-flicks`) and `bb0ae3e` landed directly on `main` with no PR, and `bb0ae3e` landed **while red**. The `CI green` job is well-designed — `needs: [unit, e2e]` + `if: always()` + explicit result assertions is exactly the right pattern — but an unenforced gate is decoration.

**Fix (5 minutes, in the GitHub UI or via `gh api`):** require a pull request before merging, require status checks `CI green`, `Unit & component tests`, `End-to-end tests`, `Typecheck`, and enable "require branches to be up to date".

### 4.4 What CI gets right

Credit where due — this is a better workflow than most small projects have:

- `concurrency` with `cancel-in-progress: true` so CI always reflects the tip.
- `actions/checkout@v7`, `setup-node@v7`, `upload-artifact@v7` — current major versions, Node 22 pinned with `cache: npm`.
- `npm ci`, not `npm install` — reproducible from the lockfile.
- Coverage and Playwright reports uploaded `if: always()` / `if: ${{ !cancelled() }}` with 7-day retention.
- `scripts/ci-summary.mjs` publishes the test totals **and** the coverage table into `$GITHUB_STEP_SUMMARY`, so a green run states what it verified. Nicely written: it degrades gracefully when the JSON report is missing and prints the enforced thresholds.
- Two independent jobs (unit, e2e) rather than one long serial pipeline.

### 4.5 What CI is missing

| Gap | Impact |
|---|---|
| **No lint step at all** | See F-04 — the only static-analysis gate is `tsc` |
| No `npm audit` / dependency-review step | 4 high advisories sat undetected |
| No Dependabot or Renovate config (`.github/` contains only `workflows/`) | Drift accumulates silently; `ai` is already a major behind |
| No CodeQL / security scanning | Public repo, CodeQL is free |
| `Build` skipped when coverage fails | Loses an independent signal (see §4.1) |
| No artifact retention for `vitest-report.json` | The summary is written but the raw report is not uploaded |

---

## 5. Testing

### 5.1 Inventory

| Layer | Tool | Files | Tests | Status |
|---|---|---:|---:|:--:|
| Unit / component / hook | Vitest 5 + RTL 16 (jsdom) | 30 in `src/` | — | ✅ |
| API route contract | Vitest (`api/chat.test.ts`, 230 lines) | 1 | — | ✅ |
| Shared lib | Vitest (`lib/flicks-tools.test.ts`) | 1 | — | ✅ |
| **Total Vitest** | | **32** | **218** | ✅ 42.3 s |
| End-to-end | Playwright 1.63, Chromium, dev server on `127.0.0.1:4174` | 3 specs (229 lines) | 6 | ✅ in CI (44 s); **not runnable in this sandbox** |

Coverage of the source tree: **53 implementation files in `src/`, 30 with a sibling test.** 23 have none — but 6 of those are the GPU-bound scene files (deliberately and documentedly excluded, covered by `e2e/marquee.spec.ts` instead) and 4 are dead code, leaving **13 genuinely untested live files**, including `App.tsx`, `error.tsx`, `NotFound.tsx`, `ChatTranscript.tsx`, `useWatchlist.ts`, `WatchlistContext.tsx`, `utils/cn.ts`, `data/movies.ts`.

### 5.2 Genuine strengths

- **`src/test/setup.ts` stubs global `fetch` to *throw* on any unmocked call**, with the URL in the message and a pointer to the mocking helper. A test that forgets to mock fails loudly instead of silently reaching OpenRouter. This is the single best testing decision in the repo, and there is a test *for the guard* (`src/test/network-guard.test.ts`).
- **Role/label-only query policy**, documented in `docs/TESTING.md` and backed by two recorded experiments: renaming every `className` in `src/` left 98 tests green (`docs/evidence/02-suite-survives-class-rename.txt`), while deleting a real behaviour branch failed the suite (`docs/evidence/01-failing-suite.txt`). That is a stronger argument than most teams ever produce.
- **The AI route is tested as a contract**, not mocked away: method validation, missing key, the whole 400 table, the SSE stream shape, a tool round-trip, and provider failure surfacing as an in-stream message rather than a leaked stack.
- **`e2e/marquee.spec.ts` asserts the real render loop** via the on-canvas fps readout (`/\d+ fps/`), which is sampled inside `useFrame` — so "the scene is rendering" is proven, not assumed. It also covers persistence across reload, pause, poster fallback, and rejecting a non-`.glb` file.
- **`playwright.config.ts` binds explicitly to `127.0.0.1`** with a comment explaining why (Vite defaults to `::1`) — the kind of note that saves the next person an hour.
- Coverage thresholds exist at all, with `lcov` + `json-summary` reporters and a written rationale per exclusion.

### 5.3 Problems

| # | Issue | Detail |
|---:|---|---|
| 1 | **The coverage gate fails** | F-01/F-03. 74.57 % lines vs 76 %. |
| 2 | **No test mounts `App.tsx`** | The route table — the app's spine — is never rendered. A typo in a `path` or a missing `Route` would ship green. One `MemoryRouter` test asserting all seven routes resolve would cover it and `NotFound.tsx` together. |
| 3 | **The error boundary is untested** | `src/error.tsx` at 0 %. It is the top-level crash handler; a throw-away test with a component that throws would cover both branches. |
| 4 | **Three tests take ~500 ms each for a deliberate sleep** | `lib/flicks-tools.test.ts` — `filters the real catalog…` 502 ms, `returns output the chat can render` 504 ms, `returns an empty list…` 501 ms. That is the artificial `setTimeout(resolve, 500)` in `lib/flicks-tools.ts:52` (F-17) burning 1.5 s of every run and CI minute. Use `vi.useFakeTimers()` or delete the delay. |
| 5 | **jsdom is created 32 times (16.5 s, 43 % of tracked time)** | Vitest itself prints the fix: `pool: 'vmThreads'` or `isolate: false`. Would roughly halve the unit job. |
| 6 | **Canvas noise** | ~16 `Not implemented: HTMLCanvasElement's getContext()` warnings per run. Harmless but it trains people to ignore the log. A one-line `getContext` stub in `setup.ts` silences it and would also unlock `ShaderHero` coverage. |
| 7 | **No `lint` script to fail** | F-04. |

---

## 6. Security

### 6.1 What is done correctly

I swept for the usual client-side hazards and found none:

```
grep -rn "dangerouslySetInnerHTML|innerHTML|eval(|document.write|new Function" src api lib e2e
→ no matches
grep -rn "as any|: any|@ts-ignore|@ts-expect-error" src lib api
→ no matches
```

- **The provider key is server-side only.** `OPENROUTER_API_KEY` is read exclusively in `api/chat.ts:29`; `lib/flicks-ai.ts` documents the rule; no `VITE_`-prefixed secret exists. `.env` is gitignored with `.env.example` explicitly un-ignored. No secret-shaped strings anywhere in tracked files.
- **Provider errors are not leaked.** `api/chat.ts:165-168` — `onError` logs server-side and returns the fixed string *"AI request failed. Please try again."* to the browser. `api/chat.test.ts` asserts this.
- **The 405 path sets `Allow: POST`** rather than silently accepting everything.
- **Client disconnect aborts the upstream request** (`req.on("close", …)` → `controller.abort()`, cleaned up in `finally`) — so a closed tab does not leave a billed generation running.
- **Input limits are enforced server-side and mirrored client-side** from one shared module: ≤30 messages/request, ≤2 000 chars/message, history trimmed to 20, roles restricted to `user`/`assistant`, and at least one `user` message required.
- **`stopWhen: stepCountIs(3)`** caps the agentic tool loop — a runaway multi-step generation is bounded.
- **The `.glb` drop zone validates before use**: magic-byte check, `MAX_GLB_BYTES = 25 MB`, and DRACO/meshopt decoders are imported only for files that need them (`gltf-inspect.ts`, `dropped-model.tsx:46-60`).
- **`Cache-Control: no-cache, no-transform` + `X-Content-Type-Options: nosniff`** on the stream response.

### 6.2 Findings

**F-06 🟠 Unauthenticated, un-rate-limited LLM proxy.** `POST /api/chat` is public. There is no rate limit, no IP throttle, no auth, no origin check, and no per-session budget. The only brakes are the payload caps above. Worst case per request: 20 messages × 2 000 chars ≈ **40 kB of attacker-chosen prompt** plus up to 3 tool steps and 800 output tokens — billed to your OpenRouter key. A loop is a few lines of `curl`. *Mitigation:* Vercel WAF rate-limit rule or an in-route token bucket keyed on IP; consider `origin` validation; set a spend limit on the OpenRouter key; `OPENROUTER_MODEL_ID` is `openai/gpt-4o-mini` (cheap, which limits the damage — a sensible default).

**F-12 🟡 Client-controlled conversation history.** `api/chat.ts` validates that each entry's `role` is `user` or `assistant` and that `parts` is an array, then passes the whole thing to `convertToModelMessages`. Nothing constrains **what an `assistant` message may contain** — a caller can fabricate prior assistant turns, including fake `tool` parts and tool results, and have them accepted as genuine history. Combined with `buildSystemPrompt()` grounding the model in the catalog, this is a straightforward prompt-injection / persona-hijack vector, and it can also be used to smuggle instructions past the "use ONLY the catalog" rule. *Mitigation:* validate parts against a schema (zod is already a dependency — F-29), strip or reject `tool`/`data`/`file` parts from client-supplied **assistant** messages, or persist history server-side keyed by chat id and accept only the newest user turn.

**F-13 🟡 `/health` calls a third-party demo API by default.** `DEFAULT_URL = "https://jsonplaceholder.typicode.com/todos/1"` (`src/pages/HealthCheck.tsx:12`). Every visitor to `/health` sends a request from *their* browser to a public demo service — leaking visitor IPs to an unrelated third party, and testing nothing about Flicks. The page describes it as *"Verifies the app can reach its external API endpoint"*, which is not what it does. Worse, `VITE_HEALTH_CHECK_API_URL` is a **build-time client variable with no allow-list**: whoever controls the build environment points every visitor's browser at an arbitrary origin, and the response JSON is then rendered verbatim into a `<pre>`. *Mitigation:* point it at your own endpoint (e.g. `GET /api/health` returning build SHA and uptime), and validate the env override against an `https:` + hostname allow-list.

**F-23 🔵 No security or caching headers.** `vercel.json` contains only `buildCommand` and `rewrites`. Missing: `X-Content-Type-Options`, `X-Frame-Options`/`frame-ancestors`, `Referrer-Policy`, `Permissions-Policy`, and any CSP. Also missing `Cache-Control: public, max-age=31536000, immutable` for the content-hashed `/assets/*` — those filenames are immutable by construction and should be cached forever, while `index.html` should be `no-cache`.

**F-24 🔵 `server.allowedHosts: true`** (`vite.config.ts:51`) disables Vite's Host-header check entirely. It is scoped to the dev server (and the comment explains it is for the sandbox preview proxy), so real-world exposure is limited to developers who expose `npm run dev` to a network. A narrower allow-list is preferable.

**F-05 🟠 Dependency advisories** — see §8.

---

## 7. Code quality & maintainability

### 7.1 Dead code (518 lines, proven by import-graph sweep)

| File | Lines | Proof |
|---|---:|---|
| `src/components/SendButtonDemo.tsx` | 185 | Not dead — **worse**: imported by `src/pages/Assistant.tsx:4` and rendered at line 132, on the production `/assistant` page. Its own doc comment says *"Demo only."* `fakeSend()` sleeps 900–1 800 ms and **rejects 20 % of the time** in `random` mode. A visitor scrolling past the real composer meets a button that randomly fails. 47 uncovered lines. |
| `src/components/AppLayout.tsx` | 30 | Imported by nothing. A second, competing layout: no `<footer>`, `focus:fixed` skip link instead of `focus:absolute`, no `tabIndex={-1}` on `<main>`. The app uses `Layout.tsx`. |
| `src/components/Header.tsx` + `Header.css` | 122 + 90 CSS | Imported **only** by the dead `AppLayout.tsx`. A second header component. |
| `src/components/index.ts` | 1 | `export { Layout, Header } from "./Layout"` — the barrel's only exports are a live component and a dead one, and **nothing imports the barrel**. |
| `src/data/mockMovies.ts` | 111 | Imported by nothing. Ten fake movies with `picsum.photos` URLs. Directly contradicts `lib/flicks-ai.ts`: *"This is the only catalog source — **no fake data**."* |
| `src/types/movie.ts` | 9 | Imported only by `mockMovies.ts`. Declares a **second, incompatible `Movie` type** (`id: string`, singular `genre`, `posterUrl`, `description`) beside the real one in `src/data/movies.ts` (`id: number`, `genres: string[]`, `posterPath`, `overview`). A trap for anyone who auto-imports `Movie`. |
| `src/components/MovieCard.css`, `src/pages/Home.css`, `src/pages/MovieDetail.css` | 62 + 36 + 117 | **Never imported by any file.** All styling is Tailwind utility classes in TSX. 215 lines of orphan CSS that still ships in the repo (not the bundle — Vite only emits imported CSS). |
| **Total** | **181 dead TS/TSX + 337 never-imported CSS = 518 lines**, plus the 185-line `SendButtonDemo` that is live but should not be | |

Deleting the 518 dead lines is a no-risk change: nothing imports them, `tsc` stays clean, and coverage improves by ~6 lines (F-11, and part of the fix for F-01).

### 7.2 Design tokens defined but unused

`src/index.css:3-17` declares a proper Tailwind 4 `@theme` palette — `--color-bg`, `--color-header`, `--color-card`, `--color-surface`, `--color-border`, `--color-text`, `--color-muted`, `--color-accent`, `--color-accent-hover`, `--color-danger` — plus `--font-sans`.

Then the components ignore it: **337 hardcoded hex literals across 25 `.tsx` files**, the top five being `#9aa1a6` (×61), `#e8a73e` (×60), `#f3f1ec` (×47), `#e05555` (×22), `#262b2f` (×22). Usage of the generated token utilities (`bg-bg`, `text-muted`, `bg-surface`, `border-border`, `bg-card`) across live components: **zero**. The only three hits are in the *dead* `AppLayout.tsx`/`Header.tsx`, which use `bg-background`, `text-text-primary`, `text-text-secondary` — **names that are not defined in `@theme` at all**, so those classes generate no CSS even if the files were revived.

Net effect: re-theming is a 337-site find-and-replace, and the token block is documentation rather than a mechanism. Either adopt the tokens or delete the block; the current state is the worst of both.

### 7.3 Correctness nits

**F-14 — `WatchlistContext`'s memo never memoizes.**
```tsx
// src/context/WatchlistContext.tsx:10-11
const watchlist = useWatchlist();
const value = useMemo(() => watchlist, [watchlist]);
```
`useWatchlist` returns a **fresh object literal every render** (`return { ids, toggle, remove }`), so the dependency changes every render and `useMemo` recomputes every time. Every consumer — `Home`'s grid of `MovieCard`s, `Watchlist`, `MovieDetail` — re-renders on any provider change, including changes that don't touch `ids`. Fix: memoize inside the hook (`useMemo(() => ({ ids, toggle, remove }), [ids, toggle, remove])`) and drop the provider-level memo, or split state and actions into two contexts so a toggle doesn't re-render the world.

**F-17 — artificial latency in a production path.** `lib/flicks-tools.ts:52`: `await new Promise((resolve) => setTimeout(resolve, 500));` with the comment *"Small delay makes the tool lifecycle visible during development. Remove this delay later if desired."* It is in the shipped serverless function, adds 500 ms to every tool call, and costs 1.5 s per test run.

**F-30 — `aria-label` on a role-less `<div>`.** `ShaderHero.tsx:411` and `:437` put `aria-label="Flicks hero — …"` on plain `<div>`s. Per HTML-AAM, `aria-label` on a generic `<div>` is not reliably exposed; the label is likely dropped. Use `role="img"` (it is a decorative-but-labelled graphic region) or move the label to a `sr-only` heading/paragraph. The inner `<canvas>` correctly has `aria-hidden="true"`.

**F-31 — unused client-sent fields.** `buildChatRequestBody` sends `trigger` and `messageId`; `api/chat.ts` never reads or validates them. Harmless, but the type claims a contract the server does not honour.

**F-29 — hand-rolled validation while `zod` is a dependency.** `api/chat.ts:52-113` is ~60 lines of manual `typeof`/`in`/`Array.isArray` checks producing seven distinct 400 messages. `src/lib/chat-contract.ts` already demonstrates the project's zod idiom, and `movieSearchOutputSchema` shows it is used for tool output. A single `z.object({...})` with `.safeParse` would be shorter, exhaustive (it would catch F-12), and consistent.

**F-26 — package identity is the scaffold default.** `package.json`: `"name": "react-vite-tailwind"`, `"version": "0.0.0"`. Shows up in the CI summary header (`### react-vite-tailwind test suite`) and in any future publishing.

**Positive notes.** No `any`, no `@ts-ignore`, no `eslint-disable` (the two `// eslint-disable-next-line` comments at `ShaderHero.tsx:228` and `scene/dropped-model.tsx:103` are inert — **no ESLint is configured**), and only five `console.*` calls in non-test source, all deliberate and prefixed (`[shader]`, `[flicks]`, `[chat]`). Comments explain *why*, not *what* — `vite.config.ts`, `quality.ts`, `drop-zone.tsx` and `marquee-viewport.tsx` are all well annotated. `src/features/marquee/` is genuinely good feature-folder architecture with pure, testable decision functions (`decideQuality`, `scrollProgress`, `bulb-layout`, `pixel-font`, `gltf-inspect`) separated from the GPU code.

---

## 8. Dependencies

### 8.1 Advisories (`npm audit` — 7 total: 1 low, 2 moderate, 4 high)

| Package | Sev | Installed | Via | Fix |
|---|:--:|---|---|---|
| `vite` | **high** | 7.3.2 | `launch-editor` NTLMv2 hash disclosure via UNC path on Windows (GHSA-v6wh-96g9-6wx3); `server.fs.deny` bypass on Windows alternate paths (GHSA-fx2h-pf6j-xcff) | **7.3.6** — inside the `^7.3.2` range; `npm audit fix` (no `--force`) resolves it |
| `path-to-regexp` | **high** | 4.0.0–6.2.2 | Backtracking regex / ReDoS, CVSS 7.5 (GHSA-9wv6-86v2-598j) | via `@vercel/node` → needs `@vercel/node@3.0.1` (major) |
| `undici` | **high** | nested under `@vercel/node` | 11 advisories incl. request smuggling, CRLF injection, keep-alive response-queue poisoning, unbounded WebSocket memory | via `@vercel/node@3.0.1` (major) |
| `@vercel/node` | **high** | ^13.0.0 | Rolls up the three above | **3.0.1** — note this is a *different* major line; verify the `VercelRequest`/`VercelResponse` types still match `api/chat.ts` |
| `ajv` | moderate | 7.x/8.x | ReDoS with the `$data` option (GHSA-2g4f-4pwh-qvx6) | via `@vercel/node@3.0.1` |
| `@vercel/static-config` | moderate | * | Depends on `ajv` | via `@vercel/node@3.0.1` |
| `esbuild` | low | 0.27.3–0.28.0 | Arbitrary file read when the **dev server** runs on Windows (GHSA-g7r4-m6w7-qqqr) | `fixAvailable: true` |

**Assessment.** All four high findings are (a) Windows-specific dev-server issues or (b) transitive to `@vercel/node`, a **devDependency used only for its TypeScript types** — it is not in the production bundle, and Vercel's own runtime provides the actual Node environment. So real-world exposure is low. That said, `npm audit fix` (without `--force`) clears `vite` and `esbuild` for free today, and CI has no `npm audit` step to notice any of this (F-27).

### 8.2 Drift (`npm outdated`)

| Package | Current | Wanted | Latest | Gap |
|---|---|---|---|---|
| `ai` | 6.0.280 | 6.0.282 | **7.0.99** | major |
| `vite` | 7.3.2 | 7.3.2 | **8.3.0** | major (also a high advisory at 7.3.2) |
| `typescript` | 5.9.3 | 5.9.3 | **7.0.2** | major |
| `@openrouter/ai-sdk-provider` | 2.10.0 | 2.10.0 | **3.0.0** | major |
| `@vitejs/plugin-react` | 5.1.1 | 5.1.1 | **6.1.1** | major |
| `tailwindcss` / `@tailwindcss/vite` | 4.1.17 | 4.1.17 | **4.3.3** | minor |
| `react` / `react-dom` | 19.2.6 | 19.2.6 | 19.3.0 | minor |
| `@types/react`, `@types/react-dom`, `@types/node`, `tailwind-merge`, `@ai-sdk/react`, `vite-plugin-singlefile` | — | — | — | patch/minor |

One inconsistency worth noting: `@ai-sdk/react` is pinned at **4.0.101** while `ai` is at **6.0.280**. `@ai-sdk/react@4` declares only `react` as a peer, so npm is silent — and the suite passes, so it evidently works — but a v4 React binding against a v6 core is not a combination the versioning advertises. Worth confirming against the AI SDK compatibility matrix before the next upgrade, and it makes the `ai` 6→7 jump riskier than it looks.

**Every dependency is actually used** (verified by import sweep): `clsx` and `tailwind-merge` each appear once, both inside `src/utils/cn.ts`, which is imported by three chat components. No phantom deps.

---

## 9. Build, bundle & performance

### 9.1 Two builds, and the default is the bad one 🟠

`vite.config.ts:19` — `...(mode === "test" || mode === "split" ? [] : [viteSingleFile()])`. So `npm run build` (the default, and what `package.json` calls `"build"`) inlines *everything* into one HTML document:

```
dist/index.html    3,389.58 kB │ gzip: 947.59 kB      ← one file, nothing cacheable, nothing deferrable
```

That includes three.js, React Three Fiber, the DRACO decoders as base64 data URLs, all CSS, and the app — served to every visitor including the ones who only read `/`. `README.md` acknowledges this and recommends `build:split`; `vercel.json` does use `build:split`. But the *default* script, the one a reviewer or a new deploy target runs, produces the 947 kB artifact, and `npm run verify` builds **that one** (so CI's build check, when it runs at all, verifies the build that is not deployed).

**Recommendation:** swap them. Make `build` the split build and `build:single` the single-file one, or make `verify` use `build:split` so CI validates the deployed artifact.

### 9.2 The split build, measured in this checkout

| Asset | Raw | gzip | Loaded when |
|---|---:|---:|---|
| `index.html` | 1.13 kB | 0.51 kB | always |
| `vendor-*.js` (react, react-dom, router) | 49.01 kB | **17.33 kB** | always (modulepreload) |
| `index-*.js` (app) | 519.78 kB | **155.27 kB** | always |
| `index-*.css` | 38.40 kB | **7.87 kB** | always |
| **Initial transfer** | **608 kB** | **≈181 kB** | |
| `marquee-viewport-*.js` (three + R3F + scene) | 945.77 kB | 252.44 kB | `lazy()` + IntersectionObserver |
| `draco_decoder-*.js` | 719.41 kB | 149.87 kB | only if a dropped `.glb` uses DRACO |
| `draco_decoder-*.wasm` ×2 | 478.17 kB | 152.15 kB | ditto |
| `draco_wasm_wrapper-*.js` ×2 | 117.22 kB | 23.38 kB | ditto |
| `GLTFLoader-*.js` | 45.80 kB | 13.90 kB | only on file drop |
| `meshopt_decoder.module-*.js` | 26.49 kB | 7.14 kB | only if meshopt-compressed |
| `DRACOLoader-*.js` | 7.47 kB | 3.13 kB | only if DRACO-compressed |

**Verified good:** `grep -c "WebGLRenderer" dist/assets/index-*.js` → **0**. No three.js or R3F code leaks into the initial chunk; the `lazy()` + `IntersectionObserver` + `frameloop="never"` gating in `marquee-experience.tsx` genuinely works, and the loaders are dynamic-imported only for files that need them (`dropped-model.tsx:46-60`). This is above-average discipline for a hobby-scale 3D feature.

**F-32 🔵 Duplicate DRACO assets.** Two `draco_decoder-*.wasm` (192 kB + 286 kB) and two `draco_wasm_wrapper-*.js` are emitted — three.js ships both a JS-fallback and a WASM decoder, and Rollup copies both. ~325 kB gzip of dead weight in `dist/` (never fetched unless DRACO is used, so no runtime cost, but it bloats the deploy).

**Documentation drift.** `README.md` claims initial app + CSS = "587 kB / **174 kB** gzip"; `AUDIT.md` §7 claims "vendor 49/17 + index 506/150 + css 36/7.5 = **167 kB**". Measured today: **608 kB raw / ≈181 kB gzip** (`index` is now 519.78 kB raw, CSS 38.40 kB). Small deltas, but both documents state them as measurements, and neither has been re-run since `ShaderHero` landed.

### 9.3 F-19 🔵 Routes are not lazy-loaded

`src/App.tsx:4-10` statically imports all seven pages. Only the marquee's *canvas host* is lazy. Consequences: the AI SDK client runtime (`@ai-sdk/react`, `ai`), the whole chat UI, `zod` (pulled in via `chat-contract.ts`), and the 465-line `ShaderHero` all sit in the 519 kB initial chunk — paid for by a visitor who only reads `/`. `React.lazy` on `Assistant`, `Marquee` (page-level, not just viewport), `HealthCheck` and `MovieDetail` would move most of it out. The `manualChunks.vendor` entry already exists as a hook; adding `ai`/`@ai-sdk/react`/`zod` to a `chat` chunk is a two-line change.

### 9.4 F-15 🟡 The hero shader never stops rendering

`ShaderHero.tsx` parks the loop on `document.hidden` (`:319-329`) but has **no `IntersectionObserver`**. The hero is `min-height: min(72vh, 640px)` at the top of `/`; the moment a visitor scrolls to the movie grid it is fully off-screen — and the rAF loop keeps drawing at 60 fps into a canvas up to **2560 × 1440** device pixels (the caps at `:265-266`), running two `fbm` domain-warp samples plus two more per band, i.e. ~8 value-noise evaluations per fragment. On a mid-range phone that is a permanent battery and thermal cost for pixels nobody can see, and it competes for the GPU with the marquee's own loop if the user navigates there in the same session.

This is a real inconsistency: the repo *invented* the right pattern for the marquee (`README.md`: *"The render loop only runs while the stage is on screen **and** the tab is visible; scrolling past it or pausing sets `frameloop="never"` instead of rendering frames nobody sees"*) and did not apply it to the next feature added.

Two smaller items in the same file:
- `gl.uniform2f(uRes, w, h)` is re-issued **every frame** (`:352`) although it only changes on resize — the comment even says "keep in sync if dpr changed mid-frame", which `resize()` already handles.
- `mousemove`/`touchmove` listeners are bound to `window`, not the container, so any pointer movement anywhere on the page does work.

*Fix:* add an `IntersectionObserver` on `containerRef` gating a `visible` flag checked in `tick()` (identical shape to `marquee-experience.tsx:44-58`), drop the per-frame `u_resolution` write, and scope the pointer listeners to the hero.

### 9.5 F-20 🔵 Remote font hotlinked to a versioned path

```css
/* src/index.css:22-27 */
@font-face {
  font-family: "Space Grotesk"; font-weight: 300 700; font-display: swap;
  src: url("https://fonts.gstatic.com/s/spacegrotesk/v16/V8mDoQDjQSkFtoMM3T6r8E7mPbF4Cw.woff2") format("woff2");
}
```
Good: `font-display: swap`, variable weight range, and `preconnect`/`dns-prefetch` to `fonts.gstatic.com` in `index.html`. Risky: that URL is Google's **internal CDN layout** with a hardcoded `v16` — it is not a published API, it can move, and there is no SRI or local fallback. It also means every visitor's browser makes a third-party request that reveals their IP. Self-hosting the `.woff2` in `public/fonts/` (which does not currently exist — F-21) removes the fragility, the privacy leak, and one `preconnect`.

### 9.6 What I could not measure

No Chrome/Chromium in this sandbox → **no Lighthouse or WAVE run**. `AUDIT.md`'s scores (Perf 71→94, A11y 84→98, live 92/100/100/58; 0 WAVE errors) are the project's own and are **not independently verified here**. Note also that they were measured at `048e608`/`d40d33d`, i.e. **before** `ShaderHero` (465 lines, an always-on WebGL loop, `min-height: 72vh`) shipped in `bb0ae3e`. An always-on full-bleed shader is exactly the kind of change that moves TBT and LCP; the recorded Performance score should be treated as superseded until re-measured.

What I *did* verify independently is the contrast arithmetic, using the WCAG relative-luminance formula on the actual palette:

| Pair | Ratio | Level |
|---|---:|:--:|
| `#f3f1ec` on `#101315` (body text) | 16.52:1 | AAA |
| `#e8a73e` on `#101315` (accent) | 8.91:1 | AAA |
| `#e8a73e` on `#1a1a1a` (button text) | 8.31:1 | AAA |
| `#9aa1a6` on `#101315` (muted) | **7.12:1** | AAA |
| `#c9c4b8` on `#06080a` (marquee overlay) | 11.53:1 | AAA |
| `#e7e4dd` on `#14181a` (config text) | 14.07:1 | AAA |
| `#9aa1a6` on `#1d2124` (muted on card) | 6.19:1 | AA |
| `#9aa1a6` on `#14181a` (muted on header) | 6.83:1 | AA |

This matches `AUDIT.md`'s claims exactly (*"#9aa1a6 on #101315 = 7.12:1"*, *"accent #e8a73e on #101315 at 8.9:1"*) — that part of the audit is reproducible and correct.

---

## 10. Accessibility

The a11y work is the strongest part of this repository, and it survives inspection. Verified in source:

- **Landmarks & navigation:** `Layout.tsx` has a skip link (`sr-only` → `focus:not-sr-only`), `<main id="main-content" tabIndex={-1}>`, `<nav aria-label="Primary">` with proper `<ul><li>` semantics, a `sticky` header, and a `<footer>`. `navLinkClass` gives active links a distinct background *and* text colour (not colour alone).
- **Focus visibility:** a global `:focus-visible` rule in `index.css:41-45` (2 px accent outline, 2 px offset) plus per-control `focus-visible:ring-2 … ring-offset-2` on every interactive element I checked.
- **Images:** both `<img>` elements in the codebase (`MovieCard.tsx:17`, `MovieDetail.tsx:64`) have descriptive `alt` (`"${title} poster"`), explicit `width={500} height={750}` (CLS prevention), `decoding="async"`, `loading="lazy"` on the card and `fetchPriority="high"` on the detail hero. Every decorative lucide icon carries `aria-hidden="true" focusable="false"`.
- **Streaming AI output** (`ChatTranscript.tsx:81-85`): `role="log"` + explicit `aria-live="polite"` + `aria-relevant="additions text"` + `aria-atomic="false"`, plus a `role="status"` typing indicator and an `sr-only` `role="status" aria-label="Sending status"` region.
- **Stop button** (`ChatComposer.tsx:135`): rendered only while busy, `aria-label="Stop generating"`, **not `disabled`** so Tab reaches it — and `e2e/assistant.spec.ts` walks pending → streaming → stop in a real browser.
- **Form semantics:** `sr-only` `<label htmlFor>` on the composer textarea, `aria-describedby` chaining, `aria-invalid` on validation failure, `role="alert"` on error text. `HealthCheck` has `aria-live="polite" aria-atomic="true"` on the status, `role="status"`/`role="alert"` on the panels, `aria-busy` + `disabled` on Retry, and a **focusable** `<pre tabIndex={0}>` with an `aria-label` for the JSON dump.
- **State:** watchlist toggles use `aria-pressed` plus a label that changes with state (`Add … to watchlist` / `Remove … from watchlist`) — no colour-only signalling.
- **The 3D feature has full keyboard parity:** every scene interaction also exists as a real control (labelled radios, checkboxes, sliders, buttons), the file drop has a `<label for>`-driven `<input type="file">` because *"drag-and-drop is not available to keyboard or screen-reader users"*, the stage is `role="group"` with an `sr-only` `aria-describedby`, and status/problem messages use `role="status"`/`role="alert"`.
- **Motion sensitivity is systemic, not token:** `prefers-reduced-motion` gates the hero to a static CSS gradient *of the same palette* (`ShaderHero.tsx:390-425`) and gates the marquee to a static SVG poster (`quality.ts:41-44`), with the reason surfaced in the UI.

**Remaining a11y items:** F-30 (`aria-label` on role-less `<div>`s in the hero); the hero's always-on animation is a vestibular consideration for users who *don't* request reduced motion but do scroll past it (F-15); and `MovieCard` keeps two links to the same destination (poster + title), which `AUDIT.md` §10 documents and justifies as an accepted WAVE *Alert* rather than an error — the justification is reasoned (merging them would break the accessible name and the tests), and I accept it, though a single link with `aria-label` on the card and a nested heading is the conventional resolution.

---

## 11. Documentation & evidence integrity

Three documents: `README.md` (148 lines), `AUDIT.md` (351), `SHADER.md` (191), plus `docs/TESTING.md` (7 kB) and a `docs/evidence/` tree with recorded CI JSON.

**The writing quality is high.** `docs/TESTING.md` explaining the role/label query policy with two recorded experiments is better documentation than most production teams write. `SHADER.md` and the inline GLSL commentary in `ShaderHero.tsx` teach the shader rather than just describing it. `README.md`'s marquee performance section states measured numbers and admits trade-offs.

**But there are real integrity problems:**

**F-08 🟠 `README.md` has an unclosed code fence.** Fences appear at lines **27** (` ```json `), **138** (` ```bash `), **145** (` ``` `). Line 27's block is never closed, so line 138's ` ```bash ` is *consumed as content*, and line 145's fence closes the block that started at 27. Result: everything from "Example tool input" through the whole "Premiere marquee (3D)" section, the performance tables, and "What I would add with more time" — roughly 110 lines, the most substantial content in the file — renders **inside a JSON code block** on GitHub. One missing ` ``` ` after the JSON example on line 34.

**F-18 🟡 `AUDIT.md` is stale, and internally inconsistent.**

| Claim in `AUDIT.md` | Reality at `bb0ae3e` |
|---|---|
| Header: branch `arena/01a095fb-flicks` @ `048e608` | Written two commits before HEAD; the audited tree no longer exists |
| §2: *"Tests: **218 / 218 green**, `typecheck` + `build:split` pass"* | 218/218 do pass, but `npm run test:coverage` and `npm run verify` **exit 1**, and CI on `main` is **failure** |
| §1.1 footnote: *"Full JSON saved as `docs/audit/lighthouse-before.json`"* | **That file does not exist** — and the same sentence says "(omitted here)". Self-contradictory, and a broken artifact reference |
| §7: *"index 506 kB/150 kB + css 36 kB/7.5 kB = 167 kB gzip"* | Measured: index 519.78 kB/155.27 kB, css 38.40 kB/7.87 kB → **≈181 kB gzip** |
| §6/§10a: *"require `CI green` … so a red suite blocks merging"* | `gh api …/rules/branches/main` → `[]`. No protection exists (F-02) |
| §10a: preview URLs `flicks.vercel.app`, `flicks-o56toi2oi-…`, `flicks-murex.vercel.app` | Three different hosts in one document; the repo `homepage` is `flicks-murex.vercel.app` while `index.html`'s `rel="canonical"` is `flicks.vercel.app` (F-22) |
| (no mention) | `ShaderHero` — the entire subject of the HEAD commit — is absent from the audit, including from its performance analysis |

None of this looks dishonest — it looks like a document that was accurate when written and was not re-run after the next commit. But it is presented as a verification record with a reproduce-it-yourself section, and its headline claim ("218/218 green") is now misleading next to a red CI badge. **Minimum fix:** re-run `npm run verify`, correct the bundle numbers, add a dated addendum covering `ShaderHero`, delete or restore the `lighthouse-before.json` reference, and stop asserting branch protection until it exists.

**F-21/F-22 🔵 Missing web-extras.** No `public/` directory at all → no `favicon.ico` (so browsers request `/favicon.ico` and get the SPA rewrite, returning HTML), no `robots.txt`, no `sitemap.xml`, no web manifest. No `og:*` or `twitter:*` meta tags, so links to the app unfurl bare. `index.html` declares `<meta name="robots" content="index, follow">` and a canonical to a domain that may not be the live one. `AUDIT.md` §10a attributes a live **SEO 58** to Vercel preview `X-Robots-Tag: noindex`, which is a fair explanation for a preview — but the canonical mismatch is a separate, real issue.

**Evidence hygiene.** `docs/` holds **5.5 MB of PNGs** in a 6.5 MB working tree (`.git` is 5.9 MB): `wave-after.png` 1.64 MB, `lighthouse-real.png` 1.20 MB, `lighthouse-before.png` 1.11 MB, `lighthouse-after.png` 0.99 MB, `ci-green.png` 362 kB, `ci-blocks-merge.png` 324 kB. These are deliberate audit artifacts, so keeping them is defensible — but at this size they should be optimised (all are screenshots that would survive `pngquant`/WebP at ~10 % of the size) or moved to CI artifacts / Git LFS. `docs/evidence/render-evidence.py` (15.8 kB) is a rendering script committed alongside the JSON it renders, and `docs/evidence/passing-run/` has no `context.json` while `failing-run/` does — a small asymmetry in an otherwise careful evidence tree.

---

## 12. Repository governance

| Item | State |
|---|---|
| License | **None.** `licenseInfo: null`, no `LICENSE` file — on a **public** repo. All rights reserved by default; nobody may legally copy, modify or redistribute it. If this is coursework, that may be intentional; if it is a portfolio piece, add one (MIT is the usual choice). |
| Description / topics | Empty / `[]`. Costs discoverability and looks unfinished on the repo card. |
| Branch protection | **None** (F-02). |
| Review workflow | 1 PR merged out of 12 commits. Commits `c0860c0`, `d40d33d`, `bb0ae3e` went straight to `main`; the last one landed red. |
| Issue/PR templates | None. Issues enabled, 0 open. |
| Dependabot / Renovate | None (F-27). |
| CODEOWNERS / CONTRIBUTING / SECURITY.md | None. |
| Commit hygiene | **Good.** Conventional-commit prefixes throughout (`feat:`, `test(e2e):`, `ci:`, `docs:`, `audit:`), descriptive subjects, one logical change each. The whole history is a single day (10:54–15:07 UTC), which is consistent with a focused build session rather than a long-lived project. |
| `.gitignore` | Sensible and complete: `node_modules`, `dist`, `.env*` with `!.env.example`, editor dirs, `*.log`, and all four test-artifact directories. No secrets, no build output, no `coverage/` tracked. Working tree is clean. |

---

## 13. Prioritized remediation plan

### P0 — today (restores a green default branch)

| # | Action | Files | Est. |
|---:|---|---|---|
| 1 | Make coverage pass. Add `ShaderHero.test.tsx` covering the reduced-motion and no-WebGL branches + cleanup, **and/or** add `src/components/ShaderHero.tsx` to the coverage `exclude` list with a GPU justification matching the existing `marquee-viewport.tsx` comment. Also delete the dead files (item 4) and add `App.test.tsx` + `NotFound` assertion. | `src/components/ShaderHero.test.tsx`, `vite.config.ts:88-94` | 1–2 h |
| 2 | Enable branch protection on `main`: require PR + status checks `CI green`, `Unit & component tests`, `End-to-end tests`; require branches up to date. Then correct `README.md`/`AUDIT.md` if you choose *not* to. | GitHub settings | 5 min |
| 3 | `npm audit fix` (no `--force`) → clears the `vite` 7.3.2 high advisory and `esbuild`. Re-run `verify`. | `package-lock.json` | 5 min |
| 4 | Delete dead code: `AppLayout.tsx`, `Header.tsx`, `Header.css`, `components/index.ts`, `data/mockMovies.ts`, `types/movie.ts`, `MovieCard.css`, `Home.css`, `MovieDetail.css`. | 9 files, **518 lines** | 15 min |
| 5 | Close the README code fence after the JSON example — insert ` ``` ` at line 33. | `README.md:27-33` | 1 min |
| 6 | Move the `Build` CI step **before** the coverage step so a threshold failure does not also suppress build verification. | `.github/workflows/ci.yml` | 5 min |

### P1 — this week

| # | Action | Ref |
|---:|---|---|
| 7 | Remove `<SendButtonDemo />` from the production Assistant page (keep the component + its test if it is a deliverable, but render it behind a route like `/labs/send-button`, not on `/assistant`). | F-10, `Assistant.tsx:132` |
| 8 | Add a linter and wire it into CI: `npm i -D oxlint`, add `"lint": "oxlint"`, add a step. Or delete `.oxlintrc.json` and stop implying one exists. Then remove the two inert `eslint-disable` comments. | F-04 |
| 9 | Rate-limit `/api/chat` (Vercel WAF rule or an in-route IP token bucket) and set a spend cap on the OpenRouter key. | F-06 |
| 10 | Replace the hand-rolled body validation with the zod schema that `chat-contract.ts` already models — and in doing so reject fabricated `tool`/`data` parts on client-supplied **assistant** messages. | F-12, F-29 |
| 11 | Gate the hero's rAF loop on an `IntersectionObserver`, drop the per-frame `u_resolution` write, and scope pointer listeners to the container. Copy the pattern from `marquee-experience.tsx:44-58`. | F-15 |
| 12 | Fix `WatchlistContext`'s memo (memoize inside `useWatchlist`, or split state/actions contexts). | F-14 |
| 13 | Point `/health` at a first-party endpoint and allow-list the env override; stop shipping `jsonplaceholder.typicode.com` as the default. | F-13 |
| 14 | Remove the 500 ms artificial delay from the production tool (or fake the timers in its tests). | F-17 |
| 15 | Add `LICENSE`, a repo description, topics, and `.github/dependabot.yml`. | F-09, F-27 |
| 16 | Re-run and update `AUDIT.md`: `verify` output, bundle numbers, a `ShaderHero` addendum, and delete the phantom `lighthouse-before.json` reference. | F-18 |

### P2 — when there's time

| # | Action | Ref |
|---:|---|---|
| 17 | Make `build` the split build (and `verify` use it), rename the single-file one to `build:single`. | F-07 |
| 18 | `React.lazy` the routes; add a `chat` manual chunk for `ai`/`@ai-sdk/react`/`zod`. | F-19 |
| 19 | Adopt the `@theme` tokens (or delete them) — replace the 337 hex literals with `bg-bg`/`text-muted`/`text-accent`/etc. | F-16 |
| 20 | Self-host Space Grotesk in a new `public/fonts/`; add `favicon`, `robots.txt`, `sitemap.xml`, OG/Twitter tags; reconcile `rel="canonical"` with the real production domain. | F-20, F-21, F-22 |
| 21 | Add `headers` to `vercel.json`: security headers plus `immutable` caching for `/assets/*`. | F-23 |
| 22 | Speed up the suite: `pool: 'vmThreads'` (or `isolate: false`) and a `getContext` stub in `setup.ts` to silence the canvas warnings. | §5.3 |
| 23 | Resolve `@ai-sdk/react@4` vs `ai@6`; plan the `ai` 6→7, `vite` 7→8, `@vercel/node` → 3.0.1 and `typescript` → 7 upgrades deliberately, one at a time. | F-25, §8.2 |
| 24 | Optimise or externalise the 5.5 MB of `docs/` PNGs; rename `package.json` to `flicks`. | §11, F-26 |

---

## 14. Verdict

This is a capable, well-instrumented small codebase with real engineering judgement behind it — the network-blocking test setup, the role/label query policy with recorded evidence, the quality-tier gating for WebGL, the verified absence of three.js in the initial chunk, and the a11y work (independently reproducible contrast arithmetic, keyboard parity for a 3D scene, `prefers-reduced-motion` handled systemically) are all above the bar for a project of this size.

Its problem is not quality, it is **follow-through at the seams**. The last commit added a 465-line GPU component with no test and no exclusion, which broke a coverage ratchet that was already set 1.4 points too tight — and because no branch protection exists, it landed on `main` red, where it sits now. The documentation then asserts guarantees ("blocks merging", "218/218 green", bundle sizes, a saved JSON artifact) that the repository does not currently honour. Layered underneath: no linter, four high advisories, an unthrottled LLM proxy, 518 lines of dead code plus a randomly-failing demo on a production page, and a README whose most important section is invisible because of one missing fence.

Almost all of it is cheap to fix. **P0 items 1–6 are roughly half a day and would take the repository from "red `main`, unenforced gates, broken README" to "green, gated, and honest about itself."** The performance and accessibility story is already good; what needs work is the plumbing that proves it and protects it.

---

*Audit performed on `arena/01a09647-flicks` at `bb0ae3e` (tree identical to `main`). All commands, scores, sizes, coverage figures, contrast ratios and GitHub API responses in this report were produced in that checkout on 2026-09-12; the Playwright suite and Lighthouse could not be executed locally (no browser binary in the sandbox) and are cited from CI run `34702536252` and the project's own `AUDIT.md` respectively, as flagged in §2 and §9.6.*
