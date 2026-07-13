import { createHmac } from "crypto";
import { describe, expect, it } from "vitest";
import { goHighLevelInternals } from "../../server/integrations/gohighlevel";

describe("GoHighLevel production integration internals", () => {
  const tenant = goHighLevelInternals.resolveTenant({ locationId: "loc_123" });

  it("registers the approved EEOS OAuth callback and legacy redirect route", () => {
    const routes: Array<{ method: string; path: string }> = [];
    const app = {
      get(path: string) {
        routes.push({ method: "GET", path });
      },
      post(path: string) {
        routes.push({ method: "POST", path });
      },
    };

    goHighLevelInternals.registerGoHighLevelRoutes(app as never);

    expect(routes).toContainEqual({ method: "GET", path: "/api/integrations/eea/oauth/callback" });
    expect(routes).toContainEqual({ method: "GET", path: "/api/integrations/gohighlevel/oauth/callback" });
  });

  it("validates the approved production OAuth redirect URI", () => {
    expect(
      goHighLevelInternals.validateOAuthRedirectUri(
        "https://eeos-platform-production.up.railway.app/api/integrations/eea/oauth/callback",
      ),
    ).toBe("https://eeos-platform-production.up.railway.app/api/integrations/eea/oauth/callback");

    expect(() =>
      goHighLevelInternals.validateOAuthRedirectUri(
        "https://eeos-platform-production.up.railway.app/api/integrations/gohighlevel/oauth/callback",
      ),
    ).toThrow("GHL_OAUTH_REDIRECT_URI must use the approved EEOS OAuth callback route.");
  });

  it("normalizes supported production event names", () => {
    expect(goHighLevelInternals.normalizeEventType("contact_created")).toBe("Contact Created");
    expect(goHighLevelInternals.normalizeEventType("opportunity-updated")).toBe("Opportunity Updated");
    expect(goHighLevelInternals.normalizeEventType("appointment created")).toBe("Appointment Created");
    expect(goHighLevelInternals.normalizeEventType("conversation created")).toBe("Conversation Created");
  });

  it("builds diagnostic paths for all live resource groups", () => {
    const locationId = "loc_123";

    expect(goHighLevelInternals.buildDiagnosticPath("contacts", locationId)).toContain("locationId=loc_123");
    expect(goHighLevelInternals.buildDiagnosticPath("opportunities", locationId)).toContain("location_id=loc_123");
    expect(goHighLevelInternals.buildDiagnosticPath("calendars", locationId)).toContain("locationId=loc_123");
    expect(goHighLevelInternals.buildDiagnosticPath("conversations", locationId)).toContain("locationId=loc_123");
    expect(goHighLevelInternals.buildDiagnosticPath("customFields", locationId)).toBe("/locations/loc_123/customFields");
    expect(goHighLevelInternals.buildDiagnosticPath("pipelines", locationId)).toContain("locationId=loc_123");
    expect(goHighLevelInternals.buildDiagnosticPath("tags", locationId)).toBe("/locations/loc_123/tags");
    expect(goHighLevelInternals.buildDiagnosticPath("locations", locationId)).toBe("/locations/loc_123");
  });

  it("builds sync paths for contacts, opportunities, and appointments", () => {
    const locationId = "loc_123";

    expect(goHighLevelInternals.buildSyncPath("contacts", locationId)).toContain("locationId=loc_123");
    expect(goHighLevelInternals.buildSyncPath("contacts", locationId)).toContain("limit=100");
    expect(goHighLevelInternals.buildSyncPath("opportunities", locationId)).toContain("location_id=loc_123");
    expect(goHighLevelInternals.buildSyncPath("appointments", locationId)).toContain("locationId=loc_123");
  });

  it("rejects unsupported sync resources", () => {
    expect(() => goHighLevelInternals.normalizeSyncResource("contacts")).not.toThrow();
    expect(() => goHighLevelInternals.normalizeSyncResource("opportunities")).not.toThrow();
    expect(() => goHighLevelInternals.normalizeSyncResource("appointments")).not.toThrow();
    expect(() => goHighLevelInternals.normalizeSyncResource("users")).toThrow("Unsupported GoHighLevel sync resource.");
  });

  it("models PRN Staffers as a customer membership with operational divisions", () => {
    const membership = goHighLevelInternals.getCustomerMembershipConfig();

    expect(membership.membershipId).toBe("membership-prn-staffers");
    expect(membership.membershipName).toBe("PRN Staffers");
    expect(membership.operationalDivisions.map((division) => division.name)).toEqual([
      "Delaware",
      "South Carolina",
      "Alabama",
      "Florida",
    ]);
  });

  it("isolates tenant resolution to configured customer membership and locations", () => {
    const membership = goHighLevelInternals.getCustomerMembershipConfig();
    const resolved = goHighLevelInternals.resolveTenant({ locationId: "loc_unknown" });

    expect(resolved.membershipId).toBe(membership.membershipId);
    expect(resolved.tenantId).toBe(membership.membershipId);
    expect(resolved.locationId).toBe("loc_unknown");
    expect(resolved.operationalDivisionId).toBe(membership.operationalDivisions[0].id);
  });

  it("verifies sha256 webhook signatures without exposing secrets", () => {
    const rawBody = Buffer.from(JSON.stringify({ eventType: "Contact Created", locationId: "loc_123" }));
    const secret = "test-webhook-secret";
    const digest = createHmac("sha256", secret).update(rawBody).digest("hex");

    expect(goHighLevelInternals.verifyHmacSignature(rawBody, `sha256=${digest}`, secret)).toBe(true);
    expect(goHighLevelInternals.verifyHmacSignature(rawBody, digest, secret)).toBe(true);
    expect(goHighLevelInternals.verifyHmacSignature(rawBody, "bad-signature", secret)).toBe(false);
  });

  it("keeps confidence scoring differentiated by event class", () => {
    expect(goHighLevelInternals.confidenceFor("Contact Created")).toBeGreaterThan(goHighLevelInternals.confidenceFor("Appointment Created"));
    expect(goHighLevelInternals.confidenceFor("Opportunity Updated")).toBeGreaterThan(goHighLevelInternals.confidenceFor("Appointment Created"));
  });

  it("presents complete recommendations with required executive explanation fields", () => {
    const receipt = goHighLevelInternals.processGhlEvent(
      {
        eventType: "Opportunity Updated",
        opportunityId: "opp_123",
        locationId: "loc_123",
        pipelineId: "pipeline_staffing",
        pipelineStageId: "qualified",
        assignedUserId: "user_123",
        source: "Referral",
        monetaryValue: 25000,
        tags: ["client", "urgent-staffing"],
        occurredAt: "2026-07-09T12:00:00.000Z",
      },
      tenant,
    );

    expect(receipt.recommendationStatus).toBe("Presented");
    expect(receipt.qualityGate).toMatchObject({
      accurate: true,
      explainable: true,
      actionable: true,
      measurable: true,
      passed: true,
    });
    expect(receipt.confidenceScore).toBeGreaterThan(80);
    expect(receipt.whyThisMatters).toContain("staffing demand");
    expect(receipt.businessReasoning.length).toBeGreaterThanOrEqual(2);
    expect(receipt.supportingBusinessSignals.length).toBeGreaterThanOrEqual(5);
    expect(receipt.expectedBusinessImpact).toContain("conversion");
    expect(receipt.riskLevel.level).toBe("High");
    expect(receipt.potentialRisk).toContain("opportunity");
    expect(receipt.recommendedNextAction).toContain("Assign");
    expect(receipt.measurementPlan.primaryMetric).toContain("Opportunity conversion");
    expect(receipt.measurementPlan.successSignal).toContain("Opportunity");
    expect(receipt.estimatedConfidenceImprovementAfterAction).toBeGreaterThan(0);
    expect(receipt.businessSignalCorrelation.length).toBeGreaterThanOrEqual(3);
    expect(receipt.businessSignalCorrelation.join(" ")).toContain("Tag signal");
    expect(receipt.executivePriority.level).toBe("Critical");
    expect(receipt.expectedOutcome).toContain("opportunity");
    expect(receipt.prediction.expectedMetricMovement).toContain("conversion");
    expect(receipt.knowledgeGraphRelationships.length).toBeGreaterThanOrEqual(8);
  });

  it("suppresses recommendations that cannot satisfy the accuracy gate", () => {
    const receipt = goHighLevelInternals.processGhlEvent({ eventType: "Contact Created" }, { ...tenant, locationId: "" });

    expect(receipt.recommendationStatus).toBe("Suppressed");
    expect(receipt.dashboardStatus).toBe("Suppressed");
    expect(receipt.qualityGate.passed).toBe(false);
    expect(receipt.qualityGate.missingRequirements).toContain("accurate");
    expect(receipt.decision).toContain("Recommendation suppressed");
    expect(receipt.whyThisMatters).toContain("earliest signal");
    expect(receipt.recommendedNextAction).toContain("Qualify");
    expect(receipt.estimatedConfidenceImprovementAfterAction).toBeGreaterThan(0);
  });

  it("raises confidence when payload evidence is stronger", () => {
    const sparse = goHighLevelInternals.confidenceFor("Contact Created", {}, { ...tenant, locationId: "" });
    const complete = goHighLevelInternals.confidenceFor(
      "Contact Created",
      {
        contactId: "contact_123",
        email: "scheduler@example.com",
        phone: "555-0100",
        source: "Website",
        occurredAt: "2026-07-09T12:00:00.000Z",
      },
      tenant,
    );

    expect(complete).toBeGreaterThan(sparse);
  });

  it("correlates business signals into executive priority and predicted metric movement", () => {
    const receipt = goHighLevelInternals.processGhlEvent(
      {
        eventType: "Conversation Created",
        conversationId: "conv_123",
        channel: "SMS",
        assignedUserId: "user_123",
        contact: {
          id: "contact_123",
          email: "client@example.com",
        },
        occurredAt: "2026-07-09T12:05:00.000Z",
      },
      tenant,
    );

    expect(receipt.recommendationStatus).toBe("Presented");
    expect(receipt.businessSignalCorrelation.join(" ")).toContain("client communication");
    expect(receipt.executivePriority.score).toBeGreaterThanOrEqual(70);
    expect(receipt.prediction.measurableMetric).toContain("Lead response time");
    expect(receipt.prediction.expectedMetricMovement).toContain("response latency");
  });
});
