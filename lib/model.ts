import { DATA } from './analyzedData';
import type { Row } from './types';
export type Mode = 'futures' | 'options' | 'h2h' | 'equity';
export const FUT = ['ols', 'garch', 'egarch', 'bekk'] as const;
export const OPT = ['put', 'collar', 'spread'] as const;
export const LABEL: Record<string, string> = { ols: 'Static OLS', garch: 'GARCH', egarch: 'EGARCH', bekk: 'BEKK', put: 'Protective Put', collar: 'Collar', spread: 'Put Spread', unhedged: 'Unhedged' };
export const C = { eq: '#E2E8F0', fut: '#38BDF8', opt: '#10B981', warn: '#F59E0B', bad: '#EF4444' };
export const isFut = (k: string) => (FUT as readonly string[]).includes(k);
export const colorOf = (k: string) => (k === 'unhedged' ? C.eq : isFut(k) ? C.fut : C.opt);
export const PRESETS = [
  { id: 'GFC', label: '2008 GFC' }, { id: 'COVID', label: 'Mar 2020 COVID' }, { id: 'CALM', label: 'Calm 2023' },
  { id: 'ELEC', label: 'Jun 2024 Election' }, { id: 'SURGE', label: 'Mar 2026 Surge' }, { id: 'FULL', label: 'Full 2006–2026' },
];
export const MIN_DATE = DATA.equity[0][0];
export const MAX_DATE = DATA.equity[DATA.equity.length - 1][0];
export const FO: Row[] = (Object.values(DATA.daily).flat() as Row[]).sort((a, b) => (a.d < b.d ? -1 : 1));
export const EQ: Row[] = DATA.equity.map((e, i) => ({ d: e[0], S: e[1], v: e[2] ?? 0, rs: i ? Math.log(e[1] / DATA.equity[i - 1][1]) : 0 })).slice(1);
export const rowsFor = (a: string, b: string, src: Row[]) => src.filter((r) => r.d >= a && r.d <= b);
export function defaults(m: Mode): string[] { return m === 'futures' ? ['ols', 'garch'] : m === 'options' ? ['collar'] : m === 'h2h' ? ['garch', 'collar'] : []; }
export function pillsFor(m: Mode): string[] { return m === 'futures' ? [...FUT] : m === 'options' ? [...OPT] : m === 'h2h' ? [...FUT, ...OPT] : []; }

// Gaussian-kernel (Nadaraya–Watson) surface: x = spot move, z = realised vol, y = net hedged return
export const N = 26;
export function surface(rows: Row[], key: string, xm: number, v0: number, v1: number) {
  const h = new Float32Array(N * N); const span = Math.max(v1 - v0, 1e-6);
  const px = rows.map((r) => r.rs / xm), pz = rows.map((r) => (r.v - v0) / span), py = rows.map((r) => (key === 'unhedged' ? r.rs : r[key]) / xm);
  for (let iz = 0; iz < N; iz++) for (let ix = 0; ix < N; ix++) {
    const x = (ix / (N - 1)) * 2 - 1, z = iz / (N - 1); let w = 0.015, s = 0;
    for (let i = 0; i < px.length; i++) { const k = Math.exp(-(((x - px[i]) ** 2) / (2 * 0.2 ** 2) + ((z - pz[i]) ** 2) / (2 * 0.3 ** 2))); w += k; s += k * py[i]; }
    h[iz * N + ix] = Math.max(-1.2, Math.min(1.2, s / w)) * 1.6;
  }
  return h;
}
export function nearest(rows: Row[], x: number, z: number, xm: number, v0: number, v1: number) {
  const span = Math.max(v1 - v0, 1e-6); let best = rows[0], bd = 1e9;
  for (const r of rows) { const d = (r.rs / xm - x) ** 2 + ((r.v - v0) / span - z) ** 2; if (d < bd) { bd = d; best = r; } }
  return best;
}
export function metrics(rows: Row[], key: string) {
  const rs = rows.map((r) => r.rs), rh = key === 'unhedged' ? rs : rows.map((r) => r[key]); const n = rh.length;
  const mean = (a: number[]) => a.reduce((s, x) => s + x, 0) / Math.max(a.length, 1);
  const vr = (a: number[]) => { const m = mean(a); return a.reduce((s, x) => s + (x - m) ** 2, 0) / Math.max(a.length - 1, 1); };
  const L = rh.map((x) => -x).sort((a, b) => a - b);
  const q = (p: number) => { const i = (n - 1) * p, lo = Math.floor(i), hi = Math.ceil(i); return L[lo] + (L[hi] - L[lo]) * (i - lo); };
  const cv = (v: number) => mean(L.filter((x) => x >= v));
  let w = 1, pk = 1, mdd = 0, tot = 0; for (const x of rh) { w *= Math.exp(x); pk = Math.max(pk, w); mdd = Math.max(mdd, 1 - w / pk); tot += x; }
  const cost = key === 'unhedged' ? 0 : isFut(key) ? rows.reduce((s, r) => s + r[key + 'c'], 0) : rows.reduce((s, r) => s + r[key + 'p'] + r[key + 't'], 0);
  return { n, VR: 100 * (1 - vr(rh) / vr(rs)), VaR95: 100 * q(0.95), VaR99: 100 * q(0.99), CVaR95: 100 * cv(q(0.95)), CVaR99: 100 * cv(q(0.99)), LPM2: 1e4 * mean(rh.map((x) => Math.max(-x, 0) ** 2)), totRet: 100 * Math.expm1(tot), MDD: 100 * mdd, cost };
}
export function wealth(rows: Row[], keys: string[]) {
  const stride = Math.max(1, Math.ceil(rows.length / 320)); const acc: Record<string, number> = {}, pk: Record<string, number> = {}; const out: any[] = [];
  ['unhedged', ...keys].forEach((k) => { acc[k] = 1; pk[k] = 1; });
  rows.forEach((r, i) => {
    const o: any = { d: r.d };
    for (const k of Object.keys(acc)) { acc[k] *= Math.exp(k === 'unhedged' ? r.rs : r[k]); pk[k] = Math.max(pk[k], acc[k]); o[k] = +acc[k].toFixed(4); o['dd_' + k] = +(100 * (acc[k] / pk[k] - 1)).toFixed(2); }
    if (i % stride === 0 || i === rows.length - 1) out.push(o);
  });
  return out;
}
