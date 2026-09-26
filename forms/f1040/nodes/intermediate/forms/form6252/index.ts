import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../../core/types/tax-node.ts";
import { output, TaxNode } from "../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../core/types/output-nodes.ts";
import { schedule_d } from "../../aggregation/schedule_d/index.ts";
import { form4797 } from "../form4797/index.ts";
import type { NodeContext } from "../../../../../../core/types/node-context.ts";
import {
  calculateInstallmentSale,
  isLongTermInstallmentSale,
} from "./calculation.ts";

// ─── Schema ───────────────────────────────────────────────────────────────────

// Form 6252 — Installment Sale Income
// IRC §453; TY2025 instructions.
//
// Installment sales spread recognition of gain across years.  For each year
// in which payments are received the engine computes:
//   installment sale income = gross profit ratio × payments received
//
// Depreciation recapture (§1245/§1250) is recognized entirely in the year
// of sale — it cannot be deferred to future years (IRC §453(i)).

export const itemSchema = z.object({
  // Selling price — the total contract price before any mortgage assumed
  // (Form 6252, line 5).
  selling_price: z.number().nonnegative().optional(),

  // Gross profit after exclusions, Form 6252 line 16.
  gross_profit: z.number().optional(),

  // Contract price — selling price minus mortgage assumed by buyer (or selling
  // price when no mortgage assumption). Form 6252 line 18.
  // IRC §453(b)(2)
  contract_price: z.number().nonnegative().optional(),

  // Installment payments received during this tax year (Form 6252 line 21).
  payments_received: z.number().nonnegative().optional(),

  // Prior-year depreciation recapture under §1245 or §1250.
  // Must be fully recognized as ordinary income in the year of sale.
  // Form 6252 line 12, sourced from Form 4797 Part III; IRC §453(i)(1).
  depreciation_recapture: z.number().nonnegative().optional(),

  // True when the property is a capital asset (Schedule D routing).
  // False when the property is §1231 property (Form 4797 routing).
  // Defaults to true (capital asset).
  is_capital_asset: z.boolean().optional(),

  // True when the capital gain on this installment sale is long-term.
  // Ignored if is_capital_asset is false.
  is_long_term: z.boolean().optional(),

  // Sale facts needed to complete MeF lines 1-26. Existing aggregate amounts
  // may be supplied as cross-checks, but the facts drive the filed form.
  property_description: z.string().min(1).optional(),
  date_acquired: z.string().optional(),
  date_sold: z.string().optional(),
  sold_to_related_party: z.boolean().optional(),
  selling_price_determinable: z.boolean().optional(),
  mortgage_assumed: z.number().nonnegative().optional(),
  cost_basis: z.number().nonnegative().optional(),
  depreciation_allowed: z.number().nonnegative().optional(),
  selling_expenses: z.number().nonnegative().optional(),
  excluded_gain: z.number().nonnegative().optional(),
  payments_received_prior_years: z.number().nonnegative().optional(),
});

export const inputSchema = z.object({ f6252s: z.array(itemSchema).min(1) });
export type F6252Item = z.infer<typeof itemSchema>;
export type F6252Input = z.infer<typeof inputSchema>;

// ─── Pure helpers ─────────────────────────────────────────────────────────────

// Gross profit ratio (GPR): gross profit ÷ contract price.
// Form 6252 line 19; IRC §453(c).
function grossProfitRatio(grossProfit: number, contractPrice: number): number {
  if (contractPrice <= 0) {
    throw new Error(
      "Form 6252 needs a positive contract price to allocate payments",
    );
  }
  return grossProfit / contractPrice;
}

// Installment sale income for the current year: GPR × payments received.
// Form 6252 line 24; IRC §453(c).
function installmentSaleIncome(
  gpr: number,
  paymentsReceived: number,
): number {
  return gpr * paymentsReceived;
}

function saleContributions(input: F6252Item): {
  recapture: number;
  longTerm: number;
  shortTerm: number;
  section1231: number;
} {
  const hasSaleFacts = input.property_description !== undefined ||
    input.date_acquired !== undefined || input.date_sold !== undefined ||
    input.cost_basis !== undefined;
  const lines = hasSaleFacts ? calculateInstallmentSale(input) : undefined;
  if (lines && (input.depreciation_allowed ?? 0) > 0) {
    throw new Error(
      "Form 6252 depreciated property needs section 1245/1250 and unrecaptured gain treatment",
    );
  }
  if ((input.gross_profit ?? 0) < 0) {
    throw new Error(
      "Form 6252 installment method cannot report a sale at a loss",
    );
  }
  const recapture = input.depreciation_recapture ?? 0;
  const payments = input.payments_received ?? 0;
  if (payments === 0 && (!lines || lines.line20 === 0)) {
    return { recapture, longTerm: 0, shortTerm: 0, section1231: 0 };
  }
  const income = lines ? lines.line26 : installmentSaleIncome(
    grossProfitRatio(input.gross_profit ?? 0, input.contract_price ?? 0),
    payments,
  );
  if (income === 0) {
    return { recapture, longTerm: 0, shortTerm: 0, section1231: 0 };
  }
  const isLongTerm = lines
    ? isLongTermInstallmentSale(input)
    : input.is_long_term !== false;
  if (
    lines && input.is_long_term !== undefined &&
    input.is_long_term !== isLongTerm
  ) {
    throw new Error(
      "Form 6252 is_long_term conflicts with actual holding period",
    );
  }
  if (input.is_capital_asset === false) {
    if (lines && !isLongTerm) {
      throw new Error(
        "Form 6252 short-term business property needs Form 4797 Part II detail",
      );
    }
    return { recapture, longTerm: 0, shortTerm: 0, section1231: income };
  }
  return {
    recapture,
    longTerm: isLongTerm ? income : 0,
    shortTerm: isLongTerm ? 0 : income,
    section1231: 0,
  };
}

// ─── Node class ───────────────────────────────────────────────────────────────

class Form6252Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "form6252";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule_d, form4797]);

  compute(_ctx: NodeContext, rawInput: F6252Input): NodeResult {
    const { f6252s } = inputSchema.parse(rawInput);
    const sales = f6252s.map(saleContributions);
    const total = (key: keyof ReturnType<typeof saleContributions>) =>
      sales.reduce((sum, sale) => sum + sale[key], 0);
    const outputs: NodeOutput[] = [];
    const recapture = total("recapture");
    if (recapture > 0) {
      outputs.push(output(form4797, { recapture_form6252: recapture }));
    }
    const longTerm = total("longTerm");
    if (longTerm > 0) {
      outputs.push(output(schedule_d, {
        line_11_form2439: longTerm,
        gain_form6252_lt: longTerm,
      }));
    }
    const shortTerm = total("shortTerm");
    if (shortTerm > 0) {
      outputs.push(output(schedule_d, {
        line_4_other_st: shortTerm,
        gain_form6252_st: shortTerm,
      }));
    }
    const section1231 = total("section1231");
    if (section1231 > 0) {
      outputs.push(output(form4797, {
        section_1231_gain: section1231,
        gain_form6252: section1231,
      }));
    }
    return { outputs };
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const form6252 = new Form6252Node();
