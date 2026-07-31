import { randomUUID } from "crypto";
import { withDatabase, withTransaction } from "../db/postgres";
import { publishIntelligenceEvent } from "../intelligence-orchestration/service";
import { INDUSTRY_KEYS, INDUSTRY_PACKS, resolveIndustryContext, type IndustryKey } from "./core";

export function listIndustryCatalog() { return INDUSTRY_KEYS.map((key) => INDUSTRY_PACKS[key]); }

export async function getOrganizationIndustryContext(organizationId: string, authorizedLocationIds: string[]) {
  return withDatabase(async (client) => {
    const selected = await client.query<{ packKey: IndustryKey; isPrimary: boolean }>(`select pack_key as "packKey",is_primary as "isPrimary" from organization_industry_packs where organization_id=$1 order by is_primary desc,created_at`, [organizationId]);
    const observations = await client.query(`select id,location_id as "locationId",pack_key as "packKey",kpi_key as "kpiKey",value::float8 as value,unit,observed_at as "observedAt",evidence from industry_kpi_observations where organization_id=$1 and (location_id is null or location_id=any($2::text[])) order by observed_at desc limit 100`, [organizationId, authorizedLocationIds]);
    const keys = selected.rows.map((row) => row.packKey);
    return { organizationId, selected: selected.rows, configured: keys.length > 0, context: resolveIndustryContext(keys), observations: observations.rows };
  });
}

export async function configureOrganizationIndustryPacks(input: { organizationId: string; packKeys: IndustryKey[]; primaryPackKey: IndustryKey; actorId: string }) {
  const unique = Array.from(new Set(input.packKeys));
  if (!unique.includes(input.primaryPackKey)) throw new Error("The primary Industry Pack must be selected.");
  const previous = await withTransaction(async (client) => {
    const before = await client.query<{ packKey: string }>(`select pack_key as "packKey" from organization_industry_packs where organization_id=$1 order by created_at`, [input.organizationId]);
    await client.query(`delete from organization_industry_packs where organization_id=$1`, [input.organizationId]);
    for (const key of unique) await client.query(`insert into organization_industry_packs (id,organization_id,pack_key,is_primary,configured_by) values ($1,$2,$3,$4,$5)`, [randomUUID(),input.organizationId,key,key===input.primaryPackKey,input.actorId]);
    await client.query(`insert into industry_pack_audit (id,organization_id,event_type,before_pack_keys,after_pack_keys,actor_id) values ($1,$2,'industry_packs_configured',$3::jsonb,$4::jsonb,$5)`, [randomUUID(),input.organizationId,JSON.stringify(before.rows.map((row)=>row.packKey)),JSON.stringify(unique),input.actorId]);
    return before.rows.map((row)=>row.packKey);
  });
  await publishIntelligenceEvent({ id:`industry-packs:${input.organizationId}:${Date.now()}`, organizationId:input.organizationId, producer:"industry_intelligence", type:"industry_packs_configured", category:"operations", occurredAt:new Date().toISOString(), subject:{type:"organization",key:input.organizationId,name:"Organization"}, payload:{before:previous,after:unique,primaryPackKey:input.primaryPackKey}, evidence:[`Executive selected ${unique.length} Industry Pack${unique.length===1?"":"s"}.`] });
  return { selected: unique, primaryPackKey: input.primaryPackKey, context: resolveIndustryContext(unique) };
}

export async function recordIndustryKpi(input: { organizationId:string; locationId?:string; packKey:IndustryKey; kpiKey:string; value:number; unit:string; observedAt:string; evidence:string[]; actorId:string }) {
  const selected = await withDatabase((client)=>client.query(`select 1 from organization_industry_packs where organization_id=$1 and pack_key=$2`,[input.organizationId,input.packKey]));
  if (!selected.rowCount) throw new Error("This Industry Pack is not configured for the organization.");
  if (!INDUSTRY_PACKS[input.packKey].kpis.includes(input.kpiKey)) throw new Error("The KPI does not belong to the selected Industry Pack.");
  const id=randomUUID();
  await withDatabase((client)=>client.query(`insert into industry_kpi_observations (id,organization_id,location_id,pack_key,kpi_key,value,unit,observed_at,evidence,recorded_by) values ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10)`,[id,input.organizationId,input.locationId??null,input.packKey,input.kpiKey,input.value,input.unit,input.observedAt,JSON.stringify(input.evidence),input.actorId]));
  await publishIntelligenceEvent({ id:`industry-kpi:${id}`, organizationId:input.organizationId, locationId:input.locationId, producer:"industry_intelligence", type:"industry_kpi_observed", category:"operations", occurredAt:input.observedAt, subject:{type:"kpi",key:`${input.packKey}:${input.kpiKey}`,name:input.kpiKey}, payload:{packKey:input.packKey,value:input.value,unit:input.unit}, evidence:input.evidence });
  return { id, recorded:true as const };
}
