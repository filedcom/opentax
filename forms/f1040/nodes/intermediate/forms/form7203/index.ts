import {
  firstYearPassiveSCorpLossStages,
  passiveSCorpLossBundleSchema,
} from "../../../inputs/k1_s_corp_passive_loss_source.ts";
import { additionalPrincipalRepayments } from "./debt-allocation.ts";
import { ownedDebtFamily } from "./owned-family.ts";
import { z } from "zod";
import type { NodeResult } from "../../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../core/types/output-nodes.ts";
import { schedule1 } from "../../../outputs/schedule1/index.ts";
import { agi_aggregator } from "../../aggregation/agi_aggregator/index.ts";
import type { NodeContext } from "../../../../../../core/types/node-context.ts";
import {
  currentOpenAccountCarry,
  reconcileCashCapitalAndNewNote,
  reviewedForm7203DebtEvidenceSchema,
  sumPrincipalRepayments,
  totalCurrentDebtAdvances,
} from "./debt-note.ts";
import { reviewedStockLossLedgerSchema } from "./stock-ledger.ts";

// ─── Schema ───────────────────────────────────────────────────────────────────

// Form 7203 — S Corporation Shareholder Stock and Debt Basis Limitations
//
// Calculates the shareholder's adjusted stock and debt basis in an S corporation
// to determine how much of the corporation's losses/deductions are deductible
// on the individual return. Excess losses are suspended under IRC §1366(d)(1)
// and carried forward indefinitely (IRC §1366(d)(2)).
//
// Upstream sender: k1_s_corp (ordinary_income, ordinary_loss, distributions,
//   nondeductible_expenses) plus user-entered beginning basis fields. The
//   public K-1 route currently admits only reviewed, current-year stock losses.
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
  current_passive_s_corp_loss: passiveSCorpLossBundleSchema.optional(),
  owned_debt_loss_sources: z.array(z.unknown()).min(2).max(4).optional(),
  // ── Part I: Stock Basis ───────────────────────────────────────────────────
  // Line 1 — Beginning stock basis at start of tax year
  stock_basis_beginning: z.number().nonnegative().optional(),

  // Line 2 — Capital contributions and stock acquisitions during year
  additional_contributions: z.number().nonnegative().optional(),
  reviewed_stock_loss_ledger: reviewedStockLossLedgerSchema.optional(),

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
  reviewed_debt_evidence: reviewedForm7203DebtEvidenceSchema.optional(),

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
// IRC §1367(a)(2)(A) — floored at zero; excess distribution = capital gain (IRC §1368(b)(2))
function stockBasisAfterDistributions(
  basisAfterIncreases: number,
  input: Form7203Input,
): number {
  return Math.max(0, basisAfterIncreases - (input.distributions ?? 0));
}

// Excess distributions over stock basis = capital gain under IRC §1368(b)(2)
// Requires an identified Form 8949 transaction; this node currently rejects
// excess gain rather than routing it to an unrelated Schedule D line.
function excessDistributionGain(
  basisAfterIncreases: number,
  input: Form7203Input,
): number {
  return Math.max(0, (input.distributions ?? 0) - basisAfterIncreases);
}

// Step 3: Tentative stock basis for loss allocation (Part I Line 10)
// Reg. 1.1367-1(f) — nondeductible expenses applied after distributions, before losses
function tentativeStockBasis(
  basisAfterDistributions: number,
  input: Form7203Input,
): number {
  return Math.max(
    0,
    basisAfterDistributions - (input.nondeductible_expenses ?? 0),
  );
}

// Step 4: Tentative debt basis for loss allocation (Part II line 29).
// A fully based principal repayment reduces the new note before the loss.
function tentativeDebtBasis(input: Form7203Input): number {
  const note =
    (input.reviewed_debt_evidence?.kind === "new_2025_formal_notes" ||
        input.reviewed_debt_evidence?.kind === "owned_2025_formal_notes" ||
        input.reviewed_debt_evidence?.kind === "owned_2025_open_account" ||
        input.reviewed_debt_evidence?.kind ===
          "owned_2025_formal_and_open_account")
      ? input.reviewed_debt_evidence
      : undefined;
  return (input.debt_basis_beginning ?? 0) + (input.new_loans ?? 0) -
    sumPrincipalRepayments(note?.principal_repayments) -
    (note?.second_formal_note?.principal_repayment?.amount ?? 0) -
    additionalPrincipalRepayments(note);
}

