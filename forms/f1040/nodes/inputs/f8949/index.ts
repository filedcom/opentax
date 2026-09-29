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
import {
  form8949,
  Form8949Part,
} from "../../intermediate/forms/form8949/index.ts";
import { form6251 } from "../../intermediate/forms/form6251/index.ts";
import { schedule_b } from "../../intermediate/aggregation/schedule_b/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// Part I short-term: A (1099-B basis reported), B (1099-B no basis), C (no 1099-B)
// Part I short-term digital: G (1099-DA basis reported), H (1099-DA no basis), I (no 1099-DA)
// Part II long-term: D (1099-B basis reported), E (1099-B no basis), F (no 1099-B)
// Part II long-term digital: J (1099-DA basis reported), K (1099-DA no basis), L (no 1099-DA)
const SHORT_TERM_PARTS = new Set(["A", "B", "C", "G", "H", "I"]);
const AMT_PARTS = ["A", "B", "C", "D", "E", "F"] as const;

function isAmtPart(part: string): part is (typeof AMT_PARTS)[number] {
  return AMT_PARTS.some((candidate) => candidate === part);
}

// Section 1202 QSBS exclusion codes
// Q1: 50% exclusion (pre-2009 stock), Q2: 75% exclusion (2009-2010), Q3: 100% exclusion (post-2010)
export enum QsbsCode {
  Q1 = "Q1",
  Q2 = "Q2",
  Q3 = "Q3",
}

export const itemSchema = z.object({
  part: z.nativeEnum(Form8949Part),
  description: z.string(),
  source_transaction_id: z.string().trim().min(1).optional(),
  date_acquired: z.string(),
  date_sold: z.string(),
  proceeds: z.number().nonnegative(),
  cost_basis: z.number().nonnegative(),
  adjustment_codes: z.string().optional(),
  adjustment_amount: z.number().optional(),
  federal_withheld: z.number().nonnegative().optional(),
  amt_cost_basis: z.number().nonnegative().optional(),
  qsbs_code: z.nativeEnum(QsbsCode).optional(),
  qsbs_amount: z.number().nonnegative().optional(),
  wash_sale_loss: z.number().nonnegative().optional(),
  loss_not_allowed: z.boolean().optional(),
  state_tax_withheld: z.number().nonnegative().optional(),
  // Accrued market discount (adjustment code D) — taxable as ordinary income,
  // not capital gain; reduces the capital gain reported on the transaction
  accrued_market_discount: z.number().nonnegative().optional()
    .describe(
      "Accrued market discount included in ordinary income (Form 8949 column (g), code D)",
    ),
  market_discount_payer_name: z.string().trim().min(1).optional(),
  // Ordinary income portion subject to recapture needs the Form 4797 source
  // path, rather than a free-standing Form 8949/Schedule 1 assertion.
  ordinary_income_portion: z.number().nonnegative().optional()
    .describe(
      "Portion of gain taxable as ordinary income due to depreciation recapture (IRC §1245/§1250)",
    ),
});

export const inputSchema = z.object({
  f8949s: z.array(itemSchema).min(1),
});

type F8949Item = z.infer<typeof itemSchema>;

function isLongTerm(item: F8949Item): boolean {
  return !SHORT_TERM_PARTS.has(item.part);
}

// Derive adjustment codes incorporating wash_sale_loss (W) and loss_not_allowed (L)
function resolvedAdjustmentCodes(item: F8949Item): string | undefined {
  let codes = item.adjustment_codes ?? "";
  if ((item.wash_sale_loss ?? 0) > 0) {
    codes = codes + "W";
  }
  if (item.loss_not_allowed === true) {
    codes = codes + "L";
  }
  return codes.length > 0 ? codes : undefined;
}

// Derive adjustment amount incorporating auto-generated codes
function resolvedAdjustmentAmount(item: F8949Item): number | undefined {
  if ((item.wash_sale_loss ?? 0) > 0) {
    return item.wash_sale_loss;
  }
  if (item.loss_not_allowed === true) {
    // Zero out the loss: adjustment = cost_basis - proceeds
    return item.cost_basis - item.proceeds;
  }
  return item.adjustment_amount;
}

