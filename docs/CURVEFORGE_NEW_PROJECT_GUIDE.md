# CurveForge — New Project Onboarding & GitHub Development Policy

**Version:** 1.0  
**Prepared:** October 9, 2026  
**Repository:** https://github.com/juanc07/curveforge  
**Primary branch:** `main`

## Purpose

Use this guide whenever development moves to a new ChatGPT conversation or project. CurveForge is an existing, working Meteora DBC / Solana devnet application; do not rebuild it from scratch. The latest committed GitHub repository is the single source of truth. Chat history and earlier ZIP snapshots are supporting context, not canonical source.

## 1. Before opening the new chat

- [ ] Confirm the latest changes are committed and pushed to `main`.
- [ ] Confirm `git status` reports a clean working tree.
- [ ] Confirm `npm run build` succeeds locally.
- [ ] Export a fresh `git archive` ZIP from `HEAD` **after** documentation updates are committed.
- [ ] Ensure no credentials, private keys, seed phrases or `.env.local` are tracked in Git.
- [ ] Upload the current source ZIP, the latest handoff document, and the existing documentation pack to the new ChatGPT project's Sources.
- [ ] Keep the Meteora SDK source ZIP available for cross-reference; verify the **installed SDK** types when coding.

**Source priority:** (1) current GitHub `main` / freshly exported source ZIP; (2) project documentation committed in `docs/`; (3) latest handoff; (4) older snapshots and chat history. Identify conflicts instead of silently merging inconsistent information.

## 2. Open the new CurveForge chat

1. Open the CurveForge ChatGPT project and start a new chat.
2. Attach or make available its uploaded Sources.
3. Paste the first-chat prompt in Section 3 below.
4. Begin with a source audit and a small, safe Milestone 8 plan; do not replace existing working features.

## 3. First-chat prompt — copy and paste

> You are the lead full-stack engineer and technical architect continuing CurveForge, our existing Meteora DBC / Solana liquidity engineering application for a hackathon. **Do not start from scratch.**
>
> Read the available project sources before changing code. Treat `curveforge-source-final-handoff.zip` as the starting snapshot if it is the newest verified export, but prefer newer committed GitHub `main` content if available. Read `CURVEFORGE_HANDOFF_2026-10-09.md`, the project's `docs/`, and the Meteora SDK references. Verify APIs against installed `@meteora-ag/dynamic-bonding-curve-sdk` type definitions; do not invent methods.
>
> **GitHub (`juanc07/curveforge`, `main`) is the single source of truth.** For every completed milestone, update code and applicable `docs/` files together, including `docs/CHANGELOG.md` and `docs/PROJECT_STATUS.md` (create them if missing); update architecture and handoff documents when relevant. Only call a milestone complete after local build and user-validated runtime tests, then commit and push and confirm a clean working tree.
>
> We use Windows Git Bash in `C:\2026\MeteoraHackaton\curveforge`. Deliver changes as small **downloadable ZIP patches** with repository-relative file paths and documentation updates; include concise unzip, build, test, commit and push commands. Preserve working app routes, wallet safeguards and bottom Back/Next navigation. Never commit `.env.local`, keys or secrets.
>
> CurveForge currently implements Steps 1–10: home, launch draft, strategies, DBC configuration, transaction simulation, configuration deployment, pool creation, live pool intelligence, SDK buy/sell quotations, and SDK-backed quote-impact visualization. Devnet configuration, token and pool creation, read-only pool inspection and buy quotes were demonstrated. A sell quote on the initial zero-quote-reserve pool returned `Insufficient Liquidity`; selling against a liquid pool remains to be verified.
>
> **Next milestone is Milestone 8 — AI Liquidity Architect, upgrading Step 3 rather than inventing Step 11.** Build deterministic and SDK-validated comparisons first (Stable Discovery, High Growth, Anti-Sniper); then add OpenAI API-backed reasoning using a server-side Next.js endpoint. AI explains trade-offs, while SDK calculations and validation are authoritative. Finally pass the selected validated strategy to Step 4. No profit guarantees, made-up pricing, or wallet operations without user approval.
>
> First, audit the source tree and documentation, report any discrepancies or missing pieces, propose the smallest safe Phase A implementation, then prepare the first ZIP patch including source and documentation. Ask for local runtime validation before claiming success.

