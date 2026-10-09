# CurveForge — ChatGPT Project Context

Use this file as the quick-entry context for new chats inside the CurveForge ChatGPT Project.

## What we are building

CurveForge is an AI-native launch architect built on Solana + Meteora Dynamic Bonding Curve.

Flow:

`Describe asset → AI recommends launch profile → deterministic validation → simulate → wallet review → Meteora DBC deployment`

Flagship demo: RWA/tokenized asset launch.

## Current technical state

- Project path: `C:\2026\MeteoraHackaton\curveforge`
- Next.js 16.4
- TypeScript
- Tailwind
- App Router
- Turbopack
- root-level `app/`
- Git initialized
- local server working at `http://localhost:3000`

Current next task:

> Install/verify Solana + Wallet Adapter + Meteora DBC dependencies, connect Phantom on devnet, then create the first real DBC transaction/pool.

## Rules

- no `src/` migration
- devnet first
- no separate backend
- no database work until DBC works
- AI recommends but deterministic code validates
- do not invent SDK APIs
- do not expose secrets
- preserve working code
- smallest working increment
- update `/docs/03_STATUS.md` and `/docs/04_CHANGELOG.md` after meaningful work

For details, read the numbered documents in `/docs`.
