# Quote Pipeline Dashboard

## What this is
Strive quote and RFQ ageing page for signed-in staff at https://strive-services-group.github.io/Quote-Pipeline-Dashboard/.

## How it is built
- Static `index.html` with embedded JavaScript and CSS; `tests/` holds the proof and release gate. GitHub Pages publishes the site.
- The page signs users in before live reads, then uses the procurement proxy for compact dashboard data and Process History for the CRM RFQ clock.

## Commands
- Install: none; tests use Node built-ins.
- Local: `python -m http.server 8000` from the repository root; live data still needs authorised sign-in.
- Test: `node tests/quote-dashboard-proof.js` and `node tests/release-gates.js` (the latter reads live dataset health).
- Build: no build step; GitHub Pages publishes the root.

## Data sources and definitions
- Compact procurement data comes from the PR/PO proxy. The RFQ clock uses CRM Sent for RFQ to RFQ Completed history; F&O steps are shown inside it.
- Definitions and prior reconciliations are in `NOTES.md`; current calculation and failure wording are in `index.html`.

## Release
- Branch from `main`; PR to `main`. `.github/workflows/deploy.yml` runs `tests/release-gates.js` before GitHub Pages deployment on main.
- Merging to main deploys live: yes, through `.github/workflows/deploy.yml` after the release gate passes.
- Confirm the workflow and served `index.html` version; signed-in source checks must cover figures, stale state and the RFQ circuit.

## Conventions
- Keep light/dark themes, compact phone layout, AED and Dubai date presentation. Unreadable history must say unavailable, not zero.

## Known traps
- The v62 RFQ band was rolled back and restored only after proxy access was fixed; never treat a proxy read failure as no RFQs.
- The feed contains current steps only. Missing or date-only timestamps are not zero-duration clocks; see `NOTES.md`.

## Standing rules
Follow `$ssg-task-run`; pages with figures also `$ssg-dashboard-check`.
