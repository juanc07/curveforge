"use client";

import { useState } from "react";
import { BN } from "@coral-xyz/anchor";
import { useConnection } from "@solana/wallet-adapter-react";
import { DynamicBondingCurveClient } from "@meteora-ag/dynamic-bonding-curve-sdk";
import { buildSdkCandidate, SDK_CANDIDATES } from "../../lib/launch/sdkStrategyCandidates";
import { STRATEGIES } from "../../lib/launch/profiles";

type Row = { id: string; amountSol: string; tokensOut: string; effectiveSolPerToken: string; error?: string };
const SIZES = ["0.001", "0.01", "0.05", "0.1"] as const;
const LAMPORTS = BigInt(1_000_000_000);
const TOKEN_UNITS = BigInt(1_000_000);

function formatUnits(value: bigint, units: bigint, places = 6): string {
  const whole = value / units;
  const fraction = (value % units).toString().padStart(units.toString().length - 1, "0").slice(0, places).replace(/0+$/, "");
  return `${whole.toLocaleString("en-US")}${fraction ? `.${fraction}` : ""}`;
}

export function SdkQuoteComparison() {
  const { connection } = useConnection();
  const [rows, setRows] = useState<Row[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [tested, setTested] = useState(false);

  function runComparison() {
    setRunning(true);
    setError("");
    setRows([]);
    setTested(false);
    // Yield to React so the UI can display the calculating state.
    window.setTimeout(() => {
      try {
        const client = new DynamicBondingCurveClient(connection, "confirmed");
        const output: Row[] = [];
        for (const candidate of SDK_CANDIDATES) {
          const config = buildSdkCandidate(candidate);
          for (const amountSol of SIZES) {
            try {
              const [whole, fractional = ""] = amountSol.split(".");
              const rawSol = BigInt(whole) * LAMPORTS + BigInt(fractional.padEnd(9, "0"));
              const quote = client.pool.getQuoteFromInputAmount({
                config,
                swapBaseForQuote: false,
                amountIn: new BN(rawSol.toString()),
                slippageBps: 100,
                hasReferral: false,
                eligibleForFirstSwapWithMinFee: false,
                currentPoint: new BN(0),
              });
              // SwapQuote2Result is IDL-generated. Some installed SDK versions
              // expose a narrower TypeScript shape than newer SDK source docs.
              // Inspect the actual SDK result instead of asserting a field exists.
              const fields = quote as unknown as Record<string, unknown>;
              const outputValue = fields.outputAmount ?? fields.amountOut ?? fields.output_amount;
              if (outputValue === undefined || outputValue === null) {
                throw new Error(`SDK quote output field missing (returned: ${Object.keys(fields).join(", ")})`);
              }
              const outputText = String(outputValue);
              if (!/^[0-9]+$/.test(outputText)) {
                throw new Error("SDK quote output is not an unsigned integer");
              }
              const rawTokens = BigInt(outputText);
              if (rawTokens <= BigInt(0)) throw new Error("SDK returned zero output");
              // Effective price: raw SOL/token values are first converted into normal units.
              const priceScaledSol = rawSol * TOKEN_UNITS * BigInt("1000000000000000000") / (rawTokens * LAMPORTS);
              output.push({ id: candidate.id, amountSol, tokensOut: formatUnits(rawTokens, TOKEN_UNITS), effectiveSolPerToken: formatUnits(priceScaledSol, BigInt("1000000000000000000"), 12) });
            } catch (e) {
              output.push({ id: candidate.id, amountSol, tokensOut: "—", effectiveSolPerToken: "—", error: e instanceof Error ? e.message : String(e) });
            }
          }
        }
        setRows(output);
        setTested(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setRunning(false);
      }
    }, 0);
  }

  return (
    <section className="mb-6 rounded-2xl border border-cyan-800/50 bg-[#101829] p-5" aria-label="SDK simulated launch quotes">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">SDK pre-launch quote comparison</h2>
          <p className="mt-2 max-w-3xl text-sm text-slate-400">Independent read-only exact-input buy quotes for each SDK-built candidate, starting at an empty virtual pool. All amounts use identical assumptions: SOL quote (9 decimals), base token (6 decimals), 100 bps slippage tolerance, no referral or first-swap discount. These are hypothetical pre-launch SDK quotes, not executable prices or sequential trades.</p>
        </div>
        <button type="button" onClick={runComparison} disabled={running} className="rounded-xl bg-cyan-400 px-4 py-3 text-sm font-bold text-slate-950 disabled:opacity-50">{running ? "Calculating…" : tested ? "Recalculate SDK quotes" : "Calculate SDK quotes"}</button>
      </div>
      {error && <p role="alert" className="mt-4 rounded-lg border border-red-600/50 p-3 text-sm text-red-300">SDK comparison unavailable: {error}</p>}
      {tested && <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[640px] text-left text-sm"><thead><tr className="border-b border-slate-700 text-cyan-300"><th className="p-3">Strategy</th><th className="p-3">Input SOL</th><th className="p-3">SDK tokens out</th><th className="p-3">Effective SOL/token</th></tr></thead><tbody>{rows.map((r) => <tr key={`${r.id}-${r.amountSol}`} className="border-b border-slate-800"><td className="p-3">{STRATEGIES.find(s => s.id === r.id)?.label ?? r.id}</td><td className="p-3">{r.amountSol}</td><td className="p-3">{r.error ? <span className="text-amber-300" title={r.error}>Quote unavailable: {r.error}</span> : r.tokensOut}</td><td className="p-3">{r.effectiveSolPerToken}</td></tr>)}</tbody></table></div>}
      <p className="mt-4 text-xs text-amber-200">A configuration built by the SDK is not an on-chain pool. Quote behavior can differ at execution due to pool state, fees, activation timing, liquidity, slippage and network conditions. This comparison never changes transaction inputs in Step 4.</p>
    </section>
  );
}
