import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../../core/types/tax-node.ts";
import { output, TaxNode } from "../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../core/types/output-nodes.ts";
import { schedule2 } from "../../aggregation/schedule2/index.ts";
import type { NodeContext } from "../../../../../../core/types/node-context.ts";
import { CONFIG_BY_YEAR } from "../../../config/index.ts";

// ─── TY2025 Constants (Rev Proc 2024-40; IRS Publication 926) ────────────────

// FICA rates — employer and employee share each pay:
// Social Security: 6.2% employer + 6.2% employee = 12.4% total
// Medicare: 1.45% employer + 1.45% employee = 2.9% total
// Combined: 7.65% employer + 7.65% employee = 15.3% total
const SS_RATE_EMPLOYER = 0.062;
const SS_RATE_EMPLOYEE = 0.062;
const MEDICARE_RATE_EMPLOYER = 0.0145;
const MEDICARE_RATE_EMPLOYEE = 0.0145;
const TY2025_FICA_CASH_WAGE_THRESHOLD = 2_800;
const TY2025_SOCIAL_SECURITY_WAGE_BASE = 176_100;
const calendarDate = z.string().refine((value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) &&
    date.toISOString().slice(0, 10) === value;
}, "Expected a valid ISO calendar date");
const futaEmployeeSchema = z.object({
  employee_id: z.string().trim().min(1),
  payroll_source_reference: z.string().trim().min(1),
  // Family-member exceptions require their own evidence and are not inferred
  // from totals. An unrelated student minor has separate age/source proof.
  relationship: z.literal("unrelated"),
  age_18_or_older_for_fica: z.boolean(),
  student_minor_fica_exclusion: z.object({
    birth_date: calendarDate,
    birth_date_source_reference: z.string().trim().min(1),
    student_enrollment_source_reference: z.string().trim().min(1),
    student_during_2025_verified: z.literal(true),
  }).strict().optional(),
  nonstudent_minor_fica_inclusion: z.object({
    birth_date: calendarDate,
    birth_date_source_reference: z.string().trim().min(1),
    education_status_source_reference: z.string().trim().min(1),
    principal_occupation_source_reference: z.string().trim().min(1),
    not_a_student_during_2025_verified: z.literal(true),
    household_services_principal_occupation_verified: z.literal(true),
  }).strict().optional(),
  ordinary_cash_only: z.literal(true),
  annual_cash_wages: z.number().positive(),
  quarterly_cash_wages: z.tuple([
    z.number().nonnegative(),
    z.number().nonnegative(),
    z.number().nonnegative(),
    z.number().nonnegative(),
  ]),
  w2: z.object({
    source_reference: z.string().trim().min(1),
    box2_federal_income_tax_withheld: z.number().nonnegative(),
    box3_social_security_wages: z.number().nonnegative(),
    box5_medicare_wages: z.number().nonnegative(),
  }).strict().optional(),
  federal_withholding_agreement: z.object({
    w4_source_reference: z.string().trim().min(1),
    employee_requested_and_employer_agreed: z.literal(true),
  }).strict().optional(),
}).strict();
const familyWithholdingEmployeeBaseSchema = z.object({
  employee_id: z.string().trim().min(1),
  employee_ssn: z.string().regex(/^\d{9}$/),
  relationship_source_reference: z.string().trim().min(1),
  payroll_source_reference: z.string().trim().min(1),
  ordinary_cash_only: z.literal(true),
  annual_cash_wages: z.number().positive(),
  quarterly_cash_wages: z.tuple([
    z.number().nonnegative(),
    z.number().nonnegative(),
    z.number().nonnegative(),
    z.number().nonnegative(),
  ]),
  federal_income_tax_withholding_requested_and_agreed: z.literal(true),
  w4_source_reference: z.string().trim().min(1),
  w2: z.object({
    source_reference: z.string().trim().min(1),
    employee_ssn: z.string().regex(/^\d{9}$/),
    box1_wages: z.number().positive(),
    box2_federal_income_tax_withheld: z.number().positive(),
    box3_social_security_wages: z.literal(0),
    box5_medicare_wages: z.literal(0),
  }).strict(),
});
const familyWithholdingEmployeeSchema = z.discriminatedUnion("relationship", [
  familyWithholdingEmployeeBaseSchema.extend({
    relationship: z.literal("child"),
    birth_date: calendarDate,
    birth_date_source_reference: z.string().trim().min(1),
  }).strict(),
  familyWithholdingEmployeeBaseSchema.extend({
    relationship: z.literal("spouse"),
    marriage_date: calendarDate,
    marriage_source_reference: z.string().trim().min(1),
    marriage_continuity_source_reference: z.string().trim().min(1),
    married_through_2025_verified: z.literal(true),
  }).strict(),
]);

