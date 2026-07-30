import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("owner location onboarding", () => {
  const source = readFileSync("client/src/pages/LocationManagement.tsx", "utf8");

  it("exposes only Name, City, and State metadata without a provider location ID field", () => {
    expect(source).toContain("Add an operating location");
    expect(source).toContain("Name");
    expect(source).toContain("City");
    expect(source).toContain("State");
    expect(source).not.toContain("providerLocationId");
    expect(source).not.toContain("GHL Location ID");
  });

  it("uses the protected existing backend endpoint and does not open OAuth automatically", () => {
    expect(source).toContain('fetch("/api/location-management/locations"');
    expect(source).toContain('"x-eeos-csrf-token": session.csrfToken');
    expect(source).toContain('session.organizationRole !== "ORGANIZATION_OWNER"');
    expect(source).toContain("Continue to GoHighLevel");
    expect(source).not.toContain("window.open");
    expect(source).not.toContain("window.location");
  });

  it("permits only the approved Florida metadata in the client form", () => {
    expect(source).toContain('normalized.name !== "PRN Staffers FL"');
    expect(source).toContain('normalized.city !== "Greensboro"');
    expect(source).toContain('normalized.state !== "Florida"');
    expect(source).toContain('<option value="Florida">Florida</option>');
  });
});
