export type ShadowOutcome = "MATCH" | "MISMATCH" | "SHADOW_SKIPPED" | "SHADOW_ERROR";
export interface IdentityShadowMetrics {
  record(outcome: ShadowOutcome, latencyMs: number, mismatchFields?: string[], errorCode?: string): void;
  eligible(): void;
  sampled(): void;
}
export class InMemoryIdentityShadowMetrics implements IdentityShadowMetrics {
  totals = { eligible: 0, sampled: 0, match: 0, mismatch: 0, error: 0, skipped: 0 };
  latencies: number[] = [];
  mismatchFields = new Map<string, number>();
  errorCodes = new Map<string, number>();
  eligible() { this.totals.eligible += 1; }
  sampled() { this.totals.sampled += 1; }
  record(outcome: ShadowOutcome, latencyMs: number, fields: string[] = [], errorCode?: string) {
    this.latencies.push(latencyMs);
    if (outcome === "MATCH") this.totals.match += 1;
    if (outcome === "MISMATCH") this.totals.mismatch += 1;
    if (outcome === "SHADOW_ERROR") this.totals.error += 1;
    if (outcome === "SHADOW_SKIPPED") this.totals.skipped += 1;
    fields.forEach((field) => this.mismatchFields.set(field, (this.mismatchFields.get(field) ?? 0) + 1));
    if (errorCode) this.errorCodes.set(errorCode, (this.errorCodes.get(errorCode) ?? 0) + 1);
  }
}
