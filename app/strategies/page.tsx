"use client";

import { useMemo, useState } from "react";
import { compareSdkCandidates } from "../../lib/launch/sdkStrategyCandidates";
import Link from "next/link";
import { STRATEGIES, type StrategyId } from "../../lib/launch/profiles";
import { ClientWalletButton } from "../../components/wallet/ClientWalletButton";
import { CurvePreview } from "../../components/strategies/CurvePreview";
import { SdkQuoteComparison } from "../../components/strategies/SdkQuoteComparison";

export default function StrategiesPage() {
  const [selected, setSelected] = useState<StrategyId>("stable-discovery");
  const comparisons = useMemo(() => compareSdkCandidates(), []);
  const current = STRATEGIES.find((p) => p.id === selected)!;
  return (
    <main className="min-h-screen bg-[#060b16] px-5 py-7 text-white md:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
          <Link href="/" className="text-2xl font-extrabold tracking-tight">Curve<span className="text-cyan-400">Forge</span><span className="ml-2 text-[10px] font-semibold tracking-[0.2em] text-slate-500">LAB</span></Link>
          <ClientWalletButton />
        </header>
        <section className="mb-8 mt-12">
          <p className="text-xs font-bold uppercase tracking-[0.23em] text-cyan-400">02 / Launch intelligence · Devnet</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight md:text-5xl">Shape the <span className="text-cyan-300">curve.</span></h1>
          <p className="mt-4 max-w-2xl text-slate-400">Compare three genuinely different read-only Meteora SDK configuration candidates under fixed assumptions. Optional read-only SDK pre-launch quotations are available below. No deployment happens here.</p>
        </section>
        <div className="mb-6 grid gap-3 md:grid-cols-3" role="group" aria-label="Choose a strategy">
          {STRATEGIES.map((p, i) => (
            <button key={p.id} type="button" onClick={() => setSelected(p.id)} aria-pressed={selected === p.id}
              className={`group relative overflow-hidden rounded-2xl border p-5 text-left transition-all duration-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-400 ${selected === p.id ? "-translate-y-1 border-cyan-400/90 bg-cyan-950/40 shadow-[0_12px_40px_-25px_rgba(34,211,238,0.8)]" : "border-slate-700 bg-[#101829] hover:-translate-y-0.5 hover:border-slate-500"}`}>
              <span className="text-[11px] font-semibold tracking-widest text-cyan-400/80">PROFILE 0{i+1}</span>
              <div className="mt-3 flex items-center justify-between gap-2"><span className="text-lg font-semibold">{p.label}</span><span className={selected === p.id ? "text-cyan-300" : "text-slate-600"}>↗</span></div>
              <p className="mt-3 text-sm leading-relaxed text-slate-400">{p.audience}</p>
            </button>
          ))}
        </div>
        <section className="mb-6 overflow-x-auto rounded-2xl border border-slate-700 bg-[#101829] p-5">
          <h2 className="text-xl font-semibold">SDK-built candidate comparison</h2>
          <p className="mt-2 text-sm text-slate-400">Identical 1,000,000,000-token supply (6 decimals), SOL quote (9 decimals), immutable SPL token, DAMM v2 migration, fixed fees, zero vesting. Values below are from SDK buildCurve() construction, not live swap quotes.</p>
          <table className="mt-5 w-full min-w-[620px] text-left text-sm"><thead><tr className="border-b border-slate-700 text-cyan-300"><th className="p-3">Candidate</th><th className="p-3">Fee</th><th className="p-3">Migration threshold</th><th className="p-3">Migration supply</th><th className="p-3">SDK result</th></tr></thead><tbody>
            {comparisons.map((item) => <tr key={item.id} className={`border-b border-slate-800 ${selected === item.id ? "bg-cyan-950/30" : ""}`}><td className="p-3">{STRATEGIES.find(s => s.id === item.id)?.label}</td><td className="p-3">{item.feeBps} bps</td><td className="p-3">{item.thresholdSol} SOL</td><td className="p-3">{item.migrationSupplyPercent}%</td><td className="p-3">{item.valid ? `Built · ${item.segments} segments` : `Rejected: ${item.error || "unexpected curve output"}`}</td></tr>)}
          </tbody></table>
          <p className="mt-4 text-sm text-slate-300">{comparisons.find(item => item.id === selected)?.rationale}</p>
          <p className="mt-2 text-xs text-amber-200">SDK parameter construction does not validate executable devnet transactions or economic behavior. Use the separate SDK quote panel below for independent launch-price comparisons. Selecting a profile does not change Step 4, simulation, or deployment inputs in this first safe increment.</p>
        </section>
        <SdkQuoteComparison />
        <CurvePreview strategy={selected} />
        <section className="mt-6 rounded-3xl border border-slate-800 bg-[#101829] p-6 md:p-8" aria-live="polite">
          <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-2xl font-semibold">{current.label} <span className="font-normal text-slate-400">/ design brief</span></h2><span className="rounded-full border border-cyan-800 px-3 py-1 text-xs text-cyan-300">Strategy intent</span></div>
          <dl className="mt-6 grid gap-4 md:grid-cols-2">
            {([ ["Curve objective",current.curveIntent], ["Fee objective",current.feeIntent], ["Graduation objective",current.graduationIntent], ["Important tradeoff",current.tradeoff] ] as const).map(([label,value]) => (
              <div key={label} className="rounded-xl border border-slate-700/80 bg-[#0b1525] p-4"><dt className="text-xs font-semibold text-cyan-300">{label}</dt><dd className="mt-2 text-sm leading-relaxed text-slate-200">{value}</dd></div>
            ))}
          </dl>
          <p className="mt-5 rounded-xl border border-amber-700/40 bg-amber-950/20 p-4 text-sm leading-relaxed text-amber-200">The comparison above constructs Meteora SDK configuration parameters. The chart remains illustrative, not an SDK quote or price forecast. No transaction simulation or deployment has occurred. Next: verified SDK configuration, transaction review, wallet signature.</p>
        </section>
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 pb-10"><div className="flex flex-wrap items-center gap-3"><Link href="/launch" className="inline-flex rounded-xl border border-cyan-500/60 px-5 py-3 font-semibold text-cyan-300 transition hover:bg-cyan-950">← Back to asset draft</Link><Link href={`/dbc-config?strategy=${encodeURIComponent(selected)}`} className="inline-flex rounded-xl bg-cyan-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300">Continue to Step 3: SDK Config →</Link></div><span className="text-xs text-slate-500">CurveForge / Curve Lab v0.1</span></div>
      </div>
    </main>
  );
}
