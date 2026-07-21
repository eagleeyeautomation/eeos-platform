import type { AuthorizedSubaccount, IdentityRepository } from "./identityRepository";

export type IdentityShadowMismatchReporter = (event: {
  operation: "getUserSubaccounts";
  mysqlCount: number;
  postgresCount: number;
  mysqlFingerprint: string;
  postgresFingerprint: string;
}) => void;

/**
 * Future shadow-read design only. This module is deliberately not imported by
 * production request paths. MySQL remains authoritative even on mismatch.
 */
export async function compareUserSubaccountsInShadow(
  userId: number,
  mysql: Pick<IdentityRepository, "getUserSubaccounts">,
  postgres: Pick<IdentityRepository, "getUserSubaccounts">,
  reportMismatch: IdentityShadowMismatchReporter,
) {
  const mysqlResult = await mysql.getUserSubaccounts(userId);
  const postgresResult = await postgres.getUserSubaccounts(userId);
  const normalizedMysql = normalizeAuthorization(mysqlResult);
  const normalizedPostgres = normalizeAuthorization(postgresResult);

  if (JSON.stringify(normalizedMysql) !== JSON.stringify(normalizedPostgres)) {
    reportMismatch({
      operation: "getUserSubaccounts",
      mysqlCount: mysqlResult.length,
      postgresCount: postgresResult.length,
      mysqlFingerprint: fingerprint(normalizedMysql),
      postgresFingerprint: fingerprint(normalizedPostgres),
    });
  }
  return mysqlResult;
}

function normalizeAuthorization(rows: AuthorizedSubaccount[]) {
  return rows
    .map(({ id, membershipId, ghlLocationId, isActive }) => ({ id, membershipId, ghlLocationId, isActive }))
    .sort((left, right) => left.id - right.id || left.membershipId - right.membershipId);
}

function fingerprint(rows: ReturnType<typeof normalizeAuthorization>) {
  let hash = 2166136261;
  for (const character of JSON.stringify(rows)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}
