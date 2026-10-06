import { form8941FamilySource } from "./review-8941-family.fixture.ts";
import { form8941OwnedInputs } from "./review-8941-owned.fixture.ts";
import { calculateForm8941 } from "../../nodes/inputs/f8941/index.ts";
import { type MonthlyArrangement } from "../../nodes/inputs/f8941/arrangements.ts";
import { monthCoverageDates } from "../../nodes/inputs/f8941/shop_evidence.ts";
import { extractFilerIdentity } from "../../mef/filer.ts";
import type { PdfReviewFixture } from "./review-fixtures.ts";

export const arrangementKinds = [
  "composite-tier-percent",
  "composite-tier-dollar",
  "composite-tier-greater-dollar",
  "list-tier-percent",
  "list-self-computed-family-floor",
  "list-self-percent-family-floor",
  "list-family-computed",
] as const;
export type ArrangementKind = typeof arrangementKinds[number];
const money = (n: number) => Math.round(n * 100) / 100;

/** Synthetic records exercise regulatory arrangements, not insurer authenticity. */
export function form8941ArrangementSource(
  kind: ArrangementKind,
  partYear = false,
) {
  const family = form8941FamilySource(false, partYear);
  const {
    uniform_employer_contribution_basis_points: _oldPct,
    qualifying_arrangement: _oldArrangement,
    insurer_billing_method: _oldBilling,
    ...source
  } = family;
  const list = kind.startsWith("list-");
  const months = [
    ...new Set(
      source.shop_review.employee_premium_reviews.flatMap((r) =>
        r.monthly_premiums.map((m) => m.month)
      ),
    ),
  ].sort((a, b) => a - b);
  const monthly_arrangements: MonthlyArrangement[] = months.map((month) => {
    const dates = monthCoverageDates(month);
    // A midyear premium change also requires distinct reference quotes/rules.
    const change = month >= 7 ? 25 : 0;
    return {
      month,
      employer_policy_reference: `Synthetic qualifying policy-${month}`,
      payer_employment_ein: source.employment_ein,
      shop_plan_reference: source.shop_plan_reference,
      coverage_start_date: dates.start,
      coverage_end_date: dates.end,
      billing_method: list ? "list" : "composite",
      employee_only_rule: kind.includes("computed")
        ? {
          method: "uniform_employee_contribution",
          employee_monthly_contribution: 575.01,
        }
        : {
          method: "uniform_percentage",
          employer_basis_points: kind === "list-tier-percent" ? 5500 : 6000,
        },
      family_rule:
        kind === "composite-tier-percent" || kind === "list-tier-percent"
          ? {
            method: "uniform_percentage",
            employer_basis_points: list ? 6000 : 5500,
          }
          : kind === "composite-tier-dollar" ||
              kind === "composite-tier-greater-dollar"
          ? {
            method: "uniform_employer_amount",
            employer_monthly_contribution: kind === "composite-tier-dollar"
              ? money((1000.05 + change) * .6)
              : 750.06 + change,
          }
          : kind === "list-family-computed"
          ? {
            method: "uniform_employee_contribution",
            employee_monthly_contribution: 1100.01,
          }
          : { method: "employee_only_floor" },
      eligible_employee_quotes: source.employees.map((employee, index) => ({
        employee_reference: employee.employee_reference,
        employee_ssn: employee.employee_ssn,
        quote_source_reference: `Synthetic insurer quote-${index + 1}-${month}`,
        employee_only_premium: (list
          ? [900.05, 1000.05, 1100.05, 1200.05, 1800.05][index]
          : 1000.05) + change,
        family_premium: (list ? 2100.07 + index * 300 : 2400.07) + change,
      })),
    };
  });
  for (const [index, employee] of source.employees.entries()) {
    const review = source.shop_review.employee_premium_reviews[index];
    review.monthly_premiums = review.monthly_premiums.map((invoice) => {
      const policy = monthly_arrangements.find((p) =>
        p.month === invoice.month
      )!;
      const quote = policy.eligible_employee_quotes[index];
      const billed = employee.coverage_tier === "family"
        ? quote.family_premium!
        : quote.employee_only_premium;
      const selfPaid = policy.employee_only_rule.method === "uniform_percentage"
        ? money(
          quote.employee_only_premium *
            policy.employee_only_rule.employer_basis_points / 10000,
        )
        : money(
          quote.employee_only_premium -
            policy.employee_only_rule.employee_monthly_contribution,
        );
      const rule = employee.coverage_tier === "family"
        ? policy.family_rule!
        : policy.employee_only_rule;
      const paid = rule.method === "uniform_percentage"
        ? money(billed * rule.employer_basis_points / 10000)
        : rule.method === "uniform_employee_contribution"
        ? money(billed - rule.employee_monthly_contribution)
        : rule.method === "uniform_employer_amount"
        ? rule.employer_monthly_contribution
        : selfPaid + index * 10;
      return {
        ...invoice,
        billed_premium: billed,
        employer_payment: paid,
        employer_policy_reference: policy.employer_policy_reference,
        insured_quote_reference: quote.quote_source_reference,
      };
    });
    employee.tax_year_shop_premium = money(
      review.monthly_premiums.reduce((sum, m) => sum + m.billed_premium, 0),
    );
    employee.employer_premium_paid = money(
      review.monthly_premiums.reduce((sum, m) => sum + m.employer_payment, 0),
    );
  }
  return {
    ...source,
    qualifying_arrangement: "monthly_owned_composite_or_list_rules" as const,
    all_plan_eligible_employees_identified_confirmed: true as const,
    all_identified_employees_plan_eligible_every_policy_month_confirmed:
      true as const,
    proprietor_and_excluded_workers_not_plan_eligible_confirmed: true as const,
    monthly_arrangements,
  };
}
export function form8941ArrangementInputs(
  kind: ArrangementKind,
  receipts = 350000,
  partYear = false,
) {
  const input = form8941OwnedInputs(receipts);
  const source = form8941ArrangementSource(kind, partYear);
  const lines = calculateForm8941(source);
  return {
    ...input,
    f8941: source,
    schedule_c: input.schedule_c.map((business) => ({
      ...business,
      line_26_wages: source.employees.reduce(
        (sum, e) => sum + e.social_security_medicare_wages,
        0,
      ),
      line_14_employee_benefits: source.other_schedule_c_employee_benefits +
        lines.line4,
    })),
  };
}
export function form8941ArrangementReviewFixture(): PdfReviewFixture {
  const inputs = form8941ArrangementInputs("list-self-computed-family-floor");
  return {
    id: "single-shop-list-computed-family-floor",
    inputs,
    filer: extractFilerIdentity(inputs.general)!,
    expectedPdfForms: [
      "f1040",
      "schedule1",
      "schedule2",
      "schedule3",
      "schedule_c",
      "schedule_se",
      "f3800",
      "form6251",
      "form8995",
      "f8941",
      "form8959",
      "form8960",
    ],
    reviewFocus: [
      "List billing computed self-only rates retain all eligible insurer quotes, uniform employee contributions and employee-specific family floors",
      "Cent amounts and midyear premiums drive monthly average-premium rows before rounding filed totals",
      "Full determined credit reduces benefits before SE/QBI/1040 and binds the native/PDF allocation",
    ],
  };
}
