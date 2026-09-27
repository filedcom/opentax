import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { output, TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { schedule3 } from "../../intermediate/aggregation/schedule3/index.ts";
import { form6251 } from "../../intermediate/forms/form6251/index.ts";
import { f1040 } from "../../outputs/f1040/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";
import { classifyForm8835Credits } from "./calculation.ts";

// TY2025 — Form 3800: General Business Credit.
// Source-backed Form 8826 and Form 8835 entries pass their classified source
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

const f8826CreditEntrySchema = z.object({
  source_type: z.enum(["self", "partnership", "s_corporation"]),
  source_ein: z.string().regex(/^\d{9}$/).optional(),
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
});

const appliedSourceCreditSchema = z.number().finite().nonnegative().refine(
  (amount) =>
    Number.isSafeInteger(Math.round(amount * 100)) &&
    Math.abs(amount * 100 - Math.round(amount * 100)) < 0.000001,
  { message: "Form 3800 applied source credit must have cent precision" },
);

export const inputSchema = z.object({
  f3800s: z.array(itemSchema).min(1).optional(),
  f8835_credit_entries: z.array(f8835CreditEntrySchema).min(1).optional(),
  f8826_credit_entries: z.array(f8826CreditEntrySchema).min(1).optional(),
  // Optional Part V allocation choices. Required only when a tax limit cuts
  // across multiple sources on the same Form 3800 credit line.
  form8826_applied_credits_by_source: z.array(appliedSourceCreditSchema)
    .optional(),
  form8835_applied_credits_by_facility: z.array(appliedSourceCreditSchema)
    .optional(),
}).refine(
  (input) =>
    input.f3800s !== undefined || input.f8835_credit_entries !== undefined ||
    input.f8826_credit_entries !== undefined,
  {
    message: "Form 3800 needs a credit source",
  },
);

type F3800Item = z.infer<typeof itemSchema>;
type F3800Items = F3800Item[];

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
): NodeOutput[] {
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
  const sourceIds = new Set<string>();
  for (const entry of f8826Entries) {
    const id = `${entry.source_type}:${entry.source_ein ?? "self"}`;
    if (sourceIds.has(id)) {
      throw new Error(`Duplicate Form 8826 credit source ${id}`);
    }
    sourceIds.add(id);
  }
  const form8826Credit = f8826Entries.reduce(
    (sum, entry) => sum + entry.credit_amount,
    0,
  );
  if (form8826Credit > 5_000) {
    throw new Error("Form 8826 source credits exceed the $5,000 cap");
  }
  const hasSourceCredit = form8826Credit > 0 ||
    (f8835Credit?.standardCredit ?? 0) > 0 ||
    (f8835Credit?.specifiedCredit ?? 0) > 0;
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
            (f8835Credit?.standardCredit ?? 0),
          specifiedCredit: f8835Credit?.specifiedCredit ?? 0,
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
    return {
      outputs: schedule3Output(
        parsed.f3800s ?? [],
        parsed.f8835_credit_entries ?? [],
        parsed.f8826_credit_entries ?? [],
      ),
    };
  }
}

export const f3800 = new F3800Node();
