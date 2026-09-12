# Flicks — Capstone Submission

## Project

**Flicks — AI-Enhanced Movie Discovery Application**

Flicks is a production-ready movie discovery frontend that allows users to browse movies, view details, manage a persistent watchlist, and use an AI assistant to search the application's movie catalogue.

## Project Brief

Flicks solves a simple movie-discovery problem: users can browse a curated catalogue and use natural-language requests to find relevant movies without leaving the application. The AI assistant is integrated into the discovery workflow rather than existing as a standalone chatbot.

## Live Application

**Production:** https://flicks-murex.vercel.app/

## Repository

**GitHub:** https://github.com/Haani-110/Flicks

## Key Capabilities

- Movie discovery and search
- Movie detail pages
- Persistent watchlist
- AI-powered movie discovery
- AI tool calling against the movie catalogue
- Streaming AI responses
- Loading, empty, success, and error states
- Responsive frontend
- Accessible navigation and interactions
- Keyboard support
- Reduced-motion support
- Performance-aware 3D marquee
- Health-check page
- Server-side API protection
- Rate limiting and request validation

## AI Integration

Flicks uses an LLM through OpenRouter and the AI SDK. The assistant can call a `search_movies` tool that searches the same movie catalogue used by the frontend.

The AI capability exists to solve a real application problem: helping users discover relevant movies using natural-language requests.

The AI API key remains server-side. Requests are validated and protected with payload limits, rate limiting, signed short-lived chat tokens, and timeout handling.

## Testing Evidence

The project includes:

- Vitest unit and component tests
- React Testing Library
- API tests
- Playwright end-to-end tests
- CI verification
- Coverage thresholds

Current documented coverage:

- Statements: 93.46%
- Branches: 87.93%
- Functions: 95.90%
- Lines: 95.41%

The project currently documents 352 passing tests across 46 test files.

## Accessibility & Performance

Accessibility work includes:

- Navigation landmarks
- Skip link
- Keyboard-accessible interactions
- Focus-visible states
- Escape handling for the navigation disclosure
- Focus restoration
- Live regions
- Reduced-motion support
- Accessible text alternatives
- Contrast improvements

The repository contains Lighthouse and WAVE audit evidence in `docs/audit/`, including before/after results.

## Production & Deployment

Flicks is deployed on Vercel from the `main` branch.

Production readiness includes:

- Production build verification
- TypeScript checking
- Linting
- Automated tests
- CI
- Security headers
- API validation
- Rate limiting
- Timeout handling
- Health-check endpoint
- Environment variable documentation
- Rollback procedure

See `docs/DEPLOYMENT-CHECKLIST.md` for the completed deployment checklist and rollback plan.

## Known Limitations

- The movie catalogue is a curated local dataset rather than a live external movie database.
- AI functionality depends on the configured LLM provider being available.
- Watchlist data is stored locally per device rather than being synchronized across accounts.
- The 3D marquee intentionally falls back to simpler rendering on devices where advanced rendering is not appropriate.

## Future Improvements

Potential future improvements include:

- User accounts and synchronized watchlists
- A larger or live movie catalogue
- More advanced recommendation capabilities
- Additional automated visual regression testing
- Further performance optimization for lower-end devices

## Reflection

See `docs/CAPSTONE-REFLECTION.md` for the full capstone reflection.

## Supporting Documentation

- `README.md` — Setup, architecture, AI integration, testing, security, performance, and deployment
- `docs/DEPLOYMENT-CHECKLIST.md` — Production checklist and rollback plan
- `docs/CAPSTONE-PROJECT-BRIEF.md` — Project brief
- `docs/CAPSTONE-REFLECTION.md` — Capstone reflection
- `docs/TESTING.md` — Testing documentation
- `docs/REGRESSION-BASELINE.md` — Regression baseline
- `docs/audit/` — Lighthouse and WAVE audit evidence

## Final Status

**Status:** Production-ready

**Production URL:** https://flicks-murex.vercel.app/

**Repository:** https://github.com/Haani-110/Flicks
