import { z } from "zod";
import type { NodeContext } from "../../../../../core/types/node-context.ts";
import type { NodeResult } from "../../../../../core/types/tax-node.ts";
import { output, TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { f3800 } from "../f3800/index.ts";
import { form6251 } from "../../intermediate/forms/form6251/index.ts";

// December 2025 Form 8864. Only the section 40A small agri-biodiesel
// producer credit survives for qualified 2025 sale or use.
const reference = z.string().trim().min(1);
const gallons = z.number().int().positive().finite().refine(
  Number.isSafeInteger,
);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value;
});

const lotSchema = z.object({
  production_batch_reference: reference,
  production_date: date,
  sale_invoice_reference: reference,
  // The checked-in TY2025 MeF rule F8864-012 forbids line 7 data.
  sale_date: date.refine((value) =>
    value >= "2025-07-01" && value < "2026-01-01"
  ),
  gallons_sold: gallons,
  produced_by_taxpayer_confirmed: z.literal(true),
  agri_biodiesel_derived_solely_from_virgin_oils_or_animal_fats_confirmed: z
    .literal(true),
  feedstock_origin: z.enum(["US", "MX", "CA"]),
  buyer_name: reference,
  buyer_qualified_fuel_use_reference: reference,
  buyer_qualified_fuel_use: z.enum([
    "qualified_biodiesel_mixture_in_business",
    "fuel_in_trade_or_business",
    "retail_sale_placed_in_vehicle_tank",
  ]),
  no_renewable_diesel_or_saf_included_confirmed: z.literal(true),
}).strict().superRefine((lot, ctx) => {
  if (lot.production_date > lot.sale_date) {
    ctx.addIssue({
      code: "custom",
      path: ["sale_date"],
      message: "Qualified sale must follow the identified production batch",
    });
  }
});

export const inputSchema = z.object({
  source_type: z.literal("direct_schedule_c_small_agri_biodiesel_producer"),
  schedule_c_business_reference: reference,
  proprietor_ssn: z.string().regex(/^\d{9}$/),
  producer_ein: z.string().regex(/^\d{9}$/),
  form637_registration_number: reference,
  form637_registration_record_reference: reference,
  facility_capacity_record_reference: reference,
  annual_productive_capacity_gallons: z.number().int().positive().finite()
    .max(60_000_000).refine(Number.isSafeInteger),
  no_controlled_group_or_common_control_confirmed: z.literal(true),
  no_pass_through_credit_confirmed: z.literal(true),
  no_transfer_election_confirmed: z.literal(true),
  no_prior_credited_fuel_recapture_event_confirmed: z.literal(true),
  lots: z.array(lotSchema).min(1),
}).strict().superRefine((source, ctx) => {
  const batchInvoices = new Set<string>();
  let totalGallons = 0;
  for (const lot of source.lots) {
    if (batchInvoices.has(lot.sale_invoice_reference)) {
      ctx.addIssue({
        code: "custom",
        path: ["lots"],
        message: "Each sale invoice must appear once",
      });
    }
    batchInvoices.add(lot.sale_invoice_reference);
    totalGallons += lot.gallons_sold;
  }
  if (
    totalGallons > 15_000_000 ||
    totalGallons > source.annual_productive_capacity_gallons
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["lots"],
      message:
        "Qualified production exceeds the 15-million-gallon or facility capacity limit",
    });
  }
});

export type F8864Input = z.infer<typeof inputSchema>;

export function calculateForm8864(raw: F8864Input) {
  const source = inputSchema.parse(raw);
  const line7Gallons = source.lots.filter((lot) => lot.sale_date < "2025-07-01")
    .reduce((sum, lot) => sum + lot.gallons_sold, 0);
  const line8Gallons = source.lots.filter((lot) =>
    lot.sale_date >= "2025-07-01"
  ).reduce((sum, lot) => sum + lot.gallons_sold, 0);
  const line7 = Math.round(line7Gallons * 0.10);
  const line8 = Math.round(line8Gallons * 0.20);
  const line9 = line7 + line8;
  return {
    line7_gallons: line7Gallons,
    line7_rate: 0.10,
    line7,
    line8_gallons: line8Gallons,
    line8_rate: 0.20,
    line8,
    line9,
    line10: 0,
    line11: line9,
  };
}

/** Prepared direct claims for one post-June direct Schedule C producer. */
export function form8864DirectClaims(raw: F8864Input) {
  const source = inputSchema.parse(raw);
  const lines = calculateForm8864(source);
  if (lines.line11 <= 0) {
    throw new Error("Form 8864 direct producer needs a positive credit");
  }
  return {
    form3800: {
      f8864_direct_producer_credit: {
        credit_amount: lines.line11,
        schedule_c_business_reference: source.schedule_c_business_reference,
        form637_registration_number: source.form637_registration_number,
        subject_to_passive_activity_limit: false as const,
      },
    },
    form6251: { line3_form8864_income_exclusion: -lines.line9 },
  };
}

class F8864Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f8864";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([f3800, form6251]);

  compute(_ctx: NodeContext, rawInput: F8864Input): NodeResult {
    const claims = form8864DirectClaims(rawInput);
    return {
      outputs: [
        output(f3800, claims.form3800),
        output(form6251, claims.form6251),
      ],
    };
  }
}

export const f8864 = new F8864Node();
