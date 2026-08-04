import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("customer licensing view", () => {
  const source = readFileSync("client/src/pages/SettingsLicensing.tsx", "utf8");

  it("uses the organization-scoped licensing query and shows the synthetic lab warning", () => {
    expect(source).toContain("trpc.licensing.current.useQuery");
    expect(source).toContain("data.organization.warningBanner.title");
    expect(source).toContain("data.organization.warningBanner.body");
  });

  it("shows customer-safe upgrade actions without exposing audit internals or payment credentials", () => {
    expect(source).toContain("Request Add-on");
    expect(source).toContain("Contact Sales");
    expect(source).not.toContain("previousValue");
    expect(source).not.toContain("payment_provider");
  });
});
