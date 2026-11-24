'use client';
import dynamic from 'next/dynamic';
import { useMemo, useRef, useState } from 'react';
import type * as THREE from 'three';
import { Dock, RangeSheet, Analytics } from '@/components/Panels';
import { DATA } from '@/lib/analyzedData';
import { Mode, FUT, OPT, FO, EQ, rowsFor, surface, nearest, defaults, LABEL, C, colorOf } from '@/lib/model';
const Scene = dynamic(() => import('@/components/Scene'), { ssr: false });

export default function Page() {
  const g = DATA.regimes.GFC;
  const [mode, setMode] = useState<Mode>('h2h'); const [sel, setSel] = useState<string[]>(defaults('h2h'));
  const [range, setRange] = useState({ a: g.start, b: g.end });
  const [openA, setOpenA] = useState(false), [openR, setOpenR] = useState(false), [recenter, setRecenter] = useState(0);
  const [pick, setPick] = useState<{ p: THREE.Vector3; row: any } | null>(null);
  const last = useRef(0);
  const changeMode = (m: Mode) => { setMode(m); setSel(defaults(m)); setPick(null); };
  const toggle = (k: string) => setSel((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k]));

  const hedgeRows = useMemo(() => rowsFor(range.a, range.b, FO), [range]);
  const hasHedge = mode !== 'equity' && hedgeRows.length >= 5;
  const rows = useMemo(() => (hasHedge ? hedgeRows : rowsFor(range.a, range.b, EQ)), [hasHedge, hedgeRows, range]);
  const view = useMemo(() => {
    const xm = Math.max(0.005, ...rows.map((r) => Math.abs(r.rs))), vs = rows.map((r) => r.v), v0 = Math.min(...vs), v1 = Math.max(...vs);
    const fk = sel.find((k) => (FUT as readonly string[]).includes(k)) ?? 'ols', ok = sel.find((k) => (OPT as readonly string[]).includes(k)) ?? 'collar';
    const keys = !hasHedge ? ['unhedged'] : mode === 'futures' ? [sel[0] ?? 'ols'] : mode === 'options' ? [sel[0] ?? 'collar'] : [fk, ok];
    const surfaces = rows.length < 2 ? [] : keys.map((k) => ({ h: surface(rows, k, xm, v0, v1), color: colorOf(k) }));
    return { xm, v0, v1, keys, surfaces };
  }, [rows, sel, mode, hasHedge]);

  const onPick = (p: THREE.Vector3) => setPick({ p, row: nearest(rows, p.x / 3, (p.z / 3 + 1) / 2, view.xm, view.v0, view.v1) });
  const tap = () => { const t = Date.now(); if (t - last.current < 300) setRecenter((n) => n + 1); last.current = t; };
  const label = !hasHedge ? 'Nifty Equity' : mode === 'h2h' ? 'Futures vs Options' : mode === 'futures' ? 'Nifty Futures' : 'Nifty Options';

  return (
    <main className="fixed inset-0 bg-black" style={{ height: '100dvh' }} onPointerDown={tap}>
      <Scene surfaces={view.surfaces} pick={pick?.p ?? null} onPick={onPick} recenter={recenter} />
      <div className="pointer-events-none absolute inset-x-0 top-0 p-4" style={{ paddingTop: 'max(16px, env(safe-area-inset-top))' }}>
        <div className="text-[10px] font-medium uppercase tracking-[0.3em] text-white/40">Nifty 50 · Hedge Space</div>
        <div className="mt-1 text-lg font-semibold tracking-tight">{label}</div>
        <div className="num mt-0.5 text-[10px] text-white/40">{mode !== 'equity' && !hasHedge ? 'No F&O rows in this period · ' : ''}{rows.length} trading days · surface: {view.keys.map((k) => LABEL[k]).join(' + ')}</div>
      </div>
      {pick && (
        <div className="glass pointer-events-none absolute left-4 top-24 w-56 rounded-2xl p-3" onPointerDown={(e) => e.stopPropagation()}>
          <div className="num text-[10px] text-white/40">{pick.row.d}</div>
          <div className="num mt-1 flex justify-between text-xs"><span className="text-white/50">Spot</span><span>{pick.row.S.toLocaleString('en-IN')}</span></div>
          <div className="num flex justify-between text-xs"><span className="text-white/50">21d vol</span><span style={{ color: pick.row.v > 0.3 ? C.bad : pick.row.v > 0.16 ? C.warn : C.eq }}>{(pick.row.v * 100).toFixed(1)}%</span></div>
          <div className="num flex justify-between text-xs"><span className="text-white/50">Spot move</span><span>{(pick.row.rs * 100).toFixed(2)}%</span></div>
          {view.keys.filter((k) => k !== 'unhedged').map((k) => (<div key={k} className="num flex justify-between text-xs"><span style={{ color: colorOf(k) }}>{LABEL[k]}</span><span>{(pick.row[k] * 100).toFixed(2)}%</span></div>))}
        </div>)}
      <div onPointerDown={(e) => e.stopPropagation()}>
        <Dock mode={mode} setMode={changeMode} sel={sel} toggle={toggle} range={range} openRange={() => setOpenR(true)} openSheet={() => setOpenA(true)} />
        <RangeSheet open={openR} close={() => setOpenR(false)} range={range} setRange={(r: any) => { setRange(r.a <= r.b ? r : { a: r.b, b: r.a }); setPick(null); }} covered={hedgeRows.length} />
        <Analytics open={openA} setOpen={setOpenA} rows={rows} mode={mode} sel={sel} hasHedge={hasHedge} />
      </div>
    </main>);
}
