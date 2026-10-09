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
  { id:'stable-discovery', label:'Stable Discovery', audience:'Exploratory launches that prefer a higher migration threshold', curveIntent:'Compare a configuration with a 150 SOL migration threshold', feeIntent:'Fixed 100 bps (1%) fee', graduationIntent:'30% token supply allocated to migration', tradeoff:'Higher threshold may take longer to reach; liquidity and price stability are not guaranteed' },
  { id:'high-growth', label:'High Growth', audience:'Launches evaluating a lower migration threshold and fee', curveIntent:'Compare SDK-calculated token output at identical SOL inputs', feeIntent:'Fixed 50 bps (0.5%) fee', graduationIntent:'60 SOL migration threshold and 15% migration supply', tradeoff:'Lower threshold does not guarantee faster migration or higher demand' },
  { id:'anti-sniper', label:'Anti-Sniper', audience:'Launches considering a high fixed-fee deterrent', curveIntent:'Compare a 100 SOL migration threshold, not a bot-blocking mechanism', feeIntent:'Fixed 500 bps (5%) fee; no declining-fee schedule', graduationIntent:'20% token supply allocated to migration', tradeoff:'Does not block bots, sniping or MEV; high fees also affect legitimate users' },
];
