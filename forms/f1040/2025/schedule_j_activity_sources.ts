import { z } from "zod";
import {
  calculateScheduleCAtRiskNet,
  itemSchema as scheduleCItemSchema,
} from "../nodes/inputs/schedule_c/model.ts";
import {
  calculateForm4835AtRiskNet,
  itemSchema as form4835ItemSchema,
} from "../nodes/inputs/f4835/index.ts";

/**
 * Activity-level Schedule J candidates, before attributable deductions and
 * the final return-level reconciliation. These are never an election amount.
 * Sources: 2025 Schedule J and Schedule C instructions at irs.gov/instructions/
 * i1040sj and i1040sc.
 */
export type ScheduleJActivitySource = {
  form: "schedule_c" | "form_4835";
  activity_reference: string;
  at_risk_net: number;
};

const fishingEvidenceSchema = z.object({
  catch_sales_record_reference: z.string().trim().min(1),
  harvested_fish_entered_commerce_verified: z.literal(true),
  scientific_research_vessel: z.literal(false),
}).strict();

const farmRentalEvidenceSchema = z.object({
  written_lease_reference: z.string().trim().min(1),
  production_share_rent_verified: z.literal(true),
  agreement_predates_tenant_activity_verified: z.literal(true),
}).strict();

/** Recompute fishing Schedule C line 31 after the activity's at-risk limit. */
export function scheduleJFishingScheduleCSource(
  raw: z.input<typeof scheduleCItemSchema>,
  evidenceRaw: z.input<typeof fishingEvidenceSchema>,
): ScheduleJActivitySource {
  const item = scheduleCItemSchema.parse(raw);
  fishingEvidenceSchema.parse(evidenceRaw);
  // The 2025 Schedule C business-code table identifies 114110 as Fishing.
  // A free-text business description or an amount alone is not classification.
  if (item.line_b_business_code !== "114110") {
    throw new Error("Schedule J Schedule C source needs fishing business code 114110");
  }
  if (!item.business_reference) {
    throw new Error("Schedule J Schedule C source needs a business reference");
  }
  if (item.statutory_employee === true || item.professional_gambler === true) {
    throw new Error("Schedule J fishing Schedule C source has incompatible treatment");
  }
  if (item.line_g_material_participation !== true) {
    throw new Error("Schedule J fishing Schedule C passive activity needs loss allocation");
  }
  const net = calculateScheduleCAtRiskNet(item).atRiskNet;
  if (!Number.isSafeInteger(net)) {
    throw new Error("Schedule J fishing Schedule C net must be whole dollars");
  }
  return {
    form: "schedule_c",
    activity_reference: item.business_reference,
    at_risk_net: net,
  };
}

/**
 * Recompute Form 4835 farm rental income after the at-risk limit. A current
 * loss or prior passive loss requires Schedule E/Form 8582 allocation first.
 */
export function scheduleJFarmRental4835Source(
  raw: z.input<typeof form4835ItemSchema>,
  evidenceRaw: z.input<typeof farmRentalEvidenceSchema>,
): ScheduleJActivitySource {
  const item = form4835ItemSchema.parse(raw);
  farmRentalEvidenceSchema.parse(evidenceRaw);
  if (!item.activity_id) {
    throw new Error("Schedule J Form 4835 source needs an activity id");
  }
  if ((item.prior_unallowed_passive_operating ?? 0) !== 0) {
    throw new Error("Schedule J Form 4835 prior passive loss needs Form 8582 allocation");
  }
  const net = calculateForm4835AtRiskNet(item).atRiskNet;
  if (net < 0) {
    throw new Error("Schedule J Form 4835 current loss needs Form 8582 allocation");
  }
  if (!Number.isSafeInteger(net)) {
    throw new Error("Schedule J Form 4835 net must be whole dollars");
  }
  return {
    form: "form_4835",
    activity_reference: item.activity_id,
    at_risk_net: net,
  };
}
