"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BN } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { NATIVE_MINT } from "@solana/spl-token";
import { useConnection } from "@solana/wallet-adapter-react";
import { DynamicBondingCurveClient } from "@meteora-ag/dynamic-bonding-curve-sdk";

const DEMO_POOL = "FcNZGEpkaWSecu6b85GsAinpyCKFo3iCQknVcBjyRxkW";
const SOL_DECIMALS = 9;
const TOKEN_DECIMALS = 6; // CurveForge demo mint; configurable token-decimal support is a later milestone.
const LAMPORTS_PER_SOL_BIG = BigInt(1000000000);
const TOKEN_SCALE = BigInt(1000000);

type Point = { lamports: string; sol: number; tokens: number; tokensRaw: string; minimumRaw: string; effectiveSolPerToken: number };
type Snapshot = { pool: string; mint: string; at: string; blockTime: number; points: Point[]; failed: number; };

function readAmount(raw: string): string {
  const trimmed = raw.trim();
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,3})?$/.test(trimmed)) throw new Error("Max input must be a positive SOL amount with up to 3 decimal places.");
  const [whole, fraction = ""] = trimmed.split(".");
  const lamports = BigInt(whole) * LAMPORTS_PER_SOL_BIG + BigInt(fraction.padEnd(SOL_DECIMALS, "0") || "0");
  if (lamports < BigInt(1000000) || lamports > BigInt(1000000000)) throw new Error("Choose a max input between 0.001 and 1 SOL.");
  return lamports.toString();
}

function asAtomicString(raw: string, decimals: number): number {
  const val = Number(raw) / 10 ** decimals;
  if (!Number.isFinite(val) || val <= 0) throw new Error("Invalid quote value received from SDK.");
  return val;
}

function getBN(record: Record<string, unknown>, names: string[]): string {
  for (const key of names) {
    const field = record[key];
    if (field !== null && field !== undefined) return String(field);
  }
  throw new Error(`SDK quote missing field: ${names.join(" or ")}`);
}

function axis(n: number) {
  return Number.isFinite(n) ? n.toLocaleString("en-US", { maximumSignificantDigits: 5 }) : "—";
}

