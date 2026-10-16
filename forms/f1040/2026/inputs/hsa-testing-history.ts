import {
  hsaFundingReview2025Schema,
  reconcileHsaFundingSources,
} from "./hsa-funding-evidence.ts";
import { hsaTestingPeriodIncome } from "../../nodes/intermediate/forms/adjustments/health/form8889/testing-income.ts";
import { roundWholeDollars } from "../../whole-dollars.ts";
import { z } from "zod";
import {
  calculateHsaEligibility2025History,
  hsaEligibility2025HistorySchema,
} from "./hsa-eligibility.ts";
import { hsaHouseholdLimitAmounts } from "../../nodes/intermediate/forms/adjustments/health/form8889/household-limits.ts";
import { CoverageType as C } from "../../nodes/intermediate/forms/adjustments/health/form8889/contribution-limit.ts";
import {
  compareHsaAmounts,
  hsaExactAmount,
  hsaExactArithmetic as math,
  roundHsaAmount,
} from "../../nodes/intermediate/forms/adjustments/health/form8889/exact-amount.ts";
import {
  HSA_CATCHUP_2025,
  HSA_FAMILY_LIMIT_2025,
  HSA_SELF_ONLY_LIMIT_2025,
} from "../../nodes/config/2025.ts";
import {
  isSourceMoney,
  sourceCents,
} from "../../nodes/intermediate/forms/taxes/retirement/form4972/source-rounding.ts";

const ref = z.string().trim().min(1),
  date = z.string().date(),
  tin = z.string().regex(/^\d{9}$/);
const line = z.number().int().nonnegative().max(1_000_000_000);
const money = z.number().finite().positive().max(10_000_000).refine(
  isSourceMoney,
);
const allocation = z.object({
  record_reference: ref,
  agreed_by_both_spouses_verified: z.literal(true),
  taxpayer_share: z.object({
    numerator: z.number().int().min(0).max(10_000_000),
    denominator: z.number().int().min(1).max(10_000_000),
  }).strict()
    .refine((s) => s.numerator <= s.denominator),
}).strict();

/** Filed contribution-year sources, retaining separate cash and IRA testing windows. */
export const hsaContribution2025HistorySchema = z.object({
  tax_year: z.literal(2025),
  record_reference: ref,
  reviewed_on: date,
  taxpayer_tin: tin,
  spouse_tin: tin.optional(),
  married_at_year_end: z.boolean(),
  marriage_record_reference: ref,
  same_identified_spouse_and_marital_status_throughout_2025_verified: z.literal(
    true,
  ),
  complete_prior_household_hsa_accounts_and_contribution_inventory_verified: z
    .literal(true),
  last_month_rule_elected: z.boolean(),
  election_reference: ref.optional(),
  allocation: allocation.optional(),
  no_archer_msa_or_qualified_ira_funding_contributions_verified: z.literal(true)
    .optional(),
  no_archer_msa_contributions_verified: z.literal(true).optional(),
  qualified_funding_review: hsaFundingReview2025Schema.optional(),
  no_death_or_disability_testing_exception_in_2025_verified: z.literal(true)
    .optional(),
  no_other_2025_testing_income_verified: z.literal(true).optional(),
  no_contribution_returns_recoveries_or_prior_excess_deduction_adjustments_verified:
    z.literal(true),
  latest_original_or_amended_return_verified: z.literal(true),
  no_pending_prior_year_corrections_verified: z.literal(true),
  owners: z.array(
    z.object({
      eligibility: hsaEligibility2025HistorySchema,
      has_hsa: z.boolean(),
    }).strict(),
  ).min(1).max(2),
  filed_forms: z.array(
    z.object({
      owner_tin: tin,
      form8889_source_reference: ref,
      filed_return_reference: ref,
      filed_on: date,
      lines: z.object({
        line2: line,
        line3: line,
        line4: z.literal(0),
        line5: line,
        line6: line,
        line7: line,
        line8: line,
        line9: line,
        line10: line,
        line11: line,
        line12: line,
        line13: line,
      }).strict(),
      filed_part_iii: z.object({
        line18: z.literal(0),
        line19: line,
        line20: line,
        line21: line,
        ira_exclusion_workpaper_reference: ref,
        excluded_qualified_funding_amount: money,
        latest_filed_ira_exclusion_and_basis_reviewed: z.literal(true),
      }).strict().optional(),
      funding_receipts: z.array(
        z.object({
          record_reference: ref,
          owner_tin: tin,
          trustee_tin: tin,
          account_number: ref,
          custodian_transaction_identifier: ref,
          custodian_statement_reference: ref,
          received_on: date,
          amount: money,
          originating_ira_type: z.enum([
            "traditional",
            "roth",
            "sep",
            "simple",
          ]),
          ira_distribution_source_reference: ref,
          source_account_or_payment_reference: ref,
          direct_trustee_transfer_verified: z.literal(true),
        }).strict(),
      ).max(2).default([]),
      contributions: z.array(
        z.object({
          record_reference: ref,
          trustee_tin: tin,
          account_number: ref,
          owner_tin: tin,
          custodian_transaction_identifier: ref,
          custodian_statement_reference: ref,
          received_on: date,
          contribution_tax_year: z.literal(2025),
          tax_year_designation_reference: ref,
          payment_source_reference: ref,
          kind: z.enum(["personal_cash", "employer_cash"]),
          amount: money,
          employer_payroll_reference: ref.optional(),
        }).strict(),
      ).max(10000),
    }).strict(),
  ).min(1).max(2),
}).strict();
export const hsaLastMonth2025HistorySchema = hsaContribution2025HistorySchema
  .extend({
    last_month_rule_elected: z.literal(true),
    election_reference: ref,
  });