// The complete payroll inventory retains actual family relationships rather
// than treating excluded wages as unrelated-worker wages.
const familyPayrollBaseSchema = familyWithholdingEmployeeBaseSchema.omit({
  federal_income_tax_withholding_requested_and_agreed: true,
  w4_source_reference: true,
  w2: true,
}).extend({
  w2: familyWithholdingEmployeeBaseSchema.shape.w2.extend({
    box2_federal_income_tax_withheld: z.number().nonnegative(),
  }).strict().optional(),
  federal_withholding_agreement:
    futaEmployeeSchema.shape.federal_withholding_agreement,
});
const sourceReference = z.string().trim().min(1);
const fourWeekCarePeriodSchema = z.object({
  from: calendarDate,
  to: calendarDate,
  medical_source_reference: sourceReference,
}).strict();
const parentQuarterSchema = z.object({
  quarter: z.number().int().min(1).max(4),
  home_residence_source_reference: sourceReference,
  child: z.union([
    z.object({
      kind: z.literal("none"),
      no_child_of_employer_living_in_home_verified: z.literal(true),
    }).strict(),
    z.object({
      kind: z.literal("child"),
      child_ssn: z.string().regex(/^\d{9}$/),
      relationship_source_reference: sourceReference,
      birth_date: calendarDate,
      birth_date_source_reference: sourceReference,
      lived_in_employers_home_throughout_service_quarter_verified: z.literal(
        true,
      ),
      adult_care_period: fourWeekCarePeriodSchema.optional(),
    }).strict(),
  ]),
  employer_circumstances: z.union([
    z.object({
      kind: z.literal("divorced_not_remarried"),
      divorce_date: calendarDate,
      divorce_source_reference: sourceReference,
      no_remarriage_throughout_quarter_verified: z.literal(true),
      continuity_source_reference: sourceReference,
    }).strict(),
    z.object({
      kind: z.literal("widowed_not_remarried"),
      spouse_death_date: calendarDate,
      death_source_reference: sourceReference,
      no_remarriage_throughout_quarter_verified: z.literal(true),
      continuity_source_reference: sourceReference,
    }).strict(),
    z.object({
      kind: z.literal("spouse_incapable"),
      spouse_ssn: z.string().regex(/^\d{9}$/),
      spouse_relationship_source_reference: sourceReference,
      living_with_spouse_throughout_quarter_verified: z.literal(true),
      spouse_residence_source_reference: sourceReference,
      incapable_care_period: fourWeekCarePeriodSchema,
    }).strict(),
    z.object({
      kind: z.literal("never_married"),
      status_source_reference: sourceReference,
      never_married_throughout_quarter_verified: z.literal(true),
    }).strict(),
    z.object({
      kind: z.literal("married_capable_spouse"),
      spouse_ssn: z.string().regex(/^\d{9}$/),
      spouse_relationship_source_reference: sourceReference,
      spouse_residence_source_reference: sourceReference,
      spouse_care_capacity_source_reference: sourceReference,
      living_with_capable_spouse_throughout_quarter_verified: z.literal(true),
    }).strict(),
  ]),
}).strict();
const parentFicaReviewSchema = z.union([
  z.object({
    classification: z.literal("excluded"),
    source_reference: sourceReference,
    no_child_of_employer_living_in_home_during_2025_verified: z.literal(true),
  }).strict(),
  z.object({
    classification: z.literal("quarterly_circumstances"),
    quarterly_circumstances: z.array(parentQuarterSchema).length(4),
    wage_payments: z.array(
      z.object({
        payment_reference: sourceReference,
        paid_date: calendarDate,
        service_from: calendarDate,
        service_to: calendarDate,
        cash_wages: z.number().positive(),
      }).strict(),
    ).min(1),
  }).strict(),
]);
const parentPayrollEmployeeSchema = familyPayrollBaseSchema.extend({
  relationship: z.literal("parent"),
  birth_date: calendarDate,
  birth_date_source_reference: sourceReference,
  parent_fica_review: parentFicaReviewSchema,
  w2: familyWithholdingEmployeeBaseSchema.shape.w2.extend({
    box2_federal_income_tax_withheld: z.number().nonnegative(),
    box3_social_security_wages: z.number().nonnegative(),
    box5_medicare_wages: z.number().nonnegative(),
  }).strict().optional(),
}).strict();
type ParentPayrollEmployee = z.infer<typeof parentPayrollEmployeeSchema>;

const childServicePaymentSchema = z.object({
  payment_reference: sourceReference,
  paid_date: calendarDate,
  service_from: calendarDate,
  service_to: calendarDate,
  cash_wages: z.number().positive(),
}).strict();
const childAgeTransitionSchema = z.object({
  service_payment_ledger_source_reference: sourceReference,
  wage_payments: z.array(childServicePaymentSchema).min(2),
}).strict();
const childPayrollEmployeeSchema = familyPayrollBaseSchema.extend({
  relationship: z.literal("child"),
  birth_date: calendarDate,
  birth_date_source_reference: sourceReference,
  age_21_transition_review: childAgeTransitionSchema.optional(),
  w2: familyPayrollBaseSchema.shape.w2.unwrap().extend({
    box3_social_security_wages: z.number().nonnegative(),
    box5_medicare_wages: z.number().nonnegative(),
  }).strict().optional(),
}).strict();
type ChildPayrollEmployee = z.infer<typeof childPayrollEmployeeSchema>;

function childPost21Wages(employee: ChildPayrollEmployee) {
  const review = employee.age_21_transition_review;
  if (!review) return { wages: 0, paidQuarters: [0, 0, 0, 0] };
  if (employee.birth_date === "2004-02-29") {
    throw new Error(
      "Schedule H leap-day age transition needs separate birthday-law review",
    );
  }
  const birthday = `2025${employee.birth_date.slice(4)}`;
  const paidQuarters = [0, 0, 0, 0], allPaidQuarters = [0, 0, 0, 0];
  const quarter = (date: string) => Math.ceil(Number(date.slice(5, 7)) / 3) - 1;
  const references = [
    employee.relationship_source_reference,
    employee.birth_date_source_reference,
    employee.payroll_source_reference,
    review.service_payment_ledger_source_reference,
    ...review.wage_payments.map((p) => p.payment_reference),
    ...(employee.w2 ? [employee.w2.source_reference] : []),
    ...(employee.federal_withholding_agreement
      ? [employee.federal_withholding_agreement.w4_source_reference]
      : []),
  ];
  if (new Set(references).size !== references.length) {
    throw new Error(
      "Schedule H child transition needs distinct retained source references",
    );
  }
  let wages = 0, total = 0, before = false, after = false;
  const periods = [...review.wage_payments].sort((a, b) =>
    a.service_from.localeCompare(b.service_from)
  );
  for (const [index, payment] of periods.entries()) {
    if (
      payment.paid_date < "2025-01-01" || payment.paid_date > "2025-12-31" ||
      payment.service_from < "2025-01-01" ||
      payment.service_to > "2025-12-31" ||
      payment.service_from > payment.service_to ||
      payment.paid_date < payment.service_to ||
      index > 0 && periods[index - 1].service_to >= payment.service_from ||
      payment.service_from < birthday && payment.service_to >= birthday
    ) {
      throw new Error(
        "Schedule H child transition needs distinct dated services split at the 21st birthday and paid in 2025",
      );
    }
    total += payment.cash_wages;
    allPaidQuarters[quarter(payment.paid_date)] += payment.cash_wages;
    if (payment.service_from >= birthday) {
      after = true;
      wages += payment.cash_wages;
      paidQuarters[quarter(payment.paid_date)] += payment.cash_wages;
    } else before = true;
  }
  if (
    !before || !after || total !== employee.annual_cash_wages ||
    allPaidQuarters.some((amount, index) =>
      amount !== employee.quarterly_cash_wages[index]
    )
  ) {
    throw new Error(
      "Schedule H child transition payment ledger must reconcile both ages and every paid quarter",
    );
  }
  return { wages, paidQuarters };
}

