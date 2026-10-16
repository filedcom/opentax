import { z } from "zod";
import {
  calculateHsaMedicalDistributions2026,
  hsaMedicalDistributions2026Schema,
} from "./hsa-medical-distributions.ts";
import { hsaExcessReturns2026Schema } from "./hsa-excess-returns.ts";
import {
  hsaPriorExcess,
  hsaPriorExcessWith,
} from "../../nodes/intermediate/forms/adjustments/health/form8889/prior-excess.ts";
import {
  hsaExactAmount,
  hsaExactArithmetic as math,
  roundHsaAmount,
} from "../../nodes/intermediate/forms/adjustments/health/form8889/exact-amount.ts";
import { excessContributionTax } from "../../nodes/intermediate/forms/taxes/retirement/form5329/excess-contribution-tax.ts";
import {
  isSourceMoney,
  sourceCents,
} from "../../nodes/intermediate/forms/taxes/retirement/form4972/source-rounding.ts";
import { roundWholeDollars } from "../../whole-dollars.ts";

const ref = z.string().trim().min(1), date = z.string().date();
const tin = z.string().regex(/^\d{9}$/);
const money = z.number().finite().nonnegative().max(10_000_000).refine(
  isSourceMoney,
);
const line = z.number().int().nonnegative().max(1_000_000_000);
const prior = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("none"),
    history_review_reference: ref,
    no_unresolved_prior_hsa_excess_verified: z.literal(true),
  }).strict(),
  z.object({
    kind: z.literal("filed_2025"),
    tax_year: z.literal(2025),
    owner_tin: tin,
    filed_return_reference: ref,
    filed_on: date,
    latest_original_or_amended_return_verified: z.literal(true),
    no_pending_prior_year_corrections_verified: z.literal(true),
    complete_2025_owner_account_inventory_verified: z.literal(true),
    part_vii: z.object({
      line42: line,
      line43: line,
      line44: line,
      line45: line,
      line46: line,
      line47: line,
      line48: line,
      line49: line,
    }).strict(),
    accounts: z.array(
      z.object({
        owner_tin: tin,
        trustee_tin: tin,
        account_number: ref,
        value_statement_reference: ref,
        valued_on: z.literal("2025-12-31"),
        fair_market_value: money,
        current_value_after_corrections_verified: z.literal(true),
      }).strict(),
    ).min(1).max(100),
    // The 2026 funding ledger already contains every actual 2026 receipt
    // designated for 2025. Never accept a second hand-entered adjustment.
    no_timely_returned_2025_contributions_in_2026_receipts_verified: z.literal(
      true,
    ),
  }).strict(),
]);

/** Internal annual workpaper, not a public return input: Part III testing-period
 * income and coordinated graph/PDF routing must be settled before publication. */
export const hsaAnnualExcess2026Schema = hsaMedicalDistributions2026Schema
  .extend({
    excess_returns: hsaExcessReturns2026Schema,
    history_review: z.object({
      record_reference: ref,
      reviewed_on: date,
      owners: z.array(
        z.object({ owner_tin: tin, prior_excess: prior }).strict(),
      ).min(1).max(2),
    }).strict(),
  }).strict();
export type HsaAnnualExcess2026 = z.input<typeof hsaAnnualExcess2026Schema>;

