"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Keypair, PublicKey, Transaction } from "@solana/web3.js";
import { NATIVE_MINT } from "@solana/spl-token";
import { DynamicBondingCurveClient, deriveDbcPoolAddress } from "@meteora-ag/dynamic-bonding-curve-sdk";
import { ClientWalletButton } from "../../components/wallet/ClientWalletButton";

const DBC_PROGRAM = new PublicKey("dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN");
type Prepared = { transaction: Transaction; mint: Keypair; pool: PublicKey; config: PublicKey; wallet: string };
type Success = { signature: string; mint: string; pool: string; config: string };
const displayError = (e: unknown) => e instanceof Error ? e.message : String(e);
const cancelled = (e: unknown) => {
  const x = e as {code?: number; name?: string; message?: string} | null;
  return x?.code === 4001 || /user rejected|user declined|cancelled|canceled/i.test(x?.message ?? "");
};

export default function PoolLaunchPage() {
  const { connection } = useConnection();
  const { publicKey, connected, signTransaction } = useWallet();
  const [configAddress, setConfigAddress] = useState("");
  const [name, setName] = useState("CurveForge Demo Token");
  const [symbol, setSymbol] = useState("CFDEMO");
  const [metadataUri, setMetadataUri] = useState("");
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState("");
  const [prepared, setPrepared] = useState<Prepared | null>(null);
  const [result, setResult] = useState<Success | null>(null);
  const [previousPool, setPreviousPool] = useState<string | null>(null);
  const lock = useRef(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const config = params.get("config");
    if (config) setConfigAddress(config);
    // Restore a previous deployment as a navigation shortcut, never as proof of a fresh launch.
    try {
      const saved = window.localStorage.getItem("curveforge:lastDevnetPool");
      if (saved) {
        const key = new PublicKey(saved);
        setPreviousPool(key.toBase58());
      }
    } catch { /* Missing/invalid storage: no shortcut. */ }
  }, []);
  const update = (setter: (v: string) => void) => (value: string) => {
    setter(value); setPrepared(null); setReport(""); setResult(null);
  };

  const prepare = async () => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setReport(""); setResult(null); setPrepared(null);
    try {
      if (process.env.NEXT_PUBLIC_SOLANA_NETWORK !== "devnet") throw new Error("Only Solana devnet is allowed for this milestone.");
      if (!connected || !publicKey) throw new Error("Connect a devnet wallet first.");
      let config: PublicKey;
      try { config = new PublicKey(configAddress.trim()); }
      catch { throw new Error("Enter a valid, already deployed DBC configuration address."); }
      if (name.trim().length < 2 || name.trim().length > 32) throw new Error("Token name must be 2–32 characters.");
      if (!/^[A-Za-z0-9]{2,10}$/.test(symbol.trim())) throw new Error("Symbol must be 2–10 letters/numbers.");
      let url: URL;
      try { url = new URL(metadataUri.trim()); }
      catch { throw new Error("Provide a valid HTTPS token metadata JSON URL or IPFS gateway URL."); }
      if (url.protocol !== "https:" || metadataUri.length > 200) throw new Error("Metadata URI must be an HTTPS URL, 200 characters or less.");
      const account = await connection.getAccountInfo(config, "confirmed");
      if (!account || !account.owner.equals(DBC_PROGRAM)) throw new Error("The configuration account does not exist on this RPC or is not owned by Meteora DBC.");
      const client = new DynamicBondingCurveClient(connection, "confirmed");
      const configState = await client.state.getPoolConfig(config);
      if (!configState) throw new Error("SDK cannot decode that DBC configuration.");
      if (!configState.quoteMint.equals(NATIVE_MINT)) throw new Error("This demo currently supports SOL-quoted configurations only.");
      const baseMint = Keypair.generate();
      const transaction = await client.creator.createPool({
        baseMint: baseMint.publicKey,
        config,
        name: name.trim(),
        symbol: symbol.trim(),
        uri: url.toString(),
        payer: publicKey,
        poolCreator: publicKey,
      });
      transaction.feePayer = publicKey;
      transaction.recentBlockhash = (await connection.getLatestBlockhash("confirmed")).blockhash;
      transaction.partialSign(baseMint);
      const simulated = await connection.simulateTransaction(transaction, undefined, false);
      const pool = deriveDbcPoolAddress(NATIVE_MINT, baseMint.publicKey, config);
      setReport([
        `Network: devnet`, `Existing config: ${config.toBase58()}`,
        `New mint: ${baseMint.publicKey.toBase58()}`, `Derived DBC pool: ${pool.toBase58()}`,
        `Instructions: ${transaction.instructions.length}`, `Compute units: ${simulated.value.unitsConsumed ?? "n/a"}`,
        `Simulation: ${simulated.value.err === null ? "SUCCESS" : JSON.stringify(simulated.value.err)}`,
        "", ...(simulated.value.logs ?? []),
      ].join("\n"));
      if (simulated.value.err !== null) throw new Error("Simulation failed. No transaction was sent.");
      setPrepared({transaction, mint: baseMint, pool, config, wallet: publicKey.toBase58()});
    } catch (e) {
      setReport(old => `${old ? old + "\n\n" : ""}${displayError(e)}`);
    } finally { lock.current = false; setBusy(false); }
  };

  const deploy = async () => {
    if (lock.current || !prepared || !connected || !publicKey || !signTransaction) return;
    lock.current = true; setBusy(true);
    try {
      if (process.env.NEXT_PUBLIC_SOLANA_NETWORK !== "devnet" || publicKey.toBase58() !== prepared.wallet) throw new Error("Wallet or network changed. Prepare again.");
      const latest = await connection.getLatestBlockhash("confirmed");
      const transaction = prepared.transaction;
      transaction.recentBlockhash = latest.blockhash;
      transaction.feePayer = publicKey;
      transaction.signatures = [];
      transaction.partialSign(prepared.mint);
      const simulation = await connection.simulateTransaction(transaction, undefined, false);
      if (simulation.value.err !== null) throw new Error(`Final simulation failed: ${JSON.stringify(simulation.value.err)}\n${(simulation.value.logs ?? []).join("\n")}`);
      const signed = await signTransaction(transaction);
      if (!signed.verifySignatures()) throw new Error("Required wallet and mint signatures missing.");
      const signature = await connection.sendRawTransaction(signed.serialize(), {skipPreflight:false, preflightCommitment:"confirmed"});
      const confirmation = await connection.confirmTransaction({signature, blockhash:latest.blockhash, lastValidBlockHeight:latest.lastValidBlockHeight}, "confirmed");
      if (confirmation.value.err !== null) throw new Error(`Transaction submitted but failed: ${JSON.stringify(confirmation.value.err)}; signature ${signature}`);
      const client = new DynamicBondingCurveClient(connection, "confirmed");
      const state = await client.state.getPool(prepared.pool);
      if (!state) throw new Error(`Transaction confirmed, but pool state not found. Check signature ${signature}`);
      setResult({signature, mint:prepared.mint.publicKey.toBase58(), pool:prepared.pool.toBase58(), config:prepared.config.toBase58()});
      setPreviousPool(prepared.pool.toBase58());
      try { window.localStorage.setItem("curveforge:lastDevnetPool", prepared.pool.toBase58()); } catch { /* Storage optional. */ }
      setReport(`DEVNET POOL VERIFIED\nSignature: ${signature}\nMint: ${prepared.mint.publicKey.toBase58()}\nPool: ${prepared.pool.toBase58()}`);
      setPrepared(null);
    } catch (e) {
      if (cancelled(e)) {
        setReport("Phantom request cancelled. No transaction was submitted by this attempt. You may review and try again.");
      } else {
        setReport(`Deployment error: ${displayError(e)}\nIf a signature was produced, check Explorer before retrying.`);
        setPrepared(null);
      }
    } finally {lock.current=false;setBusy(false);}
  };
  const input = (title: string, value: string, setter: (v: string) => void, hint: string) => <label className="block text-sm text-slate-300">
    {title}<input className="mt-2 block w-full rounded-lg border border-slate-600 bg-slate-950 p-3 font-mono text-sm text-white focus:border-cyan-400 outline-none" value={value} onChange={e=>update(setter)(e.target.value)} placeholder={hint} disabled={busy || !!result}/>
  </label>;
  return <main className="min-h-screen bg-[#060b16] px-5 py-8 text-slate-100"><div className="mx-auto max-w-5xl">
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5"><Link href="/dbc-deploy" className="text-2xl font-black">Curve<span className="text-cyan-400">Forge</span><span className="ml-2 text-xs text-slate-500">/ POOL LAB</span></Link><ClientWalletButton /></header>
    <p className="mt-12 text-xs font-bold tracking-widest text-cyan-400">07 / METEORA DBC · DEVNET POOL CREATION</p>
    <h1 className="mt-3 text-4xl font-bold">Create the first real DBC pool</h1>
    <p className="mt-3 max-w-3xl text-slate-400">Use a previously deployed DBC configuration to create a token mint and virtual bonding-curve pool. Simulation is separate from explicit Phantom approval.</p>
    <div className="mt-6 rounded-xl border border-amber-700/60 bg-amber-950/20 p-4 text-sm text-amber-200">DEVNET ONLY. Signing creates permanent on-chain test accounts and uses devnet SOL for rent/fees. The token metadata URI must point to valid public metadata JSON. This does not tokenize legal ownership of an RWA.</div>
    <section className="mt-7 space-y-5 rounded-2xl border border-slate-700 bg-[#101829] p-6">
      {input("Existing deployed DBC config address",configAddress,setConfigAddress,"Paste verified config public key")}
      <div className="grid gap-5 sm:grid-cols-2">{input("Token name",name,setName,"Demo Token")}{input("Token symbol",symbol,setSymbol,"DEMO")}</div>
      {input("Metadata JSON URI (HTTPS)",metadataUri,setMetadataUri,"https://your-domain.example/token.json")}
      <p className="text-xs text-slate-400">Metadata JSON should identify this exact token and image. The URI is written on-chain; verify it before signing. No private key or seed phrase is requested or saved.</p>
      <button className="rounded-lg bg-cyan-400 px-6 py-3 font-semibold text-slate-950 disabled:opacity-50" disabled={busy || !connected || !!result} onClick={prepare}>{busy ? "Working…" : "1. Prepare & simulate (no signing)"}</button>
    </section>
    {prepared && <section className="mt-6 rounded-2xl border border-cyan-700 bg-[#101829] p-6"><h2 className="text-xl font-semibold">2. Review before signing</h2><p className="mt-3 break-all text-sm">New token mint: {prepared.mint.publicKey.toBase58()}</p><p className="mt-2 break-all text-sm">Derived pool: {prepared.pool.toBase58()}</p><p className="mt-2 break-all text-sm">Config: {prepared.config.toBase58()}</p><p className="mt-3 text-sm text-amber-200">This will create a new mint and DBC pool on DEVNET; it will not create a second configuration. Check wallet prompts carefully.</p><button disabled={busy || !signTransaction} onClick={deploy} className="mt-5 rounded-lg bg-emerald-400 px-6 py-3 font-semibold text-slate-950 disabled:opacity-50">2. Sign in Phantom & create pool</button></section>}
    {result && <section className="mt-6 rounded-2xl border border-emerald-700 bg-emerald-950/20 p-6"><h2 className="text-xl font-semibold text-emerald-300">DBC pool verified on devnet</h2><p className="mt-3 break-all">Mint: {result.mint}</p><p className="mt-2 break-all">Pool: {result.pool}</p><a href={`https://explorer.solana.com/tx/${result.signature}?cluster=devnet`} target="_blank" rel="noopener noreferrer" className="mt-3 block text-cyan-300 underline">View transaction on Explorer ↗</a><Link href={`/dbc-dashboard?pool=${encodeURIComponent(result.pool)}&mint=${encodeURIComponent(result.mint)}`} className="mt-5 inline-block rounded-lg bg-cyan-400 px-6 py-3 font-semibold text-slate-950">Continue to Step 8: Live Pool Dashboard →</Link></section>}
    {report && <section className="mt-6 rounded-2xl border border-slate-700 bg-[#101829] p-6"><h2 className="text-lg font-semibold">Transaction diagnostics</h2><pre className="mt-4 max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-[#050a13] p-4 text-xs">{report}</pre></section>}
    {!result && <section className="mt-6 rounded-2xl border border-slate-700 bg-[#101829] p-5">
      <h2 className="text-lg font-semibold">Step 8 — Live Pool Dashboard</h2>
      <p className="mt-2 text-sm text-slate-400">Already deployed a pool? Open the live dashboard without creating another token. The dashboard verifies pool data from devnet.</p>
      {previousPool ? <Link href={`/dbc-dashboard?pool=${encodeURIComponent(previousPool)}`} className="mt-4 inline-block rounded-lg bg-cyan-400 px-5 py-3 font-semibold text-slate-950">Continue to Step 8: Last launched pool →</Link>
        : <Link href="/dbc-dashboard" className="mt-4 inline-block rounded-lg border border-cyan-500 px-5 py-3 font-semibold text-cyan-300">Go to Step 8: Enter existing pool address →</Link>}
    </section>}
    <nav className="mt-8 text-sm text-cyan-300"><Link href="/dbc-deploy">← Step 6: Configuration deployment</Link></nav>
  </div></main>;
}
