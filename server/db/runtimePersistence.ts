import { createHash } from "crypto";
import { withDatabase, withTransaction } from "./postgres";

export type GhlStoredTokenRecord = {
  membershipId: string;
  operationalDivisionId: string;
  locationId: string;
  encryptedPayload: string;
  expiresAt: string;
  scopes: string[];
};

export type GhlConnectionRecord = {
  organizationId: string;
  provider: string;
  operationalDivisionId: string;
  locationId: string;
  encryptedTokenPayload: string;
  tokenExpiresAt: string | null;
  scopes: string[];
  connectedAt: string;
  updatedAt: string;
};

export type RuntimeAuditEvent = {
  organizationId: string;
  eventType: string;
  source: string;
  locationId?: string | null;
  correlationId?: string | null;
  payloadFingerprint?: string | null;
  metadata: Record<string, unknown>;
};

export async function upsertGhlTokenRecord(record: GhlStoredTokenRecord) {
  await withDatabase(async (client) => {
    await client.query(
      `
        insert into eeos_integration_connections (
          organization_id,
          provider,
          operational_division_id,
          location_id,
          encrypted_token_payload,
          token_expires_at,
          scopes,
          connected_at,
          updated_at
        )
        values ($1, 'gohighlevel', $2, $3, $4, $5, $6::jsonb, now(), now())
        on conflict (organization_id, provider, operational_division_id)
        do update set
          location_id = excluded.location_id,
          encrypted_token_payload = excluded.encrypted_token_payload,
          token_expires_at = excluded.token_expires_at,
          scopes = excluded.scopes,
          updated_at = now(),
          disconnected_at = null
      `,
      [
        record.membershipId,
        record.operationalDivisionId,
        record.locationId,
        record.encryptedPayload,
        record.expiresAt,
        JSON.stringify(record.scopes),
      ],
    );
  });
}

export async function upsertGhlTokenRecordWithAudit(
  record: GhlStoredTokenRecord,
  event: RuntimeAuditEvent,
) {
  await withTransaction(async (client) => {
    await client.query(
      `
        insert into eeos_integration_connections (
          organization_id, provider, operational_division_id, location_id,
          encrypted_token_payload, token_expires_at, scopes, connected_at, updated_at
        )
        values ($1, 'gohighlevel', $2, $3, $4, $5, $6::jsonb, now(), now())
        on conflict (organization_id, provider, operational_division_id)
        do update set location_id = excluded.location_id,
          encrypted_token_payload = excluded.encrypted_token_payload,
          token_expires_at = excluded.token_expires_at, scopes = excluded.scopes,
          updated_at = now(), disconnected_at = null
      `,
      [
        record.membershipId, record.operationalDivisionId, record.locationId,
        record.encryptedPayload, record.expiresAt, JSON.stringify(record.scopes),
      ],
    );
    await client.query(
      `
        insert into eeos_audit_events (
          organization_id, source, event_type, location_id, correlation_id,
          payload_fingerprint, metadata, created_at
        )
        values ($1, $2, $3, $4, $5, $6, $7::jsonb, now())
      `,
      [
        event.organizationId, event.source, event.eventType, event.locationId ?? null,
        event.correlationId ?? null, event.payloadFingerprint ?? null,
        JSON.stringify(event.metadata),
      ],
    );
  });
}

export async function readGhlTokenRecord(membershipId: string) {
  return withDatabase(async (client) => {
    const result = await client.query<{ encrypted_token_payload: string }>(
      `
        select encrypted_token_payload
        from eeos_integration_connections
        where organization_id = $1
          and provider = 'gohighlevel'
          and disconnected_at is null
        order by updated_at desc
        limit 1
      `,
      [membershipId],
    );

    return result.rows[0]?.encrypted_token_payload ?? null;
  });
}