export function calculateHsaAnnualExcess2026(raw: HsaAnnualExcess2026) {
  const input = hsaAnnualExcess2026Schema.parse(raw);
  const { history_review: history, ...medicalInput } = input;
  const medical = calculateHsaMedicalDistributions2026(medicalInput);
  const excess = medical.excess_return_sources!;
  const funding = excess.contribution_sources;
  if (
    history.reviewed_on < input.excess_returns.review.reviewed_on ||
    history.owners.length !== funding.owners.length ||
    new Set(history.owners.map((o) => o.owner_tin)).size !==
      history.owners.length ||
    history.owners.some((o) =>
      !funding.owners.some((f) => f.owner_tin === o.owner_tin)
    )
  ) {
    throw Error(
      "HSA annual history must cover each actual owner after completed source reviews",
    );
  }
  const historicalReferences = new Set<string>();
  const historicalAccountOwners = new Map<string, string>();
  const owners = funding.owners.map((f) => {
    const owner = f.owner_tin;
    const m = medical.owners.find((o) => o.owner_tin === owner)!;
    const e = excess.owners.find((o) => o.owner_tin === owner)!;
    const p = history.owners.find((o) => o.owner_tin === owner)!.prior_excess;
    const accounts = funding.source_input.claim.accounts.filter((a) =>
      a.owner_tin === owner
    );
    let line42 = 0;
    let priorAccountValue: number | undefined;
    if (p.kind === "filed_2025") {
      if (
        p.owner_tin !== owner || p.filed_on < "2026-01-01" ||
        p.filed_on > history.reviewed_on ||
        historicalReferences.has(p.filed_return_reference)
      ) {
        throw Error(
          "HSA prior excess needs the actual owner's latest filed 2025 return",
        );
      }
      historicalReferences.add(p.filed_return_reference);
      const accountKeys = new Set<string>();
      let valueCents = 0;
      for (const a of p.accounts) {
        const key = `${a.trustee_tin}/${a.account_number}`;
        if (
          a.owner_tin !== owner || accountKeys.has(key) ||
          (historicalAccountOwners.has(key) &&
            historicalAccountOwners.get(key) !== owner) ||
          historicalReferences.has(a.value_statement_reference)
        ) {
          throw Error(
            "HSA prior values must identify distinct accounts of the same owner",
          );
        }
        accountKeys.add(key);
        historicalAccountOwners.set(key, owner);
        historicalReferences.add(a.value_statement_reference);
        valueCents += sourceCents(a.fair_market_value);
      }
      for (const a of accounts) {
        if (
          a.opened_on <= "2025-12-31" &&
          !accountKeys.has(`${a.trustee_tin}/${a.account_number}`)
        ) {
          throw Error(
            "HSA prior value inventory omits an existing owner account",
          );
        }
        for (const r of a.receipts) {
          if (
            (r.kind === "personal_cash" || r.kind === "employer_cash") &&
            r.contribution_tax_year === 2025 &&
            r.received_on.startsWith("2026-")
          ) {
            valueCents += sourceCents(r.amount);
          }
        }
      }
      priorAccountValue = valueCents / 100;
      const l = p.part_vii;
      const replay = hsaPriorExcess(l.line42, l.line43, l.line44, l.line47);
      if (
        l.line45 !== replay.line45 || l.line46 !== replay.line46 ||
        l.line48 !== replay.line48 ||
        l.line49 !==
          roundWholeDollars(excessContributionTax(l.line48, priorAccountValue))
      ) {
        throw Error(
          "HSA filed 2025 Part VII must reconcile its lines and sourced account-value cap",
        );
      }
      if (l.line49 > 0) line42 = l.line48;
    }
    const c = f.current_contributions, l = c.filed_current_lines;
    const line43 = Math.max(0, l.line12 - l.line2);
    const line44 = m.filed_part_ii.line16;
    const line47 = Math.max(
      0,
      Math.max(0, l.line2 - l.line12) -
        roundHsaAmount(e.exact_personal_principal_returned),
    ) +
      Math.max(
        0,
        Math.max(0, l.line9 - Math.max(0, l.line8 - l.line10)) -
          roundHsaAmount(e.exact_employer_principal_returned),
      );
    const filed = hsaPriorExcess(line42, line43, line44, line47);
    const exact = hsaPriorExcessWith(
      hsaExactAmount(line42, 1),
      c.before_withdrawals_and_prior_excess.unusedPersonalLimit,
      hsaExactAmount(sourceCents(m.taxable_distributions), 100),
      e.exact_current_excess_after_returns,
      math,
    );
    // Printed line 49 expressly includes contributions made in 2027 for 2026.
    // Timely returns are treated as not contributed: subtract only allocations
    // to those following-year receipts, never current-year principal or earnings.
    const returnedByReceipt = new Map<string, number>();
    for (
      const w of input.excess_returns.review.withdrawals.filter((w) =>
        w.owner_tin === owner
      )
    ) {
      for (const a of w.contribution_allocations) {
        returnedByReceipt.set(
          a.receipt_reference,
          (returnedByReceipt.get(a.receipt_reference) ?? 0) +
            sourceCents(a.principal),
        );
      }
    }
    const values = accounts.map((a) => ({
      account_reference: a.record_reference,
      value_source_reference: a.form5498sa.source_document_reference,
      december_31_value: a.form5498sa.box5_year_end_fmv,
      following_year_contributions: a.receipts.filter((r) =>
        (r.kind === "personal_cash" || r.kind === "employer_cash") &&
        r.contribution_tax_year === 2026 && r.received_on.startsWith("2027-")
      ).map((r) => ({
        receipt_reference: r.record_reference,
        amount: r.amount,
        timely_returned_principal:
          (returnedByReceipt.get(r.record_reference) ?? 0) / 100,
      })),
    }));
    const capCents = values.reduce(
      (n, a) =>
        n + sourceCents(a.december_31_value) +
        a.following_year_contributions.reduce(
          (v, r) =>
            v + sourceCents(r.amount) -
            sourceCents(r.timely_returned_principal),
          0,
        ),
      0,
    );
    const accountValueCap = capCents / 100;
    const line49 = roundWholeDollars(
      excessContributionTax(filed.line48, accountValueCap),
    );
    return {
      owner_tin: owner,
      prior_excess_source: p,
      prior_account_value_cap: priorAccountValue,
      current_account_value_sources: values,
      current_account_value_cap: accountValueCap,
      exact_prior_excess: exact,
      exact_excise_tax_base: math.min(
        exact.line48,
        hsaExactAmount(capCents, 100),
      ),
      excise_tax_rate: .06,
      filed_part_vii: {
        line42,
        line43,
        line44,
        line45: filed.line45,
        line46: filed.line46,
        line47,
        line48: filed.line48,
        line49,
      },
      exact_form8889_line13: math.add(
        c.before_withdrawals_and_prior_excess.currentPersonalDeduction,
        exact.priorYearDeduction,
      ),
      filed_form8889_line13: l.line13_before_prior_excess +
        filed.priorYearDeduction,
      form5329_part_vii_required: line42 > 0 || filed.line48 > 0 ||
        e.exact_current_excess_after_returns.numerator > 0,
      carryforward_for_2027: line49 > 0 ? filed.line48 : 0,
    };
  });
  return {
    source_input: input,
    medical_sources: medical,
    owners,
    schedule1_line13_before_testing_period_review: owners.reduce(
      (n, o) => n + o.filed_form8889_line13,
      0,
    ),
    schedule2_line18_hsa_excess_tax: owners.reduce(
      (n, o) => n + o.filed_part_vii.line49,
      0,
    ),
  };
}
