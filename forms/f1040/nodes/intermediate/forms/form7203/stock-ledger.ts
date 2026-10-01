import { z } from "zod";

// A single original-shareholder stock block with only a current K-1 box-1
// ordinary loss. This is source evidence, not a generic S-corporation basis
// history or a substitute for the filed Form 7203.
export const reviewedStockLossLedgerSchema = z.object({
  shareholder_ssn: z.string().regex(/^\d{9}$/),
  shareholder_name_as_on_k1: z.string().regex(
    /^([A-Za-z0-9'\-] ?)*[A-Za-z0-9'\-]$/,
  ).max(35),
  corporation_ein: z.string().regex(/^\d{9}$/),
  beginning_stock_basis: z.number().int().nonnegative(),
  beginning_basis_workpaper_reference: z.string().trim().min(1),
  cash_capital_contribution: z.object({
    amount: z.number().int().positive(),
    contributed_date: z.string().regex(/^2025-\d{2}-\d{2}$/).refine((value) =>
      !Number.isNaN(Date.parse(value)) &&
      new Date(value).toISOString().slice(0, 10) === value
    ),
    shareholder_ssn: z.string().regex(/^\d{9}$/),
    corporation_ein: z.string().regex(/^\d{9}$/),
    bank_transfer_reference: z.string().trim().min(1),
    corporate_capital_account_reference: z.string().trim().min(1),
    cash_received_by_corporation_confirmed: z.literal(true),
    no_shares_issued_confirmed: z.literal(true),
    not_a_shareholder_loan_confirmed: z.literal(true),
  }).strict().optional(),
  original_shareholder: z.literal(true),
  all_shares_one_stock_block: z.literal(true),
  no_current_year_stock_transactions: z.literal(true),
  no_section_1367_1_g_election: z.literal(true),
  no_other_2025_stock_basis_changes: z.literal(true),
  no_other_schedule_e_activity: z.literal(true),
  materially_participated_in_s_corporation: z.literal(true),
  material_participation_workpaper_reference: z.string().trim().min(1),
  no_shareholder_debt_or_repayments: z.literal(true),
  no_prior_year_suspended_losses: z.literal(true),
  no_at_risk_or_passive_limitation: z.literal(true),
}).strict().superRefine((ledger, ctx) => {
  const contribution = ledger.cash_capital_contribution;
  if (contribution && (
    contribution.shareholder_ssn !== ledger.shareholder_ssn ||
    contribution.corporation_ein !== ledger.corporation_ein ||
    contribution.bank_transfer_reference ===
      contribution.corporate_capital_account_reference ||
    contribution.bank_transfer_reference === ledger.beginning_basis_workpaper_reference ||
    contribution.corporate_capital_account_reference ===
      ledger.beginning_basis_workpaper_reference
  )) {
    ctx.addIssue({
      code: "custom",
      path: ["cash_capital_contribution"],
      message: "Form 7203 cash capital contribution needs matching shareholder/corporation and distinct transfer, capital-account, and beginning-basis records",
    });
  }
});

export type ReviewedStockLossLedger = z.infer<
  typeof reviewedStockLossLedgerSchema
>;
