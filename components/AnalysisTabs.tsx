'use client';
import { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ScatterChart,
  Scatter,
  Area,
} from 'recharts';
import { DATA } from '@/lib/analyzedData';
import {
  computeRegression,
  getHedgeRatioSeries,
  getOptionsPayoffData,
  getVolatilityHistory,
} from '@/lib/regression';
import { LABEL, colorOf, C } from '@/lib/model';
import type { Row } from '@/lib/types';

const tip = {
  contentStyle: {
    background: 'rgba(10,12,16,.95)',
    border: '1px solid rgba(255,255,255,.12)',
    borderRadius: 12,
    fontSize: 11,
  },
  labelStyle: { color: '#94a3b8' },
};
const ax = {
  stroke: 'rgba(255,255,255,.25)',
  tick: { fill: 'rgba(255,255,255,.45)', fontSize: 10 },
  tickLine: false,
} as const;

export function RegressionTab({ rows, hasHedge }: { rows: Row[]; hasHedge: boolean }) {
  const reg = useMemo(() => computeRegression(rows), [rows]);
  const hedgeRatios = useMemo(() => getHedgeRatioSeries(rows), [rows]);

  if (!hasHedge || reg.n < 5) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center">
        <p className="text-sm font-medium text-white/80">No Futures Data In This Date Range</p>
        <p className="mt-2 text-xs text-white/40">
          The Excel dataset contains high-frequency futures &amp; options contracts for the 4 core regimes
          (2008 GFC, 2020 COVID, 2023 Calm, 2024 Election). Select one of these periods to view live OLS regression and dynamic GARCH models.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Formula & Top Metrics */}
      <div>
        <div className="flex items-center justify-between">
          <h4 className="text-[10px] font-medium uppercase tracking-widest text-white/40">
            OLS Hedge Ratio &amp; Regression Fit
          </h4>
          <span className="num text-[10px] text-sky-400">N = {reg.n} trading days</span>
        </div>
        <div className="mt-1.5 rounded-xl border border-white/10 bg-white/[0.02] p-2.5 font-mono text-xs text-white/80">
          Δ ln(Sₜ) = {reg.alpha >= 0 ? '+' : ''}{(reg.alpha).toFixed(4)}% +{' '}
          <span className="font-bold text-sky-300">{(reg.beta).toFixed(3)}</span> × Δ ln(Fₜ) + εₜ
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-xl border border-sky-500/20 bg-sky-500/[0.05] p-2.5 text-center">
            <div className="text-[10px] text-sky-300/70">Optimal Hedge (β)</div>
            <div className="num mt-0.5 text-base font-bold text-sky-400">{reg.beta.toFixed(3)}</div>
            <div className="text-[9px] text-white/40">h* = Cov(s,f)/Var(f)</div>
          </div>
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.05] p-2.5 text-center">
            <div className="text-[10px] text-emerald-300/70">Variance Red. (R²)</div>
            <div className="num mt-0.5 text-base font-bold text-emerald-400">{reg.r2.toFixed(2)}%</div>
            <div className="text-[9px] text-white/40">Risk reduction vs equity</div>
          </div>
          <div className="rounded-xl border border-purple-500/20 bg-purple-500/[0.05] p-2.5 text-center">
            <div className="text-[10px] text-purple-300/70">t-Statistic</div>
            <div className="num mt-0.5 text-base font-bold text-purple-400">{reg.tStat.toFixed(1)}</div>
            <div className="text-[9px] text-white/40">{reg.pVal}</div>
          </div>
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.05] p-2.5 text-center">
            <div className="text-[10px] text-amber-300/70">Std Error (SE)</div>
            <div className="num mt-0.5 text-base font-bold text-amber-400">±{reg.se.toFixed(4)}</div>
            <div className="text-[9px] text-white/40">Basis drift margin</div>
          </div>
        </div>
      </div>

      {/* Spot vs Futures Scatter Plot */}
      <div>
        <h4 className="mb-2 text-[10px] uppercase tracking-widest text-white/40">
          Spot Return vs. Futures Return (Daily %)
        </h4>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: -10 }}>
              <CartesianGrid stroke="rgba(255,255,255,.05)" />
              <XAxis
                type="number"
                dataKey="x"
                name="Futures Return"
                unit="%"
                {...ax}
                tickFormatter={(v) => `${v}%`}
              />
              <YAxis
                type="number"
                dataKey="y"
                name="Spot Return"
                unit="%"
                {...ax}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip
                {...tip}
                cursor={{ strokeDasharray: '3 3' }}
                formatter={(v: any, name: any) => [`${Number(v).toFixed(2)}%`, name]}
              />
              <Scatter name="Trading Days" data={reg.scatter} fill="#38BDF8" fillOpacity={0.65} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-1 text-center text-[10px] text-white/40">
          Slope of linear fit line equals the optimal OLS hedge ratio (β = {reg.beta.toFixed(3)}).
        </p>
      </div>

      {/* Dynamic Hedge Ratio Trajectory Chart */}
      <div>
        <h4 className="mb-1 text-[10px] uppercase tracking-widest text-white/40">
          Dynamic Hedge Ratios (hₜ) Over Time: OLS vs. GARCH vs. EGARCH vs. BEKK
        </h4>
        <p className="mb-2 text-[10px] text-white/50">
          Observes how multivariate GARCH conditional covariance models adapt daily compared to static linear regression.
        </p>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={hedgeRatios} margin={{ top: 5, right: 10, bottom: 5, left: -15 }}>
              <CartesianGrid stroke="rgba(255,255,255,.05)" vertical={false} />
              <XAxis dataKey="d" {...ax} minTickGap={40} />
              <YAxis domain={['auto', 'auto']} {...ax} tickFormatter={(v) => v.toFixed(2)} />
              <Tooltip {...tip} />
              <Line dataKey="ols" name="Static OLS" stroke="#94A3B8" strokeDasharray="4 4" dot={false} strokeWidth={1.5} />
              <Line dataKey="garch" name="GARCH(1,1)" stroke="#38BDF8" dot={false} strokeWidth={2} />
              <Line dataKey="egarch" name="EGARCH (Asymmetric)" stroke="#A855F7" dot={false} strokeWidth={2} />
              <Line dataKey="bekk" name="BEKK-GARCH" stroke="#10B981" dot={false} strokeWidth={2} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Econometric Parameters Details */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3.5 space-y-3">
        <h4 className="text-xs font-semibold text-white">Multivariate Econometric Parameter Estimates:</h4>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 text-[11px]">
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-2.5">
            <strong className="text-sky-300">GARCH(1,1) CCC:</strong>
            <div className="num mt-1 text-white/70">Corr ρ = {DATA.meta.models.garch.rho.toFixed(4)}</div>
            <div className="text-[10px] text-white/40 mt-0.5">
              Spot α₁={DATA.meta.models.garch.params.rs[1]}, β₁={DATA.meta.models.garch.params.rs[2]}
            </div>
            <div className="text-[9px] text-emerald-400/80 mt-1">High persistence (&gt;0.99)</div>
          </div>

          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-2.5">
            <strong className="text-purple-300">EGARCH (Leverage):</strong>
            <div className="num mt-1 text-white/70">Corr ρ = {DATA.meta.models.egarch.rho.toFixed(4)}</div>
            <div className="text-[10px] text-white/40 mt-0.5">
              Asymmetry γ = {DATA.meta.models.egarch.params.rs[2]}
            </div>
            <div className="text-[9px] text-amber-400/80 mt-1">Negative shock spikes vol</div>
          </div>

          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-2.5">
            <strong className="text-emerald-300">BEKK-GARCH:</strong>
            <div className="num mt-1 text-white/70">NLL = {DATA.meta.models.bekk.nll.toFixed(2)}</div>
            <div className="text-[10px] text-white/40 mt-0.5">
              Full 2×2 ARCH &amp; GARCH matrix
            </div>
            <div className="text-[9px] text-sky-400/80 mt-1">Co-volatility clustering</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function OptionsTab({ rows, hasHedge }: { rows: Row[]; hasHedge: boolean }) {
  const payoffData = useMemo(() => getOptionsPayoffData(), []);

  // Find active regime's legs
  const activeRegime = useMemo(() => {
    for (const key of ['GFC', 'COVID', 'CALM', 'ELEC'] as const) {
      const reg = DATA.regimes[key];
      if (rows.some((r) => r.d >= reg.start && r.d <= reg.end)) {
        return reg;
      }
    }
    return DATA.regimes.GFC;
  }, [rows]);

  return (
    <div className="space-y-6">
      {/* Payoff Curve */}
      <div>
        <h4 className="mb-1 text-[10px] uppercase tracking-widest text-white/40">
          Non-Linear Options Payoff Profile (Expiry Return %)
        </h4>
        <p className="mb-2 text-[10px] text-white/50">
          Payoff comparison as Nifty spot return moves from -20% to +20%:
        </p>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={payoffData} margin={{ top: 5, right: 10, bottom: 5, left: -15 }}>
              <CartesianGrid stroke="rgba(255,255,255,.05)" vertical={false} />
              <XAxis dataKey="move" {...ax} minTickGap={35} />
              <YAxis {...ax} domain={[-22, 22]} tickFormatter={(v) => `${v}%`} />
              <Tooltip {...tip} formatter={(v: any) => `${Number(v).toFixed(1)}%`} />
              <Line dataKey="Spot" name="Unhedged Spot" stroke={C.eq} strokeDasharray="3 3" dot={false} strokeWidth={1.5} />
              <Line dataKey="Protective Put" name="Protective Put (95% Strike)" stroke="#38BDF8" dot={false} strokeWidth={2} />
              <Line dataKey="Collar" name="Collar (95% Put / 105% Call)" stroke="#10B981" dot={false} strokeWidth={2} />
              <Line dataKey="Put Spread" name="Bear Put Spread (95% / 90%)" stroke="#F59E0B" dot={false} strokeWidth={2} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Contract Roll Details from Excel */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-[10px] uppercase tracking-widest text-white/40">
            Historical Option Contracts &amp; Roll Cycles ({activeRegime.label})
          </h4>
          <span className="text-[10px] text-white/50">{activeRegime.legs?.length || 0} cycles logged</span>
        </div>
        <div className="max-h-64 overflow-y-auto rounded-2xl border border-white/10 bg-white/[0.02]">
          <table className="num w-full min-w-[420px] text-[11px]">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.04] text-white/40 text-left">
                <th className="p-2 font-medium">Roll Date</th>
                <th className="p-2 font-medium">Strategy</th>
                <th className="p-2 font-medium text-right">Spot</th>
                <th className="p-2 font-medium text-right">Strike(s)</th>
                <th className="p-2 font-medium text-right">Expiry</th>
                <th className="p-2 font-medium text-right">Net Cost (₹)</th>
              </tr>
            </thead>
            <tbody>
              {activeRegime.legs?.slice(0, 18).map((leg: any, i: number) => {
                const strikeDesc = leg.legs
                  .map((l: any) => `${l.side === 'short' ? '-' : '+'}${l.strike}${l.type}`)
                  .join(' / ');
                return (
                  <tr key={i} className="border-b border-white/5 hover:bg-white/[0.03]">
                    <td className="p-2 text-white/80">{leg.date}</td>
                    <td className="p-2 font-medium" style={{ color: colorOf(leg.strat) }}>
                      {LABEL[leg.strat]}
                    </td>
                    <td className="p-2 text-right text-white/70">{leg.spot.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                    <td className="p-2 text-right font-mono text-white/80">{strikeDesc}</td>
                    <td className="p-2 text-right text-white/60">{leg.expiry}</td>
                    <td className="p-2 text-right font-bold" style={{ color: leg.net > 0 ? '#F59E0B' : '#10B981' }}>
                      {leg.net > 0 ? `+₹${leg.net.toFixed(1)}` : `-₹${Math.abs(leg.net).toFixed(1)}`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-1 text-[10px] text-white/40">
          Source: NSE Options tick data inside {activeRegime.label} regime. Strikes selected at ~95% spot (Puts) &amp; ~105% spot (Calls).
        </p>
      </div>
    </div>
  );
}

export function VolatilityTab() {
  const volHistory = useMemo(() => getVolatilityHistory(12), []);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between">
          <h4 className="text-[10px] uppercase tracking-widest text-white/40">
            20-Year Historical Volatility (2007 – 2026)
          </h4>
          <span className="num text-[10px] text-white/50">4,705 Daily Observations</span>
        </div>
        <p className="mt-0.5 text-xs text-white/50">
          Nifty 50 21-day annualized rolling volatility from the Excel dataset across multi-decade market cycles.
        </p>
        <div className="mt-3 h-60">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={volHistory} margin={{ top: 5, right: 10, bottom: 5, left: -15 }}>
              <CartesianGrid stroke="rgba(255,255,255,.05)" vertical={false} />
              <XAxis dataKey="date" {...ax} minTickGap={45} />
              <YAxis yAxisId="v" {...ax} domain={[0, 95]} tickFormatter={(v) => `${v}%`} />
              <YAxis yAxisId="s" orientation="right" {...ax} domain={['auto', 'auto']} tickFormatter={(v) => (v / 1000).toFixed(0) + 'k'} />
              <Tooltip {...tip} />
              <Area yAxisId="v" dataKey="vol" name="21d Realised Vol %" stroke="#EF4444" fill="#EF4444" fillOpacity={0.18} />
              <Line yAxisId="s" dataKey="spot" name="Nifty 50 Spot Level" stroke="#38BDF8" dot={false} strokeWidth={1.5} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Volatility Regimes Breakdown */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-xl border border-red-500/20 bg-red-500/[0.04] p-2.5">
          <div className="text-[10px] text-red-300/80 font-medium">2008 Lehman GFC</div>
          <div className="num mt-1 text-sm font-bold text-red-400">Peak: 88.9%</div>
          <div className="text-[10px] text-white/50">Nifty MDD: -59.9%</div>
        </div>
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-2.5">
          <div className="text-[10px] text-amber-300/80 font-medium">2020 COVID Crash</div>
          <div className="num mt-1 text-sm font-bold text-amber-400">Peak: 89.5%</div>
          <div className="text-[10px] text-white/50">Nifty MDD: -38.4%</div>
        </div>
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-2.5">
          <div className="text-[10px] text-emerald-300/80 font-medium">2023 Low-Vol Bull</div>
          <div className="num mt-1 text-sm font-bold text-emerald-400">Mean: 8.1%</div>
          <div className="text-[10px] text-white/50">Range: 7% → 10%</div>
        </div>
        <div className="rounded-xl border border-sky-500/20 bg-sky-500/[0.04] p-2.5">
          <div className="text-[10px] text-sky-300/80 font-medium">2024 Election Shock</div>
          <div className="num mt-1 text-sm font-bold text-sky-400">Jump: 29.9%</div>
          <div className="text-[10px] text-white/50">1-Day drop: -5.9%</div>
        </div>
      </div>
    </div>
  );
}

