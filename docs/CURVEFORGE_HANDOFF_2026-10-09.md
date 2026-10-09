# CurveForge — Development Handoff

**As of:** 2026-10-09 (Asia/Manila)  
**Project:** Meteora Dynamic Bonding Curve hackathon  
**Repository:** https://github.com/juanc07/curveforge  
**Local Windows path:** `C:\2026\MeteoraHackaton\curveforge`  
**Terminal:** Git Bash (`/c/2026/MeteoraHackaton/curveforge`)  
**Branch:** `main`  
**Last explicitly verified pushed commit in conversation:** `7605fa8` (Milestone 6). Later Milestone 7/navigation commits have **not** been verified in logs; determine latest HEAD locally.

## 1. Executive summary
CurveForge is an AI-native Solana liquidity launch architect using Meteora Dynamic Bonding Curve (DBC). Users describe a proposed token/asset, inspect launch profiles, build and simulate real DBC configuration transactions, sign via Phantom, deploy a devnet config and token/pool, and inspect SDK-backed on-chain pool state, swap quotes, and quote-impact curves.

**Working demonstrated proof:** A real DBC config and SPL token/virtual pool were deployed and verified on devnet. The Step 8 pool dashboard returned real reserve and graduation data; Step 9 produced a valid 0.01 SOL buy quotation; Step 10 displayed 14 successful SDK-backed independent buy quotes and an effective-price chart. The 1,000 CFDEMO sell quote reported **Insufficient Liquidity**, consistent with zero quote-side reserves; the liquid-pool sell path and execution have NOT been validated.

**Next high-priority work:** make Step 3 an **AI Liquidity Architect**, but first create SDK-valid deterministic strategy candidates and quote comparisons. Use OpenAI only for structured explanation and reasoning through a server-side Next.js API route; keep all blockchain numbers SDK-derived. No OpenAI API integration has been implemented or tested yet.

## 2. Tech stack & constraints
- Next.js 16.4.0 App Router, React 19, TypeScript, Tailwind, Turbopack; **root `app/`**, not `src/app/`.
- `@meteora-ag/dynamic-bonding-curve-sdk@1.5.13`, `@solana/web3.js@1.99.0`, Anchor 0.31.1, Solana Wallet Adapter, Phantom.
- Devnet RPC configured through `.env.local`; example names `NEXT_PUBLIC_SOLANA_NETWORK=devnet`, `NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com`.
- Never commit `.env.local`, OpenAI keys, wallet secrets, keypairs, seed phrases, or node_modules.
- Wallet signs transactions; simulate/review before chain writes; never bypass on-chain validation.
- No separate service or database is required for the next milestone.
- **User workflow:** downloadable ZIP patches, then `unzip -o /c/Users/USER/Downloads/<patch>.zip -d .`, `npm run build && npm run dev`, functional tests, `git add/commit/push`. Do not make users manually author many files. Don't claim a ZIP exists unless verified.
- **UI preference:** Keep **bottom** Previous / Continue navigation; remove duplicate top journey bar. Step 10 is current end (no Step 11 yet). Preserve `?pool=` when moving between steps 8–10. Earlier Continue actions can be gated on success.

## 3. Implemented journey / route map
| Step | Route | Purpose | Observed status |
|---|---|---|---|
| 1 | `/` | Landing and launch CTA | Implemented |
| 2 | `/launch` | Asset/token draft, program readiness | Implemented |
| 3 | `/strategies` | Stable Discovery, High Growth, Anti-Sniper illustrative curves | Implemented, **AI/SDK comparison not yet wired** |
| 4 | `/dbc-config` | Real SDK curve/config construction | Implemented |
| 5 | `/dbc-simulate` | Build and simulate unsigned DBC config transaction | Implemented |
| 6 | `/dbc-deploy` | Phantom signing, devnet deploy, verification | Successful test |
| 7 | `/dbc-pool` | Token metadata/mint + DBC pool create/sign/verify | Successful test |
| 8 | `/dbc-dashboard` | Read on-chain pool, reserves, migration progress | Successful screenshot |
| 9 | `/dbc-quotes` | SDK `swapQuote` buy/sell quotes, read-only | Buy works; zero-reserve sell insufficient liquidity |
| 10 | `/dbc-curve` | Fourteen SDK quote samples, effective price impact SVG + table | Successful screenshot |

