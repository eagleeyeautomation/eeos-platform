/**
 * GoHighLevel Webhook Receiver & Signal Normalization Pipeline
 * POST /api/webhooks/ghl
 *
 * Receives all GHL event types, verifies HMAC-SHA256 signature,
 * normalizes signals, and feeds the IE pipeline.
 *
 * Engineering Principle: "Don't Build More. Build Accurate."
 * Signal quality determines recommendation quality. Every signal is
 * normalized with a weight that reflects its business significance.
 */

import crypto from "crypto";
import type { Express, Request, Response } from "express";
import { ENV } from "./_core/env";
import {
  insertSignal, markSignalProcessed,
  upsertBusinessMemory, getBusinessMemory,
  insertTimelineEvent, upsertKgNode, insertKgEdge,
  insertAuditEntry,
} from "./db";

// Signal weight table — higher weight = more IE influence
const SIGNAL_WEIGHTS: Record<string, number> = {
  "opportunity.created": 2.0,
  "opportunity.status_changed": 2.5,
  "opportunity.updated": 1.5,
  "opportunity.deleted": 1.8,
  "contact.created": 1.2,
  "contact.updated": 0.8,
  "contact.tag_added": 1.0,
  "contact.tag_removed": 0.9,
  "appointment.created": 1.5,
  "appointment.completed": 2.0,
  "appointment.cancelled": 1.8,
  "payment.received": 3.0,
  "form.submitted": 1.3,
  "pipeline.stage_changed": 2.2,
  "conversation.message_sent": 0.5,
  "conversation.message_received": 0.6,
  "workflow.triggered": 0.7,
  "note.created": 0.4,
  "task.created": 0.6,
  "task.completed": 0.8,
};

// Timeline significance mapping
const SIGNAL_SIGNIFICANCE: Record<string, "low" | "medium" | "high" | "critical"> = {
  "opportunity.created": "high",
  "opportunity.status_changed": "high",
  "payment.received": "critical",
  "appointment.cancelled": "medium",
  "appointment.completed": "high",
  "contact.created": "medium",
  "pipeline.stage_changed": "high",
  "form.submitted": "medium",
};

