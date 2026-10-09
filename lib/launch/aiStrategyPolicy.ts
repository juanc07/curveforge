/** Deterministic policy: AI commentary must never replace capability checks. */
export type CapabilityWarning = { code: string; message: string };

export type PublicCandidate = {
  id: "stable-discovery" | "high-growth" | "anti-sniper";
  label: string;
  feeBps: number;
  thresholdSol: number;
  migrationSupplyPercent: number;
  tradeoff: string;
};

// Server-safe mirror of the *published* Phase A SDK presets. The API imports only
// this pure module; browser and server checks prevent silent preset drift.
export const PUBLIC_CANDIDATES: readonly PublicCandidate[] = [
  { id: "stable-discovery", label: "Stable Discovery", feeBps: 100, thresholdSol: 150, migrationSupplyPercent: 30, tradeoff: "Higher migration threshold; no guarantee of stable price or liquidity" },
  { id: "high-growth", label: "High Growth", feeBps: 50, thresholdSol: 60, migrationSupplyPercent: 15, tradeoff: "Lower fee and threshold; no guarantee of demand or growth" },
  { id: "anti-sniper", label: "Anti-Sniper", feeBps: 500, thresholdSol: 100, migrationSupplyPercent: 20, tradeoff: "5% fixed trading fee is a possible deterrent, not bot blocking or decaying fees" },
];

export function objectiveWarnings(text: string): CapabilityWarning[] {
  const warnings: CapabilityWarning[] = [];
  const add = (code: string, message: string) => warnings.push({ code, message });
  if (/\b(snip(?:er|ers|ing)?|bot(?:s)?|front[ -]?runn?(?:ing)?|mev)\b/i.test(text))
    add("bot-prevention", "No current preset blocks bots, snipers, MEV or front-running. Anti-Sniper uses a fixed 500 bps (5%) fee that also affects legitimate trading.");
  if (/\b(rwa|real[ -]?world asset|tokeni[sz](?:e|ation|ed)|equity|shares?|security token|property ownership)\b/i.test(text))
    add("rwa-rights", "Creating a token does not establish legal RWA ownership, custody, investor rights or regulatory compliance. Obtain appropriate legal and asset-specific review.");
  if (/\b(guarantee(?:d)?|risk[ -]?free|no risk|certain profit|assured returns?|fixed returns?|never lose)\b/i.test(text))
    add("guarantees", "No preset can guarantee profit, investment returns, a successful migration, or protection from losses.");
  if (/\b(dynamic fees?|decay(?:ing)? fees?|time[ -]?based fees?|anti[ -]?bot rules?|whitelist|blacklist|vesting|transfer restrictions?)\b/i.test(text))
    add("unsupported-controls", "The three candidate presets use fixed trading fees, no vesting and no access controls. Requested advanced protections require separate SDK feature design and validation.");
  if (/\b(stable price|price peg|peg(?:ged)?|prevent volatility|zero slippage|guaranteed liquidity)\b/i.test(text))
    add("market-outcome", "None of these presets guarantees a pegged price, stable market, liquidity, or zero slippage.");
  return warnings;
}

export function recommendedStrategyIsValid(id: unknown): id is PublicCandidate["id"] {
  return typeof id === "string" && PUBLIC_CANDIDATES.some((candidate) => candidate.id === id);
}
