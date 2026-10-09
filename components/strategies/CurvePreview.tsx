"use client";

import { useEffect, useRef, useState } from "react";
import type { StrategyId } from "../../lib/launch/profiles";

type Model = { base: number; linear: number; quadratic: number; feeStart: number; feeEnd: number };
const MODELS: Record<StrategyId, Model> = {
  "stable-discovery": { base: 0.14, linear: 0.34, quadratic: 0.20, feeStart: 2, feeEnd: 2 },
  "high-growth": { base: 0.14, linear: 0.49, quadratic: 0.78, feeStart: 3, feeEnd: 3 },
  "anti-sniper": { base: 0.14, linear: 0.34, quadratic: 0.20, feeStart: 15, feeEnd: 2 },
};
const WIDTH = 720;
const HEIGHT = 304;
const LEFT = 60;
const RIGHT = 20;
const TOP = 22;
const BOTTOM = 44;
const INNER_W = WIDTH - LEFT - RIGHT;
const INNER_H = HEIGHT - TOP - BOTTOM;
const Y_MAX = 1.55;
const priceAt = (m: Model, x: number) => m.base + m.linear * x + m.quadratic * x * x;
const feeAt = (m: Model, x: number) => m.feeStart + (m.feeEnd - m.feeStart) * x;
const interp = (a: Model, b: Model, t: number): Model => ({
  base: a.base + (b.base - a.base) * t,
  linear: a.linear + (b.linear - a.linear) * t,
  quadratic: a.quadratic + (b.quadratic - a.quadratic) * t,
  feeStart: a.feeStart + (b.feeStart - a.feeStart) * t,
  feeEnd: a.feeEnd + (b.feeEnd - a.feeEnd) * t,
});
const sx = (x: number) => LEFT + x * INNER_W;
const sy = (y: number) => TOP + INNER_H * (1 - y / Y_MAX);
const toPath = (model: Model) => Array.from({ length: 161 }, (_, i) => {
  const x = i / 160;
  return `${i === 0 ? "M" : "L"}${sx(x).toFixed(2)},${sy(priceAt(model, x)).toFixed(2)}`;
}).join(" ");