/** Verify GHL HMAC-SHA256 webhook signature */
function verifyWebhookSignature(
  payload: string,
  signature: string | undefined,
  secret: string
): boolean {
  if (!signature || !secret) return !secret; // Allow if no secret configured
  try {
    const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

/** Normalize a GHL webhook payload into a standard signal */
function normalizeSignal(eventType: string, payload: Record<string, unknown>) {
  const base = {
    entityType: null as string | null,
    entityId: null as string | null,
    entityName: null as string | null,
    normalizedData: {} as Record<string, unknown>,
  };

  if (eventType.startsWith("contact.") || eventType.startsWith("contact/")) {
    const contact = payload.contact as Record<string, unknown> | undefined;
    base.entityType = "contact";
    base.entityId = String(payload.id || payload.contactId || contact?.id || "");
    base.entityName = String(payload.firstName || contact?.firstName || "") + " " +
      String(payload.lastName || contact?.lastName || "");
    base.normalizedData = {
      email: payload.email || contact?.email,
      phone: payload.phone || contact?.phone,
      tags: payload.tags || contact?.tags,
      source: payload.source || contact?.source,
      assignedTo: payload.assignedTo || contact?.assignedTo,
    };
  } else if (eventType.startsWith("opportunity.")) {
    const opp = payload.opportunity as Record<string, unknown> | undefined;
    base.entityType = "opportunity";
    base.entityId = String(payload.id || payload.opportunityId || opp?.id || "");
    base.entityName = String(payload.name || opp?.name || "Opportunity");
    base.normalizedData = {
      pipelineId: payload.pipelineId || opp?.pipelineId,
      pipelineStageId: payload.pipelineStageId || opp?.pipelineStageId,
      status: payload.status || opp?.status,
      monetaryValue: payload.monetaryValue || opp?.monetaryValue,
      assignedTo: payload.assignedTo || opp?.assignedTo,
      contactId: payload.contactId || opp?.contactId,
    };
  } else if (eventType.startsWith("appointment.") || eventType.startsWith("calendars/")) {
    base.entityType = "appointment";
    base.entityId = String(payload.id || payload.appointmentId || "");
    base.entityName = String(payload.title || "Appointment");
    base.normalizedData = {
      calendarId: payload.calendarId,
      contactId: payload.contactId,
      startTime: payload.startTime,
      endTime: payload.endTime,
      status: payload.status,
      assignedUserId: payload.assignedUserId,
    };
  } else if (eventType === "pipeline.stage_changed") {
    base.entityType = "pipeline_stage";
    base.entityId = String(payload.pipelineStageId || "");
    base.entityName = String(payload.stageName || "Pipeline Stage");
    base.normalizedData = {
      pipelineId: payload.pipelineId,
      fromStage: payload.fromStage,
      toStage: payload.toStage,
      opportunityId: payload.opportunityId,
    };
  } else if (eventType === "payment.received") {
    base.entityType = "payment";
    base.entityId = String(payload.id || "");
    base.entityName = `Payment $${payload.amount || 0}`;
    base.normalizedData = {
      amount: payload.amount,
      currency: payload.currency,
      contactId: payload.contactId,
      invoiceId: payload.invoiceId,
    };
  } else if (eventType === "form.submitted") {
    base.entityType = "form";
    base.entityId = String(payload.formId || "");
    base.entityName = String(payload.formName || "Form Submission");
    base.normalizedData = {
      formId: payload.formId,
      contactId: payload.contactId,
      submissionId: payload.submissionId,
    };
  }

  return base;
}

/** Build a human-readable timeline title from signal type and entity */
function buildTimelineTitle(eventType: string, entityName: string, payload: Record<string, unknown>): string {
  const name = entityName.trim() || "Entity";
  switch (eventType) {
    case "contact.created": return `New contact added: ${name}`;
    case "contact.updated": return `Contact updated: ${name}`;
    case "contact.tag_added": return `Tag added to ${name}: ${payload.tag || ""}`;
    case "contact.tag_removed": return `Tag removed from ${name}: ${payload.tag || ""}`;
    case "opportunity.created": return `New opportunity: ${name}`;
    case "opportunity.status_changed": return `Opportunity status changed: ${name} → ${payload.status || ""}`;
    case "opportunity.updated": return `Opportunity updated: ${name}`;
    case "pipeline.stage_changed": return `Pipeline stage change: ${payload.fromStage || "?"} → ${payload.toStage || "?"}`;
    case "appointment.created": return `Appointment scheduled: ${name}`;
    case "appointment.completed": return `Appointment completed: ${name}`;
    case "appointment.cancelled": return `Appointment cancelled: ${name}`;
    case "payment.received": return `Payment received: $${(payload.amount as number || 0).toLocaleString()}`;
    case "form.submitted": return `Form submitted: ${name}`;
    default: return `${eventType.replace(/\./g, " ").replace(/_/g, " ")}: ${name}`;
  }
}

/** Update business memory based on incoming signal */
async function updateBusinessMemoryFromSignal(
  tenantId: string,
  eventType: string,
  normalizedData: Record<string, unknown>
): Promise<void> {
  const existing = await getBusinessMemory(tenantId);
  const update: Record<string, unknown> = {
    lastSignalAt: new Date(),
    signalCount24h: (existing?.signalCount24h ?? 0) + 1,
    signalCount7d: (existing?.signalCount7d ?? 0) + 1,
    signalCount30d: (existing?.signalCount30d ?? 0) + 1,
  };

  if (eventType === "contact.created") {
    update.totalContacts = (existing?.totalContacts ?? 0) + 1;
    update.newContactsLast7d = (existing?.newContactsLast7d ?? 0) + 1;
    update.newContactsLast30d = (existing?.newContactsLast30d ?? 0) + 1;
  } else if (eventType === "opportunity.created") {
    update.activeOpportunities = (existing?.activeOpportunities ?? 0) + 1;
    const value = Number(normalizedData.monetaryValue ?? 0);
    update.totalPipelineValue = (existing?.totalPipelineValue ?? 0) + value;
    // Recalculate avg deal size
    const totalOpps = (existing?.activeOpportunities ?? 0) + 1;
    if (totalOpps > 0) {
      update.avgDealSize = ((existing?.totalPipelineValue ?? 0) + value) / totalOpps;
    }
  } else if (eventType === "opportunity.status_changed") {
    const status = String(normalizedData.status ?? "");
    if (status === "won") {
      update.wonOpportunitiesLast30d = (existing?.wonOpportunitiesLast30d ?? 0) + 1;
      update.activeOpportunities = Math.max(0, (existing?.activeOpportunities ?? 0) - 1);
    } else if (status === "lost") {
      update.lostOpportunitiesLast30d = (existing?.lostOpportunitiesLast30d ?? 0) + 1;
      update.activeOpportunities = Math.max(0, (existing?.activeOpportunities ?? 0) - 1);
    }
  } else if (eventType === "appointment.created") {
    update.appointmentsLast7d = (existing?.appointmentsLast7d ?? 0) + 1;
    update.appointmentsLast30d = (existing?.appointmentsLast30d ?? 0) + 1;
  } else if (eventType === "appointment.cancelled") {
    const total = existing?.appointmentsLast30d ?? 1;
    const cancelled = Math.round((existing?.appointmentCancellationRate ?? 0) * total) + 1;
    update.appointmentCancellationRate = cancelled / total;
  }

  // Recalculate health score (simple heuristic, IE will refine this)
  const healthFactors = [
    (existing?.wonOpportunitiesLast30d ?? 0) > 0 ? 20 : 0,
    (existing?.activeOpportunities ?? 0) > 0 ? 15 : 0,
    (existing?.newContactsLast7d ?? 0) > 0 ? 15 : 0,
    (existing?.appointmentCancellationRate ?? 0) < 0.3 ? 10 : 0,
    (existing?.signalCount7d ?? 0) > 10 ? 10 : 5,
    30, // base score
  ];
  update.healthScore = Math.min(100, healthFactors.reduce((a, b) => a + b, 0));

  await upsertBusinessMemory(tenantId, update as Parameters<typeof upsertBusinessMemory>[1]);
}

/** Process a single normalized signal through the full pipeline */
async function processSignalPipeline(
  tenantId: string,
  signalId: number,
  eventType: string,
  payload: Record<string, unknown>,
  normalized: ReturnType<typeof normalizeSignal>
): Promise<void> {
  const startTime = Date.now();

  try {
    // 1. Update Business Memory
    await updateBusinessMemoryFromSignal(tenantId, eventType, normalized.normalizedData);

    // 2. Insert Timeline Event
    if (normalized.entityType) {
      const significance = SIGNAL_SIGNIFICANCE[eventType] ?? "low";
      await insertTimelineEvent({
        tenantId,
        signalId,
        eventType,
        title: buildTimelineTitle(eventType, normalized.entityName ?? "", payload),
        description: JSON.stringify(normalized.normalizedData),
        entityType: normalized.entityType,
        entityId: normalized.entityId,
        entityName: normalized.entityName,
        significance,
        occurredAt: new Date(),
      });
    }

    // 3. Upsert Knowledge Graph node
    if (normalized.entityType && normalized.entityId) {
      await upsertKgNode({
        tenantId,
        nodeType: normalized.entityType as Parameters<typeof upsertKgNode>[0]["nodeType"],
        externalId: normalized.entityId,
        label: normalized.entityName ?? normalized.entityId,
        properties: normalized.normalizedData,
      });
    }

    // 4. Mark signal as processed
    await markSignalProcessed(signalId);

    // 5. Audit log
    await insertAuditEntry({
      tenantId,
      actor: "ghl_webhook",
      action: `signal.processed:${eventType}`,
      entityType: normalized.entityType ?? undefined,
      entityId: normalized.entityId ?? undefined,
      outcome: "success",
      durationMs: Date.now() - startTime,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    await markSignalProcessed(signalId, errorMsg);
    await insertAuditEntry({
      tenantId,
      actor: "ghl_webhook",
      action: `signal.processed:${eventType}`,
      outcome: "failure",
      errorMessage: errorMsg,
      durationMs: Date.now() - startTime,
    });
    throw error;
  }
}

/** Register GHL webhook routes on the Express app */
export function registerGhlWebhookRoutes(app: Express) {
  /**
   * POST /api/webhooks/ghl
   * Receives all GHL webhook events. Verifies HMAC-SHA256 signature,
   * normalizes the signal, and runs the full pipeline.
   */
  app.post("/api/webhooks/ghl", express_json_raw(), async (req: Request, res: Response) => {
    const startTime = Date.now();

    // Get raw body for signature verification
    const rawBody = (req as Request & { rawBody?: string }).rawBody || JSON.stringify(req.body);
    const signature = req.headers["x-ghl-signature"] as string | undefined
      || req.headers["x-webhook-signature"] as string | undefined;

    // Verify signature if secret is configured
    if (ENV.ghlWebhookSecret) {
      if (!verifyWebhookSignature(rawBody, signature, ENV.ghlWebhookSecret)) {
        console.warn("[GHL Webhook] Invalid signature rejected");
        res.status(401).json({ error: "Invalid webhook signature" });
        return;
      }
    }

    // Respond immediately to prevent GHL timeout (process async)
    res.status(200).json({ received: true });

    // Parse payload
    let payload: Record<string, unknown>;
    try {
      payload = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    } catch {
      console.error("[GHL Webhook] Failed to parse payload");
      return;
    }

    // Extract event type and tenant
    const eventType = String(payload.type || payload.event || payload.eventType || "unknown");
    const locationId = String(payload.locationId || payload.location_id || "");
    const tenantId = locationId || "unknown";

    if (tenantId === "unknown" || eventType === "unknown") {
      console.warn(`[GHL Webhook] Missing tenantId or eventType in payload`);
      return;
    }

    console.log(`[GHL Webhook] Received ${eventType} for tenant ${tenantId}`);

    try {
      // Normalize the signal
      const normalized = normalizeSignal(eventType, payload);
      const weight = SIGNAL_WEIGHTS[eventType] ?? 1.0;

      // Store raw signal
      const signalId = await insertSignal({
        tenantId,
        signalType: eventType as Parameters<typeof insertSignal>[0]["signalType"],
        sourceEventId: String(payload.id || payload.eventId || ""),
        entityType: normalized.entityType,
        entityId: normalized.entityId,
        entityName: normalized.entityName,
        rawPayload: payload,
        normalizedPayload: normalized.normalizedData,
        signalWeight: weight,
        receivedAt: new Date(),
      });

      // Process through pipeline asynchronously
      processSignalPipeline(tenantId, signalId, eventType, payload, normalized)
        .catch(err => console.error(`[GHL Webhook] Pipeline error for signal ${signalId}:`, err));

      console.log(`[GHL Webhook] Signal ${signalId} queued for processing (${Date.now() - startTime}ms)`);
    } catch (error) {
      console.error("[GHL Webhook] Failed to store signal:", error);
    }
  });
}

/** Express middleware to capture raw body for HMAC verification */
function express_json_raw() {
  return (req: Request, res: Response, next: () => void) => {
    let data = "";
    req.setEncoding("utf8");
    req.on("data", (chunk: string) => { data += chunk; });
    req.on("end", () => {
      (req as Request & { rawBody?: string }).rawBody = data;
      try {
        req.body = data ? JSON.parse(data) : {};
      } catch {
        req.body = {};
      }
      next();
    });
  };
}
