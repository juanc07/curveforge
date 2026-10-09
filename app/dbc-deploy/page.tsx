"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Keypair, Transaction, PublicKey } from "@solana/web3.js";
import { NATIVE_MINT } from "@solana/spl-token";
import {
  DynamicBondingCurveClient, buildCurve, ActivationType, BaseFeeMode,
  CollectFeeMode, MigrationFeeOption, MigrationOption,
  TokenAuthorityOption, TokenDecimal, TokenType,
} from "@meteora-ag/dynamic-bonding-curve-sdk";
import { ClientWalletButton } from "../../components/wallet/ClientWalletButton";

const PROGRAM_ID = "dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN";
const formatError = (error: unknown) => error instanceof Error ? error.message : String(error);

export default function DbcDeployPage() {
  const { connection } = useConnection();
  const { publicKey, connected, signTransaction } = useWallet();
  const [supply, setSupply] = useState("1000000000");
  const [threshold, setThreshold] = useState("100");
  const [fee, setFee] = useState("100");
  const [migrate, setMigrate] = useState("20");
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState("");
  const [walletNotice, setWalletNotice] = useState("");
  const [passed, setPassed] = useState(false);
  const [prepared, setPrepared] = useState<{tx: Transaction; config: string; keypair: Keypair; payer: string} | null>(null);
  const [deployed, setDeployed] = useState<{signature: string; config: string} | null>(null);
  const running = useRef(false);

  // Read inputs after mounting to keep the server/client initial render identical.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const supplied = ["supply", "threshold", "fee", "migration"];
    if (!supplied.every((key) => params.has(key))) return;
    const values = supplied.map((key) => params.get(key) ?? "");
    const nums = values.map(Number);
    const valid = values.every((value) => /^\d+$/.test(value)) &&
      nums.every((value) => Number.isSafeInteger(value)) &&
      nums[0] >= 1000 && nums[0] <= 1e12 &&
      nums[1] >= 1 && nums[1] <= 1e6 &&
      nums[2] >= 1 && nums[2] <= 1000 &&
      nums[3] >= 1 && nums[3] <= 99;
    if (!valid) {
      setReport("Some transferred configuration inputs are invalid. Review the values before simulation.");
      return;
    }
    setSupply(values[0]);
    setThreshold(values[1]);
    setFee(values[2]);
    setMigrate(values[3]);
  }, []);

  const simulate = async () => {
    if (running.current) return; running.current = true;
    setPrepared(null); setDeployed(null); setReport(""); setWalletNotice(""); setPassed(false);
    if (!connected || !publicKey) { setReport("Connect a Phantom devnet wallet first."); running.current = false; return; }
    const inputs = [supply, threshold, fee, migrate];
    const nums = inputs.map(Number);
    if (inputs.some(v => !/^\d+$/.test(v)) || nums.some(n => !Number.isSafeInteger(n))) {
      setReport("All inputs must be safe whole numbers."); running.current = false; return;
    }
    const [totalTokenSupply, migrationQuoteThreshold, fixedFeeBps, percentageSupplyOnMigration] = nums;
    if (totalTokenSupply < 1000 || totalTokenSupply > 1e12 || migrationQuoteThreshold < 1 || migrationQuoteThreshold > 1e6 || fixedFeeBps < 1 || fixedFeeBps > 1000 || percentageSupplyOnMigration < 1 || percentageSupplyOnMigration > 99) {
      setReport("Input out of range. Supply: 1,000–1 trillion; threshold: 1–1,000,000 SOL; fee: 1–1000 bps; migration supply: 1–99%."); running.current = false; return;
    }
    if (process.env.NEXT_PUBLIC_SOLANA_NETWORK !== "devnet") { setReport("Blocked: NEXT_PUBLIC_SOLANA_NETWORK must be devnet."); running.current = false; return; }
    setBusy(true);
    try {
      const programInfo = await connection.getAccountInfo(new PublicKey(PROGRAM_ID));
      if (!programInfo?.executable) throw new Error("DBC program is not executable on the connected RPC.");
      const configParams = buildCurve({
        token: { tokenType: TokenType.SPLToken, tokenBaseDecimal: TokenDecimal.SIX, tokenQuoteDecimal: TokenDecimal.NINE, tokenAuthorityOption: TokenAuthorityOption.Immutable, totalTokenSupply, leftover: 0 },
        fee: { baseFeeParams: { baseFeeMode: BaseFeeMode.FeeSchedulerLinear, feeSchedulerParam: { startingFeeBps: fixedFeeBps, endingFeeBps: fixedFeeBps, numberOfPeriod: 0, totalDuration: 0 } }, dynamicFeeEnabled: false, collectFeeMode: CollectFeeMode.QuoteToken, creatorTradingFeePercentage: 0, poolCreationFee: 0, enableFirstSwapWithMinFee: false },
        migration: { migrationOption: MigrationOption.MET_DAMM_V2, migrationFeeOption: MigrationFeeOption.FixedBps100, migrationFee: { feePercentage: 0, creatorFeePercentage: 0 } },
        liquidityDistribution: { partnerLiquidityPercentage: 0, partnerPermanentLockedLiquidityPercentage: 100, creatorLiquidityPercentage: 0, creatorPermanentLockedLiquidityPercentage: 0 },
        lockedVesting: { totalLockedVestingAmount: 0, numberOfVestingPeriod: 0, cliffUnlockAmount: 0, totalVestingDuration: 0, cliffDurationFromMigrationTime: 0 },
        activationType: ActivationType.Timestamp, percentageSupplyOnMigration, migrationQuoteThreshold,
      });
      // Temporary config signer stays in memory for the explicit deployment action.
      const configAccount = Keypair.generate();
      const client = new DynamicBondingCurveClient(connection, "confirmed");
      const tx: Transaction = await client.partner.createConfig({
        config: configAccount.publicKey,
        feeClaimer: publicKey,
        leftoverReceiver: publicKey,
        payer: publicKey,
        quoteMint: NATIVE_MINT,
        ...configParams,
      });
      tx.feePayer = publicKey;
      const { blockhash } = await connection.getLatestBlockhash("confirmed");
      tx.recentBlockhash = blockhash;
      // RPC simulation skips cryptographic signature verification. The wallet does not sign.
      // Sign the ephemeral config account locally so the serialization is consistent.
      tx.partialSign(configAccount);
      const result = await connection.simulateTransaction(tx, undefined, false);
      const summary = [
        `Network: devnet`, `Wallet fee payer: ${publicKey.toBase58()}`,
        `Ephemeral config account: ${configAccount.publicKey.toBase58()}`,
        `Instruction count: ${tx.instructions.length}`,
        `Compute units consumed: ${result.value.unitsConsumed ?? "unavailable"}`,
        `Simulation result: ${result.value.err === null ? "SUCCESS" : JSON.stringify(result.value.err)}`,
        "", "RPC logs:", ...(result.value.logs || ["No logs returned"]),
      ].join("\n");
      setReport(summary);
      setPassed(result.value.err === null);
      if (result.value.err === null) setPrepared({tx, config: configAccount.publicKey.toBase58(), keypair: configAccount, payer: publicKey.toBase58()});
    } catch (error) { setReport(`Simulation failed: ${formatError(error)}`); }
    finally { setBusy(false); running.current = false; }
  };

  const deploy = async () => {
    if (running.current || !prepared || !passed || !publicKey || !signTransaction || !connected) return;
    if (process.env.NEXT_PUBLIC_SOLANA_NETWORK !== "devnet" || publicKey.toBase58() !== prepared.payer) {
      setReport("Deployment blocked: wrong network or wallet changed. Prepare again."); setPrepared(null); setPassed(false); return;
    }
    running.current = true; setBusy(true); setWalletNotice("");
    try {
      // Use fresh blockhash; signatures from the prior simulation are discarded.
      const latest = await connection.getLatestBlockhash("confirmed");
      const tx = prepared.tx;
      tx.recentBlockhash = latest.blockhash;
      tx.feePayer = publicKey;
      tx.signatures = [];
      tx.partialSign(prepared.keypair);
      // Simulate the exact transaction that Phantom will be asked to sign.
      const preflight = await connection.simulateTransaction(tx, undefined, false);
      if (preflight.value.err !== null) throw new Error("Final simulation failed: " + JSON.stringify(preflight.value.err) + "\n" + (preflight.value.logs ?? []).join("\n"));
      const signed = await signTransaction(tx);
      if (!signed.verifySignatures()) throw new Error("Required config and wallet signatures were not both present.");
      const signature = await connection.sendRawTransaction(signed.serialize(), {skipPreflight: false, preflightCommitment: "confirmed"});
      const confirmation = await connection.confirmTransaction({signature, blockhash: latest.blockhash, lastValidBlockHeight: latest.lastValidBlockHeight}, "confirmed");
      if (confirmation.value.err !== null) throw new Error("Submitted but confirmation failed: " + JSON.stringify(confirmation.value.err) + "; signature=" + signature);
      const info = await connection.getAccountInfo(prepared.keypair.publicKey, "confirmed");
      if (!info || !info.owner.equals(new PublicKey(PROGRAM_ID))) throw new Error("Transaction confirmed but DBC configuration account could not be verified. Signature=" + signature);
      setDeployed({signature, config: prepared.config});
      setReport(`DEVNET CONFIG DEPLOYED AND VERIFIED\nConfiguration: ${prepared.config}\nTransaction: ${signature}\nOwner: ${info.owner.toBase58()}\nNote: this is a launch CONFIGURATION, not a token or pool.`);
      setPrepared(null);
    } catch (error) {
      const message = formatError(error);
      const walletError = error as {name?: string; code?: number; message?: string};
      const cancelled = walletError?.name === "WalletSignTransactionError" &&
        /reject|cancel|declin/i.test(message) ||
        walletError?.code === 4001 ||
        /user rejected|user declined|request rejected/i.test(message);
      if (cancelled) {
        // A declined wallet signature does not submit a transaction.
        // Keep the prepared configuration so the user can review it and try again.
        setWalletNotice("Phantom signing was cancelled. No transaction was submitted by this attempt. You may review and sign again, or prepare a fresh simulation.");
      } else {
        setReport(`Deployment result: ${message}\\nIf a transaction was submitted, check devnet explorer before trying again.`);
        setPrepared(null); setPassed(false);
      }
    } finally { running.current = false; setBusy(false); }
  };

  const field = (label: string, value: string, set: (v: string) => void) => (
    <label className="block text-sm text-slate-300">{label}
      <input className="mt-2 block w-full rounded-lg border border-slate-600 bg-slate-950 p-3 font-mono text-white outline-none focus:border-cyan-400" inputMode="numeric" value={value} onChange={e => { set(e.target.value); setPrepared(null); setPassed(false); setWalletNotice(""); }}/>
    </label>
  );
  return <main className="min-h-screen bg-[#060b16] px-5 py-8 text-slate-100">
    <div className="mx-auto max-w-5xl">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
        <Link href="/dbc-config" className="text-2xl font-extrabold">Curve<span className="text-cyan-400">Forge</span><span className="ml-2 text-xs text-slate-500"> / DEPLOY LAB</span></Link>
        <ClientWalletButton />
      </header>
      <p className="mt-12 text-xs font-bold tracking-[0.18em] text-cyan-400">06 / METEORA DBC · DEVNET CONFIGURATION DEPLOYMENT</p>
      <h1 className="mt-3 text-4xl font-bold">Review and deploy a DBC configuration</h1>
      <p className="mt-4 max-w-3xl text-slate-400">Builds a real Meteora config transaction, simulates it, then requests explicit Phantom approval to submit on devnet.</p>
      <div className="mt-6 rounded-xl border border-amber-700/60 bg-amber-950/20 p-4 text-sm text-amber-200">
        This page CAN submit an on-chain transaction with your explicit Phantom approval. It creates a reusable <strong>DBC configuration only</strong>, not a token or pool. Devnet SOL pays fees and rent. Use a test wallet and review every wallet prompt.
      </div>
      <section className="mt-7 rounded-2xl border border-slate-700 bg-[#101829] p-6">
        <h2 className="text-xl font-semibold">Experimental SOL launch parameters</h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          {field("Total token supply", supply, setSupply)}
          {field("Migration threshold (SOL)", threshold, setThreshold)}
          {field("Fixed trading fee (bps)", fee, setFee)}
          {field("Token supply on migration (%)", migrate, setMigrate)}
        </div>
        <p className="mt-4 text-xs text-slate-400">SPL token · 6 base decimals · wrapped SOL quote · DAMM v2 migration · no vesting · fixed trading fee. A temporary configuration keypair is kept in browser memory until signed deployment. Reloading clears it.</p>
        <button onClick={simulate} disabled={busy || !connected} className="mt-6 rounded-lg bg-cyan-400 px-6 py-3 font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50">
          {busy ? "Working…" : "1. Prepare & simulate (no signing)"}
        </button>
        {!connected && <p className="mt-3 text-sm text-amber-300">Connect Phantom first.</p>}
      </section>
      {prepared && passed && !deployed && <section className="mt-6 rounded-2xl border border-cyan-700/60 bg-[#101829] p-6">
        <h2 className="text-xl font-semibold">2. Review before deployment</h2>
        <p className="mt-3 break-all text-sm text-slate-300">New config address: <code>{prepared.config}</code></p>
        <p className="mt-2 text-sm text-slate-300">Fee payer and fee receiver: {prepared.payer}</p>
        <p className="mt-2 text-sm text-amber-200">Network: DEVNET · New on-chain config account · Nonrefundable devnet transaction fees and account rent · No token or pool created.</p>
        <button disabled={busy || !signTransaction} onClick={deploy} className="mt-5 rounded-lg bg-emerald-400 px-6 py-3 font-semibold text-slate-950 disabled:opacity-50">{busy ? "Submitting…" : "2. Sign in Phantom & deploy devnet config"}</button>
      </section>}
      {walletNotice && <p role="status" className="mt-5 rounded-xl border border-amber-600/50 bg-amber-950/20 p-4 text-sm text-amber-200">{walletNotice}</p>}
      {deployed && <section className="mt-6 rounded-2xl border border-emerald-700/60 bg-emerald-950/20 p-6"><h2 className="text-xl font-bold text-emerald-300">Devnet configuration verified</h2><p className="mt-2 break-all text-sm">Config: {deployed.config}</p><a className="mt-3 block break-all text-cyan-300 underline" target="_blank" rel="noopener noreferrer" href={`https://explorer.solana.com/tx/${deployed.signature}?cluster=devnet`}>View transaction on Solana Explorer ↗</a><p className="mt-3 text-sm text-amber-200">Save your configuration address. Pool creation is a separate next step.</p><Link href={`/dbc-pool?config=${encodeURIComponent(deployed.config)}`} className="mt-5 inline-block rounded-lg bg-cyan-400 px-5 py-3 font-semibold text-slate-950 hover:bg-cyan-300">Continue to Step 7: Create DBC Pool →</Link></section>}
      {report && <section className="mt-6 rounded-2xl border border-slate-700 bg-[#101829] p-6">
        <h2 className={`text-xl font-semibold ${passed ? "text-emerald-300" : "text-amber-300"}`}>{deployed ? "Confirmed on-chain" : passed ? "RPC simulation succeeded" : "Transaction diagnostics"}</h2>
        <pre className="mt-4 max-h-[550px] overflow-auto whitespace-pre-wrap break-words rounded-xl bg-[#050a13] p-4 font-mono text-xs leading-relaxed text-slate-200">{report}</pre>
      </section>}
      <nav className="mt-8 flex flex-wrap gap-5 text-sm text-cyan-300">
        <Link href={`/dbc-simulate?supply=${encodeURIComponent(supply)}&threshold=${encodeURIComponent(threshold)}&fee=${encodeURIComponent(fee)}&migration=${encodeURIComponent(migrate)}`}>← Step 5: Simulate</Link>
        <Link href="/dbc-config">SDK parameter builder</Link>
      </nav>
    </div>
  </main>;
}
