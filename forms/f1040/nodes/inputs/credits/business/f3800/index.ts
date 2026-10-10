import {
  currentOrphanAllocationSchema,
  reconcileCurrentOrphanAllocation,
} from "./current-allocation.ts";
import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../../../core/types/tax-node.ts";
import { output, TaxNode } from "../../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../../core/types/output-nodes.ts";
import { schedule3 } from "../../../../intermediate/aggregation/general/return-assembly/schedule3/index.ts";
import { form6251 } from "../../../../intermediate/forms/taxes/amt/form6251/index.ts";
import { f1040 } from "../../../../outputs/general/return-assembly/f1040/index.ts";
import type { NodeContext } from "../../../../../../../core/types/node-context.ts";
import {
  classifyForm3800PassiveCredits,
  classifyForm8835Credits,
  ZERO_FORM3800_PASSIVE_ACTIVITY,
} from "./calculation.ts";
import { sourceAllocationSchema } from "../../../../intermediate/forms/credits/business/form8582cr/source.ts";
import { allocateDisabledAccessLine1eCredits } from "./disabled-access.ts";
import {
  form3800CarryoverVintageSchema,
  reconcileForm3800CarryoverLedger,
} from "./carryover-ledger.ts";

// TY2025 — Form 3800: General Business Credit.
// Source-backed Form 8826, Form 8835, and Form 5884 entries pass classified source
// credit to the Form 1040 sink for the Part II tax-liability limitation.
// The older f3800s input still routes unbounded gross amounts to Schedule 3
// line 6a and must not be treated as a filed Form 3800 calculation.
// IRC §38 (credit allowed), §39 (carryback 1 yr / carryforward 20 yrs).
// Carryback is 3 years for §6417(b) credits (clean energy elective payments).

// Per-entry schema — each item represents one Form 3800 entry (3800 or GBC screen)
export const itemSchema = z.object({
  // Pre-computed total GBC (overrides component sum when provided)
  // IRC §38; Form 3800 Part II line 38
  total_gbc: z.number().nonnegative().optional(),

  // ── Component credits (Part III current-year credits) ─────────────────────
  // Work Opportunity Credit — IRC §51; Form 5884
  work_opportunity_credit: z.number().nonnegative().optional(),
  // Research Activities Credit — IRC §41; Form 6765
  research_credit: z.number().nonnegative().optional(),
  // Disabled Access Credit — IRC §44; Form 8826
  disabled_access_credit: z.number().nonnegative().optional(),
  // Employer pension plan startup costs credit — IRC §45E/§45T; Form 8881
  employer_pension_startup_credit: z.number().nonnegative().optional(),
  // Employer-provided childcare credit — IRC §45F; Form 8882
  employer_childcare_credit: z.number().nonnegative().optional(),
  // Small employer health insurance premiums — IRC §45R; Form 8941
  small_employer_health_credit: z.number().nonnegative().optional(),
  // New Markets Tax Credit — IRC §45D; Form 8874
  new_markets_credit: z.number().nonnegative().optional(),
  // Energy Efficient Home Credit — IRC §45L; Form 8908
  energy_efficient_home_credit: z.number().nonnegative().optional(),
  // Advanced Manufacturing Production Credit — IRC §45X; Form 7207
  advanced_manufacturing_credit: z.number().nonnegative().optional(),

  // ── Carryover credits (Part IV prior-year / Part II line 5) ──────────────
  // GBC carried forward from prior years (up to 20 years) — IRC §39(a)(1)(B)
  carryforward_credit: z.number().nonnegative().optional(),
  // GBC carried back from a subsequent year (1 yr standard; 3 yrs §6417(b)) — IRC §39(a)(1)(A)
  carryback_credit: z.number().nonnegative().optional(),
});

const f8835CreditEntrySchema = z.object({
  form3800_line: z.enum(["1f", "4e"]),
  credit_amount: z.number().nonnegative(),
  transfer_out_amount: z.number().nonnegative(),
  registration_number: z.string().min(1).optional(),
  subject_to_passive_activity_limit: z.boolean(),
  transfer_election_statement_file_name: z.string().min(1).optional(),
});

