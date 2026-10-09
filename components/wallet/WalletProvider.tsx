"use client";

import { useMemo } from "react";
import { ConnectionProvider, WalletProvider as SolanaWalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import type { WalletError } from "@solana/wallet-adapter-base";
import { clusterApiUrl } from "@solana/web3.js";

// Wallet adapters emit an error event even when the caller catches a rejected
// signature. The adapter's default handler console.errors all events, which
// triggers the Next.js development overlay for an expected user cancellation.
// Only suppress deliberate rejection; keep reporting unexpected wallet errors.
function handleWalletError(error: WalletError) {
  const value = error as WalletError & { code?: number; cause?: { code?: number; message?: string } };
  const message = [error.message, value.cause?.message].filter(Boolean).join(" ");
  const rejected = value.code === 4001 || value.cause?.code === 4001 ||
    /user rejected|user declined|request rejected|user cancelled|user canceled/i.test(message);

  if (!rejected) console.error("Wallet adapter error:", error);
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const endpoint = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl("devnet");
  const wallets = useMemo(() => [new PhantomWalletAdapter()], []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider wallets={wallets} autoConnect={false} onError={handleWalletError}>
        <WalletModalProvider>{children}</WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
}
