"use client";

import { useState } from "react";
import Link from "next/link";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { ClientWalletButton } from "../../components/wallet/ClientWalletButton";
import { PublicKey } from "@solana/web3.js";

const DBC_PROGRAM = new PublicKey("dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN");
type Check = { state: "idle" | "checking" | "ready" | "failed"; message: string };

export default function LaunchPage() {
  const { connection } = useConnection();
  const { connected, publicKey } = useWallet();
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [description, setDescription] = useState("");
  const [assetType, setAssetType] = useState("RWA");
  const [quote, setQuote] = useState("SOL");
  const [check, setCheck] = useState<Check>({ state: "idle", message: "Not checked yet." });

  const valid = name.trim().length >= 2 && name.trim().length <= 32 &&
    /^[A-Za-z0-9]{2,10}$/.test(symbol.trim()) &&
    description.trim().length >= 10 && description.trim().length <= 500;

  async function preflight() {
    if (!connected || !publicKey || !valid) {
      setCheck({state:"failed", message:"Connect Phantom and complete all fields correctly first."});
      return;
    }
    setCheck({ state: "checking", message: "Checking RPC and Meteora DBC program..." });
    try {
      const [version, program] = await Promise.all([
        connection.getVersion(),
        connection.getAccountInfo(DBC_PROGRAM, "confirmed"),
      ]);
      if (!program?.executable) {
        setCheck({state:"failed", message:"DBC program was not found as executable on this RPC. Verify devnet settings before continuing."});
        return;
      }
      setCheck({state:"ready", message:`RPC responsive (Solana core ${version["solana-core"] ?? "unknown"}). DBC program is executable. Draft valid. No transactions submitted.`});
    } catch(e) {
      setCheck({state:"failed", message:e instanceof Error ? e.message : "RPC preflight failed."});
    }
  }

  const inputClass = "mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400";
  const labelClass = "block text-sm font-medium text-slate-300";
  return (
    <main className="min-h-screen bg-[#070c19] px-6 py-8 text-white">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <Link href="/" className="text-2xl font-bold">Curve<span className="text-cyan-400">Forge</span></Link>
          <ClientWalletButton />
        </header>
        <section className="mt-14">
          <div className="text-sm font-medium text-cyan-400">STEP 1 / LAUNCH DRAFT · DEVNET</div>
          <h1 className="mt-3 text-4xl font-bold">Describe your asset</h1>
          <p className="mt-4 max-w-3xl text-slate-400">Prepare a token launch draft and verify Meteora connectivity. This step does not create a token, configure a curve, or request a wallet signature.</p>
        </section>
        <div className="mt-10 grid gap-6 lg:grid-cols-5">
          <section className="space-y-5 rounded-2xl border border-slate-800 bg-slate-900 p-6 lg:col-span-3">
            <div><label htmlFor="token-name" className={labelClass}>Asset / token name</label>
              <input id="token-name" className={inputClass} maxLength={32} value={name} onChange={e=>setName(e.target.value)} placeholder="Example: Rental Revenue Token" /></div>
            <div><label htmlFor="token-symbol" className={labelClass}>Symbol (2–10 letters or numbers)</label>
              <input id="token-symbol" className={inputClass} maxLength={10} value={symbol} onChange={e=>setSymbol(e.target.value.toUpperCase())} placeholder="RENT" /></div>
            <div><label htmlFor="description" className={labelClass}>Description (10–500 characters)</label>
              <textarea id="description" className={inputClass} rows={4} maxLength={500} value={description} onChange={e=>setDescription(e.target.value)} placeholder="Describe your asset and intended liquidity needs..." /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label htmlFor="asset-type" className={labelClass}>Asset category</label>
                <select id="asset-type" className={inputClass} value={assetType} onChange={e=>setAssetType(e.target.value)}>
                  {["RWA","EQUITY","AI","MEME","CUSTOM"].map(item=><option key={item} value={item}>{item}</option>)}
                </select></div>
              <div><label htmlFor="quote-token" className={labelClass}>Preferred quote</label>
                <select id="quote-token" className={inputClass} value={quote} onChange={e=>setQuote(e.target.value)}>
                  <option value="SOL">SOL</option><option value="USDC">USDC</option>
                </select></div>
            </div>
            <p className="text-xs text-amber-300">Quote selection is only a draft preference. Actual devnet mint support and Meteora curve parameters must be validated before deployment.</p>
            <button onClick={preflight} disabled={check.state==="checking" || !valid || !connected}
              className="rounded-xl bg-cyan-400 px-6 py-3 font-semibold text-slate-950 enabled:hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-40">
              {check.state==="checking" ? "Checking..." : "Verify launch readiness"}
            </button>
            <p role="status" className={`text-sm ${check.state==="failed" ? "text-rose-300" : check.state==="ready" ? "text-emerald-300" : "text-slate-400"}`}>{check.message}</p>
          </section>
          <aside className="rounded-2xl border border-slate-800 bg-slate-900 p-6 lg:col-span-2">
            <h2 className="text-xl font-semibold">Launch draft summary</h2>
            <dl className="mt-5 space-y-4 text-sm">
              <div><dt className="text-slate-400">Wallet</dt><dd className="mt-1 break-all font-mono">{publicKey?.toBase58() ?? "Not connected"}</dd></div>
              <div><dt className="text-slate-400">Name</dt><dd className="mt-1">{name || "—"}</dd></div>
              <div><dt className="text-slate-400">Symbol</dt><dd className="mt-1">{symbol || "—"}</dd></div>
              <div><dt className="text-slate-400">Category / quote</dt><dd className="mt-1">{assetType} / {quote}</dd></div>
              <div><dt className="text-slate-400">Meteora DBC program</dt><dd className="mt-1 break-all font-mono text-xs">{DBC_PROGRAM.toBase58()}</dd></div>
            </dl>
            <div className="mt-7 rounded-xl border border-cyan-900 bg-cyan-950/30 p-4 text-sm text-slate-300">
              <strong className="text-cyan-300">Next milestone:</strong> verified SDK configuration builder, curve parameter validation, and transaction simulation.
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
