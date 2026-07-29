import { TRPCError } from "@trpc/server";
import type { User } from "../drizzle/schema";
import {
  getAllOrganizations,
  getMembershipById,
  getMembershipUser,
  getOrganizationById,
  getSubaccountsByMembership,
  getUserSubaccounts,
} from "./db";

export type EeosRole =
  | "PLATFORM_ADMIN"
  | "ORGANIZATION_OWNER"
  | "LOCATION_MANAGER"
  | "STAFF"
  | "READ_ONLY";

export type AuthorizationContext = {
  userId: string;
  role: EeosRole;
  organizationId: string | null;
  organizationName: string | null;
  membershipId: string | null;
  authorizedLocationIds: string[];
};

export type OrganizationAuthorizationContext = AuthorizationContext & {
  selectedLocationId: string;
  selectedLocationName: string;
};

function mapMembershipRole(role?: string | null): EeosRole {
  if (role === "owner") return "ORGANIZATION_OWNER";
  if (role === "executive") return "LOCATION_MANAGER";
  if (role === "analyst") return "STAFF";
  return "READ_ONLY";
}

export function requireAuthenticatedUser(user: User | null | undefined): User {
  if (!user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Authentication is required." });
  }
  return user;
}

export async function resolveOrganizationAuthorizationContext(
  user: User,
  requestedLocationId?: string,
): Promise<OrganizationAuthorizationContext | null> {
  const subaccounts = await getUserSubaccounts(user.id);
  const selected = requestedLocationId
    ? subaccounts.find((subaccount) => subaccount.ghlLocationId === requestedLocationId)
    : subaccounts[0];

  if (!selected) return null;

  const [membership, membershipUser] = await Promise.all([
    getMembershipById(selected.membershipId),
    getMembershipUser(selected.membershipId, user.id),
  ]);
  if (!membership || membership.status !== "active" || !membershipUser?.isActive) return null;

  const organization = await getOrganizationById(membership.organizationId);
  if (!organization?.isActive) return null;

  const membershipSubaccounts = subaccounts.filter(
    (subaccount) => subaccount.membershipId === selected.membershipId,
  );

  return {
    userId: String(user.id),
    role: mapMembershipRole(membershipUser.role),
    organizationId: String(membership.organizationId),
    organizationName: organization.name,
    membershipId: String(selected.membershipId),
    authorizedLocationIds: Array.from(new Set(
      membershipSubaccounts.map((subaccount) => subaccount.ghlLocationId),
    )),
    selectedLocationId: selected.ghlLocationId,
    selectedLocationName: selected.name,
  };
}

export async function resolveAuthorizationContext(user: User): Promise<AuthorizationContext> {
  if (user.role === "admin") {
    return {
      userId: String(user.id),
      role: "PLATFORM_ADMIN",
      organizationId: null,
      organizationName: "Eagle Eye Automation",
      membershipId: null,
      authorizedLocationIds: [],
    };
  }

  const organizationContext = await resolveOrganizationAuthorizationContext(user);
  if (!organizationContext) {
    return {
      userId: String(user.id),
      role: "STAFF",
      organizationId: null,
      organizationName: null,
      membershipId: null,
      authorizedLocationIds: [],
    };
  }

  return organizationContext;
}

export async function requireOrganizationMembership(user: User | null | undefined): Promise<AuthorizationContext> {
  const authenticatedUser = requireAuthenticatedUser(user);
  const context = await resolveAuthorizationContext(authenticatedUser);
  if (context.role === "PLATFORM_ADMIN") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Platform administrators must enter an audited support scope before viewing customer owner data.",
    });
  }
  if (!context.organizationId || context.authorizedLocationIds.length === 0) {
    throw new TRPCError({ code: "FORBIDDEN", message: "No active organization membership is available." });
  }
  return context;
}

export async function requireAuthorizedLocation(user: User | null | undefined, locationId: string): Promise<AuthorizationContext> {
  const context = await requireOrganizationMembership(user);
  if (!context.authorizedLocationIds.includes(locationId)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "This location is not authorized for the current organization." });
  }
  return context;
}

export async function requireWritableOrganizationRole(user: User | null | undefined): Promise<AuthorizationContext> {
  const context = await requireOrganizationMembership(user);
  if (context.role === "READ_ONLY") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Read-only users cannot perform this action." });
  }
  return context;
}

export async function requirePlatformAdmin(user: User | null | undefined): Promise<AuthorizationContext> {
  const authenticatedUser = requireAuthenticatedUser(user);
  const context = await resolveAuthorizationContext(authenticatedUser);
  if (context.role !== "PLATFORM_ADMIN") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Platform administrator access is required." });
  }
  return context;
}

export async function listAuthorizedSubaccounts(user: User) {
  const context = await resolveAuthorizationContext(user);
  if (context.role === "PLATFORM_ADMIN") return [];
  return getUserSubaccounts(user.id);
}

export async function listPlatformOrganizations(user: User | null | undefined) {
  await requirePlatformAdmin(user);
  const organizations = await getAllOrganizations();
  return organizations.map((organization) => ({
    id: String(organization.id),
    name: organization.name,
    slug: organization.slug,
    type: organization.type,
    isActive: organization.isActive,
  }));
}

export async function listAuthorizedLocationsForMembership(membershipId: string | null) {
  if (!membershipId) return [];
  const subaccounts = await getSubaccountsByMembership(Number(membershipId));
  return subaccounts.map((subaccount) => ({
    id: subaccount.ghlLocationId,
    name: subaccount.name,
  }));
}

export async function listOwnerOrganizationLocations(user: User) {
  const subaccounts = await getUserSubaccounts(user.id);
  const resolved = await Promise.all(subaccounts.map(async (subaccount) => {
    const context = await resolveOrganizationAuthorizationContext(user, subaccount.ghlLocationId);
    if (!context || context.role !== "ORGANIZATION_OWNER") return null;
    return {
      organizationId: context.organizationId!,
      organizationName: context.organizationName!,
      membershipId: context.membershipId!,
      locationId: subaccount.ghlLocationId,
      locationName: subaccount.name,
    };
  }));

  return resolved.filter((location): location is NonNullable<typeof location> => location !== null);
}
