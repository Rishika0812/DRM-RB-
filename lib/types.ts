export type Row = { d: string; S: number; v: number; rs: number; [k: string]: any };
export type AnalyzedData = { meta: any; regimes: Record<string, any>; equity: [string, number, number | null][]; daily: Record<string, Row[]> };
