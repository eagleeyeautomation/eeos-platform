import type { AuthSession } from "../db";

export const RECENT_MFA_WINDOW_MS = 10 * 60_000;

type SessionTimestamp = Date | string | null | undefined;

function timestampMs(value: SessionTimestamp) {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "string") return new Date(value).getTime();
  return Number.NaN;
}

export type RecentMfaResult = {
  allowed: boolean;
  reason: "ok" | "missing_mfa" | "missing_recent_auth" | "invalid_mfa" | "invalid_recent_auth" | "expired";
  ageSeconds: number | null;
};

export function evaluateRecentMfa(
  session: Pick<AuthSession, "mfaVerifiedAt" | "recentAuthAt"> | undefined,
  nowMs = Date.now(),
  windowMs = RECENT_MFA_WINDOW_MS,
): RecentMfaResult {
  if (!session?.mfaVerifiedAt) return { allowed: false, reason: "missing_mfa", ageSeconds: null };
  if (!session.recentAuthAt) return { allowed: false, reason: "missing_recent_auth", ageSeconds: null };
  const mfaMs = timestampMs(session.mfaVerifiedAt);
  if (!Number.isFinite(mfaMs)) return { allowed: false, reason: "invalid_mfa", ageSeconds: null };
  const recentMs = timestampMs(session.recentAuthAt);
  if (!Number.isFinite(recentMs)) return { allowed: false, reason: "invalid_recent_auth", ageSeconds: null };
  const ageMs = Math.max(0, nowMs - recentMs);
  return {
    allowed: ageMs <= windowMs,
    reason: ageMs <= windowMs ? "ok" : "expired",
    ageSeconds: Math.floor(ageMs / 1000),
  };
}
