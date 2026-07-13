import type { Express } from "express";

type GhlFetchResult = {
  ok: boolean;
  status: number;
  path: string;
  data: unknown;
  responseTimeMs: number;
};

type GhlRecord = Record<string, unknown>;

const ghlBaseUrl = "https://services.leadconnectorhq.com";

export function registerPrnPrivateGhlRoutes(app: Express) {
  app.get("/api/prn/gohighlevel/live-dashboard", async (_req, res) => {
    try {
      const token = process.env.GHL_PRN_SOUTH_CAROLINA_PRIVATE_TOKEN;
      const locationId = process.env.GHL_PRN_SOUTH_CAROLINA_LOCATION_ID;

      if (!token || !locationId) {
        res.status(503).json({
          ok: false,
          mode: "private_token",
          division: "PRN Staffers South Carolina",
          configured: {
            GHL_PRN_SOUTH_CAROLINA_PRIVATE_TOKEN: Boolean(token),
            GHL_PRN_SOUTH_CAROLINA_LOCATION_ID: Boolean(locationId),
          },
          error: "PRN Staffers South Carolina private-token integration is not configured.",
        });
        return;
      }

      const client = createPrivateGhlClient(token);
      const [location, users, contacts, opportunities] = await Promise.all([
        client.getFirstOk([`/locations/${encodeURIComponent(locationId)}`], "location"),
        client.getFirstOk([
          `/users/?locationId=${encodeURIComponent(locationId)}`,
          `/users/search?locationId=${encodeURIComponent(locationId)}`,
        ], "users"),
        client.getFirstOk([`/contacts/?locationId=${encodeURIComponent(locationId)}&limit=100`], "contacts"),
        client.getFirstOk([`/opportunities/search?location_id=${encodeURIComponent(locationId)}&limit=100`], "opportunities"),
      ]);

      const contactsList = extractList(contacts.data, ["contacts"]);
      const opportunitiesList = extractList(opportunities.data, ["opportunities"]);
      const usersList = extractList(users.data, ["users"]);
      const pipelineValue = opportunitiesList.reduce((sum, opportunity) => sum + readMoney(opportunity), 0);
      const openOpportunities = opportunitiesList.filter((opportunity) => !isClosedOpportunity(opportunity)).length;
      const healthScore = calculateHealthScore({
        locationOk: location.ok,
        usersOk: users.ok,
        contactsCount: contactsList.length,
        opportunitiesCount: opportunitiesList.length,
        openOpportunities,
      });

      res.status(location.ok || users.ok || contacts.ok || opportunities.ok ? 200 : 502).json({
        ok: location.ok && users.ok && contacts.ok && opportunities.ok,
        mode: "private_token",
        source: "Live PRN Staffers GoHighLevel",
        division: "PRN Staffers South Carolina",
        locationId,
        lastSync: new Date().toISOString(),
        location: summarizeLocation(location.data, locationId),
        metrics: {
          totalContacts: contactsList.length,
          users: usersList.length,
          opportunities: opportunitiesList.length,
          openOpportunities,
          pipelineValue,
          healthScore,
        },
        endpointHealth: {
          location: sanitizeFetchResult(location),
          users: sanitizeFetchResult(users),
          contacts: sanitizeFetchResult(contacts),
          opportunities: sanitizeFetchResult(opportunities),
        },
      });
    } catch (error) {
      console.error(JSON.stringify({
        level: "error",
        component: "prn_private_ghl",
        event: "live_dashboard.failed",
        error: error instanceof Error ? error.message : "Unknown error",
      }));
      res.status(502).json({
        ok: false,
        mode: "private_token",
        source: "Live PRN Staffers GoHighLevel",
        error: "Unable to retrieve live PRN Staffers GoHighLevel data.",
      });
    }
  });
}

function createPrivateGhlClient(token: string) {
  async function request(path: string, operation: string): Promise<GhlFetchResult> {
    const startedAt = Date.now();
    const response = await fetch(`${ghlBaseUrl}${path}`, {
      headers: {
        authorization: `Bearer ${token}`,
        accept: "application/json",
        version: process.env.GHL_API_VERSION || "2021-07-28",
      },
    });
    const text = await response.text();
    const data = parseJson(text);

    console.log(JSON.stringify({
      level: response.ok ? "info" : "warn",
      component: "prn_private_ghl",
      event: "ghl.request",
      operation,
      path,
      status: response.status,
      responseTimeMs: Date.now() - startedAt,
    }));

    return {
      ok: response.ok,
      status: response.status,
      path,
      data,
      responseTimeMs: Date.now() - startedAt,
    };
  }

  return {
    async getFirstOk(paths: string[], operation: string) {
      let lastResult: GhlFetchResult | null = null;

      for (const path of paths) {
        const result = await request(path, operation);
        if (result.ok) {
          return result;
        }
        lastResult = result;
      }

      return lastResult || { ok: false, status: 500, path: paths[0] || "", data: {}, responseTimeMs: 0 };
    },
  };
}

function parseJson(text: string) {
  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { raw: text.slice(0, 240) };
  }
}

function extractList(data: unknown, preferredKeys: string[]): GhlRecord[] {
  if (Array.isArray(data)) {
    return data.filter(isRecord);
  }

  if (!isRecord(data)) {
    return [];
  }

  for (const key of preferredKeys) {
    const value = data[key];
    if (Array.isArray(value)) {
      return value.filter(isRecord);
    }
  }

  for (const value of Object.values(data)) {
    if (Array.isArray(value)) {
      return value.filter(isRecord);
    }
  }

  return [];
}

function summarizeLocation(data: unknown, fallbackLocationId: string) {
  const location = isRecord(data) && isRecord(data.location) ? data.location : data;
  if (!isRecord(location)) {
    return { id: fallbackLocationId, name: "PRN Staffers South Carolina" };
  }

  return {
    id: readString(location.id) || fallbackLocationId,
    name: readString(location.name) || readString(location.businessName) || "PRN Staffers South Carolina",
    city: readString(location.city),
    state: readString(location.state),
  };
}

function sanitizeFetchResult(result: GhlFetchResult) {
  return {
    ok: result.ok,
    status: result.status,
    path: result.path,
    responseTimeMs: result.responseTimeMs,
  };
}

function calculateHealthScore(input: {
  locationOk: boolean;
  usersOk: boolean;
  contactsCount: number;
  opportunitiesCount: number;
  openOpportunities: number;
}) {
  let score = 45;
  if (input.locationOk) score += 10;
  if (input.usersOk) score += 10;
  if (input.contactsCount > 0) score += 15;
  if (input.opportunitiesCount > 0) score += 10;
  if (input.openOpportunities > 0) score += 10;
  return Math.min(score, 100);
}

function readMoney(record: GhlRecord) {
  for (const key of ["monetaryValue", "monetary_value", "value", "pipelineValue"]) {
    const value = record[key];
    const numberValue = typeof value === "number" ? value : typeof value === "string" ? Number(value.replace(/[$,]/g, "")) : 0;
    if (Number.isFinite(numberValue)) {
      return numberValue;
    }
  }
  return 0;
}

function isClosedOpportunity(record: GhlRecord) {
  const status = `${readString(record.status) || readString(record.pipelineStageName) || ""}`.toLowerCase();
  return status.includes("won") || status.includes("lost") || status.includes("closed");
}

function readString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function isRecord(value: unknown): value is GhlRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
