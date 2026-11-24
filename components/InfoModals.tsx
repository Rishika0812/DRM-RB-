'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

const spring = { type: 'spring', stiffness: 350, damping: 32 } as const;

export function HowToViewModal({ open, close }: { open: boolean; close: () => void }) {
  const [activeTab, setActiveTab] = useState<'gestures' | 'axes' | 'colors'>('gestures');

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
          />
          <motion.div
            className="glass fixed inset-x-3 top-1/2 z-50 mx-auto max-w-lg -translate-y-1/2 rounded-3xl p-5 shadow-2xl md:p-6"
            style={{ maxHeight: '88dvh' }}
            initial={{ opacity: 0, scale: 0.94, y: '-45%' }}
            animate={{ opacity: 1, scale: 1, y: '-50%' }}
            exit={{ opacity: 0, scale: 0.94, y: '-45%' }}
            transition={spring}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-sky-500/20 text-xs font-bold text-sky-400">
                    3D
                  </span>
                  <h2 className="text-base font-semibold tracking-tight text-white">How to View 3D Diagram</h2>
                </div>
                <p className="mt-0.5 text-xs text-white/50">Touch gestures, zoom controls &amp; 3D navigation</p>
              </div>
              <button
                onClick={close}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-sm text-white/70 hover:bg-white/20 hover:text-white transition"
              >
                ✕
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="mt-3 grid grid-cols-3 gap-1 rounded-xl bg-white/[0.04] p-1 text-xs">
              {(
                [
                  ['gestures', 'Controls & Zoom'],
                  ['axes', 'Axes Guide'],
                  ['colors', 'Heatmap'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`rounded-lg py-1.5 font-medium transition ${
                    activeTab === id ? 'bg-white/15 text-white shadow-sm' : 'text-white/50 hover:text-white/80'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Content Body */}
            <div className="noscroll mt-3 space-y-3.5 overflow-y-auto pr-1 text-xs text-white/80" style={{ maxHeight: '60dvh' }}>
              {activeTab === 'gestures' && (
                <>
                  <div className="rounded-2xl border border-sky-500/20 bg-sky-500/[0.06] p-3 text-sky-200">
                    <div className="font-semibold text-sky-300">📱 Mobile &amp; Touch Gestures:</div>
                    <ul className="mt-2 space-y-2 text-white/80">
                      <li className="flex items-start gap-2">
                        <span className="rounded bg-white/10 px-1.5 py-0.5 text-[11px] font-mono text-sky-300">1 Finger</span>
                        <span><strong>Drag:</strong> Rotate the 3D surface in 360° to view from any perspective.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="rounded bg-white/10 px-1.5 py-0.5 text-[11px] font-mono text-emerald-300">2 Fingers</span>
                        <span><strong>Pinch In / Out:</strong> Zoom out to make the diagram smaller so the whole space fits on your phone screen, or zoom in for close inspection.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="rounded bg-white/10 px-1.5 py-0.5 text-[11px] font-mono text-purple-300">2 Fingers</span>
                        <span><strong>Drag:</strong> Pan and reposition the diagram up or down away from the bottom bar.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="rounded bg-white/10 px-1.5 py-0.5 text-[11px] font-mono text-amber-300">Tap</span>
                        <span><strong>Tap on any point:</strong> Inspect historical date, spot price, 21d volatility, and strategy return.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="rounded bg-white/10 px-1.5 py-0.5 text-[11px] font-mono text-cyan-300">Double-Tap</span>
                        <span><strong>Double-tap background:</strong> Instantly recenter and restore the default camera view.</span>
                      </li>
                    </ul>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                    <div className="font-semibold text-white">🔍 Quick On-Screen Buttons (Top Right):</div>
                    <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-xl border border-white/5 bg-white/5 p-2">
                        <div className="text-sm font-bold text-white">+</div>
                        <div className="text-[10px] text-white/50">Zoom In</div>
                      </div>
                      <div className="rounded-xl border border-white/5 bg-white/5 p-2">
                        <div className="text-sm font-bold text-white">−</div>
                        <div className="text-[10px] text-white/50">Zoom Out (Make Smaller)</div>
                      </div>
                      <div className="rounded-xl border border-white/5 bg-white/5 p-2">
                        <div className="text-sm font-bold text-white">↺</div>
                        <div className="text-[10px] text-white/50">Reset View</div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                    <div className="font-semibold text-white">💻 Desktop Mouse Controls:</div>
                    <ul className="mt-1.5 space-y-1 text-white/70">
                      <li>• <strong>Left Click + Drag:</strong> Rotate surface</li>
                      <li>• <strong>Scroll Wheel:</strong> Zoom in / out (adjust scale)</li>
                      <li>• <strong>Right Click + Drag:</strong> Pan camera position</li>
                      <li>• <strong>Click Surface:</strong> Pin data point inspection card</li>
                    </ul>
                  </div>
                </>
              )}

              {activeTab === 'axes' && (
                <div className="space-y-3">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-cyan-400"></span>
                      <span className="font-semibold text-cyan-300">X-Axis: Spot Move (%)</span>
                    </div>
                    <p className="mt-1 text-white/70 leading-relaxed">
                      Horizontal axis representing the 1-day percentage price change in the Nifty 50 index.
                      Movements to the left indicate market drops or crashes; movements to the right indicate rallies.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-indigo-400"></span>
                      <span className="font-semibold text-indigo-300">Z-Axis: Realised Volatility (21d)</span>
                    </div>
                    <p className="mt-1 text-white/70 leading-relaxed">
                      Depth axis showing 21-day annualized rolling volatility.
                      Front points represent calm market regimes; rear points reflect market stress and volatility spikes.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
                      <span className="font-semibold text-emerald-300">Y-Axis (Height): Hedged Return (%)</span>
                    </div>
                    <p className="mt-1 text-white/70 leading-relaxed">
                      Vertical elevation of the surface. Higher elevation means positive hedged portfolio returns.
                      Depressions or downward slopes show net portfolio drawdowns.
                    </p>
                  </div>
                </div>
              )}

              {activeTab === 'colors' && (
                <div className="space-y-3">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                    <div className="font-semibold text-white">Surface Color Elevation Map:</div>
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center gap-2.5">
                        <div className="h-4 w-4 shrink-0 rounded bg-white"></div>
                        <div>
                          <strong className="text-white">White / High Peak:</strong>
                          <span className="text-white/60"> Strong positive hedged return</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <div className="h-4 w-4 shrink-0 rounded bg-sky-500"></div>
                        <div>
                          <strong className="text-sky-300">Strategy Color (Blue/Green/Purple):</strong>
                          <span className="text-white/60"> Capital preservation zone &amp; stable protection</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <div className="h-4 w-4 shrink-0 rounded bg-amber-500"></div>
                        <div>
                          <strong className="text-amber-300">Amber / Orange:</strong>
                          <span className="text-white/60"> Mild drawdown or option premium cost drag</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <div className="h-4 w-4 shrink-0 rounded bg-rose-500"></div>
                        <div>
                          <strong className="text-rose-300">Red / Deep Trough:</strong>
                          <span className="text-white/60"> Severe tail risk drawdown / unhedged loss</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 border-t border-white/10 pt-3">
              <button
                onClick={close}
                className="w-full rounded-xl bg-white/10 py-2.5 text-center text-xs font-semibold text-white hover:bg-white/20 transition"
              >
                Got It
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export function AboutModal({ open, close }: { open: boolean; close: () => void }) {
  const [activeTab, setActiveTab] = useState<'about' | 'regimes' | 'models'>('about');

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
          />
          <motion.div
            className="glass fixed inset-x-3 top-1/2 z-50 mx-auto max-w-lg -translate-y-1/2 rounded-3xl p-5 shadow-2xl md:p-6"
            style={{ maxHeight: '88dvh' }}
            initial={{ opacity: 0, scale: 0.94, y: '-45%' }}
            animate={{ opacity: 1, scale: 1, y: '-50%' }}
            exit={{ opacity: 0, scale: 0.94, y: '-45%' }}
            transition={spring}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-500/20 text-xs font-bold text-amber-400">
                    ℹ
                  </span>
                  <h2 className="text-base font-semibold tracking-tight text-white">About This Website</h2>
                </div>
                <p className="mt-0.5 text-xs text-white/50">Nifty 50 Hedge Space &amp; Derivatives Risk Lab</p>
              </div>
              <button
                onClick={close}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-sm text-white/70 hover:bg-white/20 hover:text-white transition"
              >
                ✕
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="mt-3 grid grid-cols-3 gap-1 rounded-xl bg-white/[0.04] p-1 text-xs">
              {(
                [
                  ['about', 'Overview'],
                  ['regimes', 'Market Regimes'],
                  ['models', 'Hedge Models'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`rounded-lg py-1.5 font-medium transition ${
                    activeTab === id ? 'bg-white/15 text-white shadow-sm' : 'text-white/50 hover:text-white/80'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Content Body */}
            <div className="noscroll mt-3 space-y-3.5 overflow-y-auto pr-1 text-xs text-white/80" style={{ maxHeight: '60dvh' }}>
              {activeTab === 'about' && (
                <>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 leading-relaxed">
                    <h3 className="font-semibold text-white">🎯 What is Nifty Hedge Space?</h3>
                    <p className="mt-1.5 text-white/70">
                      <strong>Nifty Hedge Space</strong> is an interactive quantitative finance lab that visualizes
                      and compares <strong>futures and options hedging effectiveness</strong> on India’s benchmark
                      equity index: <strong>NSE Nifty 50</strong>.
                    </p>
                    <p className="mt-2 text-white/70">
                      Traditional finance reports present risk in static 2D tables (Sharpe ratio, max drawdown).
                      This platform constructs full <strong>3D non-linear risk surfaces</strong> mapping spot market moves,
                      realised volatility, and hedged portfolio returns across extreme historical market crises.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                    <h3 className="font-semibold text-white">📊 Key Quantitative Metrics Analyzed:</h3>
                    <ul className="mt-2 space-y-1.5 text-white/70">
                      <li>• <strong className="text-emerald-300">Variance Reduction (VR %):</strong> Percentage reduction in portfolio return variance compared to holding unhedged equity.</li>
                      <li>• <strong className="text-amber-300">VaR 95 &amp; CVaR 95:</strong> 95% Value-at-Risk and Conditional VaR (Expected Shortfall) measuring tail disaster losses.</li>
                      <li>• <strong className="text-cyan-300">LPM₂ (Lower Partial Moment):</strong> Semi-variance focusing exclusively on downside deviations below target.</li>
                      <li>• <strong className="text-rose-300">Net Cost %:</strong> Cumulative drag from options premiums and basis execution costs.</li>
                    </ul>
                  </div>
                </>
              )}

              {activeTab === 'regimes' && (
                <div className="space-y-2.5">
                  <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.05] p-3">
                    <div className="flex items-center justify-between">
                      <strong className="text-red-300">2008 Global Financial Crisis (GFC)</strong>
                      <span className="text-[10px] text-white/40">Oct 2007 → Jun 2009</span>
                    </div>
                    <p className="mt-1 text-white/70">
                      Severe credit contagion and Lehman Brothers bankruptcy. Nifty experienced a maximum drawdown
                      of <strong>-59.9%</strong> and 21d volatility spiked above <strong>60%</strong>.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.05] p-3">
                    <div className="flex items-center justify-between">
                      <strong className="text-amber-300">2020 COVID-19 Crash</strong>
                      <span className="text-[10px] text-white/40">Jan 2020 → Jun 2020</span>
                    </div>
                    <p className="mt-1 text-white/70">
                      Fastest bear market collapse in history. Nifty plunged <strong>-38.4%</strong> in under 4 weeks
                      with unprecedented circuit breakers and rapid recovery.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.05] p-3">
                    <div className="flex items-center justify-between">
                      <strong className="text-emerald-300">2023 Low-Volatility Regime</strong>
                      <span className="text-[10px] text-white/40">Apr 2023 → Oct 2023</span>
                    </div>
                    <p className="mt-1 text-white/70">
                      Persistent range-bound bull market. Volatility compressed to <strong>~10-11%</strong>, testing
                      hedging costs during calm bull rallies where option drag becomes evident.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-sky-500/20 bg-sky-500/[0.05] p-3">
                    <div className="flex items-center justify-between">
                      <strong className="text-sky-300">2024 Election Volatility</strong>
                      <span className="text-[10px] text-white/40">Apr 2024 → Jun 2024</span>
                    </div>
                    <p className="mt-1 text-white/70">
                      Event-driven volatility with pre-election IV surge and extreme single-day swing
                      (<strong>-5.9%</strong> on June 4 election results day, followed by rapid recovery).
                    </p>
                  </div>
                </div>
              )}

              {activeTab === 'models' && (
                <div className="space-y-3">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                    <strong className="text-sky-300">Linear Futures Models:</strong>
                    <ul className="mt-1.5 space-y-1 text-white/70">
                      <li>• <strong>OLS:</strong> Constant hedge ratio from static linear regression.</li>
                      <li>• <strong>GARCH(1,1):</strong> Time-varying ratio responding to daily volatility clustering.</li>
                      <li>• <strong>EGARCH:</strong> Exponential GARCH capturing asymmetric downside leverage shocks.</li>
                      <li>• <strong>BEKK-GARCH:</strong> Full bivariate co-volatility model between spot and futures.</li>
                    </ul>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                    <strong className="text-purple-300">Asymmetric Options Models:</strong>
                    <ul className="mt-1.5 space-y-1 text-white/70">
                      <li>• <strong>Protective Put:</strong> Pure downside floor preserving 100% upside participation.</li>
                      <li>• <strong>Collar:</strong> Long put + short out-of-the-money call for zero/low net premium.</li>
                      <li>• <strong>Bear Put Spread:</strong> Bounded downside protection at discounted premium cost.</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 border-t border-white/10 pt-3">
              <button
                onClick={close}
                className="w-full rounded-xl bg-white/10 py-2.5 text-center text-xs font-semibold text-white hover:bg-white/20 transition"
              >
                Close
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

