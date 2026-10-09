# Milestone 8 — Phase B: AI Liquidity Architect

**Increment 1 (2026-10-09):** Pending local build/API/browser verification. Designed against Phase A commit `993df69` plus supplied Increment 4 patch. Does not alter SDK configuration or transaction writes.

## Architecture

- `components/strategies/AiLiquidityArchitect.tsx`: optional Step 3 launch objectives and recommendation panel. User must explicitly select a recommendation. Manual strategies remain available.
- `app/api/ai/strategy/route.ts`: server-side Next.js POST; validates text length, strips arbitrary request fields, checks same-origin when supplied, applies per-process rate limit (8 requests per IP/hour), times out provider requests after 18 seconds, bounds generation to 600 output tokens, asks for JSON-schema structured output, validates result again and returns a safe fixed candidate identifier.
- Uses server `OPENAI_API_KEY` and optional `OPENAI_STRATEGY_MODEL` (default `gpt-4o-mini`); no `NEXT_PUBLIC_` prefix, no extra dependency. Responses API `store:false`.
- Static candidate constraints are hard-coded into the AI request for this first increment; future work should derive them from a shared server-safe preset metadata module to eliminate drift. The SDK comparisons and numerical quotes displayed by Phase A remain independent and authoritative.

## Security / limitations

- Model only recommends among known candidate identifiers; it cannot modify fee, threshold, supply, transaction or signature. User consent is required before applying a recommendation, Step 4 remains reviewable and wallet approvals unchanged.
- Model advice can be incorrect; it never supplies SDK quote numbers. Higher fixed fees are *not* anti-bot protection. No investment or graduation guarantees.
- Local per-process rate limiting is a development/cost guard, not shared enforcement across serverless instances. **Before public deployment**, add persistent distributed rate limits/authentication, abuse controls and budget monitoring.
- Requests send the user's brief to OpenAI. Do not enter wallet secrets, private keys or personal credentials.
- Same-origin protection assumes proxy origin is correctly configured. Multi-proxy public deployment requires trusted origin configuration.
- OpenAI key missing: returns HTTP 503 and the deterministic manual flow remains available.

## Local acceptance test

1. Confirm `npm run build` and `npm run dev` pass after ZIP extraction.
2. Visit `/strategies` with no key: show clear fallback; three manual candidates and SDK comparison work.
3. Add `OPENAI_API_KEY=...` **only in ignored `.env.local`**, restart dev server; submit 15–1200 character natural language brief.
4. Confirm AI returns one of three strategies, explains tradeoffs and risks, and clicking `Select ...` updates the selected strategy. Verify next Step 4 parameters and Step 5 simulation remain unchanged.
5. Test blank/oversized input, network/offline failures, rapid repeated requests, and the `429` rate-limit guard. Inspect Network panel to confirm API key is never returned to browser.
6. Check Step 8–10 pool query-parameter navigation regression before marking milestone complete. No on-chain deploy needed.

No live OpenAI request or API cost has been incurred by this patch preparation; runtime and build results pending.

## Increment 2 — Objective capability guardrails and stricter API envelope (2026-10-09)

- `lib/launch/aiStrategyPolicy.ts` defines single-source published preset facts and deterministic checks for anti-bot/MEV, RWA legal rights, promised returns, advanced fees/vesting, and stability requests. These warnings are shown *before* requesting AI advice, and are recomputed on the server. They indicate unsupported guarantees; simple keyword checks cannot fully interpret all user intents.
- `app/api/ai/strategy/route.ts` imports the preset facts rather than copying them, requires JSON content type and matching browser Origin, caps raw request bytes and input characters, sets no-store, uses bounded provider output and a timeout, and returns deterministic warnings separately from model text. It intentionally never signs or submits transactions.
- Per-instance shared-anonymous quota is 8 requests/hour and max 4 concurrent provider requests. This is deliberately conservative for a development demo and is **not distributed, authenticated, persistent, or suitable for public internet deployment**. A real public launch needs managed shared rate limiting, authenticated identity, edge protection, budget alerts and observability. Client-supplied forwarding headers are deliberately not trusted.
- Browser warning panel does not depend on a successful AI call; the normal three manual strategy options remain available on API failure.
- Cross-origin and missing-origin requests are rejected, including simple curl POSTs without an explicit matching Origin header. Reverse-proxy origin configuration needs testing in production.
- AI recommendations remain advisory and the label “Anti-Sniper” is a preset name, not a technical bot-prevention claim. RWA token creation does not confer legal rights.
- **Validation needed:** local `npm run build`, test an RWA/sniper brief, benign brief, malformed JSON, oversized request, provider unavailability and 429 behavior; verify Step 3 → Step 5 simulation, and then review before commit.

### Design limitation

The `PUBLIC_CANDIDATES` module is the single SDK-free source of preset metadata. `SDK_CANDIDATES` maps directly from it; no SDK imports are needed in the API route. Changes to these candidate parameters still require fresh SDK quote and devnet simulation tests.
