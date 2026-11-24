'use client';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { useState } from 'react';
import { ResponsiveContainer, ComposedChart, Line, Area, XAxis, YAxis, Tooltip, BarChart, Bar, Cell, CartesianGrid } from 'recharts';
import { DATA } from '@/lib/analyzedData';
import { Mode, LABEL, PRESETS, colorOf, pillsFor, metrics, wealth, MIN_DATE, MAX_DATE, C } from '@/lib/model';
import type { Row } from '@/lib/types';
import { RegressionTab, OptionsTab, VolatilityTab } from './AnalysisTabs';

const spring = { type: 'spring', stiffness: 380, damping: 36 } as const;
const MODES: [Mode, string][] = [['futures', 'Futures'], ['options', 'Options'], ['h2h', 'Head-to-Head'], ['equity', 'Equity']];
const f = (x: number, d = 2) => (Number.isFinite(x) ? x.toFixed(d) : '–');

export function Dock({ mode, setMode, sel, toggle, range, openRange, openSheet }: any) {
  const pills = pillsFor(mode);
  const drag = useDragControls();
  const [minimized, setMinimized] = useState(false);

  if (minimized) {
    return (
      <div className="fixed inset-x-0 bottom-0 z-30 px-3 pb-3 flex justify-center pointer-events-auto" style={{ paddingBottom: 'max(14px, env(safe-area-inset-bottom))' }}>
        <motion.button
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setMinimized(false)}
          className="glass flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium text-white/90 shadow-xl shadow-black/60 hover:bg-white/10 transition border border-white/15"
        >
          <span className="text-sky-400">▲</span>
          <span>Show Controls</span>
          <span className="num text-[10px] text-white/40">({range.a.slice(2)} → {range.b.slice(2)})</span>
        </motion.button>
      </div>
    );
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 px-3 pt-1" style={{ paddingBottom: 'max(10px, env(safe-area-inset-bottom))' }}>
      <div className="mx-auto flex h-7 max-w-xl items-center justify-between px-3">
        <div className="w-12" />
        <motion.div onPointerDown={(e) => drag.start(e)} onTap={openSheet} onPanEnd={(_, i) => i.offset.y < -24 && openSheet()} className="flex h-7 w-24 items-center justify-center cursor-grab active:cursor-grabbing" style={{ touchAction: 'none' }}>
          <div className="h-1 w-10 rounded-full bg-white/30" />
        </motion.div>
        <button
          onClick={() => setMinimized(true)}
          title="Minimize bottom bar to view 3D diagram full-screen"
          className="flex items-center gap-1 rounded-full bg-white/[0.08] px-2 py-0.5 text-[10px] text-white/50 hover:bg-white/15 hover:text-white transition"
        >
          <span>▼</span>
          <span>Hide</span>
        </button>
      </div>
      <div className="glass mx-auto max-w-xl rounded-3xl p-2 space-y-2">
        <div className="grid grid-cols-4 gap-1 rounded-2xl bg-white/[0.04] p-1">
          {MODES.map(([m, l]) => (
            <button key={m} onClick={() => setMode(m)} className="relative h-10 rounded-xl text-[11px] font-medium tracking-wide">
              {mode === m && <motion.div layoutId="mode" transition={spring} className="absolute inset-0 rounded-xl bg-white/12 ring-1 ring-white/15" />}
              <span className={`relative ${mode === m ? 'text-white' : 'text-white/50'}`}>{l}</span>
            </button>))}
        </div>
        {pills.length > 0 && (
          <div className="noscroll flex gap-1.5 overflow-x-auto">
            {pills.map((k) => { const on = sel.includes(k); return (
              <motion.button whileTap={{ scale: 0.95 }} key={k} onClick={() => toggle(k)} className="h-9 shrink-0 rounded-full px-3.5 text-[11px] font-medium"
                style={{ border: `1px solid ${on ? colorOf(k) : 'rgba(255,255,255,.1)'}`, color: on ? colorOf(k) : 'rgba(255,255,255,.5)', background: on ? colorOf(k) + '1f' : 'transparent' }}>{LABEL[k]}</motion.button>); })}
          </div>)}
        <div className="flex gap-2">
          <button onClick={openRange} className="flex h-10 flex-1 items-center justify-between rounded-2xl bg-white/[0.04] px-4 text-xs hover:bg-white/[0.08] transition">
            <span className="text-white/50">Period</span><span className="num text-white/90">{range.a} → {range.b}</span>
          </button>
          <button onClick={openSheet} className="flex h-10 items-center gap-1.5 rounded-2xl bg-sky-500/15 border border-sky-500/25 px-3.5 text-xs font-medium text-sky-300 hover:bg-sky-500/25 transition">
            <span>📊</span>
            <span>Analysis</span>
          </button>
        </div>
      </div>
    </div>);
}