function parentTaxableCashWages(
  employee: ParentPayrollEmployee,
  employerSsn: string,
): number {
  const review = employee.parent_fica_review;
  if (employee.birth_date > "2024-12-31") {
    throw new Error("Schedule H parent birth date must precede 2025");
  }
  if (review.classification === "excluded") return 0;
  const quarters = review.quarterly_circumstances;
  if (new Set(quarters.map((q) => q.quarter)).size !== 4) {
    throw new Error(
      "Schedule H parent review needs all four distinct quarters",
    );
  }
  const bounds = (q: number) => ({
    from: `2025-${String((q - 1) * 3 + 1).padStart(2, "0")}-01`,
    to: ["2025-03-31", "2025-06-30", "2025-09-30", "2025-12-31"][q - 1],
  });
  const quarter = (date: string) => Math.ceil(Number(date.slice(5, 7)) / 3);
  const care = (
    period: z.infer<typeof fourWeekCarePeriodSchema>,
    q: number,
  ) => {
    const b = bounds(q);
    if (
      period.from < b.from || period.to > b.to || period.from > period.to ||
      (Date.parse(period.to) - Date.parse(period.from)) / 86400000 + 1 < 28
    ) {
      throw new Error(
        "Schedule H parent care condition needs four continuous weeks within the service quarter",
      );
    }
  };
  for (const row of quarters) {
    const b = bounds(row.quarter), status = row.employer_circumstances;
    if (row.child.kind === "child") {
      if (
        row.child.child_ssn === employee.employee_ssn ||
        row.child.child_ssn === employerSsn ||
        row.child.birth_date > b.from
      ) {
        throw new Error(
          "Schedule H parent child identity and birth must match service-quarter household facts",
        );
      }
      if (row.child.adult_care_period) {
        care(row.child.adult_care_period, row.quarter);
      }
    }
    if (
      status.kind === "divorced_not_remarried" &&
        status.divorce_date > b.from ||
      status.kind === "widowed_not_remarried" &&
        status.spouse_death_date > b.from
    ) {
      throw new Error(
        "Schedule H parent marital event must precede its complete source quarter",
      );
    }
    if (status.kind === "spouse_incapable") {
      care(status.incapable_care_period, row.quarter);
    }
  }
  const payments = review.wage_payments, paidQuarters = [0, 0, 0, 0];
  if (
    new Set(payments.map((p) => p.payment_reference)).size !== payments.length
  ) {
    throw new Error("Schedule H parent payment references must be unique");
  }
  let total = 0, eligible = 0;
  for (const payment of payments) {
    if (
      payment.paid_date < "2025-01-01" || payment.paid_date > "2025-12-31" ||
      payment.service_from < "2025-01-01" ||
      payment.service_to > "2025-12-31" ||
      payment.service_from > payment.service_to ||
      payment.paid_date < payment.service_to ||
      quarter(payment.service_from) !== quarter(payment.service_to)
    ) {
      throw new Error(
        "Schedule H parent cash payments need dated 2025 services within one sourced quarter",
      );
    }
    paidQuarters[quarter(payment.paid_date) - 1] += payment.cash_wages;
    total += payment.cash_wages;
    const row = quarters.find((q) =>
      q.quarter === quarter(payment.service_from)
    )!;
    const child = row.child, status = row.employer_circumstances;
    const eighteenth = child.kind === "child"
      ? `${Number(child.birth_date.slice(0, 4)) + 18}${
        child.birth_date.slice(4)
      }`
      : "";
    if (
      child.kind === "child" && payment.service_from < eighteenth &&
      payment.service_to >= eighteenth && !child.adult_care_period
    ) {
      throw new Error(
        "Schedule H parent services across child age 18 need separately sourced payment periods",
      );
    }
    const childQualifies = child.kind === "child" &&
      (payment.service_to < eighteenth ||
        child.adult_care_period !== undefined);
    const employerQualifies = [
      "divorced_not_remarried",
      "widowed_not_remarried",
      "spouse_incapable",
    ].includes(status.kind);
    if (childQualifies && employerQualifies) eligible += payment.cash_wages;
  }
  if (
    total !== employee.annual_cash_wages ||
    paidQuarters.some((v, i) => v !== employee.quarterly_cash_wages[i])
  ) {
    throw new Error(
      "Schedule H parent payment ledger must reconcile annual and payment-quarter cash wages",
    );
  }
  return eligible >= TY2025_FICA_CASH_WAGE_THRESHOLD ? eligible : 0;
}

const payrollEmployeeSchema = z.union([
  futaEmployeeSchema,
  parentPayrollEmployeeSchema,
  childPayrollEmployeeSchema,
  familyPayrollBaseSchema.extend({
    relationship: z.literal("spouse"),
    marriage_date: calendarDate,
    marriage_source_reference: z.string().trim().min(1),
    marriage_continuity_source_reference: z.string().trim().min(1),
    married_through_2025_verified: z.literal(true),
  }).strict(),
]);