function processItem(item: F8949Item): NodeOutput[] {
  const amd = item.accrued_market_discount ?? 0;
  const recapture = item.ordinary_income_portion ?? 0;
  const marketDiscountPayerName = item.market_discount_payer_name;
  if (recapture > 0) {
    throw new Error(
      "Form 8949 depreciation recapture needs a sourced Form 4797 handoff before filing",
    );
  }
  if (
    amd > 0 && (
      !marketDiscountPayerName ||
      amd > Math.max(0, item.proceeds - item.cost_basis) ||
      item.adjustment_codes !== undefined ||
      item.adjustment_amount !== undefined ||
      (item.wash_sale_loss ?? 0) > 0 || item.loss_not_allowed === true
    )
  ) {
    throw new Error(
      "Form 8949 market discount needs a payer and an uncombined code-D adjustment within the positive gain",
    );
  }
  const adjustmentCodes = amd > 0 ? "D" : resolvedAdjustmentCodes(item);
  const adjustmentAmount = amd > 0 ? -amd : resolvedAdjustmentAmount(item);
  const gainLoss = item.proceeds - item.cost_basis + (adjustmentAmount ?? 0);

  const outputs: NodeOutput[] = [
    output(form8949, {
      transaction: {
        part: item.part,
        description: item.description,
        source_transaction_id: item.source_transaction_id,
        date_acquired: item.date_acquired,
        date_sold: item.date_sold,
        proceeds: item.proceeds,
        cost_basis: item.cost_basis,
        adjustment_codes: adjustmentCodes,
        adjustment_amount: adjustmentAmount,
        gain_loss: gainLoss,
        is_long_term: isLongTerm(item),
        ...(item.qsbs_code
          ? { qsbs_code: item.qsbs_code, qsbs_amount: item.qsbs_amount }
          : {}),
      },
    }),
  ];

  if ((item.federal_withheld ?? 0) > 0) {
    outputs.push(
      output(f1040, { line25b_withheld_1099: item.federal_withheld! }),
    );
  }

  if (
    item.amt_cost_basis !== undefined && item.amt_cost_basis !== item.cost_basis
  ) {
    const regularGain = gainLoss;
    const amtGain = item.proceeds - item.amt_cost_basis;
    if (
      !isAmtPart(item.part) ||
      !item.source_transaction_id ||
      adjustmentCodes !== undefined ||
      (adjustmentAmount ?? 0) !== 0 ||
      amd !== 0 ||
      item.qsbs_code !== undefined ||
      item.qsbs_amount !== undefined ||
      !Number.isInteger(item.proceeds) ||
      !Number.isInteger(item.cost_basis) ||
      !Number.isInteger(item.amt_cost_basis) ||
      !(
        (regularGain > 0 && amtGain > 0) ||
        (regularGain < 0 && amtGain < 0)
      )
    ) {
      throw new Error(
        "Form 8949 AMT basis difference needs an identified, unadjusted, whole-dollar Part I or Part II gain or loss under both bases; other Schedule D refigures are not yet supported",
      );
    }
    outputs.push(
      output(form6251, {
        line2k_8949_basis_dispositions: {
          source_transaction_id: item.source_transaction_id,
          part: item.part,
          proceeds: item.proceeds,
          regular_basis: item.cost_basis,
          amt_basis: item.amt_cost_basis,
          regular_gain: regularGain,
          amt_gain: amtGain,
        },
      }),
    );
  }

  // Market discount is taxable interest, separately from the capital gain.
  if (amd > 0) {
    if (!marketDiscountPayerName) {
      throw new Error("Form 8949 market discount needs a named interest payer");
    }
    outputs.push(
      output(schedule_b, {
        taxable_interest_net: amd,
        payer_name: marketDiscountPayerName,
      } as AtLeastOne<z.infer<typeof schedule_b["inputSchema"]>>),
    );
  }

  return outputs;
}

class F8949Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f8949";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([
    form8949,
    f1040,
    form6251,
    schedule_b,
  ]);

  compute(_ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    const parsed = inputSchema.parse(input);
    return { outputs: parsed.f8949s.flatMap((item) => processItem(item)) };
  }
}

export const f8949 = new F8949Node();
