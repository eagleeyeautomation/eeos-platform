export type MembershipLink = { membershipId: number };
export type MembershipRecord = { id: number; organizationId: number };
export type OrganizationRecord = { name: string };
export type SubaccountRecord = { membershipId: number };

export type MysqlAuthorizationQueries<S extends SubaccountRecord> = {
  getActiveMembershipLinks(userId: number): Promise<MembershipLink[]>;
  getMembershipById(id: number): Promise<MembershipRecord | undefined>;
  getOrganizationById(id: number): Promise<OrganizationRecord | undefined>;
  getActiveSubaccountsByMembershipId(membershipId: number): Promise<S[]>;
};

/**
 * Test seam for the existing MySQL authorization algorithm. Production query
 * construction remains in server/db.ts; this function preserves its control
 * flow, duplicate behavior, and missing-parent behavior verbatim.
 */
export async function resolveMysqlUserSubaccounts<S extends SubaccountRecord>(
  userId: number,
  queries: MysqlAuthorizationQueries<S>,
): Promise<Array<S & { membershipId: number; orgName: string }>> {
  const userMemberships = await queries.getActiveMembershipLinks(userId);
  if (userMemberships.length === 0) return [];

  const results: Array<S & { membershipId: number; orgName: string }> = [];
  for (const membershipUser of userMemberships) {
    const membership = await queries.getMembershipById(membershipUser.membershipId);
    if (!membership) continue;
    const organization = await queries.getOrganizationById(membership.organizationId);
    const subaccounts = await queries.getActiveSubaccountsByMembershipId(membershipUser.membershipId);
    for (const subaccount of subaccounts) {
      results.push({
        ...subaccount,
        membershipId: membershipUser.membershipId,
        orgName: organization?.name ?? "Unknown",
      });
    }
  }
  return results;
}