export default function DbcCurvePage() {
  const { connection } = useConnection();
  const [pool, setPool] = useState(DEMO_POOL);
  const [maxSol, setMaxSol] = useState("0.1");
  const [status, setStatus] = useState<"idle" | "loading">("idle");
  const [error, setError] = useState("");
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);

  useEffect(() => {
    const url = new URLSearchParams(window.location.search).get("pool");
    if (url) setPool(url);
  }, []);

  async function calculate() {
    setStatus("loading");
    setError("");
    setSnapshot(null);
    try {
      if (process.env.NEXT_PUBLIC_SOLANA_NETWORK !== "devnet") throw new Error("This analysis is restricted to devnet.");
      const maxAtomic = BigInt(readAmount(maxSol));
      const poolKey = new PublicKey(pool.trim());
      const client = new DynamicBondingCurveClient(connection, "confirmed");
      const virtualPool = await client.state.getPool(poolKey);
      if (!virtualPool) throw new Error("DBC pool not found on devnet.");
      const config = await client.state.getPoolConfig(virtualPool.poolState.config);
      if (!config) throw new Error("DBC pool configuration not found.");
      if (!config.quoteMint.equals(NATIVE_MINT)) throw new Error("The first chart supports SOL-quoted pools only.");
      const slot = await connection.getSlot("confirmed");
      const blockTime = await connection.getBlockTime(slot);
      if (blockTime === null) throw new Error("Could not obtain chain time for fee schedule.");
      // Each quote is independently calculated against the SAME chain snapshot.
      // These are cumulative input quotes, not successive swaps or future state forecasts.
      const counts = 14;
      const values = Array.from({ length: counts }, (_, i) =>
        BigInt(1000000) + (maxAtomic - BigInt(1000000)) * BigInt(i) / BigInt(counts - 1)
      );
      const distinct = [...new Set(values.map(v => v.toString()))];
      const points: Point[] = [];
      let failed = 0;
      for (const input of distinct) {
        try {
          const result = client.pool.swapQuote({
            virtualPool,
            config,
            swapBaseForQuote: false,
            amountIn: new BN(input),
            slippageBps: 100,
            hasReferral: false,
            eligibleForFirstSwapWithMinFee: false,
            currentPoint: new BN(blockTime),
          });
          const fields = result as unknown as Record<string, unknown>;
          const tokensRaw = getBN(fields, ["outputAmount", "amountOut", "output_amount"]);
          const minimumRaw = getBN(fields, ["minimumAmountOut", "minimum_amount_out"]);
          const tokens = asAtomicString(tokensRaw, TOKEN_DECIMALS);
          const sol = asAtomicString(input, SOL_DECIMALS);
          points.push({ lamports: input, sol, tokens, tokensRaw, minimumRaw, effectiveSolPerToken: sol / tokens });
        } catch (e) {
          // A quote can exceed pool limits; retain successful samples and report omissions.
          if (e instanceof Error && /missing field|Invalid quote value/i.test(e.message)) throw e;
          failed++;
        }
      }
      if (points.length < 2) throw new Error("Not enough executable SDK buy quotes for a chart. Try a smaller max SOL input.");
      setSnapshot({ pool: poolKey.toBase58(), mint: virtualPool.poolState.baseMint.toBase58(), at: new Date().toLocaleString(), blockTime, points, failed });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setStatus("idle");
    }
  }

  const points = snapshot?.points ?? [];
  const chartW = 880;
  const chartH = 300;
  const margin = { left: 90, right: 36, top: 30, bottom: 62 };
  const plotW = chartW - margin.left - margin.right;
  const plotH = chartH - margin.top - margin.bottom;
  const minX = points.length ? points[0].sol : 0;
  const maxX = points.length ? points[points.length - 1].sol : 1;
  const minimumPrice = points.length ? Math.min(...points.map(p => p.effectiveSolPerToken)) : 0;
  const maximumPrice = points.length ? Math.max(...points.map(p => p.effectiveSolPerToken)) : 1;
  const priceRange = Math.max(maximumPrice - minimumPrice, maximumPrice * 0.02, 1e-15);
  const chartMin = Math.max(0, minimumPrice - priceRange * 0.08);
  const chartMax = maximumPrice + priceRange * 0.08;
  const toX = (x: number) => margin.left + ((x - minX) / Math.max(maxX - minX, 1e-12)) * plotW;
  const toY = (y: number) => margin.top + (1 - (y - chartMin) / Math.max(chartMax - chartMin, 1e-20)) * plotH;
  const path = points.map((point, idx) => `${idx === 0 ? "M" : "L"}${toX(point.sol).toFixed(2)},${toY(point.effectiveSolPerToken).toFixed(2)}`).join(" ");

  return <main className="min-h-screen bg-[#060b16] px-5 py-8 text-slate-100"><div className="mx-auto max-w-6xl">
    <header className="flex items-center justify-between border-b border-white/10 pb-5"><Link href="/" className="text-2xl font-extrabold">Curve<span className="text-cyan-400">Forge</span></Link><span className="text-xs font-semibold text-cyan-300">DEVNET · READ ONLY</span></header>
    <p className="mt-12 text-xs font-bold tracking-[.18em] text-cyan-400">10 / SDK-BASED LIQUIDITY ENGINEERING</p>
    <h1 className="mt-3 text-4xl font-bold">Quote Impact Curve</h1>
    <p className="mt-3 max-w-4xl text-slate-400">Explore how the <strong className="text-slate-200">average effective purchase price</strong> changes with trade size using real Meteora DBC swapQuote() results. Each point is independently quoted against one on-chain pool snapshot; it is not a sequence of trades or a historical chart.</p>
    <section className="mt-7 rounded-2xl border border-slate-700 bg-[#101829] p-6">
      <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <label className="text-sm text-slate-300">Devnet pool address<input value={pool} onChange={e => { setPool(e.target.value); setSnapshot(null); }} className="mt-2 w-full rounded-lg border border-slate-600 bg-slate-950 p-3 font-mono text-sm" /></label>
        <label className="text-sm text-slate-300">Maximum buy amount (SOL)<input value={maxSol} onChange={e => { setMaxSol(e.target.value); setSnapshot(null); }} inputMode="decimal" className="mt-2 w-full rounded-lg border border-slate-600 bg-slate-950 p-3 font-mono text-sm" /></label>
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-4"><button onClick={calculate} disabled={status === "loading"} className="rounded-lg bg-cyan-400 px-6 py-3 font-semibold text-slate-950 hover:bg-cyan-300 disabled:opacity-50">{status === "loading" ? "Reading SDK quotes…" : "Generate live quote curve"}</button><span className="text-xs text-slate-400">14 sample inputs · 1% slippage · no wallet signature</span></div>
      {error && <p role="alert" className="mt-4 rounded-lg border border-amber-700 bg-amber-950/20 p-4 text-sm text-amber-200">{error}</p>}
    </section>
    {snapshot && <>
      <section className="mt-6 rounded-2xl border border-cyan-800/60 bg-[#101829] p-6">
        <div className="flex flex-wrap justify-between gap-3"><h2 className="text-xl font-semibold text-emerald-300">SDK quote impact curve</h2><span className="text-xs text-slate-400">Snapshot: {snapshot.at} · Chain time {snapshot.blockTime}</span></div>
        <p className="mt-2 text-sm text-slate-400">Y axis: average SOL spent per token acquired (includes input-side fees). X axis: independent SOL buy input. <strong className="text-slate-300">Not marginal spot price.</strong></p>
        <div className="mt-6 overflow-x-auto"><svg viewBox={`0 0 ${chartW} ${chartH}`} role="img" aria-label="SDK-quoted average SOL per token by buy size" className="min-w-[620px] w-full">
          {[0,1,2,3,4].map(i => { const v = chartMin + (chartMax - chartMin) * i / 4; const y = toY(v); return <g key={i}><line x1={margin.left} x2={chartW-margin.right} y1={y} y2={y} stroke="#334155" strokeDasharray="4 6"/><text x={margin.left - 10} y={y + 4} textAnchor="end" fontSize="12" fill="#94a3b8">{v.toExponential(3)}</text></g>; })}
          <line x1={margin.left} x2={chartW-margin.right} y1={chartH-margin.bottom} y2={chartH-margin.bottom} stroke="#64748b"/>
          <path d={path} fill="none" stroke="#22d3ee" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round"/>
          {points.map((p,i) => <circle key={p.lamports} cx={toX(p.sol)} cy={toY(p.effectiveSolPerToken)} r={i === points.length-1 ? 5 : 3.5} fill="#67e8f9"><title>{`${p.sol} SOL: ${axis(p.tokens)} tokens; ${p.effectiveSolPerToken.toExponential(5)} SOL/token`}</title></circle>)}
          {[0,1,2,3,4].map(i => { const x = margin.left + plotW*i/4; return <text key={i} x={x} y={chartH-margin.bottom+24} textAnchor="middle" fontSize="12" fill="#94a3b8">{axis(minX+(maxX-minX)*i/4)}</text>; })}
          <text x={margin.left+plotW/2} y={chartH-9} textAnchor="middle" fontSize="13" fill="#cbd5e1">Buy amount (SOL)</text>
        </svg></div>
        <p className="mt-3 text-xs text-slate-400">{points.length} successful SDK samples{snapshot.failed ? ` · ${snapshot.failed} samples outside quote limits` : ""}. Pool: {snapshot.pool} · Mint: {snapshot.mint}</p>
      </section>
      <section className="mt-5 overflow-hidden rounded-2xl border border-slate-700 bg-[#101829] p-6"><h2 className="text-xl font-semibold">Underlying SDK quote samples</h2><p className="mt-2 text-sm text-slate-400">Estimated output and 1% minimum output are quoted tokens, not executed fills.</p><div className="mt-5 overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="border-b border-slate-600 text-slate-400"><tr><th className="p-3">Input (SOL)</th><th className="p-3">Estimated tokens</th><th className="p-3">Min tokens (1%)</th><th className="p-3">Avg SOL/token</th></tr></thead><tbody>{points.map(p => <tr key={p.lamports} className="border-b border-slate-800 font-mono"><td className="p-3">{axis(p.sol)}</td><td className="p-3">{axis(p.tokens)}</td><td className="p-3">{axis(Number(p.minimumRaw)/Number(TOKEN_SCALE))}</td><td className="p-3">{p.effectiveSolPerToken.toExponential(6)}</td></tr>)}</tbody></table></div></section>
      <p className="mt-5 text-xs text-amber-200">Quote-only analysis. Independent quotes do not model sequential trades, external trades, future price changes, wallet balances or guaranteed execution. Demonstration assumes a 6-decimal base token and timestamp-activated, SOL-quoted Meteora pool.</p>
    </>}
    <nav className="mt-9 text-sm text-cyan-300"><Link href={`/dbc-quotes?pool=${encodeURIComponent(pool.trim())}`}>← Step 9: Live Swap Quotes</Link></nav>
  </div></main>;
}
