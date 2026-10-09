/** Read-only Phase A candidates. NOT transaction parameters until Phase C integration. */
import {
  ActivationType, BaseFeeMode, buildCurve, CollectFeeMode,
  MigrationFeeOption, MigrationOption, TokenAuthorityOption, TokenDecimal, TokenType,
} from "@meteora-ag/dynamic-bonding-curve-sdk";
import type { StrategyId } from "./profiles";

export type Candidate = {
  id: StrategyId;
  feeBps: number;
  thresholdSol: number;
  migrationSupplyPercent: number;
  rationale: string;
};

/** All candidates: 1B SPL tokens (6 decimals), wSOL quote (9 decimals), DAMM v2. */
export const SDK_CANDIDATES: readonly Candidate[] = [
  { id: "stable-discovery", feeBps: 100, thresholdSol: 150, migrationSupplyPercent: 30, rationale: "Higher migration threshold and larger migration allocation; does not guarantee price stability." },
  { id: "high-growth", feeBps: 50, thresholdSol: 60, migrationSupplyPercent: 15, rationale: "Lower trading fee and earlier threshold; demand, slippage, and graduation are not guaranteed." },
  { id: "anti-sniper", feeBps: 500, thresholdSol: 100, migrationSupplyPercent: 20, rationale: "Higher fixed entry fee is a deterrent, NOT bot prevention or time-decaying fees." },
];

/** Shared checked inputs for strategy preview, config display, preflight and deployment. */
export type CurveInputs = {
  totalTokenSupply: number;
  migrationQuoteThreshold: number;
  fixedFeeBps: number;
  percentageSupplyOnMigration: number;
};

export function validateCurveInputs(inputs: CurveInputs): CurveInputs {
  const limits: { label: string; value: number; min: number; max: number }[] = [
    { label: "Token supply", value: inputs.totalTokenSupply, min: 1000, max: 1_000_000_000_000 },
    { label: "Migration threshold (SOL)", value: inputs.migrationQuoteThreshold, min: 1, max: 1_000_000 },
    { label: "Trading fee (bps)", value: inputs.fixedFeeBps, min: 1, max: 1000 },
    { label: "Supply on migration (%)", value: inputs.percentageSupplyOnMigration, min: 1, max: 99 },
  ];
  for (const {label, value, min, max} of limits) {
    if (!Number.isSafeInteger(value) || value < min || value > max) {
      throw new Error(`${label} must be a whole number between ${min.toLocaleString()} and ${max.toLocaleString()}.`);
    }
  }
  return inputs;
}

/** The same SDK builder is used by Steps 3, 4, 5 and 6. No chain writes. */
export function buildCurveConfig(inputs: CurveInputs) {
  const {totalTokenSupply, migrationQuoteThreshold, fixedFeeBps, percentageSupplyOnMigration} = validateCurveInputs(inputs);
  return buildCurve({
    token: { tokenType: TokenType.SPLToken, tokenBaseDecimal: TokenDecimal.SIX, tokenQuoteDecimal: TokenDecimal.NINE, tokenAuthorityOption: TokenAuthorityOption.Immutable, totalTokenSupply, leftover: 0 },
    fee: { baseFeeParams: { baseFeeMode: BaseFeeMode.FeeSchedulerLinear, feeSchedulerParam: { startingFeeBps: fixedFeeBps, endingFeeBps: fixedFeeBps, numberOfPeriod: 0, totalDuration: 0 } }, dynamicFeeEnabled: false, collectFeeMode: CollectFeeMode.QuoteToken, creatorTradingFeePercentage: 0, poolCreationFee: 0, enableFirstSwapWithMinFee: false },
    migration: { migrationOption: MigrationOption.MET_DAMM_V2, migrationFeeOption: MigrationFeeOption.FixedBps100, migrationFee: { feePercentage: 0, creatorFeePercentage: 0 } },
    liquidityDistribution: { partnerLiquidityPercentage: 0, partnerPermanentLockedLiquidityPercentage: 100, creatorLiquidityPercentage: 0, creatorPermanentLockedLiquidityPercentage: 0 },
    lockedVesting: { totalLockedVestingAmount: 0, numberOfVestingPeriod: 0, cliffUnlockAmount: 0, totalVestingDuration: 0, cliffDurationFromMigrationTime: 0 },
    activationType: ActivationType.Timestamp, percentageSupplyOnMigration, migrationQuoteThreshold,
  });
}

export function buildSdkCandidate(candidate: Candidate) {
  return buildCurveConfig({
    totalTokenSupply: 1_000_000_000,
    migrationQuoteThreshold: candidate.thresholdSol,
    fixedFeeBps: candidate.feeBps,
    percentageSupplyOnMigration: candidate.migrationSupplyPercent,
  });
}

export function compareSdkCandidates() {
  return SDK_CANDIDATES.map((candidate) => {
    try {
      const config = buildSdkCandidate(candidate);
      return {
        ...candidate,
        valid: config.curve.length > 0 && !config.sqrtStartPrice.isZero() &&
          config.migrationQuoteThreshold.toString() === String(candidate.thresholdSol * 1_000_000_000),
        segments: config.curve.length,
        sqrtStartPrice: config.sqrtStartPrice.toString(),
        migrationThresholdLamports: config.migrationQuoteThreshold.toString(),
        error: "",
      };
    } catch (error) {
      return { ...candidate, valid: false, segments: 0, sqrtStartPrice: "—", migrationThresholdLamports: "—", error: error instanceof Error ? error.message : String(error) };
    }
  });
}
