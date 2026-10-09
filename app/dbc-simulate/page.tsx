"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Keypair, Transaction, SystemProgram } from "@solana/web3.js";
import { NATIVE_MINT } from "@solana/spl-token";
import {
  DynamicBondingCurveClient, buildCurve, ActivationType, BaseFeeMode,
  CollectFeeMode, MigrationFeeOption, MigrationOption,
  TokenAuthorityOption, TokenDecimal, TokenType,
} from "@meteora-ag/dynamic-bonding-curve-sdk";
import { ClientWalletButton } from "../../components/wallet/ClientWalletButton";

const PROGRAM_ID = "dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN";
const formatError = (error: unknown) => error instanceof Error ? error.message : String(error);

export default function DbcSimulatePage() {
  const { connection } = useConnection();
  const { publicKey, connected } = useWallet();
  const [supply, setSupply] = useState("1000000000");
  const [threshold, setThreshold] = useState("100");
  const [fee, setFee] = useState("100");
  const [migrate, setMigrate] = useState("20");
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState("");
  const [passed, setPassed] = useState(false);

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
    setReport(""); setPassed(false);
    if (!connected || !publicKey) { setReport("Connect a Phantom devnet wallet first."); return; }
    const inputs = [supply, threshold, fee, migrate];
    const nums = inputs.map(Number);
    if (inputs.some(v => !/^\d+$/.test(v)) || nums.some(n => !Number.isSafeInteger(n))) {
      setReport("All inputs must be safe whole numbers."); return;
    }
    const [totalTokenSupply, migrationQuoteThreshold, fixedFeeBps, percentageSupplyOnMigration] = nums;
    if (totalTokenSupply < 1000 || totalTokenSupply > 1e12 || migrationQuoteThreshold < 1 || migrationQuoteThreshold > 1e6 || fixedFeeBps < 1 || fixedFeeBps > 1000 || percentageSupplyOnMigration < 1 || percentageSupplyOnMigration > 99) {
      setReport("Input out of range. Supply: 1,000–1 trillion; threshold: 1–1,000,000 SOL; fee: 1–1000 bps; migration supply: 1–99%."); return;
    }
    if (process.env.NEXT_PUBLIC_SOLANA_NETWORK !== "devnet") { setReport("Blocked: NEXT_PUBLIC_SOLANA_NETWORK must be devnet."); return; }
    setBusy(true);
    try {
      const programInfo = await connection.getAccountInfo(new (await import("@solana/web3.js")).PublicKey(PROGRAM_ID));
      if (!programInfo?.executable) throw new Error("DBC program is not executable on the connected RPC.");
      const configParams = buildCurve({
        token: { tokenType: TokenType.SPLToken, tokenBaseDecimal: TokenDecimal.SIX, tokenQuoteDecimal: TokenDecimal.NINE, tokenAuthorityOption: TokenAuthorityOption.Immutable, totalTokenSupply, leftover: 0 },
        fee: { baseFeeParams: { baseFeeMode: BaseFeeMode.FeeSchedulerLinear, feeSchedulerParam: { startingFeeBps: fixedFeeBps, endingFeeBps: fixedFeeBps, numberOfPeriod: 0, totalDuration: 0 } }, dynamicFeeEnabled: false, collectFeeMode: CollectFeeMode.QuoteToken, creatorTradingFeePercentage: 0, poolCreationFee: 0, enableFirstSwapWithMinFee: false },
        migration: { migrationOption: MigrationOption.MET_DAMM_V2, migrationFeeOption: MigrationFeeOption.FixedBps100, migrationFee: { feePercentage: 0, creatorFeePercentage: 0 } },
        liquidityDistribution: { partnerLiquidityPercentage: 0, partnerPermanentLockedLiquidityPercentage: 100, creatorLiquidityPercentage: 0, creatorPermanentLockedLiquidityPercentage: 0 },
        lockedVesting: { totalLockedVestingAmount: 0, numberOfVestingPeriod: 0, cliffUnlockAmount: 0, totalVestingDuration: 0, cliffDurationFromMigrationTime: 0 },
        activationType: ActivationType.Timestamp, percentageSupplyOnMigration, migrationQuoteThreshold,
      });
      // Ephemeral config account is used ONLY in this read-only simulation.
      // It is not persisted and cannot be reused for deployment.
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
    } catch (error) { setReport(`Simulation failed: ${formatError(error)}`); }
    finally { setBusy(false); }
  };

  const field = (label: string, value: string, set: (v: string) => void) => (
    <label className="block text-sm text-slate-300">{label}
      <input className="mt-2 block w-full rounded-lg border border-slate-600 bg-slate-950 p-3 font-mono text-white outline-none focus:border-cyan-400" inputMode="numeric" value={value} onChange={e => set(e.target.value)}/>
    </label>
  );
  return <main className="min-h-screen bg-[#060b16] px-5 py-8 text-slate-100">
    <div className="mx-auto max-w-5xl">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
        <Link href="/dbc-config" className="text-2xl font-extrabold">Curve<span className="text-cyan-400">Forge</span><span className="ml-2 text-xs text-slate-500"> / TX LAB</span></Link>
        <ClientWalletButton />
      </header>
      <p className="mt-12 text-xs font-bold tracking-[0.18em] text-cyan-400">05 / METEORA DBC · DEVNET TRANSACTION PREFLIGHT</p>
      <h1 className="mt-3 text-4xl font-bold">Build and simulate a real DBC config transaction</h1>
      <p className="mt-4 max-w-3xl text-slate-400">Uses Meteora SDK <code>buildCurve()</code> and <code>partner.createConfig()</code> to construct an actual unsigned transaction and run Solana RPC simulation.</p>
      <div className="mt-6 rounded-xl border border-amber-700/60 bg-amber-950/20 p-4 text-sm text-amber-200">
        Simulation only. No Phantom signature, no transaction submission, no deployed pool. A successful simulation is not a guarantee of successful deployment. This creates a <strong>config transaction</strong>, not a token or DBC pool.
      </div>
      <section className="mt-7 rounded-2xl border border-slate-700 bg-[#101829] p-6">
        <h2 className="text-xl font-semibold">Experimental SOL launch parameters</h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          {field("Total token supply", supply, setSupply)}
          {field("Migration threshold (SOL)", threshold, setThreshold)}
          {field("Fixed trading fee (bps)", fee, setFee)}
          {field("Token supply on migration (%)", migrate, setMigrate)}
        </div>
        <p className="mt-4 text-xs text-slate-400">SPL token · 6 base decimals · wrapped SOL quote · DAMM v2 migration · no vesting · fixed trading fee. An ephemeral config keypair is generated only in browser memory for simulation.</p>
        <button onClick={simulate} disabled={busy || !connected} className="mt-6 rounded-lg bg-cyan-400 px-6 py-3 font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50">
          {busy ? "Simulating…" : "Build and simulate (no signing)"}
        </button>
        {!connected && <p className="mt-3 text-sm text-amber-300">Connect Phantom first.</p>}
      </section>
      {report && <section className="mt-6 rounded-2xl border border-slate-700 bg-[#101829] p-6">
        <h2 className={`text-xl font-semibold ${passed ? "text-emerald-300" : "text-amber-300"}`}>{passed ? "RPC simulation succeeded" : "Transaction diagnostics"}</h2>
        <pre className="mt-4 max-h-[550px] overflow-auto whitespace-pre-wrap break-words rounded-xl bg-[#050a13] p-4 font-mono text-xs leading-relaxed text-slate-200">{report}</pre>
      </section>}
      <nav className="mt-8 text-sm text-cyan-300"><Link href="/dbc-config">← SDK parameter builder</Link></nav>
    </div>
  </main>;
}
