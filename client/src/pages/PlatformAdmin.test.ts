import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Platform administrator organization entry", () => {
  const source = readFileSync("client/src/pages/PlatformAdmin.tsx", "utf8");

  it("shows entry only for the administrator's validated active owner organization", () => {
    expect(source).toContain('session.organization?.id === String(organization.id)');
    expect(source).toContain('session.organizationRole === "ORGANIZATION_OWNER"');
    expect(source).toContain("Enter organization");
  });

  it("uses the protected server entry route and session-bound CSRF value", () => {
    expect(source).toContain("/api/admin/organizations/${organizationId}/enter");
    expect(source).toContain('"x-eeos-csrf-token": session.csrfToken');
  });
});
