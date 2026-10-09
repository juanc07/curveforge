# Hackathon demo polish — UI-only increment

## Purpose
Make the actual SDK evidence and AI recommendation the focus of Step 3 without modifying transaction code or claiming unsupported market outcomes.

## Changed files
- `app/launch/page.tsx`: Step 2 → Step 3 link and sidebar copy.
- `app/strategies/page.tsx`: correct Step 3 header and Step 4 navigation, accurate handoff disclaimers, optional conceptual chart disclosure.
- `lib/launch/profiles.ts`: copy reflects actual 50/100/500 bps fixed fees, 60/100/150 SOL thresholds and 15/20/30% migration allocations.
- `components/strategies/CurvePreview.tsx`: conspicuous disclaimer that illustrative fee curves are not real settings.
- `components/strategies/SdkQuoteComparison.tsx`: quote action vs preset selection accurately distinguished.
- `docs/CHANGELOG.md`, `docs/PROJECT_STATUS.md`: patch record.

## Known limitations
- Conceptual visual still contains arbitrary equations and fictitious fee numbers. It is hidden behind a collapsed native details disclosure by default, not removed.
- The Anti-Sniper preset is a static 500 bps fee deterrent, NOT anti-bot prevention or declining fees.
- Initial SDK hypothetical quotes are not guaranteed live market prices or executable orders.
- No changes to AI provider, rate-limit design, live pool reads, or wallet submission.

## Local acceptance
1. `npm run build` succeeds on Next.js 16.4.0.
2. Step 2 Continue button reads Step 3 and opens `/strategies`.
3. `/strategies` header reads Step 3; bottom Continue button reads Step 4 and sends `?strategy=`.
4. SDK candidate comparison and AI guidance still render; three candidates selectable.
5. Optional conceptual chart is collapsed initially, can be expanded and collapsed again.
6. Step 4 strategy preset still prefills correct values; Step 5/Step 6 routes still reachable.
7. No user signs or submits a transaction for these checks.

## Evidence status
This patch has archive/content checks only; user must confirm production build and browser smoke tests before commit.

## Increment 2 — Launch Decision Report (awaiting local verification)
- `components/strategies/SdkQuoteComparison.tsx`: adds a read-only decision report after the existing SDK calculation, comparing three candidates under a user-selectable identical input (0.001, 0.01, 0.05, 0.1 SOL).
- Cards show SDK token output, effective SOL/token, fixed trading fee, migration threshold and migration supply. Bars are normalized within the selected quote input, not market forecasts.
- Quote errors remain visible; this increment does not change SDK quote calls, API credentials, transaction inputs or wallet approval.
- Acceptance: build; click Calculate SDK quotes; report appears with three candidates; changing input changes results; missing quotes show errors; Step 4 handoff and Step 5 preflight unchanged.
- This patch does not claim profit, economic security, legal RWA ownership or bot prevention.
