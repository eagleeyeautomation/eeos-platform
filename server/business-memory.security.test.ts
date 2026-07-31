import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Express, Request, Response } from "express";
import type { User } from "../drizzle/schema";
import { registerBusinessMemoryRoutes, type BusinessMemoryActorContext } from "./business-memory";

type RouteHandler = (req: Request, res: Response) => Promise<void>;

const owner = { id: 42 } as User;
const viewer = { id: 43 } as User;
const handlers = new Map<string, RouteHandler>();
const writes: Array<{ businessId: string; actor?: BusinessMemoryActorContext; method: string }> = [];

function response() {
  const result: { status: number; body: unknown; headers: Record<string, string> } = {
    status: 0,
    body: null,
    headers: {},
  };
  const res = {
    status(code: number) {
      result.status = code;
      return res;
    },
    json(body: unknown) {
      result.body = body;
      return res;
    },
    set(name: string, value: string) {
      result.headers[name] = value;
      return res;
    },
  } as unknown as Response;
  return { res, result };
}

function request(input: {
  method: string;
  session?: "owner" | "viewer" | "invalid";
  locationId?: string;
  csrf?: string;
  body?: Record<string, unknown>;
  id?: string;
}) {
  const headers = new Map<string, string>();
  if (input.session) headers.set("x-test-session", input.session);
  if (input.csrf) headers.set("x-eeos-csrf-token", input.csrf);
  headers.set("x-request-id", "security-test-request");
  return {
    method: input.method,
    query: input.method === "GET" && input.locationId ? { locationId: input.locationId } : {},
    body: {
      ...(input.body ?? {}),
      ...(input.method !== "GET" && input.locationId ? { locationId: input.locationId } : {}),
    },
    params: { id: input.id ?? "record-1" },
    header(name: string) {
      return headers.get(name.toLowerCase());
    },
  } as unknown as Request;
}

function route(method: string, path: string) {
  const handler = handlers.get(`${method} ${path}`);
  if (!handler) throw new Error(`Missing route ${method} ${path}`);
  return handler;
}

const baseRecord = {
  id: "record-1",
  businessId: "organization:10:location:loc-a",
  category: "operations",
  title: "Authorized record",
  description: "Authorized record description",
  status: "active",
  source: "user" as const,
  metadata: {},
  createdAt: "2026-07-31T00:00:00.000Z",
  updatedAt: "2026-07-31T00:00:00.000Z",
};

