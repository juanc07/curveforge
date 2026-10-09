"use client";

import { useState } from "react";
import Link from "next/link";
import { useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { DynamicBondingCurveClient } from "@meteora-ag/dynamic-bonding-curve-sdk";
import { ClientWalletButton } from "../../components/wallet/ClientWalletButton";

type Result = { address: string; kind: "config" | "pool"; data: unknown };
function safelySerialize(value: unknown) {
  return JSON.stringify(value, (_key, item: unknown) => {
    if (typeof item === "bigint") return item.toString();
    if (item instanceof PublicKey) return item.toBase58();
    if (typeof item === "object" && item !== null && "toArrayLike" in item && typeof (item as {toString?: unknown}).toString === "function") return String(item);
    return item;
  }, 2);
}

export default function DbcInspector() {
  const { connection } = useConnection();
  const [address, setAddress] = useState("");
  const [kind, setKind] = useState<"config" | "pool">("config");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");

  async function inspect() {
    setError(""); setResult(null);
    let key: PublicKey;
    try { key = new PublicKey(address.trim()); }
    catch { setError("Enter a valid Solana public address."); return; }
    setLoading(true);
    try {
      const sdk = new DynamicBondingCurveClient(connection, "confirmed");
      const data = kind === "config" ? await sdk.state.getPoolConfig(key) : await sdk.state.getPool(key);
      if (!data) { setError(`No Meteora DBC ${kind} found at this address on the configured network. This is expected if you have not created one yet.`); return; }
      setResult({ address: key.toBase58(), kind, data });
    } catch (e) { setError(e instanceof Error ? e.message : "Could not query the Meteora SDK."); }
    finally { setLoading(false); }
  }

  return (
    <main className="min-h-screen bg-[#060b16] px-5 py-7 text-slate-100 md:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
          <Link href="/strategies" className="text-2xl font-extrabold">Curve<span className="text-cyan-400">Forge</span><span className="ml-2 text-xs text-slate-500"> / SDK LAB</span></Link>
          <ClientWalletButton />
        </header>
        <div className="mt-12 text-xs font-bold tracking-[0.2em] text-cyan-400">03 / REAL METEORA DBC STATE · DEVNET</div>
        <h1 className="mt-3 text-4xl font-bold">On-chain configuration inspector</h1>
        <p className="mt-4 max-w-3xl leading-relaxed text-slate-400">Read a real DBC configuration or virtual pool via the installed Meteora SDK. Unlike the Curve Lab preview, this view displays actual decoded chain state. Read-only: no signing or transactions.</p>
        <section className="mt-8 rounded-2xl border border-slate-700 bg-[#101829] p-6">
          <label htmlFor="account-kind" className="block text-sm text-slate-300">Account type</label>
          <select id="account-kind" value={kind} onChange={(e) => setKind(e.target.value as "config" | "pool")} className="mt-2 w-full rounded-xl border border-slate-600 bg-[#07101f] p-3 sm:max-w-xs">
            <option value="config">DBC pool configuration</option><option value="pool">DBC virtual pool</option>
          </select>
          <label htmlFor="account-address" className="mt-5 block text-sm text-slate-300">On-chain account address</label>
          <input id="account-address" value={address} onChange={(e) => setAddress(e.target.value)} spellCheck={false} placeholder="Paste an existing devnet config/pool address" className="mt-2 w-full rounded-xl border border-slate-600 bg-[#07101f] p-3 font-mono text-sm outline-none focus:border-cyan-400" />
          <button type="button" disabled={loading || !address.trim()} onClick={inspect} className="mt-5 rounded-xl bg-cyan-400 px-6 py-3 font-semibold text-slate-950 disabled:opacity-50">{loading ? "Reading on-chain state..." : "Inspect with Meteora SDK"}</button>
          {error && <p role="alert" className="mt-4 rounded-lg border border-amber-700/50 bg-amber-950/20 p-3 text-sm text-amber-200">{error}</p>}
        </section>
        {result && <section className="mt-6 rounded-2xl border border-cyan-800/50 bg-[#101829] p-6"><h2 className="text-lg font-semibold text-cyan-300">Verified {result.kind} state</h2><p className="mt-2 break-all font-mono text-xs text-slate-400">{result.address}</p><pre className="mt-5 max-h-[540px] overflow-auto rounded-xl bg-[#050a13] p-4 text-xs leading-relaxed text-slate-200">{safelySerialize(result.data)}</pre></section>}
        <div className="mt-7 flex flex-wrap items-center justify-between gap-3 text-sm"><Link href="/strategies" className="text-cyan-300 hover:underline">← Strategy lab</Link><span className="text-slate-500">Next: create a validated configuration and simulate its transaction.</span></div>
      </div>
    </main>
  );
}