// ─── Schema ───────────────────────────────────────────────────────────────────

export const inputSchema = z.object({
  // MeF identity and per-employee line A answer cannot be inferred from payroll.
  employer_ein: z.string().regex(/^\d{9}$/).optional(),
  family_employer_ssn: z.string().regex(/^\d{9}$/).optional(),
  cash_wages_over_2025_limit: z.boolean().optional(),
  cash_wages_over_quarter_limit: z.boolean().optional(),
  // Social Security wages (may differ if wages exceed SS wage base)
  ss_wages: z.number().nonnegative().optional(),

  // Medicare wages (all FICA wages — no wage base cap)
  medicare_wages: z.number().nonnegative().optional(),

  // Line 5 is the sum of wages above $200,000 for each employee, not the
  // employer's aggregate Medicare wages above $200,000.
  additional_medicare_wages: z.number().nonnegative().optional(),

  // Federal income tax withheld from household employee wages
  // Must withhold only if employee requests it (Form W-4)
  federal_income_tax_withheld: z.number().nonnegative().optional(),

  // Complete worker inventory, retaining family and minor classifications.
  // Aggregate quarters in both years establish the absence of FUTA.
  fica_only_payroll: z.object({
    all_household_employees_included: z.literal(true),
    prior_year_payroll_source_reference: z.string().trim().min(1),
    prior_year_quarter_cash_wages: z.tuple([
      z.number().nonnegative(),
      z.number().nonnegative(),
      z.number().nonnegative(),
      z.number().nonnegative(),
    ]),
    employee_wages: z.array(payrollEmployeeSchema).min(1),
  }).strict().optional(),

  // One sourced child or spouse. Family wages are excluded from FICA and FUTA,
  // but agreed Form W-4 withholding belongs on line 7.
  family_withholding_only_payroll: z.object({
    all_household_employees_included: z.literal(true),
    employer_ssn: z.string().regex(/^\d{9}$/),
    employee: familyWithholdingEmployeeSchema,
  }).strict().optional(),

  // Part II Section A/B: the payroll ledger verifies each employee's $7,000 cap.
  federal_unemployment: z.union([
    z.object({
      paid_only_one_state: z.literal(true),
      all_contributions_paid_on_time: z.literal(true),
      all_futa_wages_state_taxable: z.literal(true),
      state: z.string().regex(/^[A-Z]{2}$/),
      contributions_paid: z.number().positive().optional(),
      zero_experience_rate: z.literal(true).optional(),
      taxable_wages: z.number().nonnegative(),
      all_household_employees_included: z.literal(true),
      prior_year_quarter_threshold_met: z.boolean(),
      prior_year_quarter_source_reference: z.string().trim().min(1).optional(),
      prior_year_eligible_quarter_source_reference: sourceReference.optional(),
      prior_year_eligible_quarter_cash_wages: z.tuple([
        z.number().nonnegative(),
        z.number().nonnegative(),
        z.number().nonnegative(),
        z.number().nonnegative(),
      ]).optional(),
      employee_wages: z.array(payrollEmployeeSchema).min(1),
    }).strict(),
    z.object({
      paid_only_one_state: z.boolean(),
      all_contributions_paid_on_time: z.boolean(),
      all_futa_wages_state_taxable: z.boolean(),
      taxable_futa_wages: z.number().nonnegative(),
      all_household_employees_included: z.literal(true),
      prior_year_quarter_threshold_met: z.boolean(),
      prior_year_quarter_source_reference: z.string().trim().min(1).optional(),
      prior_year_eligible_quarter_source_reference: sourceReference.optional(),
      prior_year_eligible_quarter_cash_wages: z.tuple([
        z.number().nonnegative(),
        z.number().nonnegative(),
        z.number().nonnegative(),
        z.number().nonnegative(),
      ]).optional(),
      employee_wages: z.array(payrollEmployeeSchema).min(1),
      state_rows: z.array(
        z.object({
          state: z.string().regex(/^[A-Z]{2}$/),
          taxable_state_wages: z.number().nonnegative(),
          experience_rate: z.number().min(0).max(1).optional(),
          rate_period_from: calendarDate.optional(),
          rate_period_to: calendarDate.optional(),
          contributions_paid_by_due_date: z.number().nonnegative(),
        }).strict(),
      ).min(1).max(62),
      late_contributions: z.number().positive().optional(),
      credit_reduction_wages: z.array(
        z.object({
          state: z.enum(["CA", "VI"]),
          taxable_futa_wages: z.number().nonnegative(),
        }).strict(),
      ).optional(),
    }).strict(),
  ]).optional(),
}).strict();

export type ScheduleHInput = z.infer<typeof inputSchema>;

// ─── Pure Helpers ─────────────────────────────────────────────────────────────