export async function readGhlConnectionRecord(
  organizationId: string,
  provider: string,
  locationId: string,
) {
  return withDatabase(async (client) => {
    const result = await client.query<{
      organization_id: string;
      provider: string;
      operational_division_id: string;
      location_id: string;
      encrypted_token_payload: string;
      token_expires_at: Date | string | null;
      scopes: string[];
      connected_at: Date | string;
      updated_at: Date | string;
    }>(
      `
        select
          organization_id,
          provider,
          operational_division_id,
          location_id,
          encrypted_token_payload,
          token_expires_at,
          scopes,
          connected_at,
          updated_at
        from eeos_integration_connections
        where organization_id = $1
          and provider = $2
          and location_id = $3
          and disconnected_at is null
        limit 1
      `,
      [organizationId, provider, locationId],
    );

    const row = result.rows[0];
    if (!row) return null;

    return {
      organizationId: row.organization_id,
      provider: row.provider,
      operationalDivisionId: row.operational_division_id,
      locationId: row.location_id,
      encryptedTokenPayload: row.encrypted_token_payload,
      tokenExpiresAt: row.token_expires_at ? new Date(row.token_expires_at).toISOString() : null,
      scopes: Array.isArray(row.scopes) ? row.scopes : [],
      connectedAt: new Date(row.connected_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
    } satisfies GhlConnectionRecord;
  });
}

export async function persistOAuthState(state: string, payload: Record<string, string>, expiresAt: Date) {
  await withDatabase(async (client) => {
    await client.query(
      `
        insert into eeos_oauth_states (state_hash, organization_id, payload, expires_at)
        values ($1, $2, $3::jsonb, $4)
        on conflict (state_hash) do nothing
      `,
      [hashState(state), payload.tenantId, JSON.stringify(payload), expiresAt.toISOString()],
    );
  });
}

export async function consumeOAuthState(state: string) {
  return withDatabase(async (client) => {
    const result = await client.query<{
      id: string;
      organization_id: string;
      payload: Record<string, unknown>;
    }>(
      `
        update eeos_oauth_states
        set consumed_at = now(), status = 'consumed'
        where state_hash = $1
          and consumed_at is null
          and expires_at > now()
        returning id, organization_id, payload
      `,
      [hashState(state)],
    );

    const consumed = result.rows[0];
    return consumed
      ? { organizationId: consumed.organization_id, payload: consumed.payload }
      : null;
  });
}

export async function persistWebhookLedgerEvent(input: {
  organizationId: string;
  providerEventId: string;
  eventType: string;
  locationId?: string | null;
  payloadFingerprint: string;
  status: "accepted" | "rejected" | "dead_letter";
  metadata: Record<string, unknown>;
}) {
  await withDatabase(async (client) => {
    await client.query(
      `
        insert into eeos_webhook_events (
          organization_id,
          provider,
          provider_event_id,
          event_type,
          location_id,
          payload_fingerprint,
          status,
          metadata,
          received_at,
          updated_at
        )
        values ($1, 'gohighlevel', $2, $3, $4, $5, $6, $7::jsonb, now(), now())
        on conflict (organization_id, provider, provider_event_id)
        do update set
          duplicate_count = eeos_webhook_events.duplicate_count + 1,
          updated_at = now()
      `,
      [
        input.organizationId,
        input.providerEventId,
        input.eventType,
        input.locationId,
        input.payloadFingerprint,
        input.status,
        JSON.stringify(input.metadata),
      ],
    );
  });
}

export async function persistAuditEvent(event: RuntimeAuditEvent) {
  await withDatabase(async (client) => {
    await client.query(
      `
        insert into eeos_audit_events (
          organization_id,
          source,
          event_type,
          location_id,
          correlation_id,
          payload_fingerprint,
          metadata,
          created_at
        )
        values ($1, $2, $3, $4, $5, $6, $7::jsonb, now())
      `,
      [
        event.organizationId,
        event.source,
        event.eventType,
        event.locationId ?? null,
        event.correlationId ?? null,
        event.payloadFingerprint ?? null,
        JSON.stringify(event.metadata),
      ],
    );
  });
}

export async function readLatestSnapshotHistory(
  locations: Array<{ organizationId: string; locationId: string }>,
) {
  if (locations.length === 0) return new Map<string, {
    generatedAt: string;
    partial: boolean;
  }>();

  return withDatabase(async (client) => {
    const organizationIds = locations.map((location) => location.organizationId);
    const locationIds = locations.map((location) => location.locationId);
    const result = await client.query<{
      organization_id: string;
      location_id: string;
      metadata: Record<string, unknown>;
      created_at: Date | string;
    }>(
      `
        select distinct on (organization_id, location_id)
          organization_id,
          location_id,
          metadata,
          created_at
        from eeos_audit_events
        where event_type = 'operations.snapshot.read'
          and organization_id = any($1::text[])
          and location_id = any($2::text[])
        order by organization_id, location_id, created_at desc
      `,
      [organizationIds, locationIds],
    );

    return new Map(result.rows
      .filter((row) => locations.some(
        (location) => location.organizationId === row.organization_id && location.locationId === row.location_id,
      ))
      .map((row) => [
        `${row.organization_id}:${row.location_id}`,
        {
          generatedAt: new Date(row.created_at).toISOString(),
          partial: row.metadata?.partial === true,
        },
      ]));
  });
}

export type StoredCompletedSnapshot = {
  generatedAt: string;
  aggregate: {
    contacts: {
      total: number;
      createdLast7Days: number;
      createdLast30Days: number;
    };
    opportunities: {
      openTotal: number;
      createdLast7Days: number;
      createdLast30Days: number;
      byStage: Array<{
        pipelineIdentifier: string;
        pipelineName: string;
        stageIdentifier: string;
        stageName: string;
        count: number;
      }>;
    };
  };
};

export async function readLatestCompletedSnapshot(
  organizationId: string,
  locationId: string,
  provider: "gohighlevel",
): Promise<StoredCompletedSnapshot | null> {
  return withDatabase(async (client) => {
    const result = await client.query<{
      metadata: Record<string, unknown>;
      created_at: Date | string;
    }>(
      `
        select metadata, created_at
        from eeos_audit_events
        where organization_id = $1
          and location_id = $2
          and source = $3
          and event_type = 'operations.snapshot.read'
          and coalesce((metadata->>'partial')::boolean, false) = false
        order by created_at desc
        limit 1
      `,
      [organizationId, locationId, provider],
    );
    const row = result.rows[0];
    if (!row) return null;
    const aggregate = row.metadata?.aggregate;
    if (!aggregate || typeof aggregate !== "object") return null;
    return {
      generatedAt: typeof row.metadata.generatedAt === "string"
        ? row.metadata.generatedAt
        : new Date(row.created_at).toISOString(),
      aggregate: aggregate as StoredCompletedSnapshot["aggregate"],
    };
  });
}

export async function disconnectGhlConnection(organizationId: string) {
  await withDatabase(async (client) => {
    await client.query(
      `
        update eeos_integration_connections
        set disconnected_at = now(), updated_at = now()
        where organization_id = $1
          and provider = 'gohighlevel'
          and disconnected_at is null
      `,
      [organizationId],
    );
  });
}

export async function upsertSyncCheckpoint(input: {
  organizationId: string;
  resource: string;
  locationId: string;
  checkpoint: Record<string, unknown>;
  lastErrorSummary?: string | null;
}) {
  await withDatabase(async (client) => {
    await client.query(
      `
        insert into eeos_sync_checkpoints (
          organization_id,
          provider,
          resource,
          location_id,
          checkpoint,
          last_successful_sync_at,
          last_error_summary,
          updated_at
        )
        values ($1, 'gohighlevel', $2, $3, $4::jsonb, now(), $5, now())
        on conflict (organization_id, provider, resource, location_id)
        do update set
          checkpoint = excluded.checkpoint,
          last_successful_sync_at = excluded.last_successful_sync_at,
          last_error_summary = excluded.last_error_summary,
          updated_at = now()
      `,
      [
        input.organizationId,
        input.resource,
        input.locationId,
        JSON.stringify(input.checkpoint),
        input.lastErrorSummary ?? null,
      ],
    );
  });
}

function hashState(state: string) {
  return createHash("sha256").update(state).digest("hex");
}