export const f8826CreditEntrySchema = z.object({
  source_type: z.enum([
    "self",
    "partnership",
    "s_corporation",
    "estate",
    "trust",
  ]),
  source_ein: z.string().regex(/^\d{9}$/).optional(),
  source_document_reference: z.string().trim().min(1).optional(),
  source_statement_reference: z.string().trim().min(1).optional(),
  credit_amount: z.number().finite().nonnegative().refine(
    (amount) =>
      Number.isSafeInteger(Math.round(amount * 100)) &&
      Math.abs(amount * 100 - Math.round(amount * 100)) < 0.000001,
    { message: "Form 8826 source credit must have cent precision" },
  ),
  subject_to_passive_activity_limit: z.boolean(),
}).superRefine((entry, ctx) => {
  if ((entry.source_type === "self") === (entry.source_ein !== undefined)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        "Form 8826 source EIN is required only for a pass-through source",
    });
  }
  if (entry.source_type === "estate" || entry.source_type === "trust") {
    for (
      const key of [
        "source_document_reference",
        "source_statement_reference",
      ] as const
    ) {
      if (!entry[key]) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: `Form 3800 estate/trust disabled-access source needs ${key}`,
        });
      }
    }
  }
});

const f5884CreditSchema = z.object({
  credit_amount: z.number().finite().nonnegative(),
  subject_to_passive_activity_limit: z.boolean(),
});

const f8881CreditSchema = z.object({
  schedule_c_business_reference: z.string().trim().min(1),
  part_i_credit: z.number().int().nonnegative(),
  part_ii_credit: z.number().int().nonnegative(),
  part_iii_credit: z.number().int().nonnegative(),
  subject_to_passive_activity_limit: z.literal(false),
}).strict().refine(
  (credit) =>
    credit.part_i_credit + credit.part_ii_credit + credit.part_iii_credit > 0,
  { message: "Form 8881 needs a positive Part I, II, or III credit" },
);

const f8844DirectEmployerCreditSchema = z.object({
  credit_amount: z.number().int().positive(),
  schedule_c_business_reference: z.string().trim().min(1),
  payroll_ledger_reference: z.string().trim().min(1),
  subject_to_passive_activity_limit: z.literal(false),
}).strict();

const f8908CreditSchema = z.object({
  credit_amount: z.number().int().positive(),
  subject_to_passive_activity_limit: z.literal(false),
}).strict();

const f8941DirectEmployerCreditSchema = z.object({
  credit_amount: z.number().int().positive(),
  schedule_c_business_reference: z.string().trim().min(1).optional(),
  schedule_f_farm_id: z.string().trim().min(1).optional(),
  group_business_references: z.array(z.string().trim().min(1)).min(2).max(12)
    .optional(),
  independent_spouse_business_references: z.tuple([
    z.string().trim().min(1),
    z.string().trim().min(1),
  ]).optional(),
  independent_spouse_credits: z.tuple([
    z.number().int().positive(),
    z.number().int().positive(),
  ]).optional(),
  shop_plan_reference: z.string().trim().min(1),
  subject_to_passive_activity_limit: z.literal(false),
  shop_plan_references: z.array(z.string().trim().min(1)).min(2).max(12).refine(
    (refs) => new Set(refs).size === refs.length,
  ).optional(),
}).strict().refine((credit) =>
  Boolean(credit.schedule_c_business_reference) !==
    Boolean(credit.schedule_f_farm_id), {
  message: "Form 8941 direct employer needs exactly one C or F deduction owner",
});

const f8994DirectEmployerCreditSchema = z.object({
  credit_amount: z.number().int().positive(),
  schedule_c_business_reference: z.string().trim().min(1),
  schedule_c_wage_ledger_reference: z.string().trim().min(1),
  subject_to_passive_activity_limit: z.literal(false),
}).strict();

const f8864DirectProducerCreditSchema = z.object({
  credit_amount: z.number().int().positive(),
  schedule_c_business_reference: z.string().trim().min(1),
  form637_registration_number: z.string().trim().min(1),
  subject_to_passive_activity_limit: z.literal(false),
}).strict();

const f8882DirectEmployerCreditSchema = z.object({
  credit_amount: z.number().int().positive(),
  schedule_c_business_reference: z.string().trim().min(1),
  subject_to_passive_activity_limit: z.literal(false),
}).strict();

const f8820CreditSchema = z.object({
  credit_amount: z.number().finite().nonnegative(),
  subject_to_passive_activity_limit: z.boolean(),
});