export type HsaContribution2025History = z.input<
  typeof hsaContribution2025HistorySchema
>;
export type HsaLastMonth2025History = z.input<
  typeof hsaLastMonth2025HistorySchema
>;

export function reconcileHsaLastMonth2025History(raw: HsaLastMonth2025History) {
  return reconcileHsaContribution2025History(
    hsaLastMonth2025HistorySchema.parse(raw),
  );
}
export function reconcileHsaContribution2025History(
  raw: HsaContribution2025History,
) {
  const s = hsaContribution2025HistorySchema.parse(raw);
  if (
    s.last_month_rule_elected !== !!s.election_reference ||
    (s.qualified_funding_review
      ? s.no_archer_msa_or_qualified_ira_funding_contributions_verified ||
        !s.no_archer_msa_contributions_verified ||
        !s.no_death_or_disability_testing_exception_in_2025_verified ||
        !s.no_other_2025_testing_income_verified ||
        s.qualified_funding_review.reviewed_on > s.reviewed_on
      : !s.no_archer_msa_or_qualified_ira_funding_contributions_verified ||
        s.no_archer_msa_contributions_verified ||
        s.no_death_or_disability_testing_exception_in_2025_verified ||
        s.no_other_2025_testing_income_verified)
  ) {
    throw Error(
      "2025 HSA history requires consistent election, funding and completed prior testing reviews",
    );
  }
  const ids = [s.taxpayer_tin, ...(s.spouse_tin ? [s.spouse_tin] : [])];
  if (
    s.filed_forms.some((f) =>
      f.filed_on < "2026-01-01" || f.filed_on > s.reviewed_on
    ) ||
    s.reviewed_on < "2026-04-15" ||
    s.married_at_year_end !== !!s.spouse_tin ||
    new Set(ids).size !== ids.length ||
    s.owners.length !== ids.length ||
    new Set(s.owners.map((o) => o.eligibility.owner_tin)).size !== ids.length ||
    s.owners.some((o) =>
      !ids.includes(o.eligibility.owner_tin) ||
      o.eligibility.reviewed_on > s.reviewed_on
    )
  ) {
    throw Error(
      "2025 HSA testing history needs the actual filed household and completed source reviews",
    );
  }
  const owners = ids.map((id) =>
    s.owners.find((o) => o.eligibility.owner_tin === id)!
  );
  const eligibility = owners.map((o) =>
    calculateHsaEligibility2025History(o.eligibility)
  );
  const forms = s.filed_forms;
  if (
    forms.length !== owners.filter((o) => o.has_hsa).length ||
    new Set(forms.map((f) => f.owner_tin)).size !== forms.length ||
    new Set(forms.map((f) => f.form8889_source_reference)).size !==
      forms.length ||
    forms.some((f) =>
      !owners.some((o) => o.has_hsa && o.eligibility.owner_tin === f.owner_tin)
    )
  ) {
    throw Error(
      "2025 HSA testing history needs one distinct filed owner form for every account holder",
    );
  }
  const coverage = eligibility.map((e, i) =>
    e.eligible_hdhp_coverage_by_month.map((c, m) =>
      s.married_at_year_end && c !== null &&
        eligibility[1 - i].eligible_hdhp_coverage_by_month[m] !== null &&
        (c === C.Family ||
          eligibility[1 - i].eligible_hdhp_coverage_by_month[m] === C.Family)
        ? C.Family
        : c
    )
  );
  if (
    s.last_month_rule_elected &&
    owners.some((o, i) => o.has_hsa && coverage[i][11] === null)
  ) {
    throw Error(
      "2025 HSA last-month history needs actual December eligibility for each account holder",
    );
  }
  const limitsOwners = owners.map((o, i) => ({
    hasAccount: o.has_hsa,
    age55: eligibility[i].age_55_or_older,
  }));
  const rules = {
    selfOnlyLimit: HSA_SELF_ONLY_LIMIT_2025,
    familyLimit: HSA_FAMILY_LIMIT_2025,
    catchupLimit: HSA_CATCHUP_2025,
  };
  const selected = hsaHouseholdLimitAmounts(
    s.last_month_rule_elected
      ? coverage.map((c, i) =>
        owners[i].has_hsa ? Array<C | null>(12).fill(c[11]) : c
      )
      : coverage,
    limitsOwners,
    s.married_at_year_end,
    s.allocation,
    rules,
  );
  const paired = s.married_at_year_end && owners.every((o) => o.has_hsa);
  const sharedMonths = paired
    ? coverage[0].filter((c, m) =>
      c === C.Family && coverage[1][m] === C.Family
    ).length
    : 0;
  const baseline = hsaHouseholdLimitAmounts(
    coverage,
    limitsOwners,
    s.married_at_year_end,
    sharedMonths ? s.allocation : undefined,
    rules,
  );
  if (compareHsaAmounts(selected.total_limit, baseline.total_limit) < 0) {
    throw Error(
      "2025 HSA last-month election cannot reduce the monthly household limit",
    );
  }
  const fundingReceipts = forms.flatMap((f) =>
    f.funding_receipts.map((r) => ({
      ...r,
      hsa_account_reference: `${r.trustee_tin}/${r.account_number}`,
    }))
  );
  if (
    fundingReceipts.some((r) => !r.received_on.startsWith("2025-")) ||
    forms.some((f) =>
      f.funding_receipts.some((r) => r.owner_tin !== f.owner_tin)
    ) ||
    (!!s.qualified_funding_review !== (fundingReceipts.length > 0))
  ) {
    throw Error(
      "2025 HSA funding history needs actual contribution-year receipts for each filed owner",
    );
  }
  const funding = s.qualified_funding_review
    ? reconcileHsaFundingSources(
      2025,
      s.qualified_funding_review,
      fundingReceipts,
      {
        taxpayer_ssn: s.taxpayer_tin,
        claim: {
          reviewed_on: s.owners.reduce(
            (d, o) =>
              d > o.eligibility.reviewed_on ? d : o.eligibility.reviewed_on,
            "2026-01-01",
          ),
        },
        household_eligibility: { owners: s.owners.map((o) => o.eligibility) },
      },
      owners.map((o, i) => ({
        owner_tin: o.eligibility.owner_tin,
        actual_eligible_hdhp_coverage_by_month: coverage[i],
      })),
      rules,
    )
    : [];
  const records = new Set<string>(),
    transactions = new Set<string>(),
    accountOwners = new Map<string, string>();
  const result = owners.flatMap((o, i) => {
    if (!o.has_hsa) return [];
    const f = forms.find((f) => f.owner_tin === o.eligibility.owner_tin)!;
    let personal = 0, employer = 0;
    const fundingOwner = funding.find((q) => q.owner_tin === f.owner_tin);
    for (const r of [...f.contributions, ...f.funding_receipts]) {
      const account = `${r.trustee_tin}/${r.account_number}`;
      const txn = `${account}/${r.custodian_transaction_identifier}`;
      if (
        r.owner_tin !== f.owner_tin || records.has(r.record_reference) ||
        transactions.has(txn) ||
        (accountOwners.has(account) &&
          accountOwners.get(account) !== f.owner_tin) ||
        r.received_on < "2025-01-01" || r.received_on > "2026-04-15" ||
        ("kind" in r &&
          (r.kind === "employer_cash") !== !!r.employer_payroll_reference)
      ) {
        throw Error(
          "2025 HSA contributions require distinct owned trustee payments, designations and employer payroll sources",
        );
      }
      records.add(r.record_reference);
      transactions.add(txn);
      accountOwners.set(account, f.owner_tin);
      if ("kind" in r) {
        if (r.kind === "personal_cash") personal += sourceCents(r.amount);
        else employer += sourceCents(r.amount);
      }
    }
    const l = selected.limits[i]!,
      b = baseline.limits[i]!,
      u = selected.units_per_dollar,
      bu = baseline.units_per_dollar;
    const exactLimit = hsaExactAmount(l.line8, u),
      exactMonthly = hsaExactAmount(b.line8, bu);
    const cash = hsaExactAmount(personal + employer, 100);
    const qualifiedAmount = fundingOwner?.amount ?? hsaExactAmount(0, 1);
    if (compareHsaAmounts(math.add(cash, qualifiedAmount), exactLimit) > 0) {
      throw Error(
        "2025 testing history with excess contributions needs a settled correction source route",
      );
    }
    const filed6 = roundHsaAmount(hsaExactAmount(l.line6, u)),
      filed7 = roundHsaAmount(hsaExactAmount(l.line7, u));
    const filed2 = roundHsaAmount(hsaExactAmount(personal, 100)),
      filed9 = roundHsaAmount(hsaExactAmount(employer, 100));
    const filed10 = roundHsaAmount(qualifiedAmount);
    const filed8 = filed6 + filed7,
      filed12 = Math.max(0, filed8 - filed9 - filed10);
    const expected = {
      line2: filed2,
      line3: roundHsaAmount(hsaExactAmount(l.line3, u)),
      line4: 0,
      line5: roundHsaAmount(hsaExactAmount(l.line5, u)),
      line6: filed6,
      line7: filed7,
      line8: filed8,
      line9: filed9,
      line10: filed10,
      line11: filed9 + filed10,
      line12: filed12,
      line13: Math.min(filed2, filed12),
    };
    if (
      Object.entries(expected).some(([k, v]) =>
        f.lines[k as keyof typeof f.lines] !== v
      )
    ) {
      throw Error(
        "2025 HSA filed Part I must reconcile its actual receipts, annual limits and spouse allocation",
      );
    }
    const transfers = (fundingOwner?.transfers ?? []).map((t) => {
      const first = eligibility[i].eligible_hdhp_coverage_by_month.findIndex((
        c,
        m,
      ) => m + 1 >= t.month && c === null);
      return {
        ...t,
        first_ineligible_in_2025: first < 0
          ? undefined
          : `2025-${String(first + 1).padStart(2, "0")}-01`,
      };
    });
    const failed2025 = transfers.filter((t) => t.first_ineligible_in_2025)
      .reduce((n, t) => n + sourceCents(t.amount), 0);
    const prior19 = roundHsaAmount(hsaExactAmount(failed2025, 100));
    const priorTax = hsaTestingPeriodIncome(0, prior19);
    const filedIII = f.filed_part_iii;
    if (
      fundingOwner
        ? !filedIII ||
          compareHsaAmounts(
              hsaExactAmount(
                sourceCents(filedIII.excluded_qualified_funding_amount),
                100,
              ),
              qualifiedAmount,
            ) !== 0 ||
          filedIII.line19 !== prior19 || filedIII.line20 !== priorTax.income ||
          filedIII.line21 !== roundWholeDollars(priorTax.additionalTax)
        : !!filedIII
    ) {
      throw Error(
        "2025 HSA funding must reconcile filed IRA exclusion and prior testing income without duplicate recapture",
      );
    }
    return [{
      owner_tin: f.owner_tin,
      owner_dob: o.eligibility.owner_dob,
      form8889_source_reference: f.form8889_source_reference,
      filed_return_reference: f.filed_return_reference,
      contributions: f.contributions,
      exact_allowed_cash: cash,
      exact_elected_limit: exactLimit,
      exact_monthly_limit: exactMonthly,
      qualified_funding_transfers: transfers,
      exact_qualified_funding: qualifiedAmount,
      last_month_rule_elected: s.last_month_rule_elected,
      exact_last_month_exposure: s.last_month_rule_elected
        ? math.min(
          cash,
          math.subtractFloorZero(math.add(cash, qualifiedAmount), exactMonthly),
        )
        : hsaExactAmount(0, 1),
      testing_period: { starts_on: "2025-12-01", ends_on: "2026-12-31" },
    }];
  });
  return { source_input: s, owners: result };
}