export function RangeSheet({ open, close, range, setRange, covered }: any) {
  return (
    <AnimatePresence>{open && (<>
      <motion.div className="fixed inset-0 z-40 bg-black/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={close} />
      <motion.div className="glass fixed inset-x-0 bottom-0 z-50 mx-auto max-w-xl rounded-t-3xl p-5" style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={spring} drag="y" dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 0.5 }} onDragEnd={(_, i) => i.offset.y > 100 && close()}>
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/30" />
        <div className="grid grid-cols-2 gap-3">
          {(['a', 'b'] as const).map((k) => (<label key={k} className="text-[10px] uppercase tracking-widest text-white/40">{k === 'a' ? 'Start date' : 'End date'}
            <input type="date" min={MIN_DATE} max={MAX_DATE} value={range[k]} onChange={(e) => e.target.value && setRange({ ...range, [k]: e.target.value })} className="num mt-1 h-11 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white" /></label>))}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {PRESETS.map((p) => { const r = DATA.regimes[p.id]; const on = range.a === r.start && range.b === r.end; return (
            <button key={p.id} onClick={() => { setRange({ a: r.start, b: r.end }); close(); }} className={`h-11 rounded-xl border text-xs ${on ? 'border-white/60 text-white' : 'border-white/10 text-white/60'}`}>{p.label}</button>); })}
        </div>
        <p className="mt-4 text-[11px] leading-relaxed text-white/40">Equity covers {MIN_DATE} → {MAX_DATE}. Futures/options data exist only inside four windows (2008 GFC, 2020 COVID, 2023 calm, 2024 election). Hedge days in this range: <span className="num text-white/70">{covered}</span>.</p>
      </motion.div></>)}</AnimatePresence>);
}

