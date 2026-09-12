# Flicks — Deployment Checklist

## Production Deployment

**Project:** Flicks  
**Production URL:** https://flicks-murex.vercel.app/  
**Repository:** https://github.com/Haani-110/Flicks  
**Deployment Platform:** Vercel  
**Branch:** main

---

## Pre-Deployment

- [x] Production build completes successfully
- [x] TypeScript typecheck passes
- [x] Lint passes with no warnings/errors
- [x] Unit/component tests pass
- [x] Test coverage meets project thresholds
- [x] End-to-end tests are configured
- [x] Environment variables are documented
- [x] Secrets are not committed to the repository
- [x] `.env.example` is included
- [x] Production API routes are protected against invalid requests
- [x] Error and loading states are implemented
- [x] Accessibility considerations have been tested
- [x] Lighthouse audit completed
- [x] WAVE accessibility audit completed

## Production Configuration

- [x] Vercel deployment configured
- [x] Production build command configured
- [x] SPA routing configured
- [x] Server-side AI API key kept out of client-side code
- [x] Security headers configured
- [x] API routes configured with appropriate caching behaviour
- [x] Health-check endpoint available
- [x] Production URL verified

## Post-Deployment Verification

- [x] Home/Browse page loads
- [x] Movie detail pages work
- [x] Watchlist can be added to and removed from
- [x] Watchlist persists using localStorage
- [x] AI Assistant loads correctly
- [x] AI responses can search the movie catalogue
- [x] API errors are handled without breaking the application
- [x] Health-check page works
- [x] Marquee page loads with appropriate fallbacks
- [x] Responsive layouts work on mobile and desktop
- [x] Keyboard navigation remains functional

---

## Failure Handling

Flicks is designed to fail safely rather than leaving users with a broken interface.

The application provides loading, empty, error, and success states for important user flows. The AI API validates requests, limits payload size, applies rate limiting, uses timeouts, and handles upstream failures. The movie catalogue remains usable even when the AI capability is unavailable.

If the AI service is unavailable, users can still browse movies, open movie details, and manage their watchlist.

---

## Rollback Plan

If a production deployment introduces a regression:

1. Identify the last known-good commit on `main`.
2. Verify that the commit passed the project's CI checks.
3. Revert the problematic change or redeploy the last known-good commit through Vercel.
4. Confirm the production URL and critical user flows after redeployment.
5. Run the relevant test suite before making the next production change.
6. Document the incident and fix in the repository if necessary.

The primary rollback strategy is to redeploy the previous known-good Git commit through Vercel rather than attempting an emergency production fix directly.

---

## Final Sign-Off

- [x] Production deployment verified
- [x] Application functional
- [x] Tests passing
- [x] Accessibility reviewed
- [x] Performance reviewed
- [x] Error handling reviewed
- [x] Rollback procedure documented
- [x] README updated

**Status:** Production-ready
