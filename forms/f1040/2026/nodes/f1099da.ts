import { z } from "zod";
import type { NodeContext } from "../../../../core/types/node-context.ts";
import { OutputNodes } from "../../../../core/types/output-nodes.ts";
import { TaxNode } from "../../../../core/types/tax-node.ts";
import {
  form8949,
  Form8949Part,
} from "../../nodes/intermediate/forms/form8949/index.ts";
import { brokerTransaction } from "./broker_transaction.ts";
import { f1040_2026_node } from "./f1040.ts";

const money = z.number().finite().nonnegative();

/** TY2026 Form 1099-DA individual-disposition input. */
export const f1099daItem2026Schema = z.object({
  filer_name: z.string().trim().min(1),
  box1a_digital_asset_code: z.string().trim().optional(),
  box1b_digital_asset_name: z.string().trim().min(1),
  box1c_units: z.number().finite().positive().optional(),
  box1d_date_acquired: z.string().trim().min(1).optional(),
  taxpayer_date_acquired: z.string().trim().min(1).optional(),
  box1e_date_sold: z.string().trim().min(1),
  box1f_proceeds: money,
  box1g_reported_basis: money.optional(),
  taxpayer_cost_basis: money.optional(),
  box1h_accrued_market_discount: money.optional(),
  box1i_wash_sale_loss_disallowed: money.optional(),
  box2_basis_reported_to_irs: z.boolean(),
  box3a_proceeds_type: z.enum(["gross", "net"]).optional(),
  box3b_qof_disposition: z.boolean().optional(),
  box4_federal_withholding: money.optional(),
  box5_loss_not_allowed: z.boolean().optional(),
  box6_term: z.enum(["short", "long", "ordinary", "unknown"]),
  box7_only_cash: z.boolean().optional(),
  box8_customer_provided_acquisition: z.boolean().optional(),
  box9_noncovered_security: z.boolean().optional(),
  box11a_aggregate_method: z.enum(["stablecoins", "nfts"]).optional(),
  box11b_transaction_count: z.number().int().positive().optional(),
  box11c_aggregate_proceeds: money.optional(),
  box12a_units_transferred_in: z.number().finite().positive().optional(),
  box12b_transfer_in_date: z.string().trim().min(1).optional(),
  box16_state_withholding: money.optional(),
  transaction_costs_not_in_box1f: money.optional(),
}).strict().superRefine((item, ctx) => {
  const reject = (message: string) =>
    ctx.addIssue({ code: z.ZodIssueCode.custom, message });
  if (item.box6_term === "ordinary" || item.box6_term === "unknown") {
    reject("TY2026 1099-DA needs a resolved short- or long-term capital route");
  }
  if (!item.box1d_date_acquired && !item.taxpayer_date_acquired) {
    reject("TY2026 1099-DA needs an acquisition date");
  }
  if (
    item.box1g_reported_basis === undefined &&
    item.taxpayer_cost_basis === undefined
  ) {
    reject("TY2026 1099-DA needs tax basis");
  }
  if (
    item.box2_basis_reported_to_irs &&
    item.box1g_reported_basis === undefined
  ) {
    reject("TY2026 1099-DA reported basis checkbox needs box 1g");
  }
  if (item.box3b_qof_disposition) {
    reject("TY2026 1099-DA QOF disposition needs Form 8997 route");
  }
  if ((item.box1h_accrued_market_discount ?? 0) > 0) {
    reject("TY2026 1099-DA accrued market discount needs worksheet route");
  }
  if (item.box5_loss_not_allowed) {
    reject("TY2026 1099-DA disallowed loss needs adjustment code L route");
  }
  if (
    item.box11a_aggregate_method || item.box11b_transaction_count ||
    (item.box11c_aggregate_proceeds ?? 0) > 0
  ) {
    reject("TY2026 1099-DA aggregate reporting needs its transaction route");
  }
  if ((item.box16_state_withholding ?? 0) > 0) {
    reject("TY2026 1099-DA state withholding needs Schedule A route");
  }
});

export const f1099daInput2026Schema = z.object({
  f1099das: z.array(f1099daItem2026Schema).min(1),
}).strict();

type Item = z.infer<typeof f1099daItem2026Schema>;

function transaction(item: Item) {
  const isLongTerm = item.box6_term === "long";
  const part = item.box2_basis_reported_to_irs
    ? (isLongTerm ? Form8949Part.J : Form8949Part.G)
    : (isLongTerm ? Form8949Part.K : Form8949Part.H);
  const description = item.box1c_units === undefined
    ? item.box1b_digital_asset_name
    : `${item.box1c_units} ${item.box1b_digital_asset_name}`;
  return brokerTransaction({
    part,
    description,
    dateAcquired: item.taxpayer_date_acquired ?? item.box1d_date_acquired!,
    dateSold: item.box1e_date_sold,
    proceeds: item.box1f_proceeds,
    reportedBasis: item.box1g_reported_basis,
    taxpayerBasis: item.taxpayer_cost_basis,
    basisReportedToIrs: item.box2_basis_reported_to_irs,
    sellingExpenses: item.transaction_costs_not_in_box1f ?? 0,
    washSaleLossDisallowed: item.box1i_wash_sale_loss_disallowed ?? 0,
  });
}

class F1099DANode2026 extends TaxNode<typeof f1099daInput2026Schema> {
  readonly nodeType = "f1099da";
  readonly inputSchema = f1099daInput2026Schema;
  readonly outputNodes = new OutputNodes([form8949, f1040_2026_node]);

  compute(ctx: NodeContext, rawInput: z.input<typeof f1099daInput2026Schema>) {
    if (ctx.taxYear !== 2026 || ctx.formType !== "f1040") {
      throw new Error("TY2026 1099-DA requires f1040:2026 context");
    }
    const { f1099das } = this.inputSchema.parse(rawInput);
    return {
      outputs: f1099das.flatMap((item) => [
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

export const f1099da_2026 = new F1099DANode2026();
