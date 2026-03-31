import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { TaxNode, output } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { schedule_d } from "../schedule_d/index.ts";
import { form4797 } from "../form4797/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

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

export const inputSchema = z.object({
  // Selling price — the total contract price before any mortgage assumed
  // (Form 6252, line 5).
  selling_price: z.number().nonnegative().optional(),

  // Gross profit = selling price − adjusted basis − selling expenses.
  // Form 6252 line 10.
  gross_profit: z.number().optional(),

  // Contract price — selling price minus mortgage assumed by buyer (or selling
  // price when no mortgage assumption). Form 6252 line 15.
  // IRC §453(b)(2)
  contract_price: z.number().nonnegative().optional(),

  // Installment payments received during this tax year (Form 6252 line 17a).
  payments_received: z.number().nonnegative().optional(),

  // Prior-year depreciation recapture under §1245 or §1250.
  // Must be fully recognized as ordinary income in the year of sale.
  // Form 6252 Part I; IRC §453(i)(1).
  depreciation_recapture: z.number().nonnegative().optional(),

  // True when the property is a capital asset (Schedule D routing).
  // False when the property is §1231 property (Form 4797 routing).
  // Defaults to true (capital asset).
  is_capital_asset: z.boolean().optional(),

  // True when the capital gain on this installment sale is long-term.
  // Ignored if is_capital_asset is false.
  is_long_term: z.boolean().optional(),
});

type Form6252Input = z.infer<typeof inputSchema>;

// ─── Pure helpers ─────────────────────────────────────────────────────────────

// Gross profit ratio (GPR): gross profit ÷ contract price.
// Form 6252 line 16; IRC §453(c).
// Returns 0 if contract_price is 0 to avoid divide-by-zero.
function grossProfitRatio(grossProfit: number, contractPrice: number): number {
  if (contractPrice <= 0) return 0;
  return grossProfit / contractPrice;
}

// Installment sale income for the current year: GPR × payments received.
// Form 6252 line 19; IRC §453(c).
function installmentSaleIncome(
  gpr: number,
  paymentsReceived: number,
): number {
  return gpr * paymentsReceived;
}

// ─── Node class ───────────────────────────────────────────────────────────────

class Form6252Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "form6252";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule_d, form4797]);

  compute(_ctx: NodeContext, rawInput: Form6252Input): NodeResult {
    const input = inputSchema.parse(rawInput);

    const outputs: NodeOutput[] = [];

    // Depreciation recapture — ordinary income recognized fully in year of sale.
    // Routes to form4797 ordinary_gain regardless of capital asset status.
    // IRC §453(i)(1).
    const recapture = input.depreciation_recapture ?? 0;
    if (recapture > 0) {
      outputs.push(output(form4797, { ordinary_gain: recapture }));
    }

    // Installment sale income for this year.
    const payments = input.payments_received ?? 0;
    if (payments === 0) {
      return { outputs };
    }

    const gpr = grossProfitRatio(input.gross_profit ?? 0, input.contract_price ?? 0);
    const income = installmentSaleIncome(gpr, payments);

    if (income === 0) {
      return { outputs };
    }

    const isCapital = input.is_capital_asset !== false; // default true
    const isLongTerm = input.is_long_term !== false;    // default true

    if (isCapital) {
      // Capital gain portion → Schedule D (long-term or short-term)
      if (isLongTerm) {
        outputs.push(output(schedule_d, { line_11_form2439: income }));
      } else {
        outputs.push(output(schedule_d, { line_1a_proceeds: income, line_1a_cost: 0 }));
      }
    } else {
      // §1231 gain portion → Form 4797
      outputs.push(output(form4797, { section_1231_gain: income }));
    }

    return { outputs };
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const form6252 = new Form6252Node();