const CHIPS: [string, string][] = [['VR', 'VR %'], ['VaR95', 'VaR 95'], ['CVaR95', 'CVaR 95'], ['LPM2', 'LPM₂'], ['cost', 'Net cost %']];
const tip = { contentStyle: { background: 'rgba(10,12,16,.95)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 12, fontSize: 11 }, labelStyle: { color: '#94a3b8' } };
const ax = { stroke: 'rgba(255,255,255,.25)', tick: { fill: 'rgba(255,255,255,.45)', fontSize: 10 }, tickLine: false } as const;

export function Analytics({ open, setOpen, rows, mode, sel, hasHedge }: { open: boolean; setOpen: (b: boolean) => void; rows: Row[]; mode: Mode; sel: string[]; hasHedge: boolean }) {
  const drag = useDragControls();
  const [tab, setTab] = useState<'overview' | 'regression' | 'options' | 'volatility' | 'matrix'>('regression');
  const [chip, setChip] = useState('VR');
  const all = hasHedge ? pillsFor(mode) : [];
  const keys = sel.filter((k) => all.includes(k));
  const W = wealth(rows, keys);
  const bars = ['unhedged', ...all].map((k) => ({ k, name: LABEL[k], v: (metrics(rows, k) as any)[chip] }));
  const lead = keys[0];

  return (
    <motion.div
      className="glass fixed inset-x-0 bottom-0 z-50 mx-auto flex max-w-2xl flex-col rounded-t-3xl shadow-2xl border-t border-white/15"
      style={{ height: '88dvh' }}
      initial={false}
      animate={{ y: open ? 0 : '105%' }}
      transition={spring}
      drag="y"
      dragListener={false}
      dragControls={drag}
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0, bottom: 0.6 }}
      onDragEnd={(_, i) => (i.offset.y > 110 || i.velocity.y > 500) && setOpen(false)}
    >
      {/* Drag handle and header */}
      <div className="flex h-10 shrink-0 items-center justify-between px-4" onPointerDown={(e) => drag.start(e)} style={{ touchAction: 'none' }}>
        <div className="w-8" />
        <div className="h-1 w-10 rounded-full bg-white/30 cursor-grab active:cursor-grabbing" />
        <button
          onClick={() => setOpen(false)}
          className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-xs text-white/70 hover:bg-white/20 hover:text-white transition"
        >
          ✕
        </button>
      </div>

      {/* Tabs navigation */}
      <div className="noscroll flex gap-1.5 overflow-x-auto border-b border-white/10 px-4 pb-2.5 text-xs">
        {[
          ['regression', '📉 Regression & OLS'],
          ['overview', '📈 Wealth & Risk'],
          ['options', '🎯 Options Structure'],
          ['volatility', '🌊 20-Yr Volatility'],
          ['matrix', '📋 Regime Matrix'],
        ].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id as any)}
            className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-medium transition ${
              tab === id
                ? 'bg-sky-500/20 text-sky-300 border border-sky-400/30 shadow-sm'
                : 'text-white/50 hover:bg-white/5 hover:text-white/80'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab contents */}
      <div className="noscroll flex-1 space-y-7 overflow-y-auto px-4 py-4 pb-12" style={{ paddingBottom: 'max(40px, env(safe-area-inset-bottom))' }}>
        {tab === 'regression' && <RegressionTab rows={rows} hasHedge={hasHedge} />}

        {tab === 'options' && <OptionsTab rows={rows} hasHedge={hasHedge} />}

        {tab === 'volatility' && <VolatilityTab />}

        {tab === 'overview' && (
          <>
            <section>
              <h3 className="mb-1 text-[10px] uppercase tracking-widest text-white/40">Cumulative wealth &amp; drawdown</h3>
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={W} margin={{ left: -18, right: -10, top: 6 }}>
                    <CartesianGrid stroke="rgba(255,255,255,.05)" vertical={false} />
                    <XAxis dataKey="d" {...ax} minTickGap={50} tickFormatter={(d) => d.slice(2, 7)} />
                    <YAxis yAxisId="w" {...ax} domain={['auto', 'auto']} />
                    <YAxis yAxisId="d" orientation="right" {...ax} domain={['auto', 0]} />
                    <Tooltip {...tip} />
                    <Area yAxisId="d" dataKey="dd_unhedged" name="Unhedged DD %" stroke="none" fill={C.bad} fillOpacity={0.14} />
                    {lead && <Area yAxisId="d" dataKey={'dd_' + lead} name={LABEL[lead] + ' DD %'} stroke="none" fill={colorOf(lead)} fillOpacity={0.14} />}
                    <Line yAxisId="w" dataKey="unhedged" name="Unhedged" stroke={C.eq} dot={false} strokeWidth={2} />
                    {keys.map((k) => <Line yAxisId="w" key={k} dataKey={k} name={LABEL[k]} stroke={colorOf(k)} dot={false} strokeWidth={2} />)}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              {!hasHedge && <p className="text-[11px] text-white/40 mt-1">No futures/options data in this period — showing Nifty equity only.</p>}
            </section>

            <section>
              <h3 className="mb-2 text-[10px] uppercase tracking-widest text-white/40">Tail risk &amp; cost comparison</h3>
              <div className="noscroll mb-2 flex gap-1.5 overflow-x-auto">
                {CHIPS.map(([k, l]) => (
                  <button key={k} onClick={() => setChip(k)} className={`h-8 shrink-0 rounded-full border px-3 text-[11px] ${chip === k ? 'border-white/60 text-white bg-white/10' : 'border-white/10 text-white/50'}`}>
                    {l}
                  </button>
                ))}
              </div>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={bars} margin={{ left: -18, right: 4 }}>
                    <CartesianGrid stroke="rgba(255,255,255,.05)" vertical={false} />
                    <XAxis dataKey="name" {...ax} interval={0} tick={{ fill: 'rgba(255,255,255,.45)', fontSize: 8 }} />
                    <YAxis {...ax} />
                    <Tooltip {...tip} cursor={{ fill: 'rgba(255,255,255,.04)' }} formatter={(v: any) => f(Number(v))} />
                    <Bar dataKey="v" radius={[4, 4, 0, 0]}>
                      {bars.map((b) => <Cell key={b.k} fill={colorOf(b.k)} fillOpacity={b.k === 'unhedged' || sel.includes(b.k) ? 1 : 0.35} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          </>
        )}

        {tab === 'matrix' && (
          <section>
            <h3 className="mb-2 text-[10px] uppercase tracking-widest text-white/40">Regime matrix · futures vs options</h3>
            <div className="space-y-3">{PRESETS.map((p) => <RegimeCard key={p.id} id={p.id} label={p.label} />)}</div>
          </section>
        )}
      </div>
    </motion.div>
  );
}
function RegimeCard({ id, label }: { id: string; label: string }) {
  const r = DATA.regimes[id]; const m = id === 'FULL' ? r.pooledFO : r.metrics; const eq = r.eq;
  const tone = eq.class === 'Extreme' ? C.bad : eq.class === 'Elevated' ? C.warn : C.opt;
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
      <div className="flex items-start justify-between"><div><div className="text-sm font-medium">{label}</div><div className="num text-[10px] text-white/40">{r.start} → {r.end}</div></div>
        <div className="text-right"><div className="num text-xs" style={{ color: tone }}>{eq.class} · {f(eq.meanVol21, 1)}% vol</div><div className="num text-[10px] text-white/40">Nifty {f(eq.totRet, 1)}% · MDD {f(eq.MDD, 1)}%</div></div></div>
      {m ? (<div className="mt-3 overflow-x-auto"><table className="num w-full min-w-[300px] text-[11px]"><thead><tr className="text-white/35"><td></td><td className="text-right">VR%</td><td className="text-right">CVaR95</td><td className="text-right">LPM₂</td><td className="text-right">Cost%</td></tr></thead><tbody>
        {['ols', 'garch', 'egarch', 'bekk', 'put', 'collar', 'spread'].map((k) => (<tr key={k} className="border-t border-white/5"><td className="py-1" style={{ color: colorOf(k) }}>{LABEL[k]}</td><td className="text-right">{f(m[k].VR, 1)}</td><td className="text-right">{f(m[k].CVaR95)}</td><td className="text-right">{f(m[k].LPM2)}</td><td className="text-right">{f(m[k].cost)}</td></tr>))}
        <tr className="border-t border-white/5 text-white/50"><td className="py-1">Unhedged</td><td className="text-right">0</td><td className="text-right">{f(m.unhedged.CVaR95)}</td><td className="text-right">{f(m.unhedged.LPM2)}</td><td className="text-right">0</td></tr></tbody></table></div>)
        : <p className="mt-2 text-[11px] text-white/40">{id === 'SURGE' ? 'The workbook has no futures/options rows for Mar 2026 — equity metrics only.' : 'Equity-only reference window.'}</p>}
    </div>);
}
