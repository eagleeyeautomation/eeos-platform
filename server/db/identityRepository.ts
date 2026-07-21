export type UserRole = "user" | "admin";
export type OrganizationType = "platform_owner" | "customer";
export type MembershipPlan = "trial" | "starter" | "professional" | "enterprise";
export type MembershipStatus = "active" | "suspended" | "cancelled" | "trial";
export type MembershipUserRole = "owner" | "executive" | "analyst" | "viewer";

export type CanonicalUser = {
  id: number;
  openId: string;
  name: string | null;
  email: string | null;
  loginMethod: string | null;
  role: UserRole;
  passwordHash: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastSignedIn: Date;
};

export type CanonicalOrganization = {
  id: number;
  slug: string;
  name: string;
  type: OrganizationType;
  industry: string | null;
  website: string | null;
  logoUrl: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type CanonicalMembership = {
  id: number;
  organizationId: number;
  plan: MembershipPlan;
  status: MembershipStatus;
  ieEnabled: boolean;
  ieModelVersion: string | null;
  maxSubaccounts: number | null;
  billingEmail: string | null;
  trialEndsAt: Date | null;
  renewsAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CanonicalMembershipUser = {
  id: number;
  membershipId: number;
  userId: number;
  role: MembershipUserRole;
  isActive: boolean;
  invitedAt: Date;
  acceptedAt: Date | null;
};

export type CanonicalSubaccount = {
  id: number;
  membershipId: number;
  ghlLocationId: string;
  ghlCompanyId: string | null;
  name: string;
  timezone: string | null;
  isActive: boolean;
  ieEnabled: boolean;
  connectedAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type AuthorizedSubaccount = CanonicalSubaccount & {
  orgName: string;
};

export type LegacyUserUpsert = {
  openId: string;
  name?: string | null;
  email?: string | null;
  loginMethod?: string | null;
  role?: UserRole;
  lastSignedIn?: Date;
};

export type LegacySubaccountUpsert = {
  membershipId: number;
  ghlLocationId: string;
  ghlCompanyId?: string | null;
  name: string;
  timezone?: string | null;
  isActive?: boolean;
  ieEnabled?: boolean;
  connectedAt?: Date;
};

export interface IdentityRepository {
  getUserById(id: number): Promise<CanonicalUser | undefined>;
  getUserByOpenId(openId: string): Promise<CanonicalUser | undefined>;
  getOrganizationById(id: number): Promise<CanonicalOrganization | undefined>;
  getMembershipById(id: number): Promise<CanonicalMembership | undefined>;
  getActiveMembershipUsersByUserId(userId: number): Promise<CanonicalMembershipUser[]>;
  getSubaccountByGhlLocationId(ghlLocationId: string): Promise<CanonicalSubaccount | undefined>;
  getActiveSubaccountsByMembershipId(membershipId: number): Promise<CanonicalSubaccount[]>;
  getUserSubaccounts(userId: number): Promise<AuthorizedSubaccount[]>;
  upsertUser(user: LegacyUserUpsert): Promise<void>;
  upsertSubaccount(subaccount: LegacySubaccountUpsert): Promise<number>;
}
