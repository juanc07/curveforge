"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";

const STEPS = [
  { route: "/", label: "Home" },
  { route: "/launch", label: "Token Draft" },
  { route: "/strategies", label: "Strategies" },
  { route: "/dbc-config", label: "DBC Config" },
  { route: "/dbc-simulate", label: "Simulate" },
  { route: "/dbc-deploy", label: "Deploy Config" },
  { route: "/dbc-pool", label: "Create Pool" },
  { route: "/dbc-dashboard", label: "Live Dashboard" },
  { route: "/dbc-quotes", label: "Swap Quotes" },
  { route: "/dbc-curve", label: "Quote Curve" },
] as const;

function NavigatorContent() {
  const pathname = usePathname();
  const search = useSearchParams();
  const index = STEPS.findIndex((step) => step.route === pathname);
  if (index < 0) return null;

  const previous = index > 0 ? STEPS[index - 1] : null;
  const next = index < STEPS.length - 1 ? STEPS[index + 1] : null;
  const pool = search.get("pool")?.trim() || "";
  const config = search.get("config")?.trim() || "";

  const hrefFor = (route: string): string => {
    if (["/dbc-dashboard", "/dbc-quotes", "/dbc-curve"].includes(route) && pool) {
      return `${route}?pool=${encodeURIComponent(pool)}`;
    }
    if (route === "/dbc-pool" && config) {
      return `${route}?config=${encodeURIComponent(config)}`;
    }
    // If the user explicitly supplied config-builder inputs, preserve them
    // when navigating between the simulation and config-deployment pages.
    if (["/dbc-simulate", "/dbc-deploy"].includes(route)) {
      const keys = ["supply", "threshold", "fee", "migration"];
      const params = new URLSearchParams();
      for (const key of keys) {
        const value = search.get(key);
        if (value !== null) params.set(key, value);
      }
      return params.size ? `${route}?${params.toString()}` : route;
    }
    return route;
  };

  // Do not offer a shortcut past preparation, signing, or verification.
  // Those steps have their own state-aware Continue buttons.
  const guarded = index >= 3 && index <= 6;

  return (
    <nav aria-label="CurveForge development journey" className="relative z-20 w-full border-b border-cyan-900/50 bg-[#07111f] px-4 py-3 text-slate-200">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3">
        <span className="text-xs font-semibold tracking-wide text-cyan-300">CURVEFORGE · STEP {index + 1} / {STEPS.length}</span>
        <span className="text-sm font-medium">{STEPS[index].label}</span>
        <div className="ml-auto flex flex-wrap items-center gap-2 text-xs sm:text-sm">
          {previous ? (
            <Link href={hrefFor(previous.route)} className="rounded-lg border border-slate-600 px-3 py-2 hover:border-cyan-400 hover:text-cyan-300">
              ← Step {index}
            </Link>
          ) : <span className="text-slate-500">Start of journey</span>}
          {!next ? (
            <span className="rounded-lg border border-emerald-800 bg-emerald-950/40 px-3 py-2 text-emerald-300">Step 10 complete · Next milestone pending</span>
          ) : guarded ? (
            <span className="rounded-lg border border-amber-900 bg-amber-950/30 px-3 py-2 text-amber-200" title="Complete the validation or deployment operation in the page to enable its own Continue button">
              Next: Step {index + 2} · complete this step first
            </span>
          ) : (
            <Link href={hrefFor(next.route)} className="rounded-lg bg-cyan-400 px-3 py-2 font-semibold text-slate-950 hover:bg-cyan-300">
              Step {index + 2}: {next.label} →
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}

export default function JourneyNavigation() {
  return <Suspense fallback={null}><NavigatorContent /></Suspense>;
}