const f8874CreditSchema = z.object({
  credit_amount: z.number().finite().positive(),
  subject_to_passive_activity_limit: z.literal(false),
});

const f8874K1CreditSchema = z.object({
  source_type: z.enum(["partnership", "s_corporation", "estate", "trust"]),
  source_ein: z.string().regex(/^\d{9}$/),
  source_document_reference: z.string().trim().min(1),
  source_statement_reference: z.string().trim().min(1).optional(),
  credit_amount: z.number().int().positive(),
  subject_to_passive_activity_limit: z.literal(false),
}).superRefine((entry, ctx) => {
  if (
    (entry.source_type === "estate" || entry.source_type === "trust") &&
    !entry.source_statement_reference
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["source_statement_reference"],
      message:
        "Estate/trust code ZZ New Markets Credit needs its statement reference",
    });
  }
});

const f8820K1CreditSchema = z.object({
  source_type: z.enum(["partnership", "s_corporation", "estate", "trust"]),
  source_ein: z.string().regex(/^\d{9}$/),
  source_document_reference: z.string().trim().min(1),
  credit_amount: z.number().int().positive(),
  subject_to_passive_activity_limit: z.boolean(),
}).superRefine((entry, ctx) => {
  if (entry.source_type === "estate" || entry.source_type === "trust") {
    ctx.addIssue({
      code: "custom",
      path: ["source_type"],
      message:
        "Estate/trust K-1 box 13 code M orphan-drug credit needs qualified clinical-testing and passive-activity source evidence",
    });
  }
});

const f3468TrustPartVCreditSchema = z.object({
  source_type: z.literal("trust"),
  source_ein: z.string().regex(/^\d{9}$/),
  source_document_reference: z.string().trim().min(1),
  source_statement_reference: z.string().trim().min(1),
  credit_amount: z.number().int().positive(),
  subject_to_passive_activity_limit: z.literal(false),
}).strict();

const f8936NewVehicleCreditSchema = z.object({
  credit_amount: z.number().finite().nonnegative(),
  subject_to_passive_activity_limit: z.boolean(),
});

const f8911CreditSchema = z.object({
  credit_amount: z.number().int().nonnegative(),
  subject_to_passive_activity_limit: z.boolean(),
});

const appliedSourceCreditSchema = z.number().finite().nonnegative().refine(
  (amount) =>
    Number.isSafeInteger(Math.round(amount * 100)) &&
    Math.abs(amount * 100 - Math.round(amount * 100)) < 0.000001,
  { message: "Form 3800 applied source credit must have cent precision" },
);

