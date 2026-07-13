import { createHash } from "crypto";
import { withDatabase } from "./postgres";

export type GhlStoredTokenRecord = {
  membershipId: string;
  operationalDivisionId: string;
  locationId: string;
  encryptedPayload: string;
  expiresAt: string;
  scopes: string[];
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
    const result = await client.query<{ id: string }>(
      `
        update eeos_oauth_states
        set consumed_at = now(), status = 'consumed'
        where state_hash = $1
          and consumed_at is null
          and expires_at > now()
        returning id
      `,
      [hashState(state)],
    );

    return Boolean(result.rows[0]);
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
