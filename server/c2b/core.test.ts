import { describe, expect, it } from "vitest";
import {
  C2B_ACTION_TRANSITIONS,
  C2B_CONNECTOR_CATALOG,
  INTELLIGENCE_DOMAINS,
  connectorsForDomain,
  summarizeC2bOpportunities,
  validateC2bScoring,
} from "./core";

describe("C2B intelligence foundation", () => {
  it("keeps connectors reusable and disabled until organization approval", () => {
    expect(C2B_CONNECTOR_CATALOG.map((item) => item.key)).toContain("gohighlevel");
    expect(C2B_CONNECTOR_CATALOG.map((item) => item.key)).toContain("csv-import");
    expect(C2B_CONNECTOR_CATALOG.every((item) => !("enabled" in item))).toBe(true);
  });

  it("provides a permanent connector framework for every intelligence domain", () => {
    expect(INTELLIGENCE_DOMAINS).toEqual(["c2c", "c2b", "b2b"]);
    for (const domain of INTELLIGENCE_DOMAINS) {
      expect(connectorsForDomain(domain).length).toBeGreaterThan(0);
      expect(connectorsForDomain(domain).every((item) => item.key.startsWith(`${domain}:`))).toBe(true);
    }
  });

  it("rejects unexplained or unsupported scores", () => {
    const invalid = {
      location: { value: 90, explanation: "", evidence: [] },
      service: { value: 80, explanation: "Service match", evidence: ["Attributed directory category"] },
      confidence: { value: 101, explanation: "Too high", evidence: ["Source"] },
      urgency: { value: 50, explanation: "Recent event", evidence: ["Published date"] },
      referralPotential: { value: 60, explanation: "Referral organization", evidence: ["Organization type"] },
      businessFit: { value: 75, explanation: "Fit", evidence: ["Service area"] },
      priority: { value: 85, explanation: "Composite", evidence: ["Location and service"] },
    };
    expect(validateC2bScoring(invalid).valid).toBe(false);
  });

  it("summarizes only persisted opportunity facts", () => {
    const summary = summarizeC2bOpportunities([
      { status: "new", state: "SC", source: "CSV Import", estimatedPipelineValue: 12000, referralPartner: false },
      { status: "converted", state: "FL", source: "Referral Partner Lists", estimatedPipelineValue: 18000, referralPartner: true },
    ]);
    expect(summary.newOpportunities).toBe(1);
    expect(summary.converted).toBe(1);
    expect(summary.pipelineValue).toBe(30000);
    expect(summary.byState).toEqual([{ label: "SC", value: 1 }, { label: "FL", value: 1 }]);
  });

  it("never performs an implicit GHL conversion", () => {
    expect(C2B_ACTION_TRANSITIONS.approve.ghlStatus).toBe("approved");
    expect(C2B_ACTION_TRANSITIONS.convert_to_ghl).toEqual({
      status: "pending_ghl",
      ghlStatus: "queued",
    });
  });
});
