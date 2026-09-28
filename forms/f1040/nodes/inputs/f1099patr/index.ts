import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { output, TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { f1040 } from "../../outputs/f1040/index.ts";
import { schedule_f } from "../../intermediate/forms/schedule_f/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// Per-entry schema — one 1099-PATR from one cooperative
export const itemSchema = z.object({
  box1_patronage_dividends: z.number().nonnegative().optional(),
  box2_nonpatronage_distributions: z.number().nonnegative().optional(),
  box3_per_unit_retain: z.number().nonnegative().optional(),
  box4_federal_withheld: z.number().nonnegative().optional(),
  box5_redeemed_nonqualified: z.number().nonnegative().optional(),
  // Box 6 — specified cooperative's section 199A(g) deduction passed to patron.
  box6_section199ag_deduction: z.number().nonnegative().optional(),
  // Box 7 — Qualified payments (affects §199A QBI calculation)
  // Informational for Form 8995/8995-A; tracked here but no direct output
  box7_qualified_payments: z.number().nonnegative().optional(),
  // Boxes 8 and 9 — informational section 199A(a) non-SSTB/SSTB items.
  box8_section199aa_qualified_items: z.number().optional(),
  box9_section199aa_sstb_items: z.number().optional(),
  // Box 13 — payer is a specified agricultural or horticultural cooperative.
  box13_specified_cooperative: z.boolean().optional(),
  payer_name: z.string().optional(),
  payer_tin: z.string().optional(),
  account_number: z.string().optional(),
  // Retained for the specified-cooperative QBI source cross-check.
  trade_or_business: z.boolean().optional(),
  distribution_treatment: z.discriminatedUnion("kind", [
    z.object({
      kind: z.literal("farm"),
      farm_id: z.string().min(1),
      verified_taxable_amount: z.number().nonnegative(),
    }).strict(),
    z.object({
      kind: z.literal("personal_basis_adjustment"),
      purchase_reference: z.string().min(1),
      verified_basis_reduction: z.number().nonnegative(),
    }).strict(),
  ]).optional(),
}).superRefine((item, ctx) => {
  const gross = distributionTotal(item);
  const treatment = item.distribution_treatment;
  if (gross > 0 && !treatment) {
    ctx.addIssue({
      code: "custom",
      message:
        "1099-PATR distributions require a verified farm or personal-purchase treatment",
    });
  }
  if (treatment?.kind === "farm") {
    if (
      item.trade_or_business === false ||
      treatment.verified_taxable_amount > gross
    ) {
      ctx.addIssue({
        code: "custom",
        message:
          "1099-PATR farm taxable amount must not exceed gross distributions or contradict business classification",
      });
    }
  }
  if (treatment?.kind === "personal_basis_adjustment") {
    if (
      item.trade_or_business === true ||
      (item.box2_nonpatronage_distributions ?? 0) > 0 ||
      (item.box3_per_unit_retain ?? 0) > 0 ||
      (item.box5_redeemed_nonqualified ?? 0) > 0 ||
      treatment.verified_basis_reduction !== gross
    ) {
      ctx.addIssue({
        code: "custom",
        message:
          "1099-PATR personal treatment requires box 1 only and a matching verified basis reduction",
      });
    }
  }
});

export const inputSchema = z.object({
  f1099patrs: z.array(itemSchema).min(1),
});

type PATRItem = z.infer<typeof itemSchema>;
type PATRItems = PATRItem[];

function distributionTotal(item: {
  box1_patronage_dividends?: number;
  box2_nonpatronage_distributions?: number;
  box3_per_unit_retain?: number;
  box5_redeemed_nonqualified?: number;
}): number {
  return (item.box1_patronage_dividends ?? 0) +
    (item.box2_nonpatronage_distributions ?? 0) +
    (item.box3_per_unit_retain ?? 0) +
    (item.box5_redeemed_nonqualified ?? 0);
}

function totalFederalWithheld(items: PATRItems): number {
  return items.reduce(
    (sum, item) => sum + (item.box4_federal_withheld ?? 0),
    0,
  );
}

function farmOutputs(items: PATRItems): NodeOutput[] {
  const farmSources = items.flatMap((item) => {
    const treatment = item.distribution_treatment;
    if (treatment?.kind !== "farm" || distributionTotal(item) === 0) return [];
    return [{
      farm_id: treatment.farm_id,
      kind: "1099patr_cooperative" as const,
      amount: distributionTotal(item),
      taxable_amount: treatment.verified_taxable_amount,
    }];
  });
  return farmSources.length > 0
    ? [output(schedule_f, { farm_sources: farmSources })]
    : [];
}

function f1040Output(items: PATRItems): NodeOutput[] {
  const withheld = totalFederalWithheld(items);
  if (withheld === 0) return [];
  return [output(f1040, { line25b_withheld_1099: withheld })];
}

class F1099PATRNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f1099patr";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule_f, f1040]);

  compute(_ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    const parsed = inputSchema.parse(input);
    const { f1099patrs } = parsed;

    const outputs: NodeOutput[] = [
      ...farmOutputs(f1099patrs),
      ...f1040Output(f1099patrs),
    ];

    // Preserve specified-cooperative source for the Form 8995-A/Schedule D
    // filing cross-check. This does not create a second tax or MeF document.
    if (
      f1099patrs.some((item) =>
        (item.trade_or_business === true ||
          item.distribution_treatment?.kind === "farm") &&
        item.box13_specified_cooperative === true &&
        (item.box7_qualified_payments ?? 0) > 0
      )
    ) {
      outputs.push({ nodeType: this.nodeType, fields: parsed });
    }

    return { outputs };
  }
}

export const f1099patr = new F1099PATRNode();