export const inputSchema = z.object({
  f3800s: z.array(itemSchema).min(1).optional(),
  current_orphan_allocation_review: currentOrphanAllocationSchema.optional(),
  carryforward_vintages: z.array(
    z.object({
      vintage: form3800CarryoverVintageSchema,
      subject_to_passive_activity_limit: z.boolean(),
    }).strict(),
  ).min(1).optional(),
  f8835_credit_entries: z.array(f8835CreditEntrySchema).min(1).optional(),
  f8826_credit_entries: z.array(f8826CreditEntrySchema).min(1).optional(),
  f5884_credit: f5884CreditSchema.optional(),
  f8881_credit: f8881CreditSchema.optional(),
  f8844_direct_employer_credit: f8844DirectEmployerCreditSchema.optional(),
  f8908_credit: f8908CreditSchema.optional(),
  f8941_direct_employer_credit: f8941DirectEmployerCreditSchema.optional(),
  f8994_direct_employer_credit: f8994DirectEmployerCreditSchema.optional(),
  f8864_direct_producer_credit: f8864DirectProducerCreditSchema.optional(),
  f8882_direct_employer_credit: f8882DirectEmployerCreditSchema.optional(),
  f8911_credit: f8911CreditSchema.optional(),
  f8820_credit: f8820CreditSchema.optional(),
  f8874_credit: f8874CreditSchema.optional(),
  f8874_k1_credit_entries: z.array(f8874K1CreditSchema).min(1).optional(),
  f8820_k1_credit_entries: z.array(f8820K1CreditSchema).min(1).optional(),
  f3468_trust_part_v_credit_entries: z.array(f3468TrustPartVCreditSchema)
    .min(1).optional(),
  f8936_new_vehicle_credit: f8936NewVehicleCreditSchema.optional(),
  f8936_commercial_vehicle_credit: f8936NewVehicleCreditSchema.optional(),
  passive_source_allocations: z.array(sourceAllocationSchema).min(1).optional(),
  form8936_applied_credit: appliedSourceCreditSchema.optional(),
  form8936_commercial_applied_credit: appliedSourceCreditSchema.optional(),
  form8820_applied_credit: appliedSourceCreditSchema.optional(),
  form8820_applied_credits_by_source: z.array(appliedSourceCreditSchema)
    .optional(),
  form8874_applied_credits_by_source: z.array(appliedSourceCreditSchema)
    .optional(),
  form3468_part_v_applied_credits_by_source: z.array(appliedSourceCreditSchema)
    .optional(),
  form5884_applied_credit: appliedSourceCreditSchema.optional(),
  form8941_applied_credit: appliedSourceCreditSchema.optional(),
  form8994_applied_credit: appliedSourceCreditSchema.optional(),
  form8864_applied_credit: appliedSourceCreditSchema.optional(),
  form5884_applied_credits_by_source: z.array(appliedSourceCreditSchema)
    .optional(),
  // Optional Part V allocation choices. Required only when a tax limit cuts
  // across multiple sources on the same Form 3800 credit line.
  form8826_applied_credits_by_source: z.array(appliedSourceCreditSchema)
    .optional(),
  form8835_applied_credits_by_facility: z.array(appliedSourceCreditSchema)
    .optional(),
}).refine(
  (input) =>
    input.current_orphan_allocation_review !== undefined ||
    input.f3800s !== undefined || input.f8835_credit_entries !== undefined ||
    input.carryforward_vintages !== undefined ||
    input.f8826_credit_entries !== undefined ||
    input.f5884_credit !== undefined ||
    input.f8881_credit !== undefined ||
    input.f8844_direct_employer_credit !== undefined ||
    input.f8908_credit !== undefined ||
    input.f8941_direct_employer_credit !== undefined ||
    input.f8994_direct_employer_credit !== undefined ||
    input.f8864_direct_producer_credit !== undefined ||
    input.f8882_direct_employer_credit !== undefined ||
    input.f8911_credit !== undefined ||
    input.f8820_credit !== undefined ||
    input.f8874_credit !== undefined ||
    input.f8874_k1_credit_entries !== undefined ||
    input.f8820_k1_credit_entries !== undefined ||
    input.f3468_trust_part_v_credit_entries !== undefined ||
    input.f8936_new_vehicle_credit !== undefined ||
    input.f8936_commercial_vehicle_credit !== undefined ||
    input.passive_source_allocations !== undefined,
  {
    message: "Form 3800 needs a credit source",
  },
);

type F3800Item = z.infer<typeof itemSchema>;
type F3800Items = F3800Item[];

/** Reconcile the current nonpassive calculation intake before any filing use. */
export function reconcileForm3800NonpassiveCarryforwards(
  entries: NonNullable<z.infer<typeof inputSchema>["carryforward_vintages"]>,
) {
  const carryforward = reconcileForm3800CarryoverLedger(
    entries.map((entry) => entry.vintage),
  );
  for (const [index, entry] of entries.entries()) {
    if (entry.subject_to_passive_activity_limit) {
      throw new Error(
        "Form 3800 passive carryforward needs linked Form 8582-CR source allocation",
      );
    }
    if (carryforward[index].adjustment2025 > 0) {
      throw new Error(
        "Form 3800 adjusted carryforward needs Part IV recapture reconciliation",
      );
    }
    if (entry.vintage.form3800_credit_line === "3") {
      throw new Error(
        "Form 3800 empowerment-zone carryforward needs Part II line 22 allocation",
      );
    }
    if (
      entry.vintage.form3800_credit_line === "1c" ||
      entry.vintage.form3800_credit_line === "4i"
    ) {
      throw new Error(
        "Form 3800 research carryforward needs the Form 6765 business-income limitation before Part I line 4 or Part II line 34",
      );
    }
  }
  return carryforward;
}

