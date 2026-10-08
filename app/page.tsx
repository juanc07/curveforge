"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { ClientWalletButton } from "../components/wallet/ClientWalletButton";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

type BalanceState = { address: string; sol: number } | null;

export default function Home() {
  const { connection } = useConnection();
  const { connected, publicKey } = useWallet();
  const [balance, setBalance] = useState<BalanceState>(null);
  const [balanceError, setBalanceError] = useState("");
  const address = publicKey?.toBase58() ?? null;
  const currentBalance = balance?.address === address ? balance.sol : null;

  useEffect(() => {
    if (!publicKey) return;
    let active = true;
    const walletAddress = publicKey.toBase58();

    connection.getBalance(publicKey)
      .then((lamports) => {
        if (!active) return;
        setBalance({ address: walletAddress, sol: lamports / LAMPORTS_PER_SOL });
        setBalanceError("");
      })
      .catch(() => {
        if (active) setBalanceError("Unable to read devnet SOL balance. Check the RPC connection.");
      });

    return () => { active = false; };
  }, [connection, publicKey]);

  return (
    <main className="min-h-screen bg-[#070c19] px-6 py-8 text-white">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="text-3xl font-bold tracking-tight">
            Curve<span className="text-cyan-400">Forge</span>
          </div>
          <ClientWalletButton />
        </header>

        <section className="pt-24 pb-14 md:pt-32">
          <div className="inline-block rounded-full border border-cyan-800 bg-cyan-950/40 px-4 py-2 text-sm font-medium text-cyan-300">
            SOLANA DEVNET · METEORA DBC
          </div>
          <h1 className="mt-8 max-w-3xl text-4xl font-bold leading-tight md:text-6xl">
            Design smarter.<br />Launch with liquidity.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-400">
            AI-assisted token launch architecture for real-world assets and more,
            powered by Meteora Dynamic Bonding Curve.
          </p>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 md:p-8">
          <h2 className="text-2xl font-semibold">Devnet Wallet</h2>
          {connected && address ? (
            <div className="mt-6 space-y-4">
              <div className="text-sm font-medium text-emerald-400">● Wallet connected</div>
              <div>
                <div className="mb-1 text-sm text-slate-400">Public address</div>
                <div className="break-all font-mono text-sm">{address}</div>
              </div>
              <div>
                <div className="mb-1 text-sm text-slate-400">Devnet SOL balance</div>
                <div className="text-3xl font-bold">
                  {currentBalance === null ? "Loading..." : `${currentBalance.toFixed(4)} SOL`}
                </div>
              </div>
              {balanceError && <p role="alert" className="text-sm text-amber-300">{balanceError}</p>}
            </div>
          ) : (
            <p className="mt-5 text-slate-400">
              Connect Phantom using a test wallet to begin. No transaction will be sent.
            </p>
          )}
        </section>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Link href="/launch" className="rounded-xl bg-cyan-400 px-6 py-3 font-semibold text-slate-950 hover:bg-cyan-300">
            Start launch draft →
          </Link>
          <span className="text-sm text-slate-400">Draft and preflight only · no transactions</span>
        </div>
        <footer className="py-10 text-sm text-slate-500">
          CurveForge · Hackathon MVP · No mainnet transactions
        </footer>
      </div>
    </main>
  );
}