describe("Business Memory route authorization", () => {
  beforeEach(() => {
    handlers.clear();
    writes.length = 0;
    const app = {
      get(path: string, handler: RouteHandler) { handlers.set(`GET ${path}`, handler); },
      post(path: string, handler: RouteHandler) { handlers.set(`POST ${path}`, handler); },
      patch(path: string, handler: RouteHandler) { handlers.set(`PATCH ${path}`, handler); },
    } as unknown as Express;

    registerBusinessMemoryRoutes(app, {
      authenticateRequest: vi.fn(async (req: Request) => {
        const session = req.header("x-test-session");
        if (session === "owner") return owner;
        if (session === "viewer") return viewer;
        throw new Error("Invalid session");
      }),
      resolveOrganizationContext: vi.fn(async (user: User, requestedLocationId?: string) => {
        const locationId = requestedLocationId ?? "loc-a";
        if (locationId !== "loc-a") return null;
        return {
          userId: String(user.id),
          role: user.id === viewer.id ? "READ_ONLY" as const : "ORGANIZATION_OWNER" as const,
          organizationId: "10",
          organizationName: "Authorized Organization",
          membershipId: "100",
          authorizedLocationIds: ["loc-a"],
          selectedLocationId: "loc-a",
          selectedLocationName: "Authorized Location",
        };
      }),
      validateCsrf: vi.fn((req: Request) => req.header("x-eeos-csrf-token") === "valid-csrf"),
      loadSnapshot: vi.fn(async (businessId: string) => ({
        businessId,
        businessGoals: [],
        strategicPriorities: [],
        executiveDecisions: [],
        recommendationOutcomes: [],
        businessMilestones: [],
        auditTrail: [],
      })),
      createBaseRecord: vi.fn(async (_type, input, actor) => {
        writes.push({ businessId: input.businessId!, actor, method: "create" });
        return { ...baseRecord, businessId: input.businessId! };
      }),
      updateBaseRecord: vi.fn(async (_type, _id, _input, businessId, actor) => {
        writes.push({ businessId: businessId!, actor, method: "update" });
        return { ...baseRecord, businessId: businessId! };
      }),
      createOutcome: vi.fn(async (input, actor) => {
        writes.push({ businessId: input.businessId!, actor, method: "create-outcome" });
        return { ...baseRecord, businessId: input.businessId!, recommendationId: "rec-1", actionTaken: "reviewed", expectedOutcome: "improve", actualOutcome: "pending", successMetric: "metric", result: "recorded", reviewedAt: null };
      }),
      updateOutcome: vi.fn(async (_id, _input, businessId, actor) => {
        writes.push({ businessId: businessId!, actor, method: "update-outcome" });
        return { ...baseRecord, businessId: businessId!, recommendationId: "rec-1", actionTaken: "reviewed", expectedOutcome: "improve", actualOutcome: "pending", successMetric: "metric", result: "recorded", reviewedAt: null };
      }),
    });
  });

  it("returns 401 for anonymous and invalid-session reads without loading memory", async () => {
    for (const session of [undefined, "invalid" as const]) {
      const { res, result } = response();
      await route("GET", "/api/prn/business-memory")(request({ method: "GET", session }), res);
      expect(result.status).toBe(401);
    }
    expect(writes).toHaveLength(0);
  });

  it("denies cross-location reads and derives authorized read scope from the session", async () => {
    const denied = response();
    await route("GET", "/api/prn/business-memory")(request({ method: "GET", session: "owner", locationId: "loc-other" }), denied.res);
    expect(denied.result.status).toBe(403);

    const allowed = response();
    await route("GET", "/api/prn/business-memory")(request({ method: "GET", session: "owner", locationId: "loc-a" }), allowed.res);
    expect(allowed.result.status).toBe(200);
    expect(allowed.result.body).toMatchObject({ businessId: "organization:10:location:loc-a" });
    expect(allowed.result.headers["Cache-Control"]).toBe("private, no-store, max-age=0");
  });

  it("protects every POST and PATCH family before any write", async () => {
    const families = [
      ["/api/prn/business-memory/goals", "/api/prn/business-memory/goals/:id"],
      ["/api/prn/business-memory/priorities", "/api/prn/business-memory/priorities/:id"],
      ["/api/prn/business-memory/decisions", "/api/prn/business-memory/decisions/:id"],
      ["/api/prn/business-memory/outcomes", "/api/prn/business-memory/outcomes/:id"],
      ["/api/prn/business-memory/milestones", "/api/prn/business-memory/milestones/:id"],
    ];
    for (const [postPath, patchPath] of families) {
      for (const [method, path] of [["POST", postPath], ["PATCH", patchPath]] as const) {
        const anonymous = response();
        await route(method, path)(request({ method }), anonymous.res);
        expect(anonymous.result.status).toBe(401);

        const viewerResponse = response();
        await route(method, path)(request({ method, session: "viewer", csrf: "valid-csrf" }), viewerResponse.res);
        expect(viewerResponse.result.status).toBe(403);

        const crossLocation = response();
        await route(method, path)(request({ method, session: "owner", locationId: "loc-other", csrf: "valid-csrf" }), crossLocation.res);
        expect(crossLocation.result.status).toBe(403);

        for (const csrf of [undefined, "invalid-csrf"]) {
          const csrfResponse = response();
          await route(method, path)(request({ method, session: "owner", csrf }), csrfResponse.res);
          expect(csrfResponse.result.status).toBe(403);
        }
      }
    }
    expect(writes).toHaveLength(0);
  });

  it("forces session-derived scope and actor attribution for authorized mutations", async () => {
    const families = [
      ["/api/prn/business-memory/goals", "/api/prn/business-memory/goals/:id"],
      ["/api/prn/business-memory/priorities", "/api/prn/business-memory/priorities/:id"],
      ["/api/prn/business-memory/decisions", "/api/prn/business-memory/decisions/:id"],
      ["/api/prn/business-memory/outcomes", "/api/prn/business-memory/outcomes/:id"],
      ["/api/prn/business-memory/milestones", "/api/prn/business-memory/milestones/:id"],
    ];
    for (const [postPath, patchPath] of families) {
      const create = response();
      await route("POST", postPath)(
        request({ method: "POST", session: "owner", csrf: "valid-csrf", locationId: "loc-a", body: { businessId: "other-tenant", organizationId: "999", title: "Goal", description: "Description" } }),
        create.res,
      );
      expect(create.result.status).toBe(201);

      const update = response();
      await route("PATCH", patchPath)(
        request({ method: "PATCH", session: "owner", csrf: "valid-csrf", locationId: "loc-a", body: { businessId: "other-tenant", organizationId: "999", status: "complete" } }),
        update.res,
      );
      expect(update.result.status).toBe(200);
    }
    expect(writes).toHaveLength(10);
    for (const write of writes) {
      expect(write.businessId).toBe("organization:10:location:loc-a");
      expect(write.actor).toMatchObject({ actorUserId: "42", organizationId: "10", locationId: "loc-a", requestId: "security-test-request" });
    }
  });
});
