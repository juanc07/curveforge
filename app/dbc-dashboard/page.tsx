"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PublicKey } from "@solana/web3.js";
import { NATIVE_MINT } from "@solana/spl-token";
import { useConnection } from "@solana/wallet-adapter-react";
import { DynamicBondingCurveClient } from "@meteora-ag/dynamic-bonding-curve-sdk";

type PoolDetails = {
  pool: string;
  mint: string;
  config: string;
  quoteMint: string;
  quoteReserve: string;
  baseReserve: string;
  threshold: string;
  progress: number;
  baseProgress: number | null;
  migrated: boolean | null;
  observed: string;
};

const displayError = (e: unknown) => e instanceof Error ? e.message : String(e);
const formatUnits = (raw: string, decimals: number, digits=6) => {
  // Keep arbitrary precision balances as decimal strings before display.
  const n = BigInt(raw);
  const denom = BigInt(10) ** BigInt(decimals);
  const integer = (n / denom).toLocaleString("en-US");
  const fraction = (n % denom).toString().padStart(decimals, "0").slice(0, digits).replace(/0+$/, "");
  return fraction ? `${integer}.${fraction}` : integer;
};
const shorten = (a: string) => `${a.slice(0, 7)}…${a.slice(-7)}`;

export default function LivePoolDashboard() {
  const { connection } = useConnection();
  const [poolInput, setPoolInput] = useState("");
  const [urlReady, setUrlReady] = useState(false);
  const [mintHint, setMintHint] = useState("");
  const [details, setDetails] = useState<PoolDetails | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pool = params.get("pool");
    if (pool) setPoolInput(pool);
    const mint = params.get("mint");
    if (mint) setMintHint(mint);
    setUrlReady(true);
  }, []);

  const refresh = useCallback(async () => {
    setError(""); setLoading(true);
    try {
      if (process.env.NEXT_PUBLIC_SOLANA_NETWORK !== "devnet") throw new Error("This dashboard is restricted to devnet.");
      let address: PublicKey;
      try { address = new PublicKey(poolInput.trim()); }
      catch { throw new Error("Enter a valid Meteora DBC pool public key."); }
      const client = new DynamicBondingCurveClient(connection, "confirmed");
      const state = await client.state.getPool(address);
      if (!state) throw new Error("DBC pool not found on the current devnet RPC.");
      const pool = state.poolState;
      const config = await client.state.getPoolConfig(pool.config);
      if (!config) throw new Error("Pool exists but its DBC configuration could not be decoded.");
      const progress = await client.state.getPoolQuoteTokenCurveProgress(address);
      let baseProgress: number | null = null;
      try {
        const value = await client.state.getPoolBaseTokenCurveProgress(address);
        if (Number.isFinite(value)) baseProgress = Math.max(0, Math.min(1, value));
      } catch { /* base progress is optional; do not hide verified reserve values */ }
      const quoteMint = config.quoteMint.toBase58();
      setDetails({
        pool: address.toBase58(),
        mint: pool.baseMint.toBase58(),
        config: pool.config.toBase58(),
        quoteMint,
        quoteReserve: pool.quoteReserve.toString(),
        baseReserve: pool.baseReserve.toString(),
        threshold: config.migrationQuoteThreshold.toString(),
        progress: Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 0,
        baseProgress,
        // Graduation/migration status requires a separate SDK status check.
        migrated: null,
        observed: new Date().toLocaleString(),
      });
      setMintHint(pool.baseMint.toBase58());
    } catch(e) { setError(displayError(e)); setDetails(null); }
    finally { setLoading(false); }
  }, [connection, poolInput]);

  const info = (title: string, value: string, sub?: string) => <div className="rounded-xl border border-slate-700 bg-slate-900 p-5">
    <p className="text-xs uppercase tracking-wider text-slate-400">{title}</p>
    <p className="mt-2 break-all font-mono text-lg font-semibold text-white">{value}</p>
    {sub && <p className="mt-2 text-xs text-slate-400">{sub}</p>}
  </div>;
  const isSol = details?.quoteMint === NATIVE_MINT.toBase58();
  return <main className="min-h-screen bg-[#060b16] px-5 py-8 text-slate-100"><div className="mx-auto max-w-6xl">
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
      <Link href="/" className="text-2xl font-black">Curve<span className="text-cyan-400">Forge</span><span className="ml-2 text-xs text-slate-500">/ LIVE INTELLIGENCE</span></Link>
      <span className="rounded-lg border border-cyan-700/50 bg-cyan-950/20 px-4 py-2 text-xs font-semibold text-cyan-300">DEVNET · READ ONLY</span>
    </header>
    <p className="mt-12 text-xs font-bold tracking-[.2em] text-cyan-400">08 / METEORA DBC · ON-CHAIN POOL DASHBOARD</p>
    <h1 className="mt-3 text-4xl font-bold">Live Pool Intelligence</h1>
    <p className="mt-3 max-w-3xl text-slate-400">Read verified reserves and graduation progress directly from the Meteora DBC SDK. No invented market data. Updates occur when you press Refresh.</p>
    <section className="mt-7 rounded-2xl border border-slate-700 bg-[#101829] p-6">
      <label className="text-sm text-slate-300">Deployed devnet DBC pool address
        <input value={poolInput} onChange={e => { setPoolInput(e.target.value); setDetails(null); }} placeholder={urlReady ? "Paste your verified pool address" : "Reading pool address from URL…"} className="mt-2 block w-full rounded-lg border border-slate-600 bg-slate-950 p-3 font-mono text-sm text-white outline-none focus:border-cyan-400" />
      </label>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <button onClick={refresh} disabled={!urlReady || loading || !poolInput.trim()} className="rounded-lg bg-cyan-400 px-6 py-3 font-semibold text-slate-950 disabled:opacity-50">{loading ? "Reading chain…" : details ? "Refresh on-chain data" : "Load live pool"}</button>
        <span className="text-xs text-slate-400">Devnet · Read-only · No wallet signature</span>
      </div>
      {!urlReady && <p className="mt-3 text-xs text-slate-400">Initializing pool address from link…</p>}
      {mintHint && <p className="mt-3 break-all text-xs text-slate-400">Mint hint: {mintHint}</p>}
      {error && <p role="alert" className="mt-4 rounded-lg border border-amber-700 bg-amber-950/30 p-4 text-sm text-amber-300">{error}</p>}
    </section>
    {details && <>
      <section className="mt-6 grid gap-4 md:grid-cols-3">
        {info("Quote reserve", isSol ? `${formatUnits(details.quoteReserve, 9)} SOL` : `${details.quoteReserve} base units`, isSol ? "Actual quote-side virtual reserve" : "Quote mint decimals not assumed")}
        {info("Base reserve", `${formatUnits(details.baseReserve, 6)} tokens`, "This launch template uses 6 base decimals")}
        {info("Migration threshold", isSol ? `${formatUnits(details.threshold, 9)} SOL` : `${details.threshold} base units`, "Read from the actual DBC config")}
      </section>
      <section className="mt-5 rounded-2xl border border-cyan-900 bg-gradient-to-br from-[#0d2330] to-[#101829] p-6">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold tracking-wider text-cyan-400">SDK-REPORTED QUOTE CURVE PROGRESS</p><h2 className="mt-2 text-3xl font-bold">{(details.progress*100).toFixed(2)}%</h2></div><span className="text-xs text-slate-300">Read at {details.observed}</span></div>
        <div className="mt-6 h-3 overflow-hidden rounded-full bg-slate-700"><div className="h-full rounded-full bg-cyan-400 transition-all duration-700" style={{width:`${details.progress*100}%`}} /></div>
        <div className="mt-3 flex justify-between text-xs text-slate-400"><span>Bonding curve start</span><span>Quote threshold</span></div>
        {details.baseProgress !== null && <p className="mt-5 text-sm text-slate-300">SDK base-token curve progress: {(details.baseProgress*100).toFixed(2)}%</p>}
        <p className="mt-4 text-xs text-amber-200">This reports on-chain curve progress only. It does not assert that the pool has graduated or migrated to DAMM v2.</p>
      </section>
      <section className="mt-5 grid gap-4 md:grid-cols-2">
        {info("Pool", shorten(details.pool), details.pool)}
        {info("Token mint", shorten(details.mint), details.mint)}
        {info("Configuration", shorten(details.config), details.config)}
        {info("Quote mint", isSol ? "Wrapped SOL" : shorten(details.quoteMint), details.quoteMint)}
      </section>
      <div className="mt-6 flex flex-wrap gap-5 text-sm text-cyan-300"><a href={`https://explorer.solana.com/account/${details.pool}?cluster=devnet`} target="_blank" rel="noopener noreferrer" className="underline">Pool on Explorer ↗</a><a href={`https://explorer.solana.com/address/${details.mint}?cluster=devnet`} target="_blank" rel="noopener noreferrer" className="underline">Token mint on Explorer ↗</a></div>
    </>}
    <nav className="mt-10 text-sm text-cyan-300"><Link href="/dbc-pool">← Step 7: Create DBC Pool</Link></nav>
  </div></main>;
}
