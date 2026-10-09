# CurveForge changelog

## Milestone 8 — Phase A, increment 1 (pending verification; 2026-10-09)
- Added SDK `buildCurve()` candidate definitions for Stable Discovery, High Growth and Anti-Sniper.
- Added read-only strategy parameter comparison to existing Step 3, without altering Steps 4–10.
- Clearly labeled illustrative chart and unfinished SDK quote/pricing analysis.
- Added `docs/MILESTONE_8_PHASE_A.md`, status and testing limitations.
- **Not yet verified in local production build or browser**; no commit/push performed by this patch.

Earlier milestone history remains in existing historical project documentation; this changelog begins at Milestone 8 to avoid reconstructing unsupported commit history.

## Milestone 8 — Phase A, increment 2 (pending local verification; 2026-10-09)
- Added a separate client-side SDK read-only pre-launch quote comparison for four independent SOL buy sizes across all three candidate configurations.
- Quoted outputs, effective input/output price and individual quote errors are displayed; no wallet or chain writes.
- Existing Step 4–10 transaction behavior is untouched; no claim of strategy handoff.
- Evidence for increment 1: user reported a successful `npm run build` (Next.js 16.4.0, TypeScript pass), `npm ls` resolved SDK 1.5.13, and screenshots showed all three selectable candidates. Routes `/strategies`, `/dbc-config`, `/dbc-simulate`, `/dbc-deploy` returned HTTP 200. This does NOT verify simulation or signing.
- Increment 2 build, installed-SDK compatibility and runtime quotes remain pending local verification.

## Milestone 8 — Phase A, increment 3 (unverified patch; 2026-10-09)
- Added a validated, identifier-only Step 3 → Step 4 strategy preset handoff through `?strategy=`.
- Step 4 looks up matching local SDK candidate, verifies the builder result, then prefills its four existing editable inputs.
- Shows a selected-preset/custom-edits notice. Existing direct `/dbc-config` links retain defaults.
- Steps 5–10, simulation, wallet signature, and deployment logic are unchanged.
- User screenshots confirm increment 2 populated twelve numerical SDK quotes across all three profiles, but no transaction tests are implied.
- **Patch not yet locally compiled, browser-tested, or committed**.


### Milestone 8 Phase A — Increment 4 (unverified patch)
- Consolidated duplicate Meteora `buildCurve()` input assembly into `buildCurveConfig()` used by strategy preview, SDK config display, simulation, and deployment preflight.
- Centralized input boundary checks. No transaction submission/signature logic changed.
- Pending: local `npm run build`, SDK comparisons, RPC simulation regression and browser checks before commit.