// Lines 1 and 3 must already account for each employee's threshold, exclusions,
// and Social Security wage base. The employer's aggregate payroll cannot do so.
export function computeScheduleHAmounts(
  input: ScheduleHInput,
  taxYear: number,
) {
  if ((input.ss_wages === undefined) !== (input.medicare_wages === undefined)) {
    throw new Error(
      "Schedule H requires both taxable Social Security and Medicare wage amounts",
    );
  }
  if (
    input.additional_medicare_wages !== undefined &&
    (input.medicare_wages === undefined ||
      input.additional_medicare_wages > input.medicare_wages)
  ) {
    throw new Error(
      "Schedule H Additional Medicare wages require a sufficient Medicare wage amount",
    );
  }
  if (
    input.cash_wages_over_quarter_limit === true &&
    !input.federal_unemployment
  ) {
    throw new Error("Schedule H needs Part II unemployment details");
  }
  if (
    input.federal_unemployment &&
    input.cash_wages_over_quarter_limit !== true
  ) {
    throw new Error("Schedule H Part II requires a true quarter-limit answer");
  }
  const unemployment = input.federal_unemployment;
  const ficaOnly = input.fica_only_payroll;
  const family = input.family_withholding_only_payroll;
  if (unemployment && ficaOnly) {
    throw new Error(
      "Schedule H requires one complete household payroll inventory",
    );
  }
  const familyWorkers = (unemployment ?? ficaOnly)?.employee_wages.filter(
    (employee) => employee.relationship !== "unrelated",
  ) ?? [];
  if (input.family_employer_ssn && familyWorkers.length === 0) {
    throw new Error(
      "Schedule H family employer identity requires family payroll",
    );
  }
  const familySsns = familyWorkers.map((employee) => employee.employee_ssn);
  if (new Set(familySsns).size !== familySsns.length) {
    throw new Error("Schedule H family employee identities must be unique");
  }
  if (family) {
    const employee = family.employee;
    const relationshipRecord = employee.relationship === "child"
      ? employee.birth_date_source_reference
      : employee.marriage_source_reference;
    const references = [
      employee.relationship_source_reference,
      relationshipRecord,
      ...(employee.relationship === "spouse"
        ? [employee.marriage_continuity_source_reference]
        : []),
      employee.payroll_source_reference,
      employee.w4_source_reference,
      employee.w2.source_reference,
    ];
    if (
      taxYear !== 2025 || unemployment || ficaOnly ||
      (employee.relationship === "child" &&
        (employee.birth_date < "2005-01-01" ||
          employee.birth_date > "2024-12-31")) ||
      (employee.relationship === "spouse" &&
        employee.marriage_date > "2024-12-31") ||
      employee.employee_ssn === family.employer_ssn ||
      new Set(references).size !== references.length ||
      employee.quarterly_cash_wages.reduce((sum, wages) => sum + wages, 0) !==
        employee.annual_cash_wages ||
      employee.w2.employee_ssn !== employee.employee_ssn ||
      employee.w2.box1_wages !== employee.annual_cash_wages ||
      employee.w2.box2_federal_income_tax_withheld >
        employee.annual_cash_wages ||
      input.cash_wages_over_2025_limit !== false ||
      input.cash_wages_over_quarter_limit !== false ||
      (input.ss_wages ?? 0) !== 0 ||
      (input.medicare_wages ?? 0) !== 0 ||
      (input.additional_medicare_wages ?? 0) !== 0 ||
      input.federal_income_tax_withheld !==
        employee.w2.box2_federal_income_tax_withheld
    ) {
      throw new Error(
        "Schedule H family withholding source must reconcile relationship, payroll, Form W-4, Form W-2, and FICA/FUTA exclusions",
      );
    }
  }
  if (
    ficaOnly && (
      unemployment || taxYear !== 2025 ||
      input.cash_wages_over_quarter_limit !== false ||
      ficaOnly.prior_year_quarter_cash_wages.some((wages) => wages >= 1_000)
    )
  ) {
    throw new Error(
      "Schedule H FICA-only source needs both years below the FUTA quarter threshold",
    );
  }
  if (
    unemployment && (
      unemployment.prior_year_quarter_threshold_met !==
        (unemployment.prior_year_quarter_source_reference !== undefined) ||
      unemployment.prior_year_eligible_quarter_cash_wages !== undefined &&
        unemployment.prior_year_eligible_quarter_cash_wages.some((w) =>
            w >= 1_000
          ) !==
          unemployment.prior_year_quarter_threshold_met
    )
  ) {
    throw new Error(
      "Schedule H prior-year FUTA quarter needs its payroll source reference",
    );
  }
  const payroll = unemployment ?? ficaOnly;
  if (payroll) {
    if (
      unemployment &&
      payroll.employee_wages.some((employee) =>
        employee.relationship === "child" &&
        employee.age_21_transition_review !== undefined
      ) && (!unemployment.prior_year_eligible_quarter_cash_wages ||
        !unemployment.prior_year_eligible_quarter_source_reference ||
        unemployment.prior_year_eligible_quarter_source_reference ===
          unemployment.prior_year_quarter_source_reference)
    ) {
      throw new Error(
        "Schedule H child transition prior-year FUTA test needs dated eligible-quarter cash wages",
      );
    }
    const ids = payroll.employee_wages.map((employee) => employee.employee_id);
    if (new Set(ids).size !== ids.length) {
      throw new Error("Schedule H FUTA employee payroll IDs must be unique");
    }
    const payrollReferences = payroll.employee_wages.map(
      (employee) => employee.payroll_source_reference,
    );
    if (new Set(payrollReferences).size !== payrollReferences.length) {
      throw new Error("Schedule H employee payroll sources must be unique");
    }
    const w2References = payroll.employee_wages.flatMap((employee) =>
      employee.w2 ? [employee.w2.source_reference] : []
    );
    if (new Set(w2References).size !== w2References.length) {
      throw new Error(
        "Schedule H employee Form W-2 source references must be unique",
      );
    }
    const quarterlyWages = [0, 0, 0, 0];
    let sourcedSocialSecurityWages = 0;
    let sourcedMedicareWages = 0;
    let sourcedFederalWithholding = 0;
    let sourcedAdditionalMedicareWages = 0;
    let sourcedFicaThresholdMet = false;
    for (const employee of payroll.employee_wages) {
      if (employee.relationship !== "unrelated") {
        const references = [
          employee.relationship_source_reference,
          employee.payroll_source_reference,
          ...(employee.relationship !== "spouse"
            ? [employee.birth_date_source_reference]
            : [
              employee.marriage_source_reference,
              employee.marriage_continuity_source_reference,
            ]),
          ...(employee.w2 ? [employee.w2.source_reference] : []),
          ...(employee.federal_withholding_agreement
            ? [employee.federal_withholding_agreement.w4_source_reference]
            : []),
          ...(ficaOnly ? [ficaOnly.prior_year_payroll_source_reference] : []),
        ];
        const withholding = employee.w2?.box2_federal_income_tax_withheld ?? 0;
        const parentWages = employee.relationship === "parent"
          ? parentTaxableCashWages(employee, input.family_employer_ssn ?? "")
          : 0;
        const childTransition = employee.relationship === "child" &&
            employee.birth_date >= "2004-01-01" &&
            employee.birth_date <= "2004-12-31"
          ? childPost21Wages(employee)
          : undefined;
        if (
          employee.relationship === "child" &&
          ((employee.birth_date >= "2004-01-01" &&
            employee.birth_date <= "2004-12-31") !==
            (employee.age_21_transition_review !== undefined))
        ) {
          throw new Error(
            "Schedule H child turning 21 needs the dated service and payment review",
          );
        }
        if (employee.relationship === "parent") {
          const reviewReferences =
            employee.parent_fica_review.classification === "excluded"
              ? [employee.parent_fica_review.source_reference]
              : employee.parent_fica_review.wage_payments.map((p) =>
                p.payment_reference
              );
          if (reviewReferences.some((ref) => references.includes(ref))) {
            throw new Error(
              "Schedule H parent circumstances and payments need distinct source references",
            );
          }
          const expectedSS = Math.min(
            parentWages,
            TY2025_SOCIAL_SECURITY_WAGE_BASE,
          );
          if (
            (employee.w2?.box3_social_security_wages ?? 0) !== expectedSS ||
            (employee.w2?.box5_medicare_wages ?? 0) !== parentWages ||
            parentWages > 0 && !employee.w2
          ) {
            throw new Error(
              "Schedule H parent W-2 FICA wages must match the sourced statutory exception",
            );
          }
          sourcedSocialSecurityWages += expectedSS;
          sourcedMedicareWages += parentWages;
          sourcedAdditionalMedicareWages += Math.max(0, parentWages - 200_000);
          sourcedFicaThresholdMet ||= parentWages > 0;
        }
        if (childTransition) {
          const ficaWages = childTransition.wages >=
              TY2025_FICA_CASH_WAGE_THRESHOLD
            ? childTransition.wages
            : 0;
          const expectedSS = Math.min(
            ficaWages,
            TY2025_SOCIAL_SECURITY_WAGE_BASE,
          );
          if (
            (employee.w2?.box3_social_security_wages ?? 0) !== expectedSS ||
            (employee.w2?.box5_medicare_wages ?? 0) !== ficaWages ||
            ficaWages > 0 && !employee.w2
          ) {
            throw new Error(
              "Schedule H child transition W-2 must match taxable post-21 service wages",
            );
          }
          sourcedSocialSecurityWages += expectedSS;
          sourcedMedicareWages += ficaWages;
          sourcedAdditionalMedicareWages += Math.max(0, ficaWages - 200_000);
          sourcedFicaThresholdMet ||= ficaWages > 0;
          childTransition.paidQuarters.forEach((wages, index) => {
            quarterlyWages[index] += wages;
          });
        } else if (
          employee.relationship === "child" &&
          ((employee.w2?.box3_social_security_wages ?? 0) !== 0 ||
            (employee.w2?.box5_medicare_wages ?? 0) !== 0)
        ) {
          throw new Error(
            "Schedule H under-21 child W-2 cannot report taxable FICA wages",
          );
        }

        if (
          taxYear !== 2025 || !input.family_employer_ssn || family ||
          employee.employee_ssn === input.family_employer_ssn ||
          (employee.relationship === "child" &&
            (employee.birth_date < "2004-01-01" ||
              employee.birth_date > "2024-12-31")) ||
          (employee.relationship === "spouse" &&
            employee.marriage_date > "2024-12-31") ||
          new Set(references).size !== references.length ||
          employee.quarterly_cash_wages.reduce(
              (sum, wages) => sum + wages,
              0,
            ) !== employee.annual_cash_wages ||
          (employee.w2 && (employee.w2.employee_ssn !== employee.employee_ssn ||
            employee.w2.box1_wages !== employee.annual_cash_wages)) ||
          withholding > employee.annual_cash_wages ||
          (withholding > 0 && !employee.federal_withholding_agreement)
        ) {
          throw new Error(
            "Schedule H mixed family payroll must reconcile relationship, employer, dates, payroll, W-2 and agreed withholding",
          );
        }
        sourcedFederalWithholding += withholding;
        // Parent and spouse wages remain excluded. Child services performed
        // on or after the 21st birthday enter the paid-quarter FUTA test.
        continue;
      }
      const minor = employee.student_minor_fica_exclusion;
      const workingMinor = employee.nonstudent_minor_fica_inclusion;
      if (employee.age_18_or_older_for_fica) {
        if (minor !== undefined || workingMinor !== undefined) {
          throw new Error(
            "Schedule H adult worker cannot claim a minor FICA classification",
          );
        }
      } else {
        if ((minor === undefined) === (workingMinor === undefined)) {
          throw new Error(
            "Schedule H minor needs exactly one student or principal-occupation source classification",
          );
        }
        const birthDate = minor?.birth_date ?? workingMinor!.birth_date;
        const references = minor
          ? [
            minor.birth_date_source_reference,
            minor.student_enrollment_source_reference,
            employee.payroll_source_reference,
          ]
          : [
            workingMinor!.birth_date_source_reference,
            workingMinor!.education_status_source_reference,
            workingMinor!.principal_occupation_source_reference,
            employee.payroll_source_reference,
          ];
        if (
          birthDate < "2007-01-02" || birthDate > "2024-12-31" ||
          new Set(references).size !== references.length
        ) {
          throw new Error(
            "Schedule H minor needs distinct age, education, occupation, and payroll sources proving under 18 in 2025",
          );
        }
      }
      if (
        employee.quarterly_cash_wages.reduce(
          (total, wages) => total + wages,
          0,
        ) !==
          employee.annual_cash_wages
      ) {
        throw new Error(
          "Schedule H employee quarterly cash wages differ from annual payroll",
        );
      }
      employee.quarterly_cash_wages.forEach((wages, index) => {
        quarterlyWages[index] += wages;
      });
      const ficaWages = (employee.age_18_or_older_for_fica ||
          workingMinor !== undefined) &&
          employee.annual_cash_wages >= TY2025_FICA_CASH_WAGE_THRESHOLD
        ? employee.annual_cash_wages
        : 0;
      sourcedFicaThresholdMet ||= ficaWages > 0;
      const expectedSS = Math.min(ficaWages, TY2025_SOCIAL_SECURITY_WAGE_BASE);
      if (
        (employee.w2?.box3_social_security_wages ?? 0) !== expectedSS ||
        (employee.w2?.box5_medicare_wages ?? 0) !== ficaWages ||
        (ficaWages > 0 && !employee.w2)
      ) {
        throw new Error(
          "Schedule H employee Form W-2 FICA wages differ from payroll",
        );
      }
      if (ficaOnly) {
        const references = [
          employee.payroll_source_reference,
          ficaOnly.prior_year_payroll_source_reference,
          ...(employee.w2 ? [employee.w2.source_reference] : []),
          ...(minor
            ? [
              minor.birth_date_source_reference,
              minor.student_enrollment_source_reference,
            ]
            : []),
          ...(workingMinor
            ? [
              workingMinor.birth_date_source_reference,
              workingMinor.education_status_source_reference,
              workingMinor.principal_occupation_source_reference,
            ]
            : []),
        ];
        if (new Set(references).size !== references.length) {
          throw new Error(
            "Schedule H FICA-only worker needs distinct current/prior payroll, classification, and W-2 sources",
          );
        }
      }
      if (
        (employee.w2?.box2_federal_income_tax_withheld ?? 0) > 0 &&
        (!employee.federal_withholding_agreement ||
          [
            employee.payroll_source_reference,
            employee.w2!.source_reference,
            ...(ficaOnly ? [ficaOnly.prior_year_payroll_source_reference] : []),
          ].includes(
            employee.federal_withholding_agreement.w4_source_reference,
          ))
      ) {
        throw new Error(
          "Schedule H federal withholding needs a distinct reviewed Form W-4 request and employer agreement",
        );
      }
      sourcedSocialSecurityWages += expectedSS;
      sourcedMedicareWages += ficaWages;
      sourcedAdditionalMedicareWages += Math.max(0, ficaWages - 200_000);
      sourcedFederalWithholding +=
        employee.w2?.box2_federal_income_tax_withheld ?? 0;
    }
    if (
      unemployment && !unemployment.prior_year_quarter_threshold_met &&
      quarterlyWages.every((wages) => wages < 1_000)
    ) {
      throw new Error(
        "Schedule H FUTA needs a $1,000 current- or prior-year quarter",
      );
    }
    if (ficaOnly && quarterlyWages.some((wages) => wages >= 1_000)) {
      throw new Error(
        "Schedule H FICA-only aggregate employee wages must stay below the FUTA quarter threshold",
      );
    }
    if (
      input.cash_wages_over_2025_limit !== undefined &&
      input.cash_wages_over_2025_limit !== sourcedFicaThresholdMet
    ) {
      throw new Error("Schedule H line A differs from per-employee cash wages");
    }
    if (
      (input.ss_wages ?? 0) !== sourcedSocialSecurityWages ||
      (input.medicare_wages ?? 0) !== sourcedMedicareWages ||
      (input.additional_medicare_wages ?? 0) !==
        sourcedAdditionalMedicareWages ||
      (input.federal_income_tax_withheld ?? 0) !== sourcedFederalWithholding
    ) {
      throw new Error(
        "Schedule H FICA and withholding differ from employee Forms W-2",
      );
    }
    if (unemployment) {
      const sourcedFutaWages = payroll.employee_wages.reduce(
        (total, employee) =>
          total +
          (employee.relationship === "unrelated"
            ? Math.min(employee.annual_cash_wages, 7_000)
            : employee.relationship === "child" &&
                employee.age_21_transition_review
            ? Math.min(childPost21Wages(employee).wages, 7_000)
            : 0),
        0,
      );
      const filedFutaWages = "taxable_wages" in unemployment
        ? unemployment.taxable_wages
        : unemployment.taxable_futa_wages;
      if (sourcedFutaWages !== filedFutaWages) {
        throw new Error(
          "Schedule H FUTA wages differ from per-employee payroll after the $7,000 cap",
        );
      }
    }
  }
  if (unemployment && taxYear !== 2025) {
    throw new Error(
      `Schedule H FUTA payroll thresholds and credit rates are not configured for ${taxYear}`,
    );
  }
  if (unemployment && "taxable_wages" in unemployment) {
    if (
      (unemployment.contributions_paid === undefined) ===
        (unemployment.zero_experience_rate === undefined)
    ) {
      throw new Error(
        "Schedule H Section A needs either contributions paid or an explicit 0% rate",
      );
    }
  }
  if (unemployment && "state_rows" in unemployment) {
    if (
      unemployment.paid_only_one_state &&
      unemployment.all_contributions_paid_on_time &&
      unemployment.all_futa_wages_state_taxable
    ) {
      throw new Error(
        "Schedule H Section B requires a No answer on line 10, 11, or 12",
      );
    }
    if (
      unemployment.all_contributions_paid_on_time ===
        (unemployment.late_contributions !== undefined)
    ) {
      throw new Error(
        "Schedule H late contributions must match the line 11 answer",
      );
    }
    for (const row of unemployment.state_rows) {
      if (
        (row.experience_rate === undefined &&
          row.rate_period_from !== undefined) ||
        (row.rate_period_from === undefined) !==
          (row.rate_period_to === undefined) ||
        (row.experience_rate !== undefined &&
          row.rate_period_from === undefined) ||
        (row.rate_period_from !== undefined &&
          (row.rate_period_from > row.rate_period_to! ||
            row.rate_period_from < `${taxYear}-01-01` ||
            row.rate_period_to! > `${taxYear}-12-31`))
      ) {
        throw new Error(
          "Schedule H state experience rate needs a valid date period",
        );
      }
    }
    const reductionStates = new Set(
      unemployment.credit_reduction_wages?.map((entry) => entry.state) ?? [],
    );
    if (
      reductionStates.size !==
        (unemployment.credit_reduction_wages?.length ?? 0) ||
      [...reductionStates].some((state) =>
        !unemployment.state_rows.some((row) => row.state === state)
      )
    ) {
      throw new Error(
        "Schedule H credit reduction state wages must match unique state rows",
      );
    }
    if (
      (unemployment.credit_reduction_wages ?? []).reduce(
        (total, entry) => total + entry.taxable_futa_wages,
        0,
      ) > unemployment.taxable_futa_wages
    ) {
      throw new Error(
        "Schedule H credit reduction wages exceed total FUTA wages",
      );
    }
    for (const state of ["CA", "VI"] as const) {
      if (
        unemployment.state_rows.some((row) => row.state === state) &&
        !reductionStates.has(state)
      ) {
        throw new Error(
          `Schedule H needs ${state} credit reduction FUTA wages`,
        );
      }
    }
    if (
      reductionStates.size > 0 && unemployment.paid_only_one_state
    ) {
      throw new Error(
        "Schedule H line 10 must be No for a credit reduction state",
      );
    }
  }
  const socialSecurityTax = Math.round(
    Math.round(input.ss_wages ?? 0) * (SS_RATE_EMPLOYER + SS_RATE_EMPLOYEE),
  );
  const medicareTax = Math.round(
    Math.round(input.medicare_wages ?? 0) *
      (MEDICARE_RATE_EMPLOYER + MEDICARE_RATE_EMPLOYEE),
  );
  const additionalMedicareTax = Math.round(
    Math.round(input.additional_medicare_wages ?? 0) * 0.009,
  );
  const ficaAndWithholding = socialSecurityTax + medicareTax +
    additionalMedicareTax +
    Math.round(input.federal_income_tax_withheld ?? 0);
  const sectionB = unemployment && "state_rows" in unemployment
    ? computeSectionB(unemployment)
    : undefined;
  const futaTax = sectionB?.futaTax ??
    (unemployment && "taxable_wages" in unemployment
      ? Math.round(Math.round(unemployment.taxable_wages) * 0.006)
      : 0);
  return {
    socialSecurityTax,
    medicareTax,
    additionalMedicareTax,
    ficaAndWithholding,
    futaTax,
    sectionB,
    totalTax: ficaAndWithholding + futaTax,
  };
}

