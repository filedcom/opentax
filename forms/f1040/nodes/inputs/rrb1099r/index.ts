import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { TaxNode, output, type AtLeastOne } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { f1040 } from "../../outputs/f1040/index.ts";
import { schedule1 } from "../../outputs/schedule1/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// RRB-1099-R — Railroad Retirement Board Pension, Annuity, and Retirement Benefits
//
// The RRB-1099-R has two components that are treated differently on Form 1040:
//   Tier 1 (NSSEB/SSEB): Social Security Equivalent Benefit — taxed like SS benefits
//   Tier 2 + any non-SS portion: treated as regular pension (lines 5a/5b)
//
// IRS Pub. 575 (2025), "Railroad Retirement Benefits" section
// IRS Pub. 915 (2025), "Tier 1 Railroad Retirement Benefits" section

// Simplified Method table for pension recovery — same as 1099-R
// IRC §72(d)(1); Pub. 575 Simplified Method Worksheet
function simplifiedMethodMonths(age: number): number {
  if (age <= 55) return 360;
  if (age <= 60) return 310;
  if (age <= 65) return 260;
  if (age <= 70) return 210;
  return 160;
}

// Per-item schema — one RRB-1099-R
export const itemSchema = z.object({
  // Payer identification
  payer_name: z.string().min(1),

  // Box 3 — Gross social security equivalent benefit (SSEB/Tier 1 SS portion)
  // This flows to Form 1040 line 6a (SS benefits) — taxed via SS Worksheet
  box3_sseb_gross: z.number().nonnegative().optional(),

  // Box 4 — Total SSEB/Tier 1 SS portion repaid in 2025
  box4_sseb_repaid: z.number().nonnegative().optional(),

  // Box 5 — Net SSEB amount (box3 - box4); precomputed by RRB
  // If provided use this; otherwise compute from box3 - box4
  box5_sseb_net: z.number().nonnegative().optional(),

  // Box 7 — Federal income tax withheld (from SSEB/Tier 1)
  box7_sseb_withheld: z.number().nonnegative().optional(),

  // Box 8 — Gross Tier 2 + non-SS portion (pension/annuity)
  // Flows to Form 1040 line 5a (pension gross)
  box8_tier2_gross: z.number().nonnegative().optional(),

  // Box 9 — Taxable Tier 2 amount
  // If not provided, use box8_tier2_gross (fully taxable by default)
  box9_tier2_taxable: z.number().nonnegative().optional(),

  // Box 10 — Federal income tax withheld (from Tier 2 / pension portion)
  box10_tier2_withheld: z.number().nonnegative().optional(),

  // Box 2a — Taxable amount of pension if Simplified Method is used
  // Used in place of box9_tier2_taxable when simplified_method_flag = true
  box2a_taxable_amount: z.number().nonnegative().optional(),

  // Box 5b — Employee contributions / cost in contract (Tier 2)
  box5b_employee_contributions: z.number().nonnegative().optional(),

  // Simplified Method fields for Tier 2 cost recovery
  simplified_method_flag: z.boolean().optional(),
  age_at_annuity_start: z.number().nonnegative().optional(),
  prior_excludable_recovered: z.number().nonnegative().optional(),
});

// Node inputSchema
export const inputSchema = z.object({
  rrb1099rs: z.array(itemSchema).min(1),
});

type RRBItem = z.infer<typeof itemSchema>;
type RRBItems = RRBItem[];

// Net SSEB (SS-equivalent) for a single item
function netSseb(item: RRBItem): number {
  if (item.box5_sseb_net !== undefined) return item.box5_sseb_net;
  const gross = item.box3_sseb_gross ?? 0;
  const repaid = item.box4_sseb_repaid ?? 0;
  return Math.max(0, gross - repaid);
}

// Simplified Method exclusion for Tier 2 (mirrors 1099-R logic)
function simplifiedMethodExclusion(item: RRBItem): number {
  if (!item.simplified_method_flag) return 0;
  const cost = item.box5b_employee_contributions ?? 0;
  if (cost <= 0) return 0;
  const priorRecovered = item.prior_excludable_recovered ?? 0;
  const remaining = cost - priorRecovered;
  if (remaining <= 0) return 0;
  const age = item.age_at_annuity_start ?? 0;
  const months = simplifiedMethodMonths(age);
  const annualExclusion = (remaining / months) * 12;
  const gross = item.box8_tier2_gross ?? 0;
  return Math.min(annualExclusion, gross);
}

// Effective taxable Tier 2 amount
function effectiveTier2Taxable(item: RRBItem): number {
  if (item.box2a_taxable_amount !== undefined) return item.box2a_taxable_amount;
  const gross = item.box8_tier2_gross ?? 0;
  if (item.simplified_method_flag) {
    const exclusion = simplifiedMethodExclusion(item);
    return Math.max(0, gross - exclusion);
  }
  return item.box9_tier2_taxable ?? gross;
}

// f1040 fields for SSEB (SS equivalent — line 6a)
function ssebF1040Fields(items: RRBItems): Record<string, number> {
  const totalNet = items.reduce((sum, item) => sum + netSseb(item), 0);
  if (totalNet <= 0) return {};
  return { line6a_ss_gross: totalNet };
}

// f1040 fields for Tier 2 pension (lines 5a/5b)
function tier2F1040Fields(items: RRBItems): Record<string, number> {
  const itemsWithTier2 = items.filter((item) => (item.box8_tier2_gross ?? 0) > 0);
  if (itemsWithTier2.length === 0) return {};
  const gross = itemsWithTier2.reduce((sum, item) => sum + (item.box8_tier2_gross ?? 0), 0);
  const taxable = itemsWithTier2.reduce((sum, item) => sum + effectiveTier2Taxable(item), 0);
  const fields: Record<string, number> = {};
  if (gross > 0) fields.line5a_pension_gross = gross;
  if (itemsWithTier2.length > 0) fields.line5b_pension_taxable = taxable;
  return fields;
}

// f1040 withholding (line 25b): sum of box7 + box10 withholding
function withholdingF1040Fields(items: RRBItems): Record<string, number> {
  const total = items.reduce(
    (sum, item) => sum + (item.box7_sseb_withheld ?? 0) + (item.box10_tier2_withheld ?? 0),
    0,
  );
  if (total <= 0) return {};
  return { line25b_withheld_1099: total };
}

class Rrb1099rNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "rrb1099r";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([f1040, schedule1]);

  compute(_ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    const { rrb1099rs } = inputSchema.parse(input);

    const f1040Fields: Partial<z.infer<typeof f1040["inputSchema"]>> = {
      ...ssebF1040Fields(rrb1099rs),
      ...tier2F1040Fields(rrb1099rs),
      ...withholdingF1040Fields(rrb1099rs),
    };

    const outputs: NodeOutput[] = [];
    if (Object.keys(f1040Fields).length > 0) {
      outputs.push(
        this.outputNodes.output(
          f1040,
          f1040Fields as AtLeastOne<z.infer<typeof f1040["inputSchema"]>>,
        ),
      );
    }

    return { outputs };
  }
}

export const rrb1099r = new Rrb1099rNode();
