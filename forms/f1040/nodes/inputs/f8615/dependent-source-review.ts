import { educationIncomeSources } from "../education_income/sources.ts";
import {
  assertDependentScholarshipReturn,
  type DependentScholarshipReview,
} from "../education_income/dependent-scholarship-review.ts";
import { FilingStatus } from "../../types.ts";
import { CONFIG_BY_YEAR } from "../../config/index.ts";
import { ordinaryTax2025 } from "../../intermediate/worksheets/tax_table_2025.ts";
import { calculateForm8615 } from "../../intermediate/forms/form8615/calculation.ts";
import { inputSchema } from "./schema.ts";

const tin = (v: unknown) => String(v ?? "").replaceAll("-", "");
const object = (v: unknown): Record<string, unknown> =>
  (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
// Finite projection: parent tax and identity do not retain the child's own
// nested parent-return snapshot. These are exact finalized public-node rows.
export const PARENT_TAX_SOURCE_KEYS = [
  "general",
  "w2",
  "f1040",
  "standard_deduction",
  "income_tax_calculation",
  "schedule3",
  "f8812",
] as const;
export function parentTaxProjection(
  pending: Readonly<Record<string, unknown>>,
) {
  return Object.fromEntries(
    PARENT_TAX_SOURCE_KEYS.filter((k) => pending[k] !== undefined).map((
      k,
    ) => [k, structuredClone(pending[k])]),
  );
}
function same(a: unknown, b: unknown): boolean {
  const normalize = (v: unknown): unknown =>
    Array.isArray(v)
      ? v.map(normalize)
      : v && typeof v === "object"
      ? Object.fromEntries(
        Object.entries(v).filter(([, x]) => x !== undefined)
          .sort(([a], [b]) => a.localeCompare(b)).map((
            [k, x],
          ) => [k, normalize(x)]),
      )
      : v;
  return JSON.stringify(normalize(a)) === JSON.stringify(normalize(b));
}
export function dependentKiddieTaxFacts(
  review: DependentScholarshipReview,
  deductionEarned: number,
) {
  const wages = review.student_w2_sources.reduce((s, r) => s + r.box1_wages, 0);
  // The Form 8615 instructions explicitly include taxable grants not reported
  // on W-2 in unearned income. This differs from the dependent SD/filing rule.
  const unearned = deductionEarned - wages;
  // Actual required-service compensation is pay for performed personal
  // services for the age/support test; issued W-2 compensation counts once.
  const supportEarned = wages +
    review.student_income_sources.reduce(
      (s, r) =>
        s + (r.kind === "scholarship_for_required_services" &&
            r.reporting.kind === "schedule1_line8r"
          ? r.taxable_amount
          : 0),
      0,
    );
  if (review.kiddie_tax_review) {
    const scholarshipCosts = review.student_income_sources.flatMap((r) =>
      r.kind === "scholarship_not_on_w2"
        ? r.nonqualified_expense_payment_sources ?? []
        : []
    );
    const excluded = review.support_sources.filter((r) =>
      r.kind === "scholarship_support"
    );
    if (
      excluded.length !== scholarshipCosts.length ||
      excluded.some((r) =>
        !scholarshipCosts.some((cost) =>
          cost.payment_record_id === r.source_document_reference &&
          tin(cost.student_ssn) === tin(r.student_ssn) &&
          cost.amount === r.amount
        )
      )
    ) {
      throw new Error(
        "Excluded dependent scholarship support must reconcile actual owned nonqualified scholarship costs",
      );
    }
  }
  const support = review.support_sources.reduce(
    (s, r) => s + (r.kind === "ordinary_support" ? r.amount : 0),
    0,
  );
  const birthday = new Date(`${review.student_dob}T00:00:00Z`);
  // IRS treats January 1 birthdays as attaining that age the preceding day.
  const age = 2025 - birthday.getUTCFullYear() +
    (birthday.getUTCMonth() === 0 && birthday.getUTCDate() === 1 ? 1 : 0);
  const requiredToFile = deductionEarned > 15750; // All owned income in this packet is SD-earned.
  const ageApplies = age < 18 ||
    (age === 18 ||
        (age >= 19 && age < 24 &&
          review.full_time_student_months.length >= 5)) &&
      supportEarned * 2 <= support;
  const taxable = Math.max(
    0,
    deductionEarned - Math.min(15750, Math.max(1350, deductionEarned + 450)),
  );
  if (taxable > 0 && !review.kiddie_tax_review) {
    throw new Error(
      "Positive-tax dependent scholarship return needs source-backed Form 8615 eligibility and parent-return review",
    );
  }
  const r = review.kiddie_tax_review;
  if (!r) {
    return {
      unearned,
      supportEarned,
      support,
      age,
      requiredToFile,
      required: false,
      taxable,
    };
  }
  const parent = object(r.settled_parent_return.pending);
  const general = object(parent.general);
  const final = object(parent.f1040);
  const deduction = object(parent.standard_deduction);
  const filer = r.settled_parent_return.filer;
  const selection = r.parent_selection;
  const pw2Raw = object(parent.w2).w2s;
  const pw2 = Array.isArray(pw2Raw) ? pw2Raw.map(object) : undefined;
  if (
    !pw2?.length || pw2.some((w) =>
      !w.source_document_reference ||
      tin(w.employee_ssn) !== tin(review.education_claimant_ssn)
    ) ||
    new Set(pw2.map((w) => w.source_document_reference)).size !== pw2.length
  ) {
    throw new Error(
      "Form 8615 parent wages need distinct issued parent-owned sources",
    );
  }
  const parentWages = pw2.reduce((s, w) => s + Number(w.box1_wages), 0);
  const parentTaxable = Math.max(0, parentWages - 15750);
  const parentTax = ordinaryTax2025(parentTaxable, FilingStatus.Single);
  const dependents = Array.isArray(general.dependents)
    ? general.dependents.map(object)
    : [];
  const name = [filer.firstName, filer.middleInitial, filer.lastName].filter(
    Boolean,
  ).join(" ");
  if (
    tin(general.taxpayer_ssn) !== tin(review.education_claimant_ssn) ||
    tin(filer.primarySSN) !== tin(review.education_claimant_ssn) ||
    !name || typeof filer.firstName !== "string" ||
    typeof filer.lastName !== "string" || !filer.lastName ||
    general.filing_status !== "single" ||
    general.taxpayer_can_be_claimed_as_dependent === true ||
    general.taxpayer_blind === true ||
    typeof general.taxpayer_dob !== "string" ||
    general.taxpayer_dob < "1961-01-02" ||
    final.line1a_wages !== parentWages ||
    final.line9_total_income !== parentWages ||
    final.line11_agi !== parentWages ||
    Number(final.line8_additional_income ?? 0) !== 0 ||
    final.line12a_standard_deduction !== 15750 ||
    final.line14_deductions_qbi_total !== 15750 ||
    final.line15_taxable_income !== parentTaxable ||
    final.line16_income_tax !== parentTax ||
    deduction.agi !== parentWages || deduction.filing_status !== "single" ||
    object(parent.income_tax_calculation).form8615_source !== undefined ||
    object(parent.income_tax_calculation).taxable_income !== parentTaxable ||
    object(parent.income_tax_calculation).filing_status !== "single" ||
    object(parent.income_tax_calculation).taking_standard_deduction !== true ||
    tin(selection.student_ssn) !== tin(review.student_ssn) ||
    tin(selection.custodial_parent_ssn) !==
      tin(review.education_claimant_ssn) ||
    tin(selection.other_parent_ssn) === tin(selection.custodial_parent_ssn) ||
    selection.custodial_parent_nights + selection.other_parent_nights !== 365 ||
    selection.custodial_parent_nights <= selection.other_parent_nights ||
    r.other_children_requiring_form8615.length !== 0 ||
    dependents.length !== 1 ||
    tin(dependents[0].ssn) !== tin(review.student_ssn) ||
    dependents[0].dob !== review.student_dob ||
    dependents[0].full_time_student !== true
  ) {
    throw new Error(
      "Form 8615 must reconcile the selected custodial parent's actual ordinary-income return and family inventory",
    );
  }
  const required = unearned > 2700 && requiredToFile && ageApplies &&
    r.parent_alive_on_2025_12_31;
  const source = required
    ? inputSchema.parse({
      eligibility_confirmed: true,
      parent_name: name,
      parent_name_control: String(filer.lastName).slice(0, 4).toUpperCase(),
      parent_ssn: general.taxpayer_ssn,
      parent_filing_status: general.filing_status,
      parent_taxable_income: final.line15_taxable_income,
      parent_income_tax: final.line16_income_tax,
      parent_tax_method: "ordinary",
      child_unearned_income: unearned,
      other_children_line5: [],
      other_children_qualified_dividends_line5: [],
      other_children_net_capital_gain_line5: [],
      other_children_schedule_d_tax_worksheet_used: [],
      other_children_form2555_used: [],
      parent_qualified_dividends: 0,
      parent_net_capital_gain: 0,
    })
    : undefined;
  return {
    unearned,
    supportEarned,
    support,
    age,
    requiredToFile,
    required,
    taxable,
    source,
  };
}
export function assertDependentKiddieTaxReturn(
  pending: Readonly<Record<string, unknown>>,
  review: DependentScholarshipReview,
  earned: number,
) {
  const facts = dependentKiddieTaxFacts(review, earned);
  if (!review.kiddie_tax_review && facts.taxable === 0) return;
  const final = object(pending.f1040);
  const taxInput = object(pending.income_tax_calculation);
  const regular = ordinaryTax2025(facts.taxable, FilingStatus.Single);
  if (!facts.required) {
    if (
      pending.form8615 !== undefined ||
      taxInput.form8615_source !== undefined ||
      final.line16_income_tax !== regular
    ) {
      throw new Error(
        "Dependent child ordinary tax must match source-derived Form 8615 eligibility",
      );
    }
    return;
  }
  const expected = calculateForm8615(facts.source!, {
    childTaxableIncome: facts.taxable,
    childFilingStatus: FilingStatus.Single,
    childRegularTax: regular,
    takingStandardDeduction: true,
    childHasPreferentialIncome: false,
    childForeignEarnedIncomeExclusion: 0,
    childAdjustedGrossIncome: earned,
    childDeduction: earned - facts.taxable,
    brackets: CONFIG_BY_YEAR[2025],
  });
  if (
    !same(taxInput.form8615_reviewed_source, facts.source) ||
    (taxInput.form8615_source !== undefined &&
      !same(taxInput.form8615_source, facts.source)) ||
    !same(pending.form8615, expected.fields) ||
    taxInput.form8615_computed_unearned_income !== facts.unearned ||
    final.line16_income_tax !== expected.line18Tax ||
    final.line24_total_tax !== expected.line18Tax
  ) {
    throw new Error(
      "Dependent Form 8615, selected parent source, child unearned income and filed tax must reconcile",
    );
  }
}
export function assertSettledParentTaxSource(
  review: DependentScholarshipReview,
  parent: Readonly<Record<string, unknown>>,
  filer?: unknown,
) {
  if (
    review.kiddie_tax_review && (!same(
      review.kiddie_tax_review.settled_parent_return.pending,
      parentTaxProjection(parent),
    ) || !same(review.kiddie_tax_review.settled_parent_return.filer, filer))
  ) {
    throw new Error(
      "Child Form 8615 must retain this exact settled parent return tax source",
    );
  }
}

export function assertReviewedDependentForm8615(
  pending: Readonly<Record<string, unknown>> | undefined,
) {
  const raw = object(pending?.general).dependent_education_income_review;
  if (raw === undefined) return;
  assertDependentScholarshipReturn(
    pending!,
    educationIncomeSources(pending?.education_income),
  );
}