function computeSectionB(
  input: Extract<NonNullable<ScheduleHInput["federal_unemployment"]>, {
    state_rows: unknown;
  }>,
) {
  const rows = input.state_rows.map((row) => {
    const creditAt54 = row.experience_rate !== undefined &&
        row.experience_rate < 0.054
      ? Math.round(row.taxable_state_wages * 0.054)
      : undefined;
    const creditAtStateRate = creditAt54 === undefined
      ? undefined
      : Math.round(row.taxable_state_wages * row.experience_rate!);
    return {
      ...row,
      creditAt54,
      creditAtStateRate,
      additionalCredit: creditAt54 === undefined
        ? 0
        : Math.max(0, creditAt54 - creditAtStateRate!),
    };
  });
  const additionalCredit = rows.reduce(
    (total, row) => total + row.additionalCredit,
    0,
  );
  const contributions = rows.reduce(
    (total, row) => total + row.contributions_paid_by_due_date,
    0,
  );
  const tentativeCredit = additionalCredit + contributions;
  const grossTax = Math.round(input.taxable_futa_wages * 0.06);
  const maximumCredit = Math.round(input.taxable_futa_wages * 0.054);
  const lateCredit = input.late_contributions === undefined ? 0 : Math.round(
    Math.min(
      Math.max(0, maximumCredit - tentativeCredit),
      input.late_contributions,
    ) * 0.9,
  );
  const reduction = (input.credit_reduction_wages ?? []).reduce(
    (total, entry) =>
      total + Math.round(
        entry.taxable_futa_wages * (entry.state === "CA" ? 0.012 : 0.045),
      ),
    0,
  );
  const allowedCredit = Math.max(
    0,
    Math.min(maximumCredit, tentativeCredit + lateCredit) - reduction,
  );
  return {
    rows,
    additionalCredit,
    contributions,
    tentativeCredit,
    grossTax,
    maximumCredit,
    allowedCredit,
    futaTax: grossTax - allowedCredit,
    needsWorksheet: input.late_contributions !== undefined ||
      (input.credit_reduction_wages?.length ?? 0) > 0,
  };
}

function buildOutput(totalTax: number): NodeOutput[] {
  if (totalTax <= 0) return [];
  return [output(schedule2, { line9_household_employment: totalTax })];
}

// ─── Node Class ───────────────────────────────────────────────────────────────

class ScheduleHNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "schedule_h";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule2]);

  compute(ctx: NodeContext, rawInput: ScheduleHInput): NodeResult {
    const cfg = CONFIG_BY_YEAR[ctx.taxYear];
    if (!cfg) throw new Error(`No f1040 config for year ${ctx.taxYear}`);
    const input = inputSchema.parse(rawInput);

    // If no wages or tax data provided, no output
    const hasWages = (input.ss_wages ?? 0) > 0 ||
      (input.medicare_wages ?? 0) > 0 ||
      (input.additional_medicare_wages ?? 0) > 0 ||
      (input.federal_income_tax_withheld ?? 0) > 0 ||
      input.federal_unemployment !== undefined;

    if (!hasWages) return { outputs: [] };

    const { totalTax } = computeScheduleHAmounts(input, ctx.taxYear);
    return { outputs: buildOutput(totalTax) };
  }
}

// ─── Singleton Export ─────────────────────────────────────────────────────────

export const schedule_h = new ScheduleHNode();