**Step 10 analytics:** independent quotes at increasing input amounts using the *same* pool snapshot. Not simulated sequential trades, not historical chart, not marginal spot price, and not a price prediction. Model used 6-decimal token and SOL-quoted timestamp-activated demonstration assumptions; generalizing needs validation.

## 4. Observed chain state (devnet)
- Original confirmed CFDEMO pool: `FcNZGEpkaWSecu6b85GsAinpyCKFo3iCQknVcBjyRxkW`.
- Devnet transaction (pool initialization): `4tFFPUzxeo25XSJ5rbSRaw7tNNqzkob2ufRLEXjDPFCdKkjAZLzhfnayV3CV6FrdrCNiL9fXDBJ5zJBqLUpeRnTX`.
- Explorer transaction: https://explorer.solana.com/tx/4tFFPUzxeo25XSJ5rbSRaw7tNNqzkob2ufRLEXjDPFCdKkjAZLzhfnayV3CV6FrdrCNiL9fXDBJ5zJBqLUpeRnTX?cluster=devnet
- Token shown in explorer: **CurveForge Demo Token (CFDEMO)**, supply 1,000,000,000, 6 decimals; token metadata served as public `token-metadata.json` in repo.
- Step 8 displayed base reserve 1,000,000,000 tokens, quote reserve 0 SOL, 100 SOL migration threshold, progress 0%.
- Successful Step 9 buy quote screenshot: 0.01 SOL → 316,705.930097 tokens; minimum at 100 bps slippage 313,538.870796; reported fees need unit validation.
- Step 10 displayed independent sample curve from 0.001 to 0.1 SOL with 14 quote samples; average effective SOL/token increases as trade size increases.
- **Another pool** `DfsTH4dStFzHRtmQn1gABgpjrjam8psM4h8uapLPBnkf` appeared in later Step 10 screenshots. Verify intentional use before referencing it in future development. Data may relate to another test pool.

## 5. Important bugs resolved / lessons
1. Next/TypeScript target below ES2020: avoid BigInt literal `10n`; use `BigInt(10)` where applicable.
2. `SwapQuoteResult` is an Anchor IDL-derived type; incorrect field assumptions initially caused TS2339. Runtime shape must be checked with SDK 1.5.13 and underlying IDL. Avoid pretending a cast proves runtime field availability.
3. `swapQuote` requires the **whole `VirtualPool`**, not `virtualPool.poolState`. Passing nested state triggered `Cannot read properties of undefined (reading 'quoteReserve')`.
4. Sell into an initial pool with 0 quote reserves returns `Insufficient Liquidity`; display contextual UX, do not force on-chain trades.
5. Repeated dashboard GET requests previously observed; read-only stability patch fixed visible flood. If it returns, inspect Network Initiator/browser extensions.
6. `bigint: Failed to load bindings, pure JS will be used` and Phantom Standard Wallet duplicate-registration warnings have been nonfatal; address as cleanup, not blockers.
7. Do **not paste example terminal output** into Git Bash; `main -> main` accidentally created an untracked file `main` previously (removed).
8. Avoid Git Bash `node <<'NODE'` heredoc; it returned `stdin is not a tty` in the user's environment. Prefer tested ZIP patches.

## 6. Navigation change and current Git uncertainty
A ZIP titled `curveforge-step1-10-journey-navigation.zip` added `app/template.tsx` and `app/components/JourneyNavigation.tsx` (a global top bar). User explicitly prefers original **bottom** page navigation. A follow-up ZIP `curveforge-bottom-navigation-cleanup.zip` overwrites `app/template.tsx` with a pass-through template, disabling the duplicate top bar while preserving page-level bottom navigation. Whether the user has applied/committed that last patch is **not yet confirmed**. The optional `JourneyNavigation.tsx` file may remain unused; inspect before deletion.

The last **verified** clean Git log was the Milestone 6 commit `7605fa8`. Step 10 and nav changes were shown running but no post-change `git status`/push log is currently known. **Run `git status`, `git log -5 --oneline`, and `npm run build` before assuming all changes have been pushed.**

