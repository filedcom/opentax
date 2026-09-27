import { z } from "zod";
import type { NodeContext } from "../../../../core/types/node-context.ts";
import { OutputNodes } from "../../../../core/types/output-nodes.ts";
import { TaxNode } from "../../../../core/types/tax-node.ts";
import {
  form8949,
  Form8949Part,
} from "../../nodes/intermediate/forms/form8949/index.ts";
import { f1040_2026_node } from "./f1040.ts";
import { brokerTransaction } from "./broker_transaction.ts";

const money = z.number().finite().nonnegative();

/** Actual TY2026 Form 1099-B boxes; box 12 reports basis, not QOF activity. */
export const f1099bItem2026Schema = z.object({
  payer_name: z.string().trim().min(1),
  box1a_description: z.string().trim().min(1),
  box1b_date_acquired: z.string().trim().min(1),
  box1c_date_sold: z.string().trim().min(1),
  box1d_proceeds: money,
  box1e_reported_basis: money.optional(),
  taxpayer_cost_basis: money.optional(),
  box1f_accrued_market_discount: money.optional(),
  box1g_wash_sale_loss_disallowed: money.optional(),
  box2_term: z.enum(["short", "long", "ordinary", "unknown"]),
  box3_collectibles: z.boolean().optional(),
  box3_qof_disposition: z.boolean().optional(),
  box4_federal_withholding: money.optional(),
  box5_noncovered_security: z.boolean().optional(),
  box6_proceeds_type: z.enum(["gross", "net"]).optional(),
  box7_loss_not_allowed: z.boolean().optional(),
  box12_basis_reported_to_irs: z.boolean(),
  box13_bartering: money.optional(),
  box16_state_withholding: money.optional(),
  selling_expenses_not_in_box1d: money.optional(),
}).strict().superRefine((item, ctx) => {
  const reject = (message: string) =>
    ctx.addIssue({ code: z.ZodIssueCode.custom, message });
  if (item.box2_term === "ordinary" || item.box2_term === "unknown") {
    reject("TY2026 1099-B needs a resolved short- or long-term capital route");
  }
  if (
    item.box1e_reported_basis === undefined &&
    item.taxpayer_cost_basis === undefined
  ) {
    reject("TY2026 1099-B needs tax basis");
  }
  if (
    item.box12_basis_reported_to_irs &&
    item.box1e_reported_basis === undefined
  ) {
    reject("TY2026 1099-B reported basis checkbox needs box 1e");
  }
  if (item.box3_collectibles || item.box3_qof_disposition) {
    reject("TY2026 1099-B box 3 needs collectibles or QOF routes");
  }
  if ((item.box1f_accrued_market_discount ?? 0) > 0) {
    reject("TY2026 1099-B accrued market discount needs its worksheet route");
  }
  if (item.box7_loss_not_allowed) {
    reject("TY2026 1099-B disallowed loss needs adjustment code L route");
  }
  if ((item.box13_bartering ?? 0) > 0) {
    reject("TY2026 1099-B barter income needs its source route");
  }
  if ((item.box16_state_withholding ?? 0) > 0) {
    reject("TY2026 1099-B state withholding needs Schedule A route");
  }
});

export const f1099bInput2026Schema = z.object({
  f1099bs: z.array(f1099bItem2026Schema).min(1),
}).strict();

type Item = z.infer<typeof f1099bItem2026Schema>;

function transaction(item: Item) {
  const isLongTerm = item.box2_term === "long";
  const part = item.box12_basis_reported_to_irs
    ? (isLongTerm ? Form8949Part.D : Form8949Part.A)
    : (isLongTerm ? Form8949Part.E : Form8949Part.B);
  return brokerTransaction({
    part,
    description: item.box1a_description,
    dateAcquired: item.box1b_date_acquired,
    dateSold: item.box1c_date_sold,
    proceeds: item.box1d_proceeds,
    reportedBasis: item.box1e_reported_basis,
    taxpayerBasis: item.taxpayer_cost_basis,
    basisReportedToIrs: item.box12_basis_reported_to_irs,
    sellingExpenses: item.selling_expenses_not_in_box1d ?? 0,
    washSaleLossDisallowed: item.box1g_wash_sale_loss_disallowed ?? 0,
  });
}

class F1099BNode2026 extends TaxNode<typeof f1099bInput2026Schema> {
  readonly nodeType = "f1099b";
  readonly inputSchema = f1099bInput2026Schema;
  readonly outputNodes = new OutputNodes([form8949, f1040_2026_node]);

  compute(ctx: NodeContext, rawInput: z.input<typeof f1099bInput2026Schema>) {
    if (ctx.taxYear !== 2026 || ctx.formType !== "f1040") {
      throw new Error("TY2026 1099-B requires f1040:2026 context");
    }
    const { f1099bs } = this.inputSchema.parse(rawInput);
    return {
      outputs: f1099bs.flatMap((item) => [
        this.outputNodes.output(form8949, { transaction: transaction(item) }),
        ...(item.box4_federal_withholding
          ? [this.outputNodes.output(f1040_2026_node, {
            line25b_withheld_1099: item.box4_federal_withholding,
          })]
          : []),
      ]),
    };
  }
}

export const f1099b_2026 = new F1099BNode2026();
