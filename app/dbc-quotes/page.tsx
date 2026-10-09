"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import { NATIVE_MINT } from "@solana/spl-token";
import { useConnection } from "@solana/wallet-adapter-react";
import { DynamicBondingCurveClient } from "@meteora-ag/dynamic-bonding-curve-sdk";

const DEFAULT_POOL = "FcNZGEpkaWSecu6b85GsAinpyCKFo3iCQknVcBjyRxkW";

type QuoteView = {
  pool: string;
  mint: string;
  input: string;
  output: string;
  minimumOutput: string;
  fee: string;
  protocolFee: string;
  referralFee: string;
  currentPoint: string;
  computedAt: string;
};

function asAtomic(value: string, decimals: number): BN {
  if (!/^\d+(\.\d+)?$/.test(value)) throw new Error("Enter a positive decimal amount.");
  const [whole, fraction = ""] = value.split(".");
  if (fraction.length > decimals) throw new Error(`At most ${decimals} decimal places are supported.`);
  const raw = BigInt(whole) * (BigInt(10) ** BigInt(decimals)) +
    BigInt(fraction.padEnd(decimals, "0") || "0");
  if (raw <= BigInt(0) || raw > BigInt("18446744073709551615")) throw new Error("Input must be positive and fit in a Solana u64 amount.");
  return new BN(raw.toString());
}

