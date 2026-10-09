# CurveForge — Project Master

**Project:** CurveForge  
**Hackathon:** Best Use of Meteora Dynamic Bonding Curve (DBC)  
**Chain:** Solana  
**Core protocol:** Meteora DBC  
**Local project:** `C:\2026\MeteoraHackaton\curveforge`  
**Framework:** Next.js 16.4 + TypeScript  
**Started:** October 8, 2026  
**Deadline at documentation creation:** ~5 days remaining

---

## 1. Product Vision

CurveForge is an **AI-native liquidity-launch architect for tokenized assets**.

Core pitch:

> Describe what you want to tokenize. CurveForge recommends, simulates, validates, and launches an appropriate liquidity lifecycle using Meteora Dynamic Bonding Curve.

CurveForge is not intended to be another generic token generator or meme launchpad.

Its differentiation is the combination of:

- AI-assisted asset analysis
- reusable launch profiles
- deterministic configuration validation
- bonding-curve simulation
- Meteora DBC deployment
- eventual DBC → DAMM v2 lifecycle
- developer-friendly configuration tooling

The flagship demo will focus on **RWA/tokenized assets**, while the architecture remains general enough for:

- Real-world assets
- Tokenized equities
- AI tokens
- Community tokens
- Meme tokens
- Custom assets

---

## 2. User Journey

### Step 1 — Describe Asset

User provides:

- Asset name
- Symbol
- Description
- Asset class
- Quote asset
- Expected launch liquidity
- Optional launch preferences

Example:

> Tokenized rental-property revenue asset priced in USDC. Initial liquidity is low and we want controlled price discovery.

### Step 2 — AI Design

CurveForge returns a recommended launch profile.

Example:

- Profile: RWA Stable Discovery
- Quote: USDC
- Curve: Long / gradual
- Risk: Low
- Dynamic fees: Enabled
- Graduation target: configurable
- Migration: DAMM v2

CurveForge must explain **why** the configuration was selected.

### Step 3 — Deterministic Validation

AI does not directly send arbitrary blockchain parameters.

Flow:

`Asset description → AI recommendation → validated profile → deterministic parameter builder → review → wallet signature`

### Step 4 — Simulate

User can inspect the bonding curve before launch.

The simulator should show:

- price progression
- quote reserve
- liquidity
- graduation progress
- example demand scenarios

### Step 5 — Launch

User connects a Solana wallet and deploys through Meteora DBC.

### Step 6 — Dashboard

After success, show:

- token mint
- pool address
- transaction signature
- price
- liquidity
- volume
- graduation progress
- Solscan link
- Meteora link

---

## 3. MVP Launch Profiles

### RWA Stable Discovery

For thinly traded or newly tokenized real-world assets.

Expected characteristics:

- USDC quote
- gradual curve
- conservative price discovery
- dynamic fees where appropriate
- higher graduation target
- DAMM v2 migration

### High Growth

For projects expecting stronger launch demand.

Expected characteristics:

- faster price discovery
- more aggressive curve
- moderate dynamic fees

### Anti-Sniper

For launches where bots/front-running are a major concern.

Expected characteristics:

- high initial fee
- declining/decaying fee schedule
- controlled early participation

### AI Custom

AI selects the closest validated profile and recommends safe parameter adjustments.

---

## 4. Hackathon Alignment

CurveForge is intentionally designed around themes the Meteora DBC track asks builders to explore:

- RWAs
- Tokenized stocks/assets
- AI
- Novel curve configurations
- Novel fee configurations
- DBC configuration presets
- Developer tooling
- DBC → DAMM v2 lifecycle
- Potential DLMM expansion

Meteora DBC must remain the core engine of the product rather than a superficial integration.

---

## 5. Approved Stack

### Application

- Next.js 16.4
- React
- TypeScript
- App Router
- Tailwind CSS
- Turbopack

### UI

- Tailwind CSS
- shadcn/ui
- Lucide React
- Recharts

### Solana

- `@solana/web3.js`
- Solana Wallet Adapter
- Phantom initially
- Solflare optional

### Meteora

- `@meteora-ag/dynamic-bonding-curve-sdk`
- DBC
- DAMM v2
- DLMM only if time remains

### AI

- OpenAI API through server-side Next.js route

### Database

- Supabase PostgreSQL later
- No database work until core DBC transaction works

### Deployment

- GitHub
- Vercel

No VPS, Docker, separate Express backend, or separate authentication service for the hackathon MVP.

---

## 6. Repository Rules

Current project structure uses root-level `app/`.

**Do not introduce `src/` unless a compelling technical reason appears.**

Planned structure:

```text
curveforge/
├── app/
│   ├── globals.css
│   ├── layout.tsx
│   ├── page.tsx
│   ├── launch/
│   │   └── page.tsx
│   └── api/
│       └── ai/
│           └── design/
│               └── route.ts
├── components/
│   ├── wallet/
│   ├── launch/
│   ├── dashboard/
│   └── ui/
├── lib/
│   ├── meteora/
│   ├── solana/
│   ├── ai/
│   └── simulator/
├── hooks/
├── types/
├── config/
├── docs/
└── public/
```

---

## 7. Current State

Completed:

- Next.js project created successfully
- Next.js version: 16.4.0
- TypeScript enabled
- ESLint enabled
- Tailwind enabled
- App Router enabled
- Turbopack enabled
- Git repository initialized
- Root-level `app/` directory confirmed
- Development server runs
- `http://localhost:3000` loads successfully

Not yet confirmed:

- Solana wallet packages installed
- Meteora DBC SDK installed
- Phantom wallet connected
- Devnet connection configured
- Meteora DBC transaction executed

---

## 8. Current Priority

The single most important next milestone is:

> **Connect Phantom → target Solana devnet → create a real Meteora DBC transaction/pool from CurveForge.**

Do not build the AI layer, database, or extensive UI before the core blockchain path works.

---

## 9. Definition of Hackathon Success

Minimum viable submission:

1. Working deployed application
2. Phantom wallet integration
3. Asset configuration flow
4. Multiple launch strategies
5. Bonding-curve visualization/simulation
6. Real Meteora DBC interaction
7. Successful pool creation
8. AI recommendation layer
9. Public GitHub repository
10. Strong README
11. Demo video
12. Completed hackathon submission

Stretch goals:

- DAMM v2 migration proof
- Mainnet proof
- Real users
- Real volume
- DLMM integration
- Configuration marketplace

---

## 10. Product North Star

A judge should understand CurveForge in under 30 seconds:

> Describe an asset → AI designs the launch → simulate liquidity → deploy with Meteora DBC.

A judge should see genuine blockchain proof within roughly 60 seconds of the demo.
