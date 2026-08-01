import { describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";
import { authorizePrnRoute } from "./prn-route-authorization";

function response() {
  const json = vi.fn();
  const res = { status: vi.fn(() => res), json } as unknown as Response;
  return { res, json };
}

const request = {} as Request;
const user = { id: 7 } as never;
const ownerContext = {
  userId: "7",
  role: "ORGANIZATION_OWNER" as const,
  organizationId: "10",
  organizationName: "Authorized Organization",
  membershipId: "20",
  authorizedLocationIds: ["loc-authorized"],
  selectedLocationId: "loc-authorized",
  selectedLocationName: "Authorized Location",
};

describe("PRN route organization and location boundary", () => {
  it("returns 401 when the session is absent", async () => {
    const { res } = response();
    await expect(authorizePrnRoute(request, res, {}, {
      authenticateRequest: vi.fn().mockRejectedValue(new Error("missing")),
      configuredLocationId: "loc-authorized",
    })).resolves.toBeNull();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("returns 403 when the configured location is outside current membership", async () => {
    const { res } = response();
    await expect(authorizePrnRoute(request, res, {}, {
      authenticateRequest: vi.fn().mockResolvedValue(user),
      resolveOrganizationContext: vi.fn().mockResolvedValue({
        ...ownerContext,
        selectedLocationId: "loc-other",
        authorizedLocationIds: ["loc-other"],
      }),
      configuredLocationId: "loc-authorized",
    })).resolves.toBeNull();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("denies read-only writes and missing CSRF without invoking data-plane work", async () => {
    const readOnlyResponse = response();
    await expect(authorizePrnRoute(request, readOnlyResponse.res, { write: true }, {
      authenticateRequest: vi.fn().mockResolvedValue(user),
      resolveOrganizationContext: vi.fn().mockResolvedValue({ ...ownerContext, role: "READ_ONLY" }),
      validateCsrf: vi.fn().mockReturnValue(true),
      configuredLocationId: "loc-authorized",
    })).resolves.toBeNull();
    expect(readOnlyResponse.res.status).toHaveBeenCalledWith(403);

    const csrfResponse = response();
    await expect(authorizePrnRoute(request, csrfResponse.res, { write: true }, {
      authenticateRequest: vi.fn().mockResolvedValue(user),
      resolveOrganizationContext: vi.fn().mockResolvedValue(ownerContext),
      validateCsrf: vi.fn().mockReturnValue(false),
      configuredLocationId: "loc-authorized",
    })).resolves.toBeNull();
    expect(csrfResponse.res.status).toHaveBeenCalledWith(403);
  });

  it("derives the canonical business scope from authenticated authorization context", async () => {
    const { res } = response();
    await expect(authorizePrnRoute(request, res, { write: true }, {
      authenticateRequest: vi.fn().mockResolvedValue(user),
      resolveOrganizationContext: vi.fn().mockResolvedValue(ownerContext),
      validateCsrf: vi.fn().mockReturnValue(true),
      configuredLocationId: "loc-authorized",
    })).resolves.toMatchObject({
      organizationId: "10",
      locationId: "loc-authorized",
      businessId: "organization:10:location:loc-authorized",
    });
  });
});
