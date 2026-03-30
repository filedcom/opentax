import { z } from "zod";
import type { NodeOutput, NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode, output, type AtLeastOne } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { f1040 } from "../../outputs/f1040/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// RRB-1099-R — Railroad Retirement Board Pension, Annuity, and Retirement Benefits
//
// Two distinct income streams:
//   SSEB/Tier 1 SS-equivalent  → Form 1040 line 6a (taxed like Social Security)
//   Non-SSEB/Tier 2 pension    → Form 1040 lines 5a/5b (taxed like pension/annuity)
//
// Sources:
//   IRS Pub. 575 (2025), "Railroad Retirement Benefits" section
//   IRS Pub. 915 (2025), "Tier 1 Railroad Retirement Benefits" section
//   IRC §72(d)(1) — Simplified Method cost recovery

// Simplified Method Table 1 — single-life annuity (Pub. 575 Table 1; IRC §72(d)(1)(B)(iv))
// Unchanged for TY2025 (statutory, not inflation-adjusted)
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

  // Box 3 — Gross SSEB/Tier 1 SS-equivalent benefit paid in 2025
  // Pub. 575 p.20; Pub. 915 p.3
  box3_sseb_gross: z.number().nonnegative().optional(),

  // Box 4 — SSEB/Tier 1 SS benefit repaid to RRB in 2025
  // Pub. 575 p.20
  box4_sseb_repaid: z.number().nonnegative().optional(),

  // Box 5 — Net SSEB (precomputed by RRB as Box 3 minus Box 4)
  // When provided, use directly; overrides computed box3 - box4
  // Pub. 575 p.20; Form 1040 instructions line 6a
  box5_sseb_net: z.number().nonnegative().optional(),

  // Box 6 — Medicare Part B premiums deducted (informational; not used in federal income)
  // RRB-1099-R instructions Box 6
  box6_medicare_premiums: z.number().nonnegative().optional(),

  // Box 7 — Federal income tax withheld from SSEB/Tier 1 payments
  // Pub. 575 p.21; Form 1040 instructions line 25b
  box7_sseb_withheld: z.number().nonnegative().optional(),

  // Box 8 — Gross non-SSEB (Tier 2 + non-SS Tier 1) pension/annuity amount
  // Pub. 575 p.22; Form 1040 instructions line 5a
  box8_tier2_gross: z.number().nonnegative().optional(),

  // Box 9 — Taxable non-SSEB amount (used when Simplified Method not applicable)
  // Pub. 575 p.22; Form 1040 instructions line 5b
  box9_tier2_taxable: z.number().nonnegative().optional(),

  // Box 10 — Federal income tax withheld from non-SSEB (Tier 2) portion
  // Pub. 575 p.22; Form 1040 instructions line 25b
  box10_tier2_withheld: z.number().nonnegative().optional(),

  // Box 2a — Simplified Method taxable amount (highest priority; overrides box9 and SM calc)
  // Pub. 575, Simplified Method Worksheet
  box2a_taxable_amount: z.number().nonnegative().optional(),

  // Box 5b — Employee contributions / cost in contract for SM Tier 2 cost recovery
  // Pub. 575 p.22; IRC §72(d)(1)
  box5b_employee_contributions: z.number().nonnegative().optional(),

  // Simplified Method fields for Tier 2 cost recovery (IRC §72(d)(1))
  simplified_method_flag: z.boolean().optional(),
  age_at_annuity_start: z.number().nonnegative().optional(),
  prior_excludable_recovered: z.number().nonnegative().optional(),
});

// Node inputSchema — array of RRB-1099-R items for this return
export const inputSchema = z.object({
  rrb1099rs: z.array(itemSchema).min(1),
});

type RRBItem = z.infer<typeof itemSchema>;
type RRBItems = RRBItem[];

// Net SSEB (SS-equivalent) for a single item
// Pub. 575 p.20: use box5 when provided; else max(0, box3 - box4)
function netSseb(item: RRBItem): number {
  if (item.box5_sseb_net !== undefined) return item.box5_sseb_net;
  const gross = item.box3_sseb_gross ?? 0;
  const repaid = item.box4_sseb_repaid ?? 0;
  return Math.max(0, gross - repaid);
}

// Annual excludable amount using Simplified Method Worksheet (Pub. 575; IRC §72(d)(1))
// Returns the excludable (tax-free) portion for the year, capped at gross
function simplifiedMethodExclusion(item: RRBItem): number {
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

// Effective taxable Tier 2 amount for a single item
// Priority: box2a_taxable_amount > SM calc > box9_tier2_taxable > box8_tier2_gross
function effectiveTier2Taxable(item: RRBItem): number {
  if (item.box2a_taxable_amount !== undefined) return item.box2a_taxable_amount;
  const gross = item.box8_tier2_gross ?? 0;
  if (item.simplified_method_flag === true) {
    const exclusion = simplifiedMethodExclusion(item);
    return Math.max(0, gross - exclusion);
  }
  return item.box9_tier2_taxable ?? gross;
}

// f1040 fields for SSEB → line 6a
// Only emitted when total net SSEB > 0
function ssebF1040Fields(items: RRBItems): Record<string, number> {
  const total = items.reduce((sum, item) => sum + netSseb(item), 0);
  if (total <= 0) return {};
  return { line6a_ss_gross: total };
}

// f1040 fields for Tier 2 pension → lines 5a / 5b
// line5a emitted only when gross > 0; line5b emitted whenever there are Tier 2 items
function tier2F1040Fields(items: RRBItems): Record<string, number> {
  const tier2Items = items.filter((item) => (item.box8_tier2_gross ?? 0) > 0);
  if (tier2Items.length === 0) return {};
  const gross = tier2Items.reduce((sum, item) => sum + (item.box8_tier2_gross ?? 0), 0);
  const taxable = tier2Items.reduce((sum, item) => sum + effectiveTier2Taxable(item), 0);
  const fields: Record<string, number> = {};
  if (gross > 0) fields.line5a_pension_gross = gross;
  fields.line5b_pension_taxable = taxable;
  return fields;
}

// f1040 withholding → line 25b: sum of box7 + box10 across all items
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
  readonly outputNodes = new OutputNodes([f1040]);

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
        output(f1040, f1040Fields as AtLeastOne<z.infer<typeof f1040["inputSchema"]>>),
      );
    }

    return { outputs };
  }
}

export const rrb1099r = new Rrb1099rNode();
