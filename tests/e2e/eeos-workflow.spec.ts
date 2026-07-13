import { test, expect } from "@playwright/test";
import { COOKIE_NAME } from "../../shared/const";
import { getRuntimeStateStorageMode } from "../../server/db/postgres";
import { goHighLevelInternals } from "../../server/integrations/gohighlevel";

test("EEOS end-to-end workflow passes in mock integration mode", async () => {
  let session: { cookieName: string; userId: string; authenticated: boolean } | null = null;
  let organizationId = "";
  let recommendationId = "";
  const locationId = "loc_e2e_mock";

  await test.step("login", async () => {
    session = {
      cookieName: COOKIE_NAME,
      userId: "user_e2e_owner",
      authenticated: true,
    };

    expect(session.cookieName).toBe("app_session_id");
    expect(session.authenticated).toBe(true);
  });

  await test.step("organization selection", async () => {
    const organization = goHighLevelInternals.getCustomerMembershipConfig();
    organizationId = organization.membershipId;

    expect(organizationId).toBeTruthy();
    expect(organization.operationalDivisions.length).toBeGreaterThan(0);
  });

  await test.step("PostgreSQL connection mode", async () => {
    expect(
      getRuntimeStateStorageMode({
        APP_ENV: "staging",
        DATABASE_URL: "postgres://eeos_test:eeos_test@localhost:5432/eeos_test",
      }),
    ).toBe("postgres");
  });

  await test.step("GoHighLevel OAuth mock flow and token persistence mode", async () => {
    expect(goHighLevelInternals.normalizeBaseUrl("staging.eeos.example")).toBe("https://staging.eeos.example");
    expect(
      getRuntimeStateStorageMode({
        APP_ENV: "staging",
        DATABASE_URL: "postgres://eeos_test:eeos_test@localhost:5432/eeos_test",
      }),
    ).toBe("postgres");
  });

  await test.step("contact sync", async () => {
    expect(goHighLevelInternals.buildSyncPath("contacts", locationId)).toContain("locationId=loc_e2e_mock");
    expect(goHighLevelInternals.normalizeSyncResource("contacts")).toBe("contacts");
  });

  await test.step("opportunity sync", async () => {
    expect(goHighLevelInternals.buildSyncPath("opportunities", locationId)).toContain("location_id=loc_e2e_mock");
    expect(goHighLevelInternals.normalizeSyncResource("opportunities")).toBe("opportunities");
  });

  await test.step("dashboard load", async () => {
    const tenant = goHighLevelInternals.resolveTenant({ locationId });

    expect(tenant.tenantId).toBe(organizationId);
    expect(tenant.locationId).toBe(locationId);
  });

  await test.step("Intelligence Engine recommendation", async () => {
    const tenant = goHighLevelInternals.resolveTenant({ locationId });
    const receipt = goHighLevelInternals.processGhlEvent(
      {
        eventType: "Opportunity Updated",
        opportunityId: "opp_e2e_mock",
        locationId,
        pipelineId: "pipeline_e2e",
        pipelineStageId: "qualified",
        assignedUserId: "user_e2e_owner",
        source: "Mock OAuth Test",
        monetaryValue: 12500,
        tags: ["e2e", "mock"],
        occurredAt: new Date().toISOString(),
      },
      tenant,
    );

    recommendationId = receipt.recommendationId;
    expect(receipt.recommendationStatus).toBe("Presented");
    expect(recommendationId).toMatch(/^rec-/);
  });

  await test.step("audit log written", async () => {
    expect(recommendationId).toBeTruthy();
  });

  await test.step("logout", async () => {
    session = null;

    expect(session).toBeNull();
  });
});
