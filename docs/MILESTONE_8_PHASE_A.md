# Milestone 8 — Phase A: deterministic comparison (increment 1)

Status: **increment 1 local build/Step 3 visual verification passed; increment 2 pending installed-SDK validation**. Do not mark Phase A complete.

## Audit
- `/strategies` previously uses product-level `STRATEGIES` plus an illustrative `CurvePreview`.
- `/dbc-config` calls SDK `buildCurve()` with editable supply, fixed trading fee, migration quote threshold and migration-supply percentage.
- `/dbc-simulate` and `/dbc-deploy` independently reconstruct the same fixed-fee `buildCurve()` inputs. Selection from Step 3 is stored in sessionStorage but NOT consumed by Step 4.
- First increment deliberately preserves those on-chain flows; integrating selection requires shared config-building logic and full simulation/deployment regression testing.

## Comparison assumptions
All three use **1,000,000,000** SPL tokens (6 decimals), 9-decimal SOL quote, immutable token authority, zero leftover, timestamp activation, fixed trading fee (starting = ending, zero periods), dynamic fee disabled, DAMM v2 migration, zero locked vesting, and 100% permanently locked partner allocation in the builder template. Differences:

| Candidate | Fixed trading fee | SOL migration threshold | Supply on migration |
|---|---:|---:|---:|
| Stable Discovery | 100 bps | 150 SOL | 30% |
| High Growth | 50 bps | 60 SOL | 15% |
| Anti-Sniper | 500 bps | 100 SOL | 20% |

All are **candidate parameters**, not claims that the strategy stabilizes price, produces growth, blocks snipers, or guarantees graduation. Anti-Sniper presently has a higher fixed fee; time-decaying fees and bot prevention are not implemented. Comparison calls the SDK's `buildCurve()` and checks structural output and threshold units. It is NOT a chain transaction simulation, deployment test, SDK swap quote, or controlled quote-impact experiment. The Step 3 chart remains illustrative and is explicitly labeled as such. Real comparative SDK-backed pricing requires validated candidate pool states and comparable quote assumptions; this remains open.

## SDK source check
Examined uploaded `dynamic-bonding-curve-sdk-main` sources `packages/dynamic-bonding-curve/src/helpers/buildCurve.ts` and `src/types.ts` where `buildCurve(params: BuildCurveParams): ConfigParameters` and fee scheduler properties are defined. Project lockfile declares `@meteora-ag/dynamic-bonding-curve-sdk` dependency; verify `npm ls @meteora-ag/dynamic-bonding-curve-sdk` and locally installed definitions before committing. The uploaded SDK source may not exactly match registry-published 1.5.13.

## Tests and open work
- Static source audit: complete.
- Package installation / production build in patch environment: **BLOCKED** (offline npm cache lacks `zod-validation-error@4.0.2`).
- SDK invocation in running Next.js browser: **NOT VERIFIED**.
- Browser UI screenshot and Step 3 → Step 4 navigation: **NOT VERIFIED**.
- RPC simulation, deploy regression, controlled pricing comparisons, and strategy handoff: **NOT VERIFIED / deferred**.

## Local acceptance
1. Confirm latest committed `main` and no conflicting local edits before patching.
2. `npm ci`, `npm ls @meteora-ag/dynamic-bonding-curve-sdk`, `npm run build`.
3. `npm run dev`; visit `/strategies`. Verify all three rows show `Built` and distinct parameters. Capture screenshot and browser console output.
4. Navigate to `/dbc-config`, then `/dbc-simulate`; confirm original editable fields and safe simulation flow remain intact. No transaction needs to be sent to test this increment.
5. Do not commit or push until build, SDK output, and UI regression have been confirmed.

## Increment 2 — pre-launch exact-input quotes (2026-10-09)
Adds a separate read-only quote comparison component in Step 3. It builds each candidate with the existing helper then calls `DynamicBondingCurveClient.pool.getQuoteFromInputAmount` (referenced in uploaded SDK source `src/services/pool.ts` and `tests/swapQuote.test.ts`) for four independent SOL buy sizes: 0.001, 0.01, 0.05, 0.1 SOL. It reports raw SDK token outputs converted from 6-decimal units and effective SOL-per-token from quoted input/output. Fixed 100 bps slippage tolerance; no referral; current point 0; no discounted first swap. Quotes are at the **initial simulated virtual pool** for each configuration. This is not historical data, not sequential trades, not an on-chain pool read or a buy-price guarantee. Display failures per candidate and input instead of substituting mock values.

**Must verify in the installed npm package**: the uploaded SDK source may be ahead of locked version 1.5.13; use local `npm run build` to confirm `getQuoteFromInputAmount` is exposed and has these types. Validate its runtime outputs on `/strategies`, including sensible output amounts and no exceptions. This patch was authored without locally installed npm dependencies, so no compiled/runtime claim is made. Step 4 and downstream transaction handling remain unchanged and Step 3 profile selections still do not flow into them.

## Increment 3 — validated strategy preset handoff (2026-10-09; testing pending)
- Step 3 uses `?strategy=<id>` to navigate to Step 4; no arbitrary fee/supply/threshold values are taken from the URL.
- Step 4 looks up the ID in the immutable local candidate table and verifies SDK construction before prefilling existing editable fields.
- Existing direct Step 4 URLs keep their previous defaults. Editing a prefilled field shows a custom-edits message; Step 5 receives those currently displayed values through its existing four-parameter URL.
- Existing Step 5/6 SDK builders still reconstruct their own configuration. A shared builder, configuration parity assertions, on-chain simulation, and signed-deployment regression tests remain prerequisites to completing Phase A/C.
- Required local tests: `npm run build`; select each candidate and click Continue; confirm Step 4 shows (150,100,30), (60,50,15), (100,500,20) for threshold/fee/migration; edit one field, confirm custom warning and transferred Step 5 query; visit `/dbc-config` directly to ensure (100,100,20) defaults; run read-only simulation with wallet if appropriate, **do not deploy**.
- User screenshots for increment 2 show all twelve SDK quote outputs and interactive profile changes, but installed version runtime identity and execution correctness remain subject to additional tests.


## Increment 4 — shared deterministic configuration builder (2026-10-09)

- `lib/launch/sdkStrategyCandidates.ts` now exports `buildCurveConfig()` and `validateCurveInputs()`; Steps 3, 4, 5, and 6 use one SDK `buildCurve()` implementation.
- Fixed assumptions remain SPL token, 6 base decimals, 9 quote decimals, immutable mint authority, constant trading fee, 100% locked partner liquidity, timestamp activation, zero vesting and DAMM v2 migration.
- This change does not alter wallet signing, transaction submission, or read-only pool inspection. Step 5's ephemeral config keypair and Step 6's separately approved signing procedure are retained.
- Local production build and RPC simulations for all three candidates **not performed in the patch environment** (npm offline cache missing dependency).
- Previous user evidence: High Growth 60 SOL / 50 bps / 15% Step 5 RPC simulation succeeded with 36,140 compute units **before this refactor**. Repeat after applying Increment 4.
- Check unchanged Step 3 quote results and Step 4 diagnostics and confirm Step 5 simulation and Step 6 read-only preflight. Do not submit a transaction for this verification.
