"use client";

import { useEffect, useState } from "react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

/**
 * Wallet adapters read browser extension state, which is unavailable during SSR.
 * Render the same placeholder on the server and first client render, then mount
 * the wallet control to avoid a hydration mismatch.
 */
export function ClientWalletButton() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        aria-label="Wallet control loading"
        className="h-12 w-40 rounded-lg bg-violet-900/60"
      />
    );
  }

  return <WalletMultiButton />;
}