## 4. CurveForge GitHub Development Policy

**Repository:** `https://github.com/juanc07/curveforge`  
**Branch:** `main`  
**Local path:** `C:\2026\MeteoraHackaton\curveforge`

**Required rules**

- GitHub is the **single source of truth**. Prefer the latest committed code over chat messages, assumptions and older archives.
- Every finished milestone updates relevant source files **and** Markdown documentation under `docs/` in the same patch/commit.
- Maintain `docs/CHANGELOG.md` (what changed, why, major fixes, test evidence) and `docs/PROJECT_STATUS.md` (implemented, verified, pending, unverified). Update architecture and handoff when materially affected.
- Review existing documentation before overwriting it; preserve history. Avoid duplicate contradictory copies.
- Prepare small ZIP patches with correct repo-relative paths; list changed files and dependencies. Do not ship unverified or speculative SDK interfaces.
- For each patch: check ZIP integrity, compile/type-check if possible, install locally, run `npm run build`, then run `npm run dev` and validate real user flows.
- Successful compilation is **not** evidence of runtime correctness. Document the exact validation outcome and known limitations.
- Only commit and push after testing. Confirm `git status` clean and `main` synchronized.
- Never commit credentials, wallet secrets, seed phrases or local environment files. OpenAI keys stay server-side without a `NEXT_PUBLIC_` prefix.
- Preserve existing functional routes and bottom navigation. On-chain actions must remain devnet-first, simulated/reviewed, and wallet-approved.

## 5. Milestone-completion checklist

- [ ] Changes derived from current source, with SDK signatures checked.
- [ ] ZIP contains only intended changed code and applicable documentation.
- [ ] `npm run build` passes (or a failure is explicitly disclosed and the milestone remains open).
- [ ] Affected workflow is tested in the browser; screenshots/logs checked.
- [ ] `docs/CHANGELOG.md` updated.
- [ ] `docs/PROJECT_STATUS.md` updated with verified versus unverified features.
- [ ] Architecture / handoff updated if the technical design changed.
- [ ] `git diff --cached` reviewed; no secrets or accidental files.
- [ ] Commit and push to `main`; `git status` clean.
- [ ] Fresh source archive exported when a new handoff is needed.

## 6. Next work: Milestone 8 — AI Liquidity Architect

**Location:** Existing Step 3 (`/strategies`), not Step 11.

**Phase A — deterministic strategy comparison:** define materially different DBC parameter sets; validate them with the installed Meteora SDK; compare SDK-calculated outputs on controlled, explicitly stated assumptions; retain a working no-AI fallback.

**Phase B — OpenAI reasoning:** create a secure Next.js API route; use structured output, input validation, server-side credentials and request limits; AI recommends among **validated** candidates and explains assumptions and uncertainty.

**Phase C — integration:** pass the chosen strategy into Step 4; verify simulation/deployment behavior remains safe and consistent; update docs and demo walkthrough.

**Non-goals for the first increment:** no new database, no separate Python service, no unsupported SDK methods, no mainnet deployment, no guaranteed-profit promises.

## 7. Useful Git Bash commands

```bash
cd /c/2026/MeteoraHackaton/curveforge
git status
npm run build
# Once docs and code are reviewed, tested, committed and pushed:
git archive --format=zip --output=/c/Users/USER/Downloads/curveforge-source-latest.zip HEAD
unzip -t /c/Users/USER/Downloads/curveforge-source-latest.zip | tail -1
```

**Do not paste terminal output back into Git Bash as commands.** When a patch changes code and docs, stage only the intended files, review `git diff --cached --stat`, and commit after successful tests.

## 8. Current evidence and limitations

Milestones through Step 10 have been implemented in the previously described project. The initial devnet pool was deployed; pool reads, a buy quotation, and a 14-sample quote-impact plot were demonstrated in screenshots. A sell quote returned `Insufficient Liquidity` against a pool with no accumulated SOL quote reserve. Strategy-comparison functionality and OpenAI API integration are **planned**, not completed. A new chat should verify the latest source archive, current Git history, and actual local build before relying on these historical observations.
