import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import {
  type AtLeastOne,
  output,
  TaxNode,
} from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { f1040 } from "../../outputs/f1040/index.ts";
import { agi_aggregator } from "../../intermediate/aggregation/agi_aggregator/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// Form RRB-1099-R reports pension components. SSEB boxes 3–5 belong to the
// separate Form RRB-1099, represented by ssa1099 rows with is_rrb: true.
export const itemSchema = z.object({
  payer_name: z.string().trim().min(1),
  recipient_tin: z.string().regex(/^\d{9}$/).optional(),
  box3_employee_contributions: z.number().nonnegative().optional(),
  box4_contributory_amount_paid: z.number().nonnegative().optional(),
  box5_vested_dual_benefit: z.number().nonnegative().optional(),
  box6_supplemental_annuity: z.number().nonnegative().optional(),
  box7_total_gross_paid: z.number().nonnegative().optional(),
  box8_prior_year_repayments: z.number().nonnegative().optional(),
  box9_federal_withheld: z.number().nonnegative().optional(),
  box10_medicare_premiums: z.number().nonnegative().optional(),
}).strict().superRefine((item, ctx) => {
  if (
    ((item.box7_total_gross_paid ?? 0) > 0 ||
      (item.box9_federal_withheld ?? 0) > 0) &&
    !item.recipient_tin
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["recipient_tin"],
      message: "RRB-1099-R pension or withholding needs box 2 recipient TIN",
    });
  }
  const components = (item.box4_contributory_amount_paid ?? 0) +
    (item.box5_vested_dual_benefit ?? 0) +
    (item.box6_supplemental_annuity ?? 0);
  if (
    Math.round((item.box7_total_gross_paid ?? 0) * 100) !==
      Math.round(components * 100)
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["box7_total_gross_paid"],
      message: "RRB-1099-R box 7 must equal boxes 4, 5, and 6",
    });
  }
  if (
    (item.box3_employee_contributions ?? 0) > 0 &&
    (item.box4_contributory_amount_paid ?? 0) > 0
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["box3_employee_contributions"],
      message:
        "RRB-1099-R contributory pension needs reviewed cost recovery before filing",
    });
  }
  if ((item.box8_prior_year_repayments ?? 0) > 0) {
    ctx.addIssue({
      code: "custom",
      path: ["box8_prior_year_repayments"],
      message:
        "RRB-1099-R prior-year repayments need deduction or credit review before filing",
    });
  }
});

export const inputSchema = z.object({
  rrb1099rs: z.array(itemSchema).min(1),
});

type RRBItems = z.infer<typeof inputSchema>["rrb1099rs"];

class Rrb1099rNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "rrb1099r";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([f1040, agi_aggregator]);

  compute(_ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    const items: RRBItems = inputSchema.parse(input).rrb1099rs;
    const gross = items.reduce(
      (sum, item) => sum + (item.box7_total_gross_paid ?? 0),
      0,
    );
    // Box 3 is blank or zero for this bounded fully taxable pension route.
    // Vested dual benefits and supplemental annuities are fully taxable.
    const taxable = gross;
    const withheld = items.reduce(
      (sum, item) => sum + (item.box9_federal_withheld ?? 0),
      0,
    );
    const fields: {
      line5a_pension_gross?: number;
      line5b_pension_taxable?: number;
      line25b_withheld_1099?: number;
    } = {};
    if (gross > 0) {
      fields.line5a_pension_gross = gross;
      fields.line5b_pension_taxable = taxable;
    }
    if (withheld > 0) fields.line25b_withheld_1099 = withheld;
    const outputs: NodeOutput[] = [];
    if (Object.keys(fields).length > 0) {
      outputs.push(output(
        f1040,
        fields as AtLeastOne<z.infer<typeof f1040["inputSchema"]>>,
      ));
    }
    if (taxable > 0) {
      outputs.push(output(agi_aggregator, {
        line5b_pension_taxable: taxable,
      }));
    }
    return { outputs };
  }
}

export const rrb1099r = new Rrb1099rNode();
