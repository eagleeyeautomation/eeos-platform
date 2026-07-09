import { createHmac } from "crypto";
import { describe, expect, it } from "vitest";
import { goHighLevelInternals } from "../../server/integrations/gohighlevel";

describe("GoHighLevel production integration internals", () => {
  const tenant = {
    tenantId: "tenant-prn-staffers" as const,
    locationId: "loc_123",
    businessDnaProfileId: "business-dna-prn-staffers" as const,
    officeId: "office-charleston",
  };

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
    expect(goHighLevelInternals.buildDiagnosticPath("locations", locationId)).toBe("/locations/loc_123");
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
    expect(receipt.potentialRisk).toContain("opportunity");
    expect(receipt.recommendedNextAction).toContain("Assign");
    expect(receipt.estimatedConfidenceImprovementAfterAction).toBeGreaterThan(0);
    expect(receipt.businessSignalCorrelation.length).toBeGreaterThanOrEqual(3);
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