## 7. Next implementation: Step 3 AI Liquidity Architect
**Phase A — deterministic:**
1. Audit actual `/strategies` and `/dbc-config` source; map strategy → validated `buildCurve()` inputs and existing query params/state mechanism.
2. Construct three genuinely distinct SDK-validated candidates (Stable Discovery, High Growth, Anti-Sniper). Do not claim anti-bot protection from cosmetic labels; implement only configuration mechanisms supported by actual SDK.
3. Compare under equal assumptions: total token supply, quote mint, migration threshold, fee basis points, example quote sizes. Separate deterministic quote-impact calculations from speculative demand/risk assumptions.
4. Visually compare numerical metrics, support explanation with real configuration values, and let the user select a candidate to continue into Step 4.
5. Prefer server-controlled or shared deterministic config definitions. Use same config and curve-building logic for comparison **and** deployment, avoid chart/deployed-config mismatch.

**Phase B — OpenAI server-only:**
1. Add secure `OPENAI_API_KEY` to `.env.local` (**never** `NEXT_PUBLIC_OPENAI_API_KEY`).
2. Add a Next.js API route with input schema validation, rate limiting, bounded token/cost usage, timeouts, and error handling.
3. Call the OpenAI Responses API with structured strategy analysis and explanations; model selects/ranks among SDK-validated candidates, never invents raw blockchain math.
4. UI shows assumptions, comparisons, reasons, clear risk language, and gracefully falls back to deterministic-only comparison if OpenAI is unavailable.
5. Do not imply tokenization alone grants legal rights to RWAs/equities; distinguish technical issuance from compliance, custody, and legal claims.

## 8. Ready-for-handoff acceptance checklist
- [ ] `git status` clean (or list uncommitted changes explicitly)
- [ ] latest `git log -5 --oneline` recorded
- [ ] `npm run build` succeeds
- [ ] Step 1–10 bottom navigation tested (including Step 8→9→10 `pool` parameter)
- [ ] existing pool dashboard read tested
- [ ] buy quote and chart tested
- [ ] navigation cleanup committed/pushed if desired
- [ ] source snapshot ZIP exported from local repository, no secrets
- [ ] handoff MD and source ZIP attached to a **new chat**

## 9. Commands — source export from Git Bash
Execute only after confirming local status. If any source is uncommitted, commit it first, or make clear that archive covers only HEAD.

```bash
cd /c/2026/MeteoraHackaton/curveforge
git status
git log -5 --oneline
npm run build
mkdir -p /c/Users/USER/Downloads
git archive --format=zip --output=/c/Users/USER/Downloads/curveforge-source-snapshot.zip HEAD
unzip -t /c/Users/USER/Downloads/curveforge-source-snapshot.zip | tail -1
```
`git archive` packages tracked code from `HEAD` only, excluding `.env.local`, `.git`, and `node_modules`, **as long as secrets were never committed**. Check `git ls-files | grep -Ei '(\.env|secret|keypair|wallet|seed)'` and inspect findings before sharing. Do not assume `git archive` sanitizes committed secrets.

## 10. Suggested first prompt in new ChatGPT thread
> Continue CurveForge using attached `CURVEFORGE_HANDOFF_2026-10-09.md` and `curveforge-source-snapshot.zip`. First read the actual repository contents and verify current implementation and `git status`/latest commit as reported by me. Do not invent SDK APIs. Keep bottom-step navigation and query-parameter pool context. Build the next small downloadable ZIP patch for Phase A of the Step 3 AI Liquidity Architect: deterministic Meteora SDK-valid strategy comparison first, OpenAI Responses API integration second. Preserve existing verified devnet deploy, dashboard, quote and curve flows. Test TypeScript/build when possible before issuing a patch.

## 11. Documentation caveat
The original uploaded `00_PROJECT_MASTER.md`, `01_ARCHITECTURE.md`, and `CHATGPT_PROJECT_CONTEXT.md` are **earlier project plans**, not accurate as-of-now statuses. This handoff combines those documents with successful commands and screenshots shown in this chat. Actual repo state after Milestone 6 must be confirmed from current local snapshot.
