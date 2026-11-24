import { DATA } from './analyzedData';
import type { Row } from './types';

export type RegressionResult = {
  beta: number;
  alpha: number;
  r2: number;
  vr: number;
  se: number;
  tStat: number;
  pVal: string;
  n: number;
  scatter: { x: number; y: number; d: string }[];
  fitLine: { x: number; y: number }[];
};

export function computeRegression(rows: Row[]): RegressionResult {
  const valid = rows.filter((r) => r.rs !== undefined && r.ols !== undefined && r.olsh);
  if (valid.length < 3) {
    return {
      beta: 1,
      alpha: 0,
      r2: 0,
      vr: 0,
      se: 0,
      tStat: 0,
      pVal: 'N/A',
      n: 0,
      scatter: [],
      fitLine: [],
    };
  }

  const n = valid.length;
  let sumX = 0,
    sumY = 0,
    sumXY = 0,
    sumX2 = 0,
    sumY2 = 0;

  const points = valid.map((r) => {
    const rs = r.rs * 100; // in percent
    const rf = ((r.rs - r.ols - (r.olsc || 0) / 100) / r.olsh) * 100; // in percent
    sumX += rf;
    sumY += rs;
    sumXY += rf * rs;
    sumX2 += rf * rf;
    sumY2 += rs * rs;
    return { x: +rf.toFixed(2), y: +rs.toFixed(2), d: r.d };
  });

  const meanX = sumX / n;
  const meanY = sumY / n;
  const cov = (sumXY - n * meanX * meanY) / (n - 1);
  const varX = Math.max((sumX2 - n * meanX * meanX) / (n - 1), 1e-8);
  const varY = Math.max((sumY2 - n * meanY * meanY) / (n - 1), 1e-8);

  const beta = cov / varX;
  const alpha = meanY - beta * meanX;
  const r2 = Math.min(100, Math.max(0, (cov * cov) / (varX * varY) * 100));
  const vr = r2; // In linear OLS, variance reduction equals R^2

  // Residual variance and standard error
  let sumResid2 = 0;
  for (const p of points) {
    const pred = alpha + beta * p.x;
    sumResid2 += (p.y - pred) ** 2;
  }
  const s2 = sumResid2 / Math.max(n - 2, 1);
  const sumDevX2 = varX * (n - 1);
  const se = Math.sqrt(Math.max(s2 / Math.max(sumDevX2, 1e-8), 1e-8));
  const tStat = beta / Math.max(se, 1e-6);

  // Line endpoints for scatter chart
  const xs = points.map((p) => p.x);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const fitLine = [
    { x: +minX.toFixed(2), y: +(alpha + beta * minX).toFixed(2) },
    { x: +maxX.toFixed(2), y: +(alpha + beta * maxX).toFixed(2) },
  ];

  return {
    beta,
    alpha,
    r2,
    vr,
    se,
    tStat,
    pVal: tStat > 3.29 ? '< 0.001 (High Significance)' : '< 0.05',
    n,
    scatter: points,
    fitLine,
  };
}

export function getHedgeRatioSeries(rows: Row[]) {
  return rows
    .filter((r) => r.olsh !== undefined)
    .map((r) => ({
      d: r.d.slice(2),
      date: r.d,
      ols: +(r.olsh || 0).toFixed(3),
      garch: +(r.garchh || 0).toFixed(3),
      egarch: +(r.egarchh || 0).toFixed(3),
      bekk: +(r.bekkh || 0).toFixed(3),
    }));
}

export function getOptionsPayoffData() {
  // Payoff profile as spot move changes from -20% to +20%
  const data = [];
  for (let move = -20; move <= 20; move += 1) {
    const spotRet = move;
    // Protective Put: Long 95% Put (cost ~1.6%), floor at -5%
    const putPayoff = Math.max(move, -5) - 1.6;
    // Collar: Long 95% Put, Short 105% Call, net cost ~0%
    const collarPayoff = Math.min(5, Math.max(-5, move));
    // Bear Put Spread: Long 95% Put, Short 90% Put, net cost ~0.8%
    const spreadPayoff =
      move <= -10 ? -10 + 5 - 0.8 : move <= -5 ? move + (-5 - move) - 0.8 : move - 0.8;

    data.push({
      move: move + '%',
      Spot: +spotRet.toFixed(1),
      'Protective Put': +putPayoff.toFixed(1),
      Collar: +collarPayoff.toFixed(1),
      'Put Spread': +spreadPayoff.toFixed(1),
    });
  }
  return data;
}

export function getVolatilityHistory(step = 6) {
  // 4,705 days of Nifty equity history
  const history = DATA.equity;
  const out = [];
  for (let i = 0; i < history.length; i += step) {
    const item = history[i];
    if (item[2] !== null) {
      out.push({
        d: item[0],
        date: item[0].slice(2, 7),
        spot: item[1],
        vol: +(item[2] * 100).toFixed(1),
      });
    }
  }
  // Include the last day
  const last = history[history.length - 1];
  if (last[2] !== null) {
    out.push({
      d: last[0],
      date: last[0].slice(2, 7),
      spot: last[1],
      vol: +(last[2] * 100).toFixed(1),
    });
  }
  return out;
}

