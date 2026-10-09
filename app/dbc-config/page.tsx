"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ActivationType,
  BaseFeeMode,
  buildCurve,
  CollectFeeMode,
  MigrationFeeOption,
  MigrationOption,
  TokenAuthorityOption,
  TokenDecimal,
  TokenType,
} from "@meteora-ag/dynamic-bonding-curve-sdk";
import { ClientWalletButton } from "../../components/wallet/ClientWalletButton";

const INTEGER = /^\d+$/;

function serialize(value: unknown): string {
  return JSON.stringify(value, (_key, item: unknown) => {
    if (typeof item === "bigint") return item.toString();
    if (item && typeof item === "object" && "toArrayLike" in item && typeof item.toString === "function") {
      return item.toString();
    }
    return item;
  }, 2);
}

function readPositiveInteger(raw: string, label: string, min: number, max: number): number {
  if (!INTEGER.test(raw)) throw new Error(`${label} must be a whole number.`);
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    throw new Error(`${label} must be between ${min.toLocaleString()} and ${max.toLocaleString()}.`);
  }
  return value;
}

export default function DbcConfigPage() {
  const [supply, setSupply] = useState("1000000000");
  const [threshold, setThreshold] = useState("100");
  const [feeBps, setFeeBps] = useState("100");
  const [migrationPercent, setMigrationPercent] = useState("20");

  const result = useMemo(() => {
    try {
      const totalTokenSupply = readPositiveInteger(supply, "Token supply", 1000, 1_000_000_000_000);
      const migrationQuoteThreshold = readPositiveInteger(threshold, "Migration threshold (SOL)", 1, 1_000_000);
      const fixedFeeBps = readPositiveInteger(feeBps, "Trading fee (bps)", 1, 1000);
      const percentageSupplyOnMigration = readPositiveInteger(migrationPercent, "Supply on migration (%)", 1, 99);

      // Based on the SDK's createConfig.test.ts single-segment buildCurve example.
      // This builds *parameters only*; it does NOT validate chain accounts or simulate a transaction.
      const config = buildCurve({
        token: {
          tokenType: TokenType.SPLToken,
          tokenBaseDecimal: TokenDecimal.SIX,
          tokenQuoteDecimal: TokenDecimal.NINE,
          tokenAuthorityOption: TokenAuthorityOption.Immutable,
          totalTokenSupply,
          leftover: 0,
        },
        fee: {
          baseFeeParams: {
            baseFeeMode: BaseFeeMode.FeeSchedulerLinear,
            feeSchedulerParam: {
              startingFeeBps: fixedFeeBps,
              endingFeeBps: fixedFeeBps,
              numberOfPeriod: 0,
              totalDuration: 0,
            },
          },
          dynamicFeeEnabled: false,
          collectFeeMode: CollectFeeMode.QuoteToken,
          creatorTradingFeePercentage: 0,
          poolCreationFee: 0,
          enableFirstSwapWithMinFee: false,
        },
        migration: {
          migrationOption: MigrationOption.MET_DAMM_V2,
          migrationFeeOption: MigrationFeeOption.FixedBps100,
          migrationFee: { feePercentage: 0, creatorFeePercentage: 0 },
        },
        liquidityDistribution: {
          partnerLiquidityPercentage: 0,
          partnerPermanentLockedLiquidityPercentage: 100,
          creatorLiquidityPercentage: 0,
          creatorPermanentLockedLiquidityPercentage: 0,
        },
        lockedVesting: {
          totalLockedVestingAmount: 0,
          numberOfVestingPeriod: 0,
          cliffUnlockAmount: 0,
          totalVestingDuration: 0,
          cliffDurationFromMigrationTime: 0,
        },
        activationType: ActivationType.Timestamp,
        percentageSupplyOnMigration,
        migrationQuoteThreshold,
      });
      return { text: serialize(config), error: "" };
    } catch (error) {
      return { text: "", error: error instanceof Error ? error.message : "SDK could not build this curve." };
    }
  }, [supply, threshold, feeBps, migrationPercent]);

  const nextHref = `/dbc-simulate?${new URLSearchParams({
    supply, threshold, fee: feeBps, migration: migrationPercent,
  }).toString()}`;

  return (
    <main className="min-h-screen bg-[#060b16] px-5 py-7 text-slate-100 md:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
          <Link href="/strategies" className="text-2xl font-extrabold">Curve<span className="text-cyan-400">Forge</span><span className="ml-2 text-xs text-slate-500"> / CONFIG LAB</span></Link>
          <ClientWalletButton />
        </header>
        <div className="mt-12 text-xs font-bold tracking-[0.2em] text-cyan-400">04 / DBC CONFIGURATION BUILDER · DEVNET PREPARATION</div>
        <h1 className="mt-3 text-4xl font-bold">Build with the real Meteora SDK</h1>
        <p className="mt-4 max-w-3xl leading-relaxed text-slate-400">This page calls the installed SDK&apos;s <code>buildCurve()</code> helper to derive typed launch parameters. It does not create accounts, request a signature, or send a transaction.</p>
        <div className="mt-6 rounded-xl border border-amber-600/40 bg-amber-950/20 p-4 text-sm text-amber-200">Experimental single-segment SOL quote template adapted from Meteora SDK tests. Not financial advice, not the final strategy presets, and not a confirmation that this config will deploy. SDK construction is not equivalent to on-chain transaction simulation.</div>
        <section className="mt-8 rounded-2xl border border-slate-700 bg-[#101829] p-6">
          <h2 className="text-xl font-semibold">Editable SDK inputs</h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            {[
              { id: "supply", label: "Total token supply", value: supply, setter: setSupply },
              { id: "threshold", label: "Migration quote threshold (SOL)", value: threshold, setter: setThreshold },
              { id: "fees", label: "Fixed trading fee (bps; 100 = 1%)", value: feeBps, setter: setFeeBps },
              { id: "migration", label: "Token supply on migration (%)", value: migrationPercent, setter: setMigrationPercent },
            ].map((field) => (
              <label key={field.id} className="block text-sm text-slate-300">{field.label}
                <input inputMode="numeric" type="text" value={field.value} onChange={(event) => field.setter(event.target.value)} className="mt-2 block w-full rounded-lg border border-slate-600 bg-[#07101f] p-3 font-mono text-slate-100 outline-none focus:border-cyan-400" />
              </label>
            ))}
          </div>
          <p className="mt-4 text-xs text-slate-400">Fixed choices: SPL Token, 6 token decimals, 9 quote decimals (wrapped SOL), immutable mint authority, fixed-fee scheduler, DAMM v2 migration, no vesting. No wallet address or key is generated or stored.</p>
        </section>
        <section className="mt-6 rounded-2xl border border-slate-700 bg-[#101829] p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">Generated SDK parameters</h2>
            <span className={`rounded-full border px-3 py-1 text-xs ${result.error ? "border-red-700 text-red-300" : "border-emerald-700 text-emerald-300"}`}>{result.error ? "Builder rejected inputs" : "SDK helper returned parameters"}</span>
          </div>
          {result.error ? <p role="alert" className="mt-4 rounded-lg bg-red-950/30 p-4 text-sm text-red-200">{result.error}</p> : <>
            <p className="mt-3 text-sm text-slate-400">This JSON is a diagnostic view. BN amounts are serialized as strings; do not paste it directly into on-chain instructions.</p>
            <pre className="mt-4 max-h-[540px] overflow-auto rounded-xl bg-[#050a13] p-4 text-xs leading-relaxed text-cyan-100">{result.text}</pre>
            <button type="button" onClick={() => navigator.clipboard.writeText(result.text)} className="mt-4 rounded-lg border border-cyan-600 px-4 py-2 text-sm text-cyan-200 hover:bg-cyan-950/40">Copy diagnostic JSON</button>
          </>}
        </section>
        <nav className="mt-8 flex flex-wrap items-center justify-between gap-4 text-sm">
          <Link href="/strategies" className="text-cyan-300 hover:underline">← Back to strategies</Link>
          {result.error ? (
            <span className="rounded-lg border border-slate-700 px-5 py-3 text-slate-500" aria-disabled="true">Fix inputs to continue →</span>
          ) : (
            <Link href={nextHref} className="rounded-lg bg-cyan-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300">Continue to Step 5: Simulate →</Link>
          )}
        </nav>
        <p className="mt-3 text-xs text-slate-500">Your four inputs will carry into the transaction simulation. Simulation does not submit a transaction or deploy a pool.</p>
      </div>
    </main>
  );
}