function display(raw: string, decimals: number) {
  const negative = raw.startsWith("-");
  const abs = negative ? raw.slice(1) : raw;
  const padded = abs.padStart(decimals + 1, "0");
  const integer = padded.slice(0, -decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const fractional = padded.slice(-decimals).replace(/0+$/, "");
  return `${negative ? "-" : ""}${integer}${fractional ? "." + fractional : ""}`;
}

const message = (e: unknown) => e instanceof Error ? e.message : String(e);

export default function DbcQuotesPage() {
  const { connection } = useConnection();
  const [pool, setPool] = useState(DEFAULT_POOL);
  const [amount, setAmount] = useState("0.01");
  const [direction, setDirection] = useState<"buy" | "sell">("buy");
  const [slippage, setSlippage] = useState("100");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [quote, setQuote] = useState<QuoteView | null>(null);

  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("pool");
    if (fromUrl) setPool(fromUrl);
  }, []);

  const calculate = async () => {
    setBusy(true);
    setError("");
    setQuote(null);
    try {
      if (process.env.NEXT_PUBLIC_SOLANA_NETWORK !== "devnet")
        throw new Error("Read-only quotes in this tool are restricted to devnet.");
      const poolKey = new PublicKey(pool.trim());
      const slippageBps = Number(slippage);
      if (!Number.isInteger(slippageBps) || slippageBps < 0 || slippageBps > 5000)
        throw new Error("Slippage must be between 0 and 5000 basis points.");
      const client = new DynamicBondingCurveClient(connection, "confirmed");
      const poolAccount = await client.state.getPool(poolKey);
      if (!poolAccount) throw new Error("DBC virtual pool not found on devnet.");
      // Meteora SDK swapQuote expects the entire VirtualPool account, not its nested poolState.
      const virtualPool = poolAccount;
      const config = await client.state.getPoolConfig(virtualPool.poolState.config);
      if (!config) throw new Error("DBC pool configuration could not be loaded.");
      if (!config.quoteMint.equals(NATIVE_MINT))
        throw new Error("This first quote tool supports wrapped SOL quote pools only.");
      // The CurveForge deployed demonstration config uses timestamp activation.
      // Obtain cluster block time rather than the local PC clock for fee timing.
      const slot = await connection.getSlot("confirmed");
      const chainTime = await connection.getBlockTime(slot);
      if (chainTime === null) throw new Error("Could not obtain devnet cluster time for fee calculations.");
      const isSell = direction === "sell";
      const amountIn = asAtomic(amount, isSell ? 6 : 9);
      const result = client.pool.swapQuote({
        virtualPool,
        config,
        swapBaseForQuote: isSell,
        amountIn,
        slippageBps,
        hasReferral: false,
        eligibleForFirstSwapWithMinFee: false,
        currentPoint: new BN(chainTime),
      });
      // SDK IDL output field naming can differ across generated versions.
      // Read only actual returned values; never synthesize token outputs or fees.
      const resultFields = result as unknown as Record<string, unknown>;
      const field = (...names: string[]): string | null => {
        for (const name of names) {
          const value = resultFields[name];
          if (value !== undefined && value !== null) return String(value);
        }
        return null;
      };
      const output = field("outputAmount", "output_amount", "amountOut");
      if (output === null) {
        throw new Error("Unsupported Meteora quote output fields: " + Object.keys(resultFields).join(", "));
      }
      const minimumOutput = field("minimumAmountOut", "minimum_amount_out");
      if (minimumOutput === null) throw new Error("Meteora quote returned no minimum output field.");
      setQuote({
        pool: poolKey.toBase58(),
        mint: virtualPool.poolState.baseMint.toBase58(),
        input: amountIn.toString(),
        output: output,
        minimumOutput: minimumOutput,
        fee: field("tradingFee", "trading_fee") ?? "N/A",
        protocolFee: field("protocolFee", "protocol_fee") ?? "N/A",
        referralFee: field("referralFee", "referral_fee") ?? "N/A",
        currentPoint: String(chainTime),
        computedAt: new Date().toLocaleString(),
      });
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  };

  const inputDecimal = direction === "buy" ? 9 : 6;
  const outputDecimal = direction === "buy" ? 6 : 9;
  return (
    <main className="min-h-screen bg-[#060b16] px-5 py-8 text-slate-100">
      <div className="mx-auto max-w-5xl">
        <header className="flex items-center justify-between gap-4 border-b border-white/10 pb-5">
          <Link href="/" className="text-2xl font-extrabold">Curve<span className="text-cyan-400">Forge</span></Link>
          <span className="text-xs font-semibold text-cyan-300">DEVNET · READ ONLY</span>
        </header>
        <p className="mt-12 text-xs font-bold tracking-[.18em] text-cyan-400">09 / SDK-BACKED PRICING INTELLIGENCE</p>
        <h1 className="mt-3 text-4xl font-bold">Live DBC Swap Quotes</h1>
        <p className="mt-4 max-w-3xl text-slate-400">Uses Meteora SDK swapQuote() with current on-chain pool and configuration accounts. Estimates only: no swap transaction is built, signed, or sent.</p>
        <section className="mt-7 rounded-2xl border border-slate-700 bg-[#101829] p-6">
          <label className="block text-sm text-slate-300">Devnet DBC pool address
            <input className="mt-2 w-full rounded-lg border border-slate-600 bg-slate-950 p-3 font-mono text-sm text-white" value={pool} onChange={(e) => { setPool(e.target.value); setQuote(null); }} />
          </label>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <label className="text-sm text-slate-300">Direction
              <select className="mt-2 w-full rounded-lg border border-slate-600 bg-slate-950 p-3 text-white" value={direction} onChange={(e) => { const v = e.target.value as "buy" | "sell"; setDirection(v); setAmount(v === "buy" ? "0.01" : "1000"); setQuote(null); }}>
                <option value="buy">Buy token with SOL</option><option value="sell">Sell token for SOL</option>
              </select>
            </label>
            <label className="text-sm text-slate-300">Input amount ({direction === "buy" ? "SOL" : "tokens"})
              <input className="mt-2 w-full rounded-lg border border-slate-600 bg-slate-950 p-3 font-mono text-white" value={amount} onChange={(e) => { setAmount(e.target.value); setQuote(null); }} inputMode="decimal"/>
            </label>
            <label className="text-sm text-slate-300">Slippage tolerance (bps)
              <input className="mt-2 w-full rounded-lg border border-slate-600 bg-slate-950 p-3 font-mono text-white" value={slippage} onChange={(e) => { setSlippage(e.target.value); setQuote(null); }} inputMode="numeric"/>
            </label>
          </div>
          <button disabled={busy} onClick={calculate} className="mt-6 rounded-lg bg-cyan-400 px-6 py-3 font-semibold text-slate-950 disabled:opacity-50">{busy ? "Calculating from SDK…" : "Calculate live quote"}</button>
          {error && <p role="alert" className="mt-4 rounded-lg border border-amber-700 bg-amber-950/20 p-4 text-sm text-amber-200">{error}</p>}
        </section>
        {quote && <section className="mt-6 rounded-2xl border border-cyan-800/60 bg-[#101829] p-6">
          <h2 className="text-xl font-semibold text-emerald-300">SDK quote computed</h2>
          <p className="mt-2 text-xs text-slate-400">Snapshot computed {quote.computedAt} · Cluster timestamp: {quote.currentPoint}</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {[
              ["Input", `${display(quote.input, inputDecimal)} ${direction === "buy" ? "SOL" : "tokens"}`],
              ["Estimated output", `${display(quote.output, outputDecimal)} ${direction === "buy" ? "tokens" : "SOL"}`],
              ["Minimum output after slippage", `${display(quote.minimumOutput, outputDecimal)} ${direction === "buy" ? "tokens" : "SOL"}`],
              ["Trading fee (SDK raw)", quote.fee === "N/A" ? "Not reported" : `${display(quote.fee, inputDecimal)} (raw fee units)`],
              ["Protocol fee (SDK raw)", quote.protocolFee === "N/A" ? "Not reported" : `${display(quote.protocolFee, inputDecimal)} (raw fee units)`],
              ["Referral fee (SDK raw)", quote.referralFee === "N/A" ? "Not reported" : `${display(quote.referralFee, inputDecimal)} (raw fee units)`],
            ].map(([label, value]) => <div key={label} className="rounded-xl border border-slate-700 p-4"><p className="text-xs text-slate-400">{label}</p><p className="mt-2 break-all font-mono text-lg">{value}</p></div>)}
          </div>
          <p className="mt-5 text-xs text-amber-200">This is a deterministic SDK quote at a particular pool state and block time, not a guaranteed executable price. Fees, pool balances and execution outcomes can change before a real swap. No transactions were submitted.</p>
        </section>}
        <nav className="mt-8 text-sm text-cyan-300">
          <Link href={`/dbc-dashboard?pool=${encodeURIComponent(pool)}`}>← Step 8: Live Pool Dashboard</Link>
        </nav>
      </div>
    </main>
  );
}