// Step 5: Total loss pool — current year + prior carryforward (Part III)
// IRC §1366(d)(2)
function totalLossPool(input: Form7203Input): number {
  return (input.ordinary_loss ?? 0) + (input.prior_year_unallowed_loss ?? 0);
}

// Step 6: Disallowed loss = pool - allowed from stock - allowed from debt (Part III Column e)
// IRC §1366(d)(1): losses limited to aggregate adjusted basis (stock first, then debt)
function disallowedLoss(
  pool: number,
  stockBasis: number,
  debtBasis: number,
): number {
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
    if (input.current_passive_s_corp_loss) {
      if (
        Object.keys(input).some((key) => key !== "current_passive_s_corp_loss")
      ) {
        throw Error("Passive Form7203 source cannot mix scalar basis inputs");
      }
      const { source, k1 } = input.current_passive_s_corp_loss;
      const s = firstYearPassiveSCorpLossStages(source, k1);
      return {
        outputs: [], // The K1 withheld the whole raw loss; §469 posts only its allowance.
        carryforwards: s.basisSuspendedLoss > 0
          ? {
            [`basis_suspended_s_corp_loss:${s.ownerTin}:${s.corporationEin}`]:
              s.basisSuspendedLoss,
            [`qualified_basis_suspended_s_corp_loss:${s.ownerTin}:${s.corporationEin}`]:
              s.basisSuspendedLoss,
          }
          : {},
      };
    }
    if (input.owned_debt_loss_sources !== undefined) {
      if (
        Object.keys(input).some((k) =>
          k !== "owned_debt_loss_sources" &&
          input[k as keyof typeof input] !== undefined
        )
      ) {
        throw Error(
          "Owned MFJ debt family cannot mix scalar/shareholder basis fields",
        );
      }
      const family = ownedDebtFamily(input.owned_debt_loss_sources);
      return {
        outputs: [
          this.outputNodes.output(schedule1, {
            basis_disallowed_add_back: family.suspended,
          }),
          this.outputNodes.output(agi_aggregator, {
            basis_disallowed_add_back: family.suspended,
          }),
        ],
        carryforwards: {
          ...Object.assign(
            {},
            ...family.rows.map((r) =>
              currentOpenAccountCarry(r.note, r.basis.allowedDebt)
            ),
          ),
          suspended_scorp_loss_7203: family.suspended,
          basis_suspended_scorp_qbi_loss_7203: family.suspended,
          ...Object.fromEntries(
            family.rows.flatMap(
              (r) => [[
                `suspended_scorp_loss_7203_${r.source.recipient_tin}_${r.source.corporation_ein}`,
                r.basis.suspendedLoss,
              ], [
                `basis_suspended_scorp_qbi_loss_7203_${r.source.recipient_tin}_${r.source.corporation_ein}`,
                r.basis.basisSuspendedQualifiedLoss,
              ]],
            ),
          ),
        },
      };
    }

    if (
      input.reviewed_debt_evidence?.kind ===
        "prior_reduced_formal_note_repayment"
    ) {
      throw new Error(
        "Form 7203 prior reduced note needs executor-owned prior filing and current payment bytes before tax posting",
      );
    }

    if ((input.prior_year_unallowed_loss ?? 0) > 0) {
      throw new Error(
        "Form 7203 prior-year basis carryover needs a source-linked current/prior loss allocation before Schedule 1 adjustment",
      );
    }

    const note = input.reviewed_debt_evidence;
    if (
      (note?.kind === "new_2025_formal_notes" ||
        note?.kind === "owned_2025_formal_notes" ||
        note?.kind === "owned_2025_open_account" ||
        note?.kind === "owned_2025_formal_and_open_account") &&
      (input.additional_contributions ?? 0) > 0
    ) {
      const ledger = input.reviewed_stock_loss_ledger;
      if (
        !ledger ||
        reconcileCashCapitalAndNewNote(ledger, note) !==
          input.additional_contributions ||
        ledger.no_shareholder_debt_or_repayments ||
        (input.ordinary_loss ?? 0) <=
          ledger.beginning_stock_basis + input.additional_contributions
      ) {
        throw new Error(
          "Form 7203 capital-and-debt loss needs reconciled capital and note source with loss reaching debt basis",
        );
      }
    } else if (input.reviewed_stock_loss_ledger !== undefined) {
      throw new Error(
        "Form 7203 reviewed stock ledger in debt calculation requires the sourced capital-and-debt route",
      );
    }
    if (
      ((input.debt_basis_beginning ?? 0) > 0 || (input.new_loans ?? 0) > 0 ||
        note) &&
      (!note || input.debt_basis_beginning !== undefined ||
        input.new_loans !== totalCurrentDebtAdvances(note) ||
        input.stock_basis_beginning !== note.beginning_stock_basis ||
        input.ordinary_loss !== note.current_box1_ordinary_loss ||
        ((input.additional_contributions ?? 0) !== 0 &&
          !input.reviewed_stock_loss_ledger) ||
        (input.ordinary_income ?? 0) !== 0 ||
        (input.tax_exempt_income ?? 0) !== 0 ||
        (input.distributions ?? 0) !== 0 ||
        (input.nondeductible_expenses ?? 0) !== 0 ||
        (input.prior_year_unallowed_loss ?? 0) !== 0)
    ) {
      throw new Error(
        "Form 7203 debt-supported loss needs identified formal-note source and matching current K-1 loss without other basis items",
      );
    }
    if (
      note?.second_formal_note &&
      note.kind !== "owned_2025_formal_and_open_account"
    ) {
      const stock = input.stock_basis_beginning ?? 0;
      const firstDebtBasis = note.cash_advance_amount -
        sumPrincipalRepayments(note.principal_repayments);
      const totalDebtBasis = firstDebtBasis +
        note.second_formal_note.cash_advance_amount -
        (note.second_formal_note.principal_repayment?.amount ?? 0);
      const debtLoss = Math.min(
        (input.ordinary_loss ?? 0) - stock,
        totalDebtBasis,
      );
      if (
        debtLoss <= 0 || !Number.isSafeInteger(
          debtLoss * firstDebtBasis / totalDebtBasis,
        )
      ) {
        throw new Error(
          "Form 7203 two-note loss needs exact whole-dollar pro rata debt allocation",
        );
      }
    }

    const pool = totalLossPool(input);
    const stockAfterIncreases = stockBasisAfterIncreases(input);
    const excessGain = excessDistributionGain(stockAfterIncreases, input);

    if (excessGain > 0) {
      throw new Error(
        "Form 7203 excess nondividend distribution needs Form 8949 transaction facts before capital-gain routing",
      );
    }

    // No current ordinary loss to limit in this bounded route.
    if (pool === 0) {
      return { outputs: [] };
    }

    const stockAfterDistrib = stockBasisAfterDistributions(
      stockAfterIncreases,
      input,
    );
    const stockBasis = tentativeStockBasis(stockAfterDistrib, input);
    const debtBasis = tentativeDebtBasis(input);
    const disallowed = disallowedLoss(pool, stockBasis, debtBasis);

    const accountCarry = currentOpenAccountCarry(
      note,
      Math.min(Math.max(0, pool - stockBasis), debtBasis),
    );
    // Loss fully within basis — no further limitation outputs needed
    if (disallowed === 0) {
      return {
        outputs: [],
        ...(Object.keys(accountCarry).length
          ? { carryforwards: accountCarry }
          : {}),
      };
    }

    // Disallowed portion: add back to schedule1 as a positive adjustment
    // (reduces the net S-corp loss already posted by the k1_s_corp upstream node)
    return {
      outputs: [
        this.outputNodes.output(schedule1, {
          basis_disallowed_add_back: disallowed,
        }),
        this.outputNodes.output(agi_aggregator, {
          basis_disallowed_add_back: disallowed,
        }),
      ],
      carryforwards: {
        ...accountCarry,
        suspended_scorp_loss_7203: disallowed,
        ...(note?.owned_current_records !== undefined
          ? { basis_suspended_scorp_qbi_loss_7203: disallowed }
          : {}),
      },
    };
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const form7203 = new Form7203Node();
