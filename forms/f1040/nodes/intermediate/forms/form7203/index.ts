import { z } from "zod";
import type { NodeResult } from "../../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../core/types/output-nodes.ts";
import { schedule1 } from "../../../outputs/schedule1/index.ts";
import { agi_aggregator } from "../../aggregation/agi_aggregator/index.ts";
import type { NodeContext } from "../../../../../../core/types/node-context.ts";

// ─── Schema ───────────────────────────────────────────────────────────────────

// Form 7203 — S Corporation Shareholder Stock and Debt Basis Limitations
//
// Calculates the shareholder's adjusted stock and debt basis in an S corporation
// to determine how much of the corporation's losses/deductions are deductible
// on the individual return. Excess losses are suspended under IRC §1366(d)(1)
// and carried forward indefinitely (IRC §1366(d)(2)).
//
// Upstream sender: k1_s_corp (ordinary_income, ordinary_loss, distributions,
//   nondeductible_expenses) plus user-entered beginning basis fields.
//
// Ordering of basis adjustments per Reg. 1.1367-1(f):
//   1. Increases for income items (Part I Lines 1–4)
//   2. Decreases for distributions (Part I Lines 5–7)
//   3. Decreases for nondeductible expenses (Part I Lines 8–9)
//   4. Losses allocated first to stock basis, then debt basis (Part III)
//
// IRS Form 7203: https://www.irs.gov/pub/irs-pdf/f7203.pdf
// IRS Instructions: https://www.irs.gov/instructions/i7203
// IRC §1366(d) — limitation on losses; IRC §1367 — adjustments to basis

export const inputSchema = z.object({
  // ── Part I: Stock Basis ───────────────────────────────────────────────────
  // Line 1 — Beginning stock basis at start of tax year
  stock_basis_beginning: z.number().nonnegative().optional(),

  // Line 2 — Capital contributions and stock acquisitions during year
  additional_contributions: z.number().nonnegative().optional(),

  // Line 3 — Ordinary business income from K-1 Box 1 (positive only)
  // Increases stock basis under IRC §1367(a)(1)(A)
  ordinary_income: z.number().nonnegative().optional(),

  // Line 3 — Tax-exempt income from K-1 Box 16 Code A
  // Increases stock basis under IRC §1367(a)(1)(A)
  tax_exempt_income: z.number().nonnegative().optional(),

  // Line 6 — Nondividend distributions from K-1 Box 16 Code D
  // Reduce stock basis (not below zero); excess is capital gain per IRC §1368
  distributions: z.number().nonnegative().optional(),

  // Line 8a — Nondeductible, non-capital expenses from K-1 Box 16 Code C
  // Reduce stock basis (not below zero) after distributions per Reg. 1.1367-1(f)
  nondeductible_expenses: z.number().nonnegative().optional(),

  // ── Part II: Debt Basis ───────────────────────────────────────────────────
  // Line 21 — Beginning adjusted debt basis (may be less than face if reduced in prior years)
  debt_basis_beginning: z.number().nonnegative().optional(),

  // Line 22 — New loans from shareholder to S-corp during the year
  new_loans: z.number().nonnegative().optional(),

  // ── Part III: Loss Items ──────────────────────────────────────────────────
  // Column (a) — Current year ordinary business loss from K-1 (positive amount)
  ordinary_loss: z.number().nonnegative().optional(),

  // Column (b) — Prior year suspended losses carried forward (positive amount)
  // IRC §1366(d)(2)
  prior_year_unallowed_loss: z.number().nonnegative().optional(),
});

type Form7203Input = z.infer<typeof inputSchema>;

// ─── Pure helpers ─────────────────────────────────────────────────────────────

// Step 1: Stock basis after all increases (Part I Lines 1–4)
// IRC §1367(a)(1)
function stockBasisAfterIncreases(input: Form7203Input): number {
  return (
    (input.stock_basis_beginning ?? 0) +
    (input.additional_contributions ?? 0) +
    (input.ordinary_income ?? 0) +
    (input.tax_exempt_income ?? 0)
  );
}

// Step 2: Stock basis after distributions (Part I Line 7)
// IRC §1367(a)(2)(A) — floored at zero; excess distribution = capital gain (not computed here)
function stockBasisAfterDistributions(basisAfterIncreases: number, input: Form7203Input): number {
  return Math.max(0, basisAfterIncreases - (input.distributions ?? 0));
}

// Step 3: Tentative stock basis for loss allocation (Part I Line 10)
// Reg. 1.1367-1(f) — nondeductible expenses applied after distributions, before losses
function tentativeStockBasis(basisAfterDistributions: number, input: Form7203Input): number {
  return Math.max(0, basisAfterDistributions - (input.nondeductible_expenses ?? 0));
}

// Step 4: Tentative debt basis for loss allocation (Part II Line 29 simplified)
// IRC §1367(b)(2) — beginning debt basis + new loans
function tentativeDebtBasis(input: Form7203Input): number {
  return (input.debt_basis_beginning ?? 0) + (input.new_loans ?? 0);
}

// Step 5: Total loss pool — current year + prior carryforward (Part III)
// IRC §1366(d)(2)
function totalLossPool(input: Form7203Input): number {
  return (input.ordinary_loss ?? 0) + (input.prior_year_unallowed_loss ?? 0);
}

// Step 6: Disallowed loss = pool - allowed from stock - allowed from debt (Part III Column e)
// IRC §1366(d)(1): losses limited to aggregate adjusted basis (stock first, then debt)
function disallowedLoss(pool: number, stockBasis: number, debtBasis: number): number {
  const allowedFromStock = Math.min(pool, stockBasis);
  const remaining = pool - allowedFromStock;
  const allowedFromDebt = Math.min(remaining, debtBasis);
  return remaining - allowedFromDebt;
}

// ─── Node class ───────────────────────────────────────────────────────────────

class Form7203Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "form7203";
  readonly inputSchema = inputSchema;
  // Disallowed basis losses are added back to schedule1 as a positive adjustment,
  // reversing the upstream-posted S-corp loss (from k1_s_corp → schedule1 line5_schedule_e)
  // to the extent it exceeds the shareholder's adjusted stock + debt basis.
  readonly outputNodes = new OutputNodes([schedule1, agi_aggregator]);

  compute(_ctx: NodeContext, rawInput: Form7203Input): NodeResult {
    const input = inputSchema.parse(rawInput);

    const pool = totalLossPool(input);

    // No losses to limit — nothing to do
    if (pool === 0) {
      return { outputs: [] };
    }

    const stockAfterIncreases = stockBasisAfterIncreases(input);
    const stockAfterDistrib = stockBasisAfterDistributions(stockAfterIncreases, input);
    const stockBasis = tentativeStockBasis(stockAfterDistrib, input);
    const debtBasis = tentativeDebtBasis(input);

    const disallowed = disallowedLoss(pool, stockBasis, debtBasis);

    // Loss fully within basis — no limitation needed
    if (disallowed === 0) {
      return { outputs: [] };
    }

    // Disallowed portion: add back to schedule1 as a positive adjustment
    // (reduces the net S-corp loss already posted by the k1_s_corp upstream node)
    return {
      outputs: [
        this.outputNodes.output(schedule1, { basis_disallowed_add_back: disallowed }),
        this.outputNodes.output(agi_aggregator, { basis_disallowed_add_back: disallowed }),
      ],
      carryforwards: { suspended_scorp_loss_7203: disallowed },
    };
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const form7203 = new Form7203Node();