// Compute the total current-year GBC for one item.
// Uses total_gbc override if provided; otherwise sums named component credits.
function currentYearGbc(item: F3800Item): number {
  if (item.total_gbc !== undefined) {
    return item.total_gbc;
  }
  return (
    (item.work_opportunity_credit ?? 0) +
    (item.research_credit ?? 0) +
    (item.disabled_access_credit ?? 0) +
    (item.employer_pension_startup_credit ?? 0) +
    (item.employer_childcare_credit ?? 0) +
    (item.small_employer_health_credit ?? 0) +
    (item.new_markets_credit ?? 0) +
    (item.energy_efficient_home_credit ?? 0) +
    (item.advanced_manufacturing_credit ?? 0)
  );
}

// Compute the carryover amount for one item.
function carryoverGbc(item: F3800Item): number {
  return (item.carryforward_credit ?? 0) + (item.carryback_credit ?? 0);
}

// Total GBC for one item including carryovers.
function itemTotal(item: F3800Item): number {
  return currentYearGbc(item) + carryoverGbc(item);
}

// Sum total GBC across all items.
function totalGbc(items: F3800Items): number {
  return items.reduce((sum, item) => sum + itemTotal(item), 0);
}

function schedule3Output(
  items: F3800Items,
  f8835Entries: z.infer<typeof f8835CreditEntrySchema>[],
  f8826Entries: z.infer<typeof f8826CreditEntrySchema>[],
  f5884Credit: z.infer<typeof f5884CreditSchema> | undefined,
  f8881Credit: z.infer<typeof f8881CreditSchema> | undefined,
  f8844Credit: z.infer<typeof f8844DirectEmployerCreditSchema> | undefined,
  f8908Credit: z.infer<typeof f8908CreditSchema> | undefined,
  f8941Credit: z.infer<typeof f8941DirectEmployerCreditSchema> | undefined,
  f8994Credit: z.infer<typeof f8994DirectEmployerCreditSchema> | undefined,
  f8864Credit: z.infer<typeof f8864DirectProducerCreditSchema> | undefined,
  f8882Credit: z.infer<typeof f8882DirectEmployerCreditSchema> | undefined,
  f8911Credit: z.infer<typeof f8911CreditSchema> | undefined,
  f8820Credit: z.infer<typeof f8820CreditSchema> | undefined,
  f8874Credit: z.infer<typeof f8874CreditSchema> | undefined,
  f8874K1Credits: readonly z.infer<typeof f8874K1CreditSchema>[],
  f8820K1Credits: readonly z.infer<typeof f8820K1CreditSchema>[],
  f3468TrustPartVCredits: readonly z.infer<
    typeof f3468TrustPartVCreditSchema
  >[],
  f8936Credit: z.infer<typeof f8936NewVehicleCreditSchema> | undefined,
  f8936CommercialCredit:
    | z.infer<typeof f8936NewVehicleCreditSchema>
    | undefined,
  passiveSources:
    | z.infer<typeof sourceAllocationSchema>[]
    | undefined,
  carryforwardVintages:
    | NonNullable<z.infer<typeof inputSchema>["carryforward_vintages"]>
    | undefined,
): NodeOutput[] {
  if (
    f8911Credit?.subject_to_passive_activity_limit &&
    f8911Credit.credit_amount > 0
  ) {
    throw new Error(
      "Form 8911 passive credit requires Form 8582-CR source allocation",
    );
  }
  const f8835Credit = f8835Entries.length > 0
    ? classifyForm8835Credits(f8835Entries)
    : undefined;
  if (
    f8826Entries.some((entry) =>
      entry.credit_amount > 0 && entry.subject_to_passive_activity_limit
    )
  ) {
    throw new Error(
      "Form 8826 passive credit needs Form 8582-CR before Form 3800",
    );
  }
  if (
    f5884Credit && f5884Credit.credit_amount > 0 &&
    f5884Credit.subject_to_passive_activity_limit
  ) {
    throw new Error(
      "Form 5884 passive credit needs Form 8582-CR before Form 3800",
    );
  }
  if (
    f8820Credit && f8820Credit.credit_amount > 0 &&
    f8820Credit.subject_to_passive_activity_limit
  ) {
    throw new Error(
      "Form 8820 passive credit needs Form 8582-CR before Form 3800",
    );
  }
  if (f8820K1Credits.some((entry) => entry.subject_to_passive_activity_limit)) {
    throw new Error(
      "Orphan-drug K-1 passive credit needs Form 8582-CR before Form 3800",
    );
  }
  const newMarketsK1Keys = new Set<string>();
  for (const entry of f8874K1Credits) {
    const key =
      `${entry.source_type}:${entry.source_ein}:${entry.source_document_reference}:${
        entry.source_statement_reference ?? ""
      }`;
    if (newMarketsK1Keys.has(key)) {
      throw new Error("Duplicate New Markets Credit K-1 source");
    }
    newMarketsK1Keys.add(key);
  }
  const newMarketsK1Credit = f8874K1Credits.reduce(
    (sum, entry) => sum + entry.credit_amount,
    0,
  );
  const orphanDrugK1Keys = new Set<string>();
  for (const entry of f8820K1Credits) {
    const key =
      `${entry.source_type}:${entry.source_ein}:${entry.source_document_reference}`;
    if (orphanDrugK1Keys.has(key)) {
      throw new Error("Duplicate orphan-drug K-1 source");
    }
    orphanDrugK1Keys.add(key);
  }
  const orphanDrugK1Credit = f8820K1Credits.reduce(
    (sum, entry) => sum + entry.credit_amount,
    0,
  );
  const partVTrustKeys = new Set<string>();
  for (const entry of f3468TrustPartVCredits) {
    const key =
      `${entry.source_ein}:${entry.source_document_reference}:${entry.source_statement_reference}`;
    if (partVTrustKeys.has(key)) {
      throw new Error("Duplicate Form 3468 Part V trust K-1 source");
    }
    partVTrustKeys.add(key);
  }
  const partVTrustCredit = f3468TrustPartVCredits.reduce(
    (sum, entry) => sum + entry.credit_amount,
    0,
  );
  if (
    (f8936Credit && f8936Credit.credit_amount > 0 &&
      f8936Credit.subject_to_passive_activity_limit) ||
    (f8936CommercialCredit && f8936CommercialCredit.credit_amount > 0 &&
      f8936CommercialCredit.subject_to_passive_activity_limit)
  ) {
    throw new Error(
      "Form 8936 passive business credit needs Form 8582-CR before Form 3800",
    );
  }
  const sourceIds = new Set<string>();
  for (const entry of f8826Entries) {
    const id = `${entry.source_type}:${entry.source_ein ?? "self"}`;
    if (sourceIds.has(id)) {
      throw new Error(`Duplicate Form 8826 credit source ${id}`);
    }
    sourceIds.add(id);
  }
  const form8826Credit = allocateDisabledAccessLine1eCredits(
    f8826Entries.map((entry) => entry.credit_amount),
  ).reduce((sum, credit) => sum + credit, 0);
  const passiveLines = passiveSources
    ? classifyForm3800PassiveCredits(passiveSources)
    : ZERO_FORM3800_PASSIVE_ACTIVITY;
  const carryforward = reconcileForm3800NonpassiveCarryforwards(
    carryforwardVintages ?? [],
  );
  const standardCarryforward = carryforward.filter((entry) =>
    entry.form3800CreditLine !== "3" &&
    !entry.form3800CreditLine.startsWith("4")
  ).reduce((sum, entry) => sum + entry.availableAfterAdjustment, 0);
  const empowermentCarryforward = carryforward.filter((entry) =>
    entry.form3800CreditLine === "3"
  ).reduce((sum, entry) => sum + entry.availableAfterAdjustment, 0);
  const specifiedCarryforward = carryforward.filter((entry) =>
    entry.form3800CreditLine.startsWith("4")
  ).reduce((sum, entry) => sum + entry.availableAfterAdjustment, 0);
  const hasPassiveSource = passiveLines.line2 + passiveLines.line23 +
      passiveLines.line32 > 0;
  const hasSourceCredit = form8826Credit > 0 ||
    (f8835Credit?.standardCredit ?? 0) > 0 ||
    (f8835Credit?.specifiedCredit ?? 0) > 0 ||
    (f5884Credit?.credit_amount ?? 0) > 0 ||
    (f8881Credit
        ? f8881Credit.part_i_credit + f8881Credit.part_ii_credit +
          f8881Credit.part_iii_credit
        : 0) > 0 ||
    (f8844Credit?.credit_amount ?? 0) > 0 ||
    (f8908Credit?.credit_amount ?? 0) > 0 ||
    (f8941Credit?.credit_amount ?? 0) > 0 ||
    (f8994Credit?.credit_amount ?? 0) > 0 ||
    (f8864Credit?.credit_amount ?? 0) > 0 ||
    (f8882Credit?.credit_amount ?? 0) > 0 ||
    (f8911Credit?.credit_amount ?? 0) > 0 ||
    (f8820Credit?.credit_amount ?? 0) > 0 ||
    (f8874Credit?.credit_amount ?? 0) > 0 ||
    newMarketsK1Credit > 0 ||
    orphanDrugK1Credit > 0 ||
    partVTrustCredit > 0 ||
    (f8936Credit?.credit_amount ?? 0) > 0 ||
    (f8936CommercialCredit?.credit_amount ?? 0) > 0 ||
    hasPassiveSource || carryforward.length > 0;
  if (hasSourceCredit && totalGbc(items) > 0) {
    throw new Error(
      "Source-backed Form 3800 credit cannot mix with unbounded legacy f3800s credit",
    );
  }
  if (hasSourceCredit) {
    return [
      output(f1040, {
        form3800_source_credits: {
          standardCredit: form8826Credit +
            (f8820Credit?.credit_amount ?? 0) +
            (f8874Credit?.credit_amount ?? 0) +
            (f8908Credit?.credit_amount ?? 0) +
            (f8864Credit?.credit_amount ?? 0) +
            (f8882Credit?.credit_amount ?? 0) +
            (f8911Credit?.credit_amount ?? 0) +
            newMarketsK1Credit +
            orphanDrugK1Credit +
            partVTrustCredit +
            (f8936Credit?.credit_amount ?? 0) +
            (f8936CommercialCredit?.credit_amount ?? 0) +
            (f8881Credit
              ? f8881Credit.part_i_credit + f8881Credit.part_ii_credit +
                f8881Credit.part_iii_credit
              : 0) +
            (f8835Credit?.standardCredit ?? 0),
          specifiedCredit: (f8835Credit?.specifiedCredit ?? 0) +
            (f5884Credit?.credit_amount ?? 0) +
            (f8941Credit?.credit_amount ?? 0) +
            (f8994Credit?.credit_amount ?? 0),
          empowermentCredit: (f8844Credit?.credit_amount ?? 0) +
            empowermentCarryforward,
          passiveLines,
          standardCarryforward,
          specifiedCarryforward,
        },
      }),
      output(form6251, { must_file_for_gbc: true }),
      output(schedule3, { form3800_source_credit_pending: true }),
    ];
  }
  const total = totalGbc(items);
  if (total === 0) return [];
  return [output(schedule3, { line6a_general_business_credit: total })];
}

