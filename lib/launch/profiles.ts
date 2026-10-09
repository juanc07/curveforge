/**
 * Product-level strategy comparisons. These are NOT Meteora SDK configs.
 * Never pass these descriptions directly to a blockchain transaction.
 */
export type StrategyId = 'stable-discovery' | 'high-growth' | 'anti-sniper';
export type Strategy = {
  id: StrategyId;
  label: string;
  audience: string;
  curveIntent: string;
  feeIntent: string;
  graduationIntent: string;
  tradeoff: string;
};
export const STRATEGIES: readonly Strategy[] = [
  { id:'stable-discovery', label:'Stable Discovery', audience:'Lower-demand launches and illustrative RWA scenarios', curveIntent:'More gradual price discovery', feeIntent:'Prefer controlled fees', graduationIntent:'Favor deeper liquidity before migration', tradeoff:'Slower price discovery; no price-stability guarantee' },
  { id:'high-growth', label:'High Growth', audience:'Projects expecting stronger early demand', curveIntent:'Faster response to net buying demand', feeIntent:'Balance participation and fee capture', graduationIntent:'Target timely migration to DAMM v2', tradeoff:'Can increase price volatility and slippage' },
  { id:'anti-sniper', label:'Anti-Sniper', audience:'Launches concerned about automated early participation', curveIntent:'Pair curve design with launch-phase fee protection', feeIntent:'Investigate time-based declining fees', graduationIntent:'Use supported graduation configuration', tradeoff:'Higher starting fees can discourage legitimate users too' },
];
