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

/** Prior-year source records stay dated 2025. This ordinary cash history route
 * excludes qualified funding, Archer MSA offsets and contribution corrections. */
export const hsaLastMonth2025HistorySchema = z.object({
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
  last_month_rule_elected: z.literal(true),
  election_reference: ref,
  allocation: allocation.optional(),
  no_archer_msa_or_qualified_ira_funding_contributions_verified: z.literal(
    true,
  ),
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
        line10: z.literal(0),
        line11: line,
        line12: line,
        line13: line,
      }).strict(),
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
export type HsaLastMonth2025History = z.input<
  typeof hsaLastMonth2025HistorySchema
>;

export function reconcileHsaLastMonth2025History(raw: HsaLastMonth2025History) {
  const s = hsaLastMonth2025HistorySchema.parse(raw);
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
  if (owners.some((o, i) => o.has_hsa && coverage[i][11] === null)) {
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
    coverage.map((c, i) =>
      owners[i].has_hsa ? Array<C | null>(12).fill(c[11]) : c
    ),
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
  const records = new Set<string>(),
    transactions = new Set<string>(),
    accountOwners = new Map<string, string>();
  const result = owners.flatMap((o, i) => {
    if (!o.has_hsa) return [];
    const f = forms.find((f) => f.owner_tin === o.eligibility.owner_tin)!;
    let personal = 0, employer = 0;
    for (const r of f.contributions) {
      const account = `${r.trustee_tin}/${r.account_number}`;
      const txn = `${account}/${r.custodian_transaction_identifier}`;
      if (
        r.owner_tin !== f.owner_tin || records.has(r.record_reference) ||
        transactions.has(txn) ||
        (accountOwners.has(account) &&
          accountOwners.get(account) !== f.owner_tin) ||
        r.received_on < "2025-01-01" || r.received_on > "2026-04-15" ||
        (r.kind === "employer_cash") !== !!r.employer_payroll_reference
      ) {
        throw Error(
          "2025 HSA contributions require distinct owned trustee payments, designations and employer payroll sources",
        );
      }
      records.add(r.record_reference);
      transactions.add(txn);
      accountOwners.set(account, f.owner_tin);
      if (r.kind === "personal_cash") personal += sourceCents(r.amount);
      else employer += sourceCents(r.amount);
    }
    const l = selected.limits[i]!,
      b = baseline.limits[i]!,
      u = selected.units_per_dollar,
      bu = baseline.units_per_dollar;
    const exactLimit = hsaExactAmount(l.line8, u),
      exactMonthly = hsaExactAmount(b.line8, bu);
    const cash = hsaExactAmount(personal + employer, 100);
    if (compareHsaAmounts(cash, exactLimit) > 0) {
      throw Error(
        "2025 testing history with excess contributions needs a settled correction source route",
      );
    }
    const filed6 = roundHsaAmount(hsaExactAmount(l.line6, u)),
      filed7 = roundHsaAmount(hsaExactAmount(l.line7, u));
    const filed2 = roundHsaAmount(hsaExactAmount(personal, 100)),
      filed9 = roundHsaAmount(hsaExactAmount(employer, 100));
    const filed8 = filed6 + filed7, filed12 = Math.max(0, filed8 - filed9);
    const expected = {
      line2: filed2,
      line3: roundHsaAmount(hsaExactAmount(l.line3, u)),
      line4: 0,
      line5: roundHsaAmount(hsaExactAmount(l.line5, u)),
      line6: filed6,
      line7: filed7,
      line8: filed8,
      line9: filed9,
      line10: 0,
      line11: filed9,
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
    return [{
      owner_tin: f.owner_tin,
      owner_dob: o.eligibility.owner_dob,
      form8889_source_reference: f.form8889_source_reference,
      filed_return_reference: f.filed_return_reference,
      contributions: f.contributions,
      exact_allowed_cash: cash,
      exact_elected_limit: exactLimit,
      exact_monthly_limit: exactMonthly,
      exact_last_month_exposure: math.subtractFloorZero(cash, exactMonthly),
      testing_period: { starts_on: "2025-12-01", ends_on: "2026-12-31" },
    }];
  });
  return { source_input: s, owners: result };
}
