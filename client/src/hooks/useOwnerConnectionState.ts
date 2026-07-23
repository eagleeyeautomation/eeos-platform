import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";

export type OwnerConnection = {
  locationId: string;
  subaccountName: string;
  connected: boolean;
  tokenType?: string | null;
  connectedAt?: string | null;
  companyId?: string | null;
  webhookRegistered?: boolean;
};

export type OwnerSubaccount = {
  id: string;
  name: string;
  orgName: string;
  ghlLocationId: string;
  status: "connected" | "idle";
  tokenType?: string | null;
  connectedAt?: string | null;
  companyId?: string | null;
  webhookRegistered?: boolean;
};

export type OwnerDashboardAccess = "loading" | "signin" | "connect" | "ready";

export const CONNECT_GHL_ROUTE = "/connect-ghl";

export const OWNER_PAGE_EMPTY_STATES = {
  "/business-health": "Business health data is still being calculated from connected GoHighLevel locations.",
  "/ai-recommendations": "No executive recommendations generated yet.",
  "/live-signals": "No live signals available yet.",
  "/integration-status": "Persisted integration status will appear here when connections are returned.",
} as const;

function normalizeTokenType(tokenType?: string | null) {
  return (tokenType ?? "").trim().toLowerCase();
}

export function isPersistedPitConnection(connection: OwnerConnection) {
  return connection.connected === true && normalizeTokenType(connection.tokenType) === "private_integration";
}

export function filterTenantScopedConnections(
  connections: OwnerConnection[],
  authorizedCompanyId?: string | null
) {
  if (!authorizedCompanyId) return connections;
  return connections.filter((connection) => connection.companyId === authorizedCompanyId);
}

export function mapPitConnectionsToOwnerSubaccounts(connections: OwnerConnection[]): OwnerSubaccount[] {
  return connections
    .filter(isPersistedPitConnection)
    .map((connection) => {
      const locationId = connection.locationId.trim();
      return {
        id: locationId,
        name: connection.subaccountName || "GoHighLevel Location",
        orgName: connection.companyId ? `Company ${connection.companyId}` : "GoHighLevel",
        ghlLocationId: locationId,
        status: "connected",
        tokenType: connection.tokenType,
        connectedAt: connection.connectedAt,
        companyId: connection.companyId,
        webhookRegistered: connection.webhookRegistered,
      };
    });
}

export function getPrimaryOwnerTenantId(subaccounts: OwnerSubaccount[]) {
  return subaccounts[0]?.ghlLocationId ?? "";
}

export function getOwnerDashboardAccessState({
  isAuthenticated,
  authLoading,
  connectionLoading,
  hasConnectedLocations,
  tenantId,
}: {
  isAuthenticated: boolean;
  authLoading: boolean;
  connectionLoading: boolean;
  hasConnectedLocations: boolean;
  tenantId: string;
}): OwnerDashboardAccess {
  if (authLoading || connectionLoading) return "loading";
  if (!isAuthenticated && !hasConnectedLocations) return "signin";
  if (!tenantId && !hasConnectedLocations) return "connect";
  return "ready";
}

export function shouldShowConnectionPrompt(accessState: OwnerDashboardAccess) {
  return accessState === "connect";
}

function readConnectionError(payload: unknown, status: number) {
  if (typeof payload === "string" && payload.trim().length > 0) return payload;
  if (payload && typeof payload === "object") {
    const error = "error" in payload ? payload.error : undefined;
    const message = "message" in payload ? payload.message : undefined;
    if (typeof error === "string") return error;
    if (typeof message === "string") return message;
  }
  return `GoHighLevel connection request failed with HTTP ${status}`;
}

export function useOwnerConnectionState() {
  const auth = useAuth();
  const [connections, setConnections] = useState<OwnerConnection[]>([]);
  const [connectionsLoading, setConnectionsLoading] = useState(true);
  const [connectionsError, setConnectionsError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadConnections() {
      setConnectionsLoading(true);
      setConnectionsError(null);

      try {
        const response = await fetch("/api/ghl/pit/connections", {
          headers: { Accept: "application/json" },
        });
        const contentType = response.headers.get("content-type") ?? "";
        const payload = contentType.includes("application/json")
          ? await response.json()
          : await response.text();

        if (!response.ok) {
          throw new Error(readConnectionError(payload, response.status));
        }

        if (!Array.isArray(payload)) {
          throw new Error("GoHighLevel connections response was not a list.");
        }

        if (active) {
          setConnections(payload as OwnerConnection[]);
        }
      } catch (error) {
        if (active) {
          setConnections([]);
          setConnectionsError(error instanceof Error ? error.message : "Unable to hydrate GoHighLevel connection state.");
        }
      } finally {
        if (active) {
          setConnectionsLoading(false);
        }
      }
    }

    void loadConnections();

    return () => {
      active = false;
    };
  }, []);

  const subaccounts = useMemo(() => mapPitConnectionsToOwnerSubaccounts(connections), [connections]);
  const connectedConnections = useMemo(() => connections.filter(isPersistedPitConnection), [connections]);
  const primaryTenantId = getPrimaryOwnerTenantId(subaccounts);
  const hasConnectedLocations = connectedConnections.length > 0;

  return {
    ...auth,
    connections,
    connectedConnections,
    subaccounts,
    connectionsLoading,
    connectionsError,
    hasConnectedLocations,
    primaryTenantId,
    accessState: getOwnerDashboardAccessState({
      isAuthenticated: auth.isAuthenticated,
      authLoading: auth.loading,
      connectionLoading: connectionsLoading,
      hasConnectedLocations,
      tenantId: primaryTenantId,
    }),
  };
}