export function CurvePreview({ strategy }: { strategy: StrategyId }) {
  const [model, setModel] = useState<Model>(MODELS[strategy]);
  const [progress, setProgress] = useState(55);
  const [reduced, setReduced] = useState(false);
  const renderedRef = useRef<Model>(MODELS[strategy]);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const target = MODELS[strategy];
    if (reduced) {
      renderedRef.current = target;
      setModel(target);
      return;
    }
    const from = renderedRef.current;
    let frame = 0;
    let start: number | undefined;
    const tick = (now: number) => {
      if (start === undefined) start = now;
      const t = Math.min(1, (now - start) / 1100);
      // Smooth acceleration AND deceleration: avoids an abrupt initial jump.
      const eased = t * t * (3 - 2 * t);
      const next = interp(from, target, eased);
      renderedRef.current = next;
      setModel(next);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [strategy, reduced]);

  const position = progress / 100;
  const price = priceAt(model, position);
  const initial = priceAt(model, 0);
  const normalized = price / initial;
  const fee = feeAt(model, position);
  const activeY = sy(price);
  const line = toPath(model);
  const area = `${line} L${sx(1)},${sy(0)} L${sx(0)},${sy(0)} Z`;

  return (
    <section className="relative overflow-hidden rounded-3xl border border-cyan-900/50 bg-[#0b1728] p-5 shadow-[0_25px_80px_-35px_rgba(0,229,255,0.15)] md:p-7" aria-label="Illustrative curve comparison">
      <div className="pointer-events-none absolute -right-20 -top-32 h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl" />
      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-300"><span className="h-2 w-2 rounded-full bg-cyan-400" /> Curve Lab / Scenario 01</div>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl">Concept-only curve sketch</h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-400">A visual sketch of launch behavior. Values are normalized illustrations, <strong className="font-semibold text-slate-300">not Meteora quotes or deployable settings</strong>.</p>
        </div>
        <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-300">ILLUSTRATIVE MODEL</span>
      </div>
      <div className="relative mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_190px]">
        <div className="min-w-0 rounded-2xl border border-white/5 bg-[#07111f]/85 p-2 md:p-4">
          <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="Normalized illustrative price versus launch progress" className="w-full overflow-visible">
            <defs>
              <linearGradient id="curveforge-area-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#22d3ee" stopOpacity="0.29"/><stop offset="100%" stopColor="#22d3ee" stopOpacity="0"/></linearGradient>
              <linearGradient id="curveforge-line-stroke" x1="0" x2="1" y1="0" y2="0"><stop offset="0%" stopColor="#5eead4"/><stop offset="100%" stopColor="#38bdf8"/></linearGradient>
            </defs>
            {[0,0.25,0.5,0.75,1,1.25,1.5].map(y => <g key={y}><line x1={LEFT} x2={WIDTH-RIGHT} y1={sy(y)} y2={sy(y)} stroke="#243449" strokeDasharray="4 7"/><text x={LEFT-12} y={sy(y)+4} fontSize="12" textAnchor="end" fill="#8191a7">{y.toFixed(2)}</text></g>)}
            {[0,0.25,0.5,0.75,1].map(x => <text key={x} x={sx(x)} y={HEIGHT-14} textAnchor="middle" fill="#8191a7" fontSize="12">{Math.round(x*100)}%</text>)}
            <path d={area} fill="url(#curveforge-area-fill)"/>
            <path d={line} fill="none" stroke="url(#curveforge-line-stroke)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
            <line x1={sx(position)} x2={sx(position)} y1={TOP} y2={sy(0)} stroke="#7dd3fc" strokeOpacity="0.6" strokeDasharray="5 6"/>
            <circle cx={sx(position)} cy={activeY} r="11" fill="#22d3ee" fillOpacity="0.17"/>
            <circle cx={sx(position)} cy={activeY} r="5" fill="#e2ffff" stroke="#22d3ee" strokeWidth="2"/>
            <text x={LEFT} y="13" fontSize="11" fill="#9bb2c9">NORMALIZED PRICE</text>
            <text x={WIDTH-RIGHT} y={HEIGHT-1} textAnchor="end" fontSize="11" fill="#9bb2c9">LAUNCH PROGRESS</text>
          </svg>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
          <Metric label="Progress" value={`${progress}%`} note="Scenario position" />
          <Metric label="Relative price" value={`${normalized.toFixed(2)}×`} note="Versus model starting point" />
          <Metric label="Fictional fee" value={`${fee.toFixed(1)}%`} note="Illustrative only; unverified" />
        </div>
      </div>
      <div className="relative mt-5 rounded-2xl border border-slate-700/70 bg-[#101d30] px-5 py-4">
        <div className="flex items-center justify-between gap-3 text-sm"><label htmlFor="scenario-progress" className="font-semibold text-slate-200">Explore launch progress</label><span className="font-mono text-cyan-300">{progress}%</span></div>
        <input id="scenario-progress" className="mt-4 w-full cursor-pointer accent-cyan-400" type="range" min="0" max="100" value={progress} onChange={e => setProgress(Number(e.target.value))} />
        <div className="mt-1 flex justify-between text-xs text-slate-500"><span>Launch begins</span><span>Illustrative end</span></div>
      </div>
      <p className="mt-4 text-xs leading-relaxed text-slate-500">These arbitrary sketch equations are NOT the Meteora SDK curve. The declining-fee sketch for Anti-Sniper is NOT implemented by the actual preset, which uses a fixed 500 bps fee. Do not use these values to infer liquidity, slippage, execution prices, returns, or protections.</p>
    </section>
  );
}
function Metric({ label, value, note }: { label: string; value: string; note: string }) {
  return <div className="rounded-2xl border border-white/5 bg-[#101e32] p-4"><p className="text-xs text-slate-400">{label}</p><p className="mt-2 text-2xl font-bold tracking-tight text-white">{value}</p><p className="mt-1 text-[11px] text-slate-500">{note}</p></div>;
}
