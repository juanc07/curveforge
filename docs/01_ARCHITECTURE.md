# CurveForge — Detailed Architecture

## 1. Architecture Principles

1. **One repository**
2. **One Next.js application**
3. **Wallet is identity**
4. **Solana/Meteora is blockchain source of truth**
5. **AI recommends; deterministic code validates**
6. **Devnet first**
7. **Supabase only after core blockchain flow works**
8. **Vercel deployment**
9. **No unnecessary infrastructure during hackathon**

---

## 2. Logical Architecture

```text
                         CURVEFORGE
                              │
                  Next.js 16 + TypeScript
                              │
          ┌───────────────────┼────────────────────┐
          │                   │                    │
          ▼                   ▼                    ▼
      React UI          Next.js API Routes    Wallet Adapter
          │                   │                    │
          │              OpenAI API                │
          │                   │                    ▼
          │                   │               Phantom Wallet
          │                   │                    │
          └───────────────┬───┴────────────────────┘
                          ▼
                Deterministic Config Engine
                          │
                          ▼
                   Meteora DBC SDK
                          │
                          ▼
                       Solana
                          │
               ┌──────────┴───────────┐
               ▼                      ▼
            DBC Pool              DAMM v2
                                      │
                                      ▼
                                  DLMM (stretch)
```

---

## 3. Frontend Architecture

### Main routes

`/`
- Landing page
- Product pitch
- CTA to launch flow

`/launch`
- Main launch wizard
- Keep steps in one route and maintain wizard state

`/project/[address]`
- Pool/project dashboard
- Optional after core launch works

`/explore`
- Optional later
- List deployments saved in Supabase

### Main launch steps

1. Asset
2. AI Design
3. Configure
4. Simulate
5. Review
6. Deploy
7. Success

---

## 4. Component Architecture

```text
components/
├── wallet/
│   ├── WalletProvider.tsx
│   └── ConnectWallet.tsx
├── launch/
│   ├── AssetForm.tsx
│   ├── AssetTypeSelector.tsx
│   ├── AIRecommendation.tsx
│   ├── CurveConfigurator.tsx
│   ├── CurveSimulator.tsx
│   ├── LaunchSummary.tsx
│   └── DeployPool.tsx
├── dashboard/
│   ├── PoolStats.tsx
│   ├── GraduationProgress.tsx
│   └── TransactionStatus.tsx
└── ui/
```

---

## 5. Domain Architecture

### Asset Input

Represents what the user wants to launch.

```ts
type AssetType = "RWA" | "EQUITY" | "AI" | "MEME" | "CUSTOM";

interface AssetInput {
  name: string;
  symbol: string;
  description: string;
  type: AssetType;
  quoteToken: "USDC" | "SOL";
  expectedLiquidity?: number;
}
```

### Launch Design

Represents the validated strategy.

```ts
interface LaunchDesign {
  profile: string;
  curveType: "FLAT" | "EXPONENTIAL" | "LONG" | "CUSTOM";
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  dynamicFees: boolean;
  graduationThreshold: number;
  migration: "DAMM_V2";
  explanation: string;
}
```

### Deployment

```ts
interface DeploymentResult {
  mintAddress: string;
  poolAddress: string;
  transactionSignature: string;
}
```

### Aggregate state

```ts
interface LaunchProject {
  asset: AssetInput;
  design: LaunchDesign;
  deployment?: DeploymentResult;
}
```

---

## 6. AI Architecture

The AI layer is advisory.

### Correct flow

```text
User input
   ↓
AI asset classification
   ↓
AI recommends validated profile
   ↓
Application validates recommendation
   ↓
Deterministic parameter builder
   ↓
Meteora configuration
```

### Incorrect flow

```text
User input
   ↓
LLM invents arbitrary numeric blockchain parameters
   ↓
Transaction
```

Never implement the incorrect flow.

### Server-only API

Suggested route:

`app/api/ai/design/route.ts`

The OpenAI API key must remain server-side.

---

## 7. Meteora Layer

Suggested files:

```text
lib/meteora/
├── dbc.ts
├── config.ts
├── profiles.ts
├── deploy.ts
└── types.ts
```

Responsibilities:

### `profiles.ts`
Validated strategy templates.

### `config.ts`
Converts a validated launch profile to supported Meteora parameters.

### `dbc.ts`
DBC SDK initialization/helpers.

### `deploy.ts`
Builds and submits transactions through wallet signing.

### `types.ts`
Meteora-specific internal types.

---

## 8. Solana Layer

```text
lib/solana/
├── connection.ts
└── tokens.ts
```

Responsibilities:

- RPC connection
- cluster selection
- token/quote constants
- explorer URL helpers

Initial network:

**Solana devnet**

Mainnet only after the full launch flow is repeatedly successful.

---

## 9. Wallet Architecture

Use Solana Wallet Adapter.

Initial requirement:

- Phantom
- connect
- disconnect
- public key display
- transaction signing

Do not store:

- private keys
- seed phrases

Wallet remains the signing authority.

---

## 10. Database Architecture

Supabase is postponed until after DBC deployment works.

Later data model:

```text
projects
- id
- wallet_address
- name
- symbol
- description
- asset_type
- quote_token
- ai_profile
- curve_type
- risk_level
- ai_reasoning
- dbc_config
- graduation_threshold
- mint_address
- dbc_pool_address
- creation_tx
- status
- created_at
```

Blockchain state is authoritative.

Supabase stores metadata/discovery information only.

---

## 11. Environment Variables

Planned:

```text
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_SOLANA_RPC_URL=

OPENAI_API_KEY=

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Rules:

- Never commit `.env.local`
- Never expose server-only secrets using `NEXT_PUBLIC_`
- Wallet secrets are never stored anywhere in CurveForge

---

## 12. Error Boundaries

Classify failures by layer:

### UI
- invalid forms
- missing fields

### Wallet
- extension unavailable
- user rejected
- disconnected

### RPC
- unavailable endpoint
- rate limiting

### Solana
- blockhash expired
- insufficient funds
- transaction simulation failure

### Meteora
- invalid config
- invalid accounts
- SDK/API mismatch

### AI
- malformed output
- timeout
- invalid profile

Each layer should produce understandable error messages rather than exposing raw technical errors to end users.

---

## 13. Security Boundaries

CurveForge must never:

- request seed phrase
- request private key
- custody user wallets
- silently submit transactions
- expose OpenAI secret
- expose Supabase service-role key

All blockchain-changing actions require visible user review and wallet signature.

---

## 14. Deployment Architecture

```text
Developer
   ↓
GitHub
   ↓
Vercel
   ↓
CurveForge Web App
   ↓
Solana RPC + Meteora + OpenAI
```

No VPS for hackathon MVP.

---

## 15. Architecture Change Rule

If architecture changes:

1. Update this file
2. Add decision to `05_DECISIONS.md`
3. Update `03_STATUS.md`
4. Add entry to `04_CHANGELOG.md`

Do not let implementation and documentation silently diverge.