class F3800Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f3800";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule3, form6251, f1040]);

  compute(_ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    const parsed = inputSchema.parse(input);
    if (parsed.current_orphan_allocation_review) {
      if (parsed.f8820_credit) {
        throw new Error(
          "Form 3800 allocation review needs K-1-only orphan-drug sources",
        );
      }
      reconcileCurrentOrphanAllocation(
        parsed.current_orphan_allocation_review,
        parsed.f8820_k1_credit_entries ?? [],
      );
    }
    return {
      outputs: schedule3Output(
        parsed.f3800s ?? [],
        parsed.f8835_credit_entries ?? [],
        parsed.f8826_credit_entries ?? [],
        parsed.f5884_credit,
        parsed.f8881_credit,
        parsed.f8844_direct_employer_credit,
        parsed.f8908_credit,
        parsed.f8941_direct_employer_credit,
        parsed.f8994_direct_employer_credit,
        parsed.f8864_direct_producer_credit,
        parsed.f8882_direct_employer_credit,
        parsed.f8911_credit,
        parsed.f8820_credit,
        parsed.f8874_credit,
        parsed.f8874_k1_credit_entries ?? [],
        parsed.f8820_k1_credit_entries ?? [],
        parsed.f3468_trust_part_v_credit_entries ?? [],
        parsed.f8936_new_vehicle_credit,
        parsed.f8936_commercial_vehicle_credit,
        parsed.passive_source_allocations,
        parsed.carryforward_vintages,
      ),
    };
  }
}

export const f3800 = new F3800Node();
