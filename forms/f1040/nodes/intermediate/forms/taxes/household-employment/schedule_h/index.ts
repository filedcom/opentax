import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../../../../core/types/tax-node.ts";
import { output, TaxNode } from "../../../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../../../core/types/output-nodes.ts";
import { schedule2 } from "../../../../aggregation/taxes/other/schedule2/index.ts";
import type { NodeContext } from "../../../../../../../../core/types/node-context.ts";
import { CONFIG_BY_YEAR } from "../../../../../config/index.ts";

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
function cashCents(amount: number): number {
  const value = Math.round(amount * 100);
  if (!Number.isFinite(amount) || Math.abs(amount * 100 - value) > 1e-7) {
    throw new Error(
      "Schedule H sourced cash amounts must have at most two decimal places",
    );
  }
  return value;
}
function quarterlyCashCents(quarters: readonly number[]): number {
  return quarters.reduce((sum, amount) => sum + cashCents(amount), 0);
}
const FUTA_STATE_CODES = new Set(
  "AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA PR RI SC SD TN TX UT VT VA WA WV WI WY VI"
    .split(" "),
);
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
const noOrdinaryFrequencySchema = z.object({
  employer_pay_practice_source_reference: sourceReference,
  complete_payment_period_ledger_source_reference: sourceReference,
  no_ordinary_payment_period_verified: z.literal(true),
}).strict();
const fourWeekCarePeriodSchema = z.object({
  from: calendarDate,
  to: calendarDate,
  medical_source_reference: sourceReference,
}).strict();
const parentRemarriageBaseSchema = z.object({
  prior_status: z.enum(["divorced", "widowed"]),
  prior_marriage_end_date: calendarDate,
  prior_marriage_end_source_reference: sourceReference,
  no_remarriage_before_event_source_reference: sourceReference,
  remarriage_date: calendarDate,
  marriage_source_reference: sourceReference,
  spouse_ssn: z.string().regex(/^\d{9}$/),
  spouse_residence_source_reference: sourceReference,
});
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
    parentRemarriageBaseSchema.extend({
      kind: z.literal("remarried_capable_spouse"),
      spouse_care_capacity_source_reference: sourceReference,
      living_with_capable_spouse_from_marriage_through_quarter_verified: z.literal(true),
    }).strict(),
    parentRemarriageBaseSchema.extend({
      kind: z.literal("remarried_spouse_incapable"),
      living_with_spouse_from_marriage_through_quarter_verified: z.literal(true),
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
  z.object({
    classification: z.literal("dated_service_periods"),
    quarterly_circumstances: z.array(parentQuarterSchema).length(4),
    complete_service_payment_ledger_source_reference: sourceReference,
    no_ordinary_frequency_review: noOrdinaryFrequencySchema.optional(),
    wage_payments: z.array(z.object({
      payment_reference: sourceReference,
      service_allocation_reference: sourceReference,
      paid_date: calendarDate,
      service_from: calendarDate,
      service_to: calendarDate,
      service_hours: z.number().finite().positive(),
      cash_wages: z.number().positive(),
      ordinary_pay_period: z.object({
        kind: z.enum(["within_31_days", "over_31_days", "no_ordinary_period"]),
        period_from: calendarDate,
        period_to: calendarDate,
        period_source_reference: sourceReference,
        service_time_source_reference: sourceReference,
      }).strict(),
    }).strict()).min(1),
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
  ordinary_pay_period: z.object({
    kind: z.enum(["within_31_days", "over_31_days", "no_ordinary_period"]),
    period_from: calendarDate,
    period_to: calendarDate,
    period_source_reference: sourceReference,
    service_time_source_reference: sourceReference,
    excluded_service_hours: z.number().nonnegative().optional(),
    covered_service_hours: z.number().nonnegative().optional(),
  }).strict(),
}).strict();
const childAgeTransitionSchema = z.object({
  service_payment_ledger_source_reference: sourceReference,
  no_ordinary_frequency_review: noOrdinaryFrequencySchema.optional(),
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

type BirthdayPeriod = {
  service_from: string;
  service_to: string;
  ordinary_pay_period: z.infer<
    typeof childServicePaymentSchema
  >["ordinary_pay_period"];
};

function coveredBirthdayService(period: BirthdayPeriod, birthday: string) {
  const review = period.ordinary_pay_period;
  if (!review) {
    throw new Error(
      "Schedule H birthday service needs retained ordinary pay-period evidence",
    );
  }
  const days = (Date.parse(review.period_to) - Date.parse(review.period_from)) /
      86_400_000 + 1;
  if (
    review.period_from > period.service_from ||
    review.period_to < period.service_to ||
    period.service_from > period.service_to || days < 1 ||
    (review.kind === "within_31_days" && days > 31) ||
    (review.kind === "over_31_days" && days <= 31) ||
    review.period_source_reference === review.service_time_source_reference
  ) {
    throw new Error(
      "Schedule H birthday wages need a sourced ordinary pay period containing the actual services",
    );
  }
  if (review.kind === "over_31_days" ||
    review.kind === "no_ordinary_period") {
    if (
      review.excluded_service_hours !== undefined ||
      review.covered_service_hours !== undefined ||
      (period.service_from < birthday && period.service_to >= birthday)
    ) {
      throw new Error(
        "Schedule H period without the majority rule needs separately allocated services and wages on one birthday side",
      );
    }
    return period.service_from >= birthday;
  }
  const crosses = review.period_from < birthday && review.period_to >= birthday;
  if (!crosses) {
    if (
      review.covered_service_hours !== undefined ||
      review.excluded_service_hours !== undefined
    ) {
      throw new Error(
        "Schedule H noncrossing pay period cannot claim birthday service-time allocation",
      );
    }
    return review.period_from >= birthday;
  }
  if (
    (review.covered_service_hours ?? 0) <= 0 ||
    (review.excluded_service_hours ?? 0) <= 0
  ) {
    throw new Error(
      "Schedule H crossing ordinary pay period needs both dated service-time totals",
    );
  }
  // Section 3306(d) and CA UIC 607 include the entire short pay period
  // when covered service occupies at least half of actual service time.
  return review.covered_service_hours! >= review.excluded_service_hours!;
}

function validateNoOrdinaryPayPractice(
  periods: BirthdayPeriod[],
  review: z.infer<typeof noOrdinaryFrequencySchema> | undefined,
) {
  const irregular = periods.filter((period) =>
    period.ordinary_pay_period.kind === "no_ordinary_period"
  );
  if (irregular.length === 0) {
    if (review) {
      throw new Error(
        "Schedule H no-ordinary payroll practice cannot override an ordinary pay period",
      );
    }
    return;
  }
  const actual = irregular.map((period) => period.ordinary_pay_period);
  const distinctPeriods = new Map<string, typeof actual[number]>();
  for (const period of actual) {
    const prior = distinctPeriods.get(period.period_source_reference);
    if (
      prior && (prior.period_from !== period.period_from ||
        prior.period_to !== period.period_to || prior.kind !== period.kind)
    ) {
      throw new Error(
        "Schedule H one irregular payment period must retain one dated source identity",
      );
    }
    distinctPeriods.set(period.period_source_reference, period);
  }
  const unique = [...distinctPeriods.values()].sort((a, b) =>
    a.period_from.localeCompare(b.period_from)
  );
  const lengths = unique.map((period) =>
    (Date.parse(period.period_to) - Date.parse(period.period_from)) / 86_400_000 +
    1
  );
  if (
    !review || irregular.length !== periods.length ||
    new Set(lengths).size < 2 ||
    unique.some((period, index) =>
      index > 0 && unique[index - 1].period_to >= period.period_from
    ) ||
    review.employer_pay_practice_source_reference ===
      review.complete_payment_period_ledger_source_reference ||
    actual.some((period) =>
      period.period_source_reference ===
        review.employer_pay_practice_source_reference ||
      period.period_source_reference ===
        review.complete_payment_period_ledger_source_reference ||
      period.service_time_source_reference ===
        review.employer_pay_practice_source_reference ||
      period.service_time_source_reference ===
        review.complete_payment_period_ledger_source_reference
    )
  ) {
    throw new Error(
      "Schedule H no-ordinary payroll exception needs complete varied payment periods and independent employer practice evidence",
    );
  }
}

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
    ...(review.no_ordinary_frequency_review
      ? [
        review.no_ordinary_frequency_review.employer_pay_practice_source_reference,
        review.no_ordinary_frequency_review.complete_payment_period_ledger_source_reference,
      ]
      : []),
    ...review.wage_payments.map((p) => p.payment_reference),
    ...new Set(
      review.wage_payments.map((p) =>
        p.ordinary_pay_period.period_source_reference
      ),
    ),
    ...new Set(
      review.wage_payments.map((p) =>
        p.ordinary_pay_period.service_time_source_reference
      ),
    ),
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
  const allocatedTimeRefs = review.wage_payments.filter((payment) =>
    payment.ordinary_pay_period.kind === "over_31_days" ||
    payment.ordinary_pay_period.kind === "no_ordinary_period"
  ).map((payment) => payment.ordinary_pay_period.service_time_source_reference);
  if (new Set(allocatedTimeRefs).size !== allocatedTimeRefs.length) {
    throw new Error(
      "Schedule H long-period service allocations need distinct retained records",
    );
  }
  let wages = 0, total = 0, before = false, after = false;
  const payPeriods = new Map<string, BirthdayPeriod["ordinary_pay_period"]>();
  const periods = [...review.wage_payments].sort((a, b) =>
    a.service_from.localeCompare(b.service_from)
  );
  validateNoOrdinaryPayPractice(periods, review.no_ordinary_frequency_review);
  for (const [index, payment] of periods.entries()) {
    if (
      payment.paid_date < "2025-01-01" || payment.paid_date > "2025-12-31" ||
      payment.service_from < "2025-01-01" ||
      payment.service_to > "2025-12-31" ||
      payment.service_from > payment.service_to ||
      payment.paid_date < payment.service_to ||
      index > 0 && periods[index - 1].service_to >= payment.service_from
    ) {
      throw new Error(
        "Schedule H child transition needs distinct dated services split at the 21st birthday and paid in 2025",
      );
    }
    const paymentCents = cashCents(payment.cash_wages);
    const periodReview = payment.ordinary_pay_period;
    const previousPeriod = payPeriods.get(periodReview.period_source_reference);
    if (previousPeriod) {
      if (
        previousPeriod.period_from !== periodReview.period_from ||
        previousPeriod.period_to !== periodReview.period_to ||
        previousPeriod.kind !== periodReview.kind ||
        (periodReview.kind === "within_31_days" &&
          JSON.stringify(previousPeriod) !== JSON.stringify(periodReview))
      ) {
        throw new Error(
          "Schedule H one ordinary pay period must use one retained period and service-time record",
        );
      }
    } else {
      if (
        [...payPeriods.values()].some((other) =>
          other.period_from <= periodReview.period_to &&
          other.period_to >= periodReview.period_from
        )
      ) {
        throw new Error("Schedule H ordinary pay periods cannot overlap");
      }
      payPeriods.set(periodReview.period_source_reference, periodReview);
    }
    const covered = coveredBirthdayService(payment, birthday);
    before ||= payment.service_from < birthday;
    after ||= payment.service_to >= birthday;
    total += paymentCents;
    allPaidQuarters[quarter(payment.paid_date)] += paymentCents;
    if (covered) {
      wages += paymentCents;
      paidQuarters[quarter(payment.paid_date)] += paymentCents;
    }
  }
  if (
    !before || !after || total !== cashCents(employee.annual_cash_wages) ||
    allPaidQuarters.some((amount, index) =>
      amount !== cashCents(employee.quarterly_cash_wages[index])
    )
  ) {
    throw new Error(
      "Schedule H child transition payment ledger must reconcile both ages and every paid quarter",
    );
  }
  return { wages: wages / 100, paidQuarters: paidQuarters.map((c) => c / 100) };
}

function parentDatedCashWages(
  employee: ParentPayrollEmployee,
  review: Extract<z.infer<typeof parentFicaReviewSchema>, { classification: "dated_service_periods" }>,
  quarters: z.infer<typeof parentQuarterSchema>[],
): number {
  const quarter = (date: string) => Math.ceil(Number(date.slice(5, 7)) / 3) - 1;
  const payments = [...review.wage_payments].sort((a, b) =>
    a.service_from.localeCompare(b.service_from)
  );
  const uniquePayments = new Set(payments.map((p) => p.payment_reference));
  if (uniquePayments.size !== payments.length ||
    uniquePayments.has(review.complete_service_payment_ledger_source_reference)) {
    throw new Error("Schedule H parent dated service needs distinct payment and ledger sources");
  }
  const evidenceRefs = [
    ...uniquePayments,
    ...new Set(payments.map((p) => p.service_allocation_reference)),
    ...new Set(payments.map((p) => p.ordinary_pay_period.period_source_reference)),
    ...new Set(payments.map((p) => p.ordinary_pay_period.service_time_source_reference)),
    review.complete_service_payment_ledger_source_reference,
    ...(review.no_ordinary_frequency_review ? [
      review.no_ordinary_frequency_review.employer_pay_practice_source_reference,
      review.no_ordinary_frequency_review.complete_payment_period_ledger_source_reference,
    ] : []),
  ];
  if (new Set(evidenceRefs).size !== evidenceRefs.length) {
    throw new Error("Schedule H parent dated service, cash and pay-practice sources must be distinct");
  }
  validateNoOrdinaryPayPractice(payments, review.no_ordinary_frequency_review);
  const periods = new Map<string, {
    from: string;
    to: string;
    kind: string;
    timeRef: string;
    coveredHours: number;
    excludedHours: number;
    cashCents: number;
    coveredCents: number;
  }>();
  const allocations = new Map<string, {
    from: string; to: string; hours: number; periodRef: string;
  }>();
  const paidQuarters = [0, 0, 0, 0];
  let total = 0;
  for (const [index, payment] of payments.entries()) {
    const p = payment.ordinary_pay_period;
    const days = (Date.parse(p.period_to) - Date.parse(p.period_from)) / 86400000 + 1;
    if (payment.paid_date < "2025-01-01" || payment.paid_date > "2025-12-31" ||
      payment.service_from < "2025-01-01" || payment.service_to > "2025-12-31" ||
      payment.service_from > payment.service_to || payment.paid_date < payment.service_to ||
      quarter(payment.service_from) !== quarter(payment.service_to) ||
      p.period_from > payment.service_from || p.period_to < payment.service_to ||
      days < 1 || p.kind === "within_31_days" && days > 31 ||
      p.kind === "over_31_days" && days <= 31 ||
      p.period_source_reference === p.service_time_source_reference ||
      p.period_source_reference === review.complete_service_payment_ledger_source_reference ||
      p.service_time_source_reference === review.complete_service_payment_ledger_source_reference) {
      throw new Error("Schedule H parent dated cash needs distinct actual service, payment and pay-period records");
    }
    const serviceDays = (Date.parse(payment.service_to) - Date.parse(payment.service_from)) / 86_400_000 + 1;
    if (payment.service_hours > serviceDays * 24) {
      throw new Error("Schedule H parent service hours exceed the retained service dates");
    }
    const row = quarters.find((q) => q.quarter === quarter(payment.service_from) + 1)!;
    const child = row.child, status = row.employer_circumstances;
    const eligibleAt = (date: string) => {
      const eighteenth = child.kind === "child"
        ? `${Number(child.birth_date.slice(0, 4)) + 18}${child.birth_date.slice(4)}`
        : "";
      const childQualifies = child.kind === "child" &&
        (date < eighteenth || child.adult_care_period !== undefined);
      const employerQualifies = status.kind === "spouse_incapable" ||
        status.kind === "remarried_spouse_incapable" ||
        status.kind === "divorced_not_remarried" && date >= status.divorce_date ||
        status.kind === "widowed_not_remarried" && date >= status.spouse_death_date ||
        status.kind === "remarried_capable_spouse" && date < status.remarriage_date;
      return childQualifies && employerQualifies;
    };
    if (status.kind === "divorced_not_remarried" &&
      status.divorce_date > ["2025-03-31", "2025-06-30", "2025-09-30", "2025-12-31"][row.quarter - 1] ||
      status.kind === "widowed_not_remarried" &&
      status.spouse_death_date > ["2025-03-31", "2025-06-30", "2025-09-30", "2025-12-31"][row.quarter - 1]) {
      throw new Error("Schedule H parent marital event must occur by its sourced service quarter");
    }
    const childBirthday = child.kind === "child" && !child.adult_care_period
      ? `${Number(child.birth_date.slice(0, 4)) + 18}${child.birth_date.slice(4)}`
      : undefined;
    const maritalEvent = status.kind === "divorced_not_remarried"
      ? status.divorce_date
      : status.kind === "widowed_not_remarried" ? status.spouse_death_date
      : status.kind === "remarried_capable_spouse" || status.kind === "remarried_spouse_incapable"
      ? status.remarriage_date : undefined;
    if ([childBirthday, maritalEvent].some((date) =>
      date !== undefined && payment.service_from < date && payment.service_to >= date
    )) {
      throw new Error("Schedule H parent service row crossing a status event needs separate dated wage and hour allocations");
    }
    const existing = periods.get(p.period_source_reference);
    if (existing && (existing.from !== p.period_from || existing.to !== p.period_to ||
      existing.kind !== p.kind || existing.timeRef !== p.service_time_source_reference)) {
      throw new Error("Schedule H one parent pay period must retain one period and service-time identity");
    }
    if (!existing && [...periods.values()].some((other) =>
      other.from <= p.period_to && other.to >= p.period_from)) {
      throw new Error("Schedule H parent ordinary pay periods cannot overlap");
    }
    const state = existing ?? {
      from: p.period_from, to: p.period_to, kind: p.kind,
      timeRef: p.service_time_source_reference, coveredHours: 0,
      excludedHours: 0, cashCents: 0, coveredCents: 0,
    };
    const cents = cashCents(payment.cash_wages);
    const allocation = allocations.get(payment.service_allocation_reference);
    if (allocation && (allocation.from !== payment.service_from ||
      allocation.to !== payment.service_to || allocation.hours !== payment.service_hours ||
      allocation.periodRef !== p.period_source_reference)) {
      throw new Error("Schedule H parent cash installments must retain the same dated service allocation");
    }
    if (!allocation && index > 0 &&
      [...allocations.values()].some((other) =>
        other.from <= payment.service_to && other.to >= payment.service_from)) {
      throw new Error("Schedule H parent distinct service allocations cannot overlap");
    }
    if (!allocation) {
      allocations.set(payment.service_allocation_reference, {
        from: payment.service_from, to: payment.service_to,
        hours: payment.service_hours, periodRef: p.period_source_reference,
      });
      if (eligibleAt(payment.service_from)) state.coveredHours += payment.service_hours;
      else state.excludedHours += payment.service_hours;
    }
    if (eligibleAt(payment.service_from)) state.coveredCents += cents;
    state.cashCents += cents;
    periods.set(p.period_source_reference, state);
    total += cents;
    paidQuarters[quarter(payment.paid_date)] += cents;
  }
  if (total !== cashCents(employee.annual_cash_wages) ||
    paidQuarters.some((amount, index) => amount !== cashCents(employee.quarterly_cash_wages[index]))) {
    throw new Error("Schedule H parent dated cash must reconcile every payment quarter and annual wage");
  }
  let coveredCents = 0;
  for (const state of periods.values()) {
    if (state.kind === "within_31_days") {
      if (state.coveredHours >= state.excludedHours) coveredCents += state.cashCents;
    } else coveredCents += state.coveredCents;
  }
  return coveredCents >= TY2025_FICA_CASH_WAGE_THRESHOLD * 100 ? coveredCents / 100 : 0;
}

// A remarriage source covers one dated event and the complete surrounding
// year; it cannot substitute a whole-quarter no-remarriage assertion.
function validateParentRemarriage(
  review: Exclude<z.infer<typeof parentFicaReviewSchema>, { classification: "excluded" }>,
  employeeSsn: string,
  employerSsn: string,
): void {
  const events = review.quarterly_circumstances.filter((row) =>
    row.employer_circumstances.kind === "remarried_capable_spouse" ||
    row.employer_circumstances.kind === "remarried_spouse_incapable"
  );
  if (!events.length) return;
  const event = events[0];
  const status = event.employer_circumstances;
  if (status.kind !== "remarried_capable_spouse" &&
    status.kind !== "remarried_spouse_incapable") return;
  const eventQuarter = Math.ceil(Number(status.remarriage_date.slice(5, 7)) / 3);
  const references = [
    status.prior_marriage_end_source_reference,
    status.no_remarriage_before_event_source_reference,
    status.marriage_source_reference,
    status.spouse_residence_source_reference,
    status.kind === "remarried_capable_spouse"
      ? status.spouse_care_capacity_source_reference
      : status.incapable_care_period.medical_source_reference,
  ];
  if (review.classification !== "dated_service_periods" || events.length !== 1 ||
    status.remarriage_date < "2025-01-01" || status.remarriage_date > "2025-12-31" ||
    eventQuarter !== event.quarter || status.prior_marriage_end_date >= "2025-01-01" ||
    status.spouse_ssn === employeeSsn || status.spouse_ssn === employerSsn ||
    new Set(references).size !== references.length) {
    throw new Error("Schedule H parent remarriage needs one dated event, distinct records and a prior-year marriage ending");
  }
  for (const row of review.quarterly_circumstances) {
    const other = row.employer_circumstances;
    if (row.quarter < event.quarter) {
      const priorMatches = status.prior_status === "divorced"
        ? other.kind === "divorced_not_remarried" &&
          other.divorce_date === status.prior_marriage_end_date &&
          other.divorce_source_reference === status.prior_marriage_end_source_reference
        : other.kind === "widowed_not_remarried" &&
          other.spouse_death_date === status.prior_marriage_end_date &&
          other.death_source_reference === status.prior_marriage_end_source_reference;
      if (!priorMatches) {
        throw new Error("Schedule H parent pre-remarriage quarters must match the prior marital record");
      }
    }
    if (row.quarter > event.quarter &&
      ((other.kind !== "married_capable_spouse" && other.kind !== "spouse_incapable") ||
        other.spouse_ssn !== status.spouse_ssn ||
        other.spouse_relationship_source_reference !== status.marriage_source_reference)) {
      throw new Error("Schedule H parent post-remarriage quarters must retain the same spouse, care circumstances and marriage record");
    }
  }
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
      } else if (review.classification === "quarterly_circumstances") {
        const eighteenth = `${Number(row.child.birth_date.slice(0, 4)) + 18}${row.child.birth_date.slice(4)}`;
        if (eighteenth >= b.from && eighteenth <= b.to &&
          review.wage_payments.some((payment) =>
            payment.service_from <= b.to && payment.service_to >= b.from
          )) {
          throw new Error("Schedule H parent age-18 service quarter needs retained ordinary pay-period evidence");
        }
      }
    }
    if (review.classification === "quarterly_circumstances" && (
      status.kind === "divorced_not_remarried" &&
        status.divorce_date > b.from ||
      status.kind === "widowed_not_remarried" &&
        status.spouse_death_date > b.from
    )) {
      throw new Error(
        "Schedule H parent marital event must precede its complete source quarter",
      );
    }
    if (status.kind === "spouse_incapable" || status.kind === "remarried_spouse_incapable") {
      care(status.incapable_care_period, row.quarter);
      if (status.kind === "remarried_spouse_incapable") {
        const marriedCareFrom = status.incapable_care_period.from < status.remarriage_date
          ? status.remarriage_date : status.incapable_care_period.from;
        const marriedCareDays = (Date.parse(status.incapable_care_period.to) -
          Date.parse(marriedCareFrom)) / 86400000 + 1;
        if (marriedCareDays < 28) {
          throw new Error("Schedule H remarried spouse care period must establish four weeks after marriage within its quarter");
        }
      }
    }
  }
  validateParentRemarriage(review, employee.employee_ssn, employerSsn);
  if (review.classification === "dated_service_periods") {
    return parentDatedCashWages(employee, review, quarters);
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
    const paymentCents = cashCents(payment.cash_wages);
    paidQuarters[quarter(payment.paid_date) - 1] += paymentCents;
    total += paymentCents;
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
    if (childQualifies && employerQualifies) eligible += paymentCents;
  }
  if (
    total !== cashCents(employee.annual_cash_wages) ||
    paidQuarters.some((v, i) =>
      v !== cashCents(employee.quarterly_cash_wages[i])
    )
  ) {
    throw new Error(
      "Schedule H parent payment ledger must reconcile annual and payment-quarter cash wages",
    );
  }
  return eligible >= TY2025_FICA_CASH_WAGE_THRESHOLD * 100 ? eligible / 100 : 0;
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

const statePayrollReviewSchema = z.object({
  all_household_cash_payments_included: z.literal(true),
  child_no_ordinary_frequency_reviews: z.array(z.object({
    employee_id: sourceReference,
    ...noOrdinaryFrequencySchema.shape,
  }).strict()).optional(),
  rate_notices: z.array(
    z.object({
      state: z.string().regex(/^[A-Z]{2}$/),
      period_from: calendarDate,
      period_to: calendarDate,
      experience_rate: z.number().min(0).max(1),
      annual_taxable_wage_base: z.number().positive(),
      source_reference: sourceReference,
    }).strict(),
  ).min(1),
  wage_payments: z.array(
    z.object({
      employee_id: sourceReference,
      paid_date: calendarDate,
      state: z.string().regex(/^[A-Z]{2}$/),
      cash_wages: z.number().positive(),
      payment_reference: sourceReference,
      family_state_coverage_source_reference: sourceReference.optional(),
      service_from: calendarDate.optional(),
      service_to: calendarDate.optional(),
      service_payment_reference: sourceReference.optional(),
      ordinary_pay_period: childServicePaymentSchema.shape.ordinary_pay_period
        .optional(),
    }).strict(),
  ).min(1),
  excluded_state_wage_payments: z.array(
    z.object({
      employee_id: sourceReference,
      paid_date: calendarDate,
      state: z.enum(["CA", "OH"]),
      cash_wages: z.number().positive(),
      payment_reference: sourceReference,
      coverage_source_reference: sourceReference,
      service_from: calendarDate.optional(),
      service_to: calendarDate.optional(),
      service_payment_reference: sourceReference.optional(),
      ordinary_pay_period: childServicePaymentSchema.shape.ordinary_pay_period
        .optional(),
    }).strict(),
  ).optional(),
  contribution_payments: z.array(
    z.object({
      rate_notice_source_reference: sourceReference,
      assessment_quarter: z.number().int().min(1).max(4).optional(),
      paid_date: calendarDate,
      amount: z.number().positive(),
      payment_reference: sourceReference,
    }).strict(),
  ),
  quarterly_assessments: z.array(
    z.object({
      rate_notice_source_reference: sourceReference,
      quarter: z.number().int().min(1).max(4),
      taxable_state_wages: z.number().nonnegative(),
      assessed_contribution: z.number().nonnegative(),
      source_reference: sourceReference,
    }).strict(),
  ).optional(),
  unpaid_contribution_review: z.object({
    filing_review_date: calendarDate,
    notice_balances: z.array(
      z.object({
        rate_notice_source_reference: sourceReference,
        state: z.string().regex(/^[A-Z]{2}$/),
        statement_as_of_date: calendarDate,
        outstanding_balance: z.number().nonnegative(),
        balance_record_reference: sourceReference,
      }).strict(),
    ).min(1),
  }).strict().optional(),
}).strict();

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
      // A source review verifies Section A's three Yes answers without
      // changing its filed Section A presentation to Section B.
      state_review_rows: z.array(
        z.object({
          state: z.string().regex(/^[A-Z]{2}$/),
          taxable_state_wages: z.number().nonnegative(),
          experience_rate: z.number().min(0).max(1).optional(),
          rate_period_from: calendarDate.optional(),
          rate_period_to: calendarDate.optional(),
          contributions_paid_by_due_date: z.number().nonnegative(),
        }).strict(),
      ).min(1).max(62).optional(),
      state_payroll_review: statePayrollReviewSchema.optional(),
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
      state_payroll_review: statePayrollReviewSchema.optional(),
    }).strict(),
  ]).optional(),
}).strict();

export type ScheduleHInput = z.infer<typeof inputSchema>;

type SectionBSource = Extract<
  NonNullable<ScheduleHInput["federal_unemployment"]>,
  {
    state_rows: unknown;
  }
>;

function schemaRepresentableStateRate(rate: number) {
  return Math.abs(rate * 100_000 - Math.round(rate * 100_000)) <= 1e-7;
}

function validateStatePayrollReview(input: SectionBSource) {
  const review = input.state_payroll_review;
  if (!review) return 0;
  const reviewedPeriods = [
    ...review.wage_payments,
    ...(review.excluded_state_wage_payments ?? []),
  ].flatMap((payment) =>
    payment.ordinary_pay_period ? [payment.ordinary_pay_period] : []
  );
  const references = [
    ...(review.child_no_ordinary_frequency_reviews ?? []).flatMap((item) => [
      item.employer_pay_practice_source_reference,
      item.complete_payment_period_ledger_source_reference,
    ]),
    ...review.rate_notices.map((notice) => notice.source_reference),
    ...review.wage_payments.map((payment) => payment.payment_reference),
    ...review.wage_payments.flatMap((payment) =>
      payment.family_state_coverage_source_reference
        ? [payment.family_state_coverage_source_reference]
        : []
    ),
    ...new Set(reviewedPeriods.map((period) => period.period_source_reference)),
    ...new Set(
      reviewedPeriods.map((period) => period.service_time_source_reference),
    ),
    ...(review.excluded_state_wage_payments ?? []).flatMap((payment) => [
      payment.payment_reference,
      payment.coverage_source_reference,
    ]),
    ...review.contribution_payments.map((payment) => payment.payment_reference),
    ...(review.quarterly_assessments ?? []).map((assessment) =>
      assessment.source_reference
    ),
    ...(review.unpaid_contribution_review?.notice_balances ?? []).map(
      (balance) => balance.balance_record_reference,
    ),
    ...input.employee_wages.map((employee) =>
      employee.payroll_source_reference
    ),
    ...input.employee_wages.flatMap((employee) =>
      employee.w2 ? [employee.w2.source_reference] : []
    ),
  ];
  if (new Set(references).size !== references.length) {
    throw new Error(
      "Schedule H state rate, wage and contribution sources must be distinct",
    );
  }
  const allocatedTimeRefs = reviewedPeriods.filter((period) =>
    period.kind === "over_31_days" || period.kind === "no_ordinary_period"
  ).map((period) => period.service_time_source_reference);
  if (new Set(allocatedTimeRefs).size !== allocatedTimeRefs.length) {
    throw new Error(
      "Schedule H long-period state service allocations need distinct retained records",
    );
  }
  const notices = review.rate_notices;
  for (const [index, notice] of notices.entries()) {
    if (
      !FUTA_STATE_CODES.has(notice.state) ||
      !schemaRepresentableStateRate(notice.experience_rate) ||
      (notice.state === "CA" &&
        cashCents(notice.annual_taxable_wage_base) !== 700_000) ||
      ((notice.state === "TX" || notice.state === "OH") &&
        cashCents(notice.annual_taxable_wage_base) !== 900_000) ||
      notice.period_from < "2025-01-01" || notice.period_to > "2025-12-31" ||
      notice.period_from > notice.period_to ||
      notices.some((other, otherIndex) =>
        otherIndex !== index &&
        other.state === notice.state && other.period_from <= notice.period_to &&
        other.period_to >= notice.period_from
      ) ||
      notices.some((other) =>
        other.state === notice.state &&
        other.annual_taxable_wage_base !== notice.annual_taxable_wage_base
      )
    ) {
      throw new Error(
        "Schedule H state rate notices need schema-representable rates, nonoverlapping 2025 periods and one state wage base",
      );
    }
  }
  const cents = cashCents;
  const rowWages = notices.map(() => 0),
    rowContributionCents = notices.map(() => 0);
  const accruedWages = notices.map(() =>
    [] as { date: string; cents: number }[]
  );
  const reductionWages = new Map<string, number>();
  const workers = new Map(
    input.employee_wages.map((employee) => [employee.employee_id, employee]),
  );
  const workerAnnual = new Map<string, number>(),
    workerQuarters = new Map<string, number[]>();
  const childServiceLinks = new Map<string, string[]>();
  const childStateServicePeriods = new Map<
    string,
    { from: string; to: string }[]
  >();
  const childStatePayPeriods = new Map<
    string,
    Map<string, BirthdayPeriod["ordinary_pay_period"]>
  >();
  const workerFuta = new Map<string, number>(),
    workerState = new Map<string, number>();
  let futaWages = 0, stateCoveredFutaWages = 0;
  const payments = [
    ...review.wage_payments,
    ...(review.excluded_state_wage_payments ?? []),
  ].sort((a, b) =>
    a.paid_date.localeCompare(b.paid_date) ||
    (a.service_from ?? "").localeCompare(b.service_from ?? "") ||
    a.payment_reference.localeCompare(b.payment_reference)
  );
  const workerPayDates = new Set<string>();
  for (const payment of payments) {
    const excludedFromState = "coverage_source_reference" in payment;
    const workerPayDate = `${payment.employee_id}:${payment.paid_date}`;
    if (workerPayDates.has(workerPayDate) && !payment.ordinary_pay_period) {
      throw new Error(
        "Schedule H duplicate-date state wages need retained ordinary pay-period evidence",
      );
    }
    workerPayDates.add(workerPayDate);
    if (
      !workers.has(payment.employee_id) || payment.paid_date < "2025-01-01" ||
      payment.paid_date > "2025-12-31"
    ) {
      throw new Error(
        "Schedule H state wages need a retained 2025 household worker and pay date",
      );
    }
    const matches = notices.flatMap((notice, index) =>
      notice.state === payment.state &&
        notice.period_from <= payment.paid_date &&
        payment.paid_date <= notice.period_to
        ? [index]
        : []
    );
    if (!excludedFromState && matches.length !== 1) {
      throw new Error(
        "Schedule H each state wage payment needs one dated rate notice",
      );
    }
    const index = matches[0], notice = notices[index];
    const employee = workers.get(payment.employee_id)!;
    const serviceDates = payment.service_from !== undefined &&
      payment.service_to !== undefined &&
      payment.service_from <= payment.service_to &&
      payment.service_from >= "2025-01-01" &&
      payment.service_to <= "2025-12-31" &&
      payment.service_to <= payment.paid_date;
    if (
      (payment.service_from === undefined) !==
        (payment.service_to === undefined) ||
      (payment.service_from !== undefined && !serviceDates)
    ) {
      throw new Error(
        "Schedule H state family service dates must precede retained cash payment",
      );
    }
    let federalEligible = employee.relationship === "unrelated";
    if (employee.relationship !== "unrelated") {
      if (
        employee.relationship === "child" &&
        employee.birth_date >= "2004-01-01" &&
        employee.birth_date <= "2004-12-31"
      ) {
        const service = employee.age_21_transition_review?.wage_payments.find(
          (row) => row.payment_reference === payment.service_payment_reference,
        );
        if (
          !service || !serviceDates ||
          service.paid_date !== payment.paid_date ||
          service.service_from !== payment.service_from ||
          service.service_to !== payment.service_to ||
          JSON.stringify(service.ordinary_pay_period) !==
            JSON.stringify(payment.ordinary_pay_period) ||
          cents(service.cash_wages) !== cents(payment.cash_wages)
        ) {
          throw new Error(
            "Schedule H turning-21 state cash must join its dated service source",
          );
        }
        const birthday = `2025${employee.birth_date.slice(4)}`;
        federalEligible = coveredBirthdayService(service, birthday);
        const links = childServiceLinks.get(employee.employee_id) ?? [];
        links.push(payment.service_payment_reference!);
        childServiceLinks.set(employee.employee_id, links);
      } else if (payment.service_payment_reference) {
        throw new Error(
          "Schedule H family state service reference needs the child turning-21 ledger",
        );
      }
      const turns18 = employee.relationship === "child" &&
        employee.birth_date >= "2007-01-01" &&
        employee.birth_date <= "2007-12-31";
      if (turns18 && !serviceDates) {
        throw new Error(
          "Schedule H turning-18 state coverage needs dated service and payment facts",
        );
      }
      const eighteenth = turns18 ? `2025${employee.birth_date.slice(4)}` : "";
      const adultStateService = turns18
        ? coveredBirthdayService(payment as BirthdayPeriod, eighteenth)
        : false;
      if (turns18) {
        const period = payment.ordinary_pay_period!;
        const existing = childStatePayPeriods.get(employee.employee_id) ??
          new Map();
        const earlier = existing.get(period.period_source_reference);
        if (earlier) {
          if (
            earlier.period_from !== period.period_from ||
            earlier.period_to !== period.period_to ||
            earlier.kind !== period.kind ||
            (period.kind === "within_31_days" &&
              JSON.stringify(earlier) !== JSON.stringify(period))
          ) {
            throw new Error(
              "Schedule H one child state pay period needs one reviewed time record",
            );
          }
        } else {
          if (
            [...existing.values()].some((other) =>
              other.period_from <= period.period_to &&
              other.period_to >= period.period_from
            )
          ) {
            throw new Error(
              "Schedule H child state ordinary pay periods cannot overlap",
            );
          }
          existing.set(period.period_source_reference, period);
        }
        childStatePayPeriods.set(employee.employee_id, existing);
        const periods = childStateServicePeriods.get(employee.employee_id) ??
          [];
        periods.push({ from: payment.service_from!, to: payment.service_to! });
        childStateServicePeriods.set(employee.employee_id, periods);
      }
      // Both California and Ohio exclude the spouse, parent, and child before
      // age 18 from their unemployment coverage for this sourced household route.
      const supportedFamilyState = payment.state === "CA" ||
        payment.state === "OH";
      const familyExcluded = supportedFamilyState &&
        (employee.relationship === "spouse" ||
          employee.relationship === "parent" ||
          employee.relationship === "child" &&
            (employee.birth_date >= "2008-01-01" ||
              turns18 && !adultStateService));
      const adultChildCovered = supportedFamilyState &&
        employee.relationship === "child" &&
        (employee.birth_date >= "2004-01-01" &&
            employee.birth_date <= "2006-12-31" ||
          turns18 && adultStateService);
      if (
        !(familyExcluded || adultChildCovered) ||
        excludedFromState !== familyExcluded ||
        (!excludedFromState &&
          !payment.family_state_coverage_source_reference)
      ) {
        throw new Error(
          "Schedule H family state UI coverage needs retained state relationship, age and coverage source",
        );
      }
    } else if (
      excludedFromState || payment.family_state_coverage_source_reference ||
      payment.service_payment_reference
    ) {
      throw new Error(
        "Schedule H unrelated employee cannot claim family state UI coverage",
      );
    }
    const paymentCents = cents(payment.cash_wages);
    const previousFuta = workerFuta.get(payment.employee_id) ?? 0;
    const futa = federalEligible
      ? Math.min(paymentCents, Math.max(0, 700_000 - previousFuta))
      : 0;
    workerFuta.set(
      payment.employee_id,
      previousFuta + (federalEligible ? paymentCents : 0),
    );
    if (!excludedFromState) {
      const stateBaseCents = cents(notice.annual_taxable_wage_base);
      const key = `${payment.employee_id}:${payment.state}`;
      const previousState = workerState.get(key) ?? 0;
      if (
        previousFuta > previousState &&
        previousFuta + paymentCents > stateBaseCents && federalEligible
      ) {
        throw new Error(
          "Schedule H interstate wage-base credit needs retained state evidence",
        );
      }
      const stateWages = Math.min(
        paymentCents,
        Math.max(0, stateBaseCents - previousState),
      );
      workerState.set(key, previousState + paymentCents);
      rowWages[index] += stateWages;
      accruedWages[index].push({ date: payment.paid_date, cents: stateWages });
      const covered = Math.min(futa, stateWages);
      stateCoveredFutaWages += covered;
      reductionWages.set(
        payment.state,
        (reductionWages.get(payment.state) ?? 0) + covered,
      );
    }
    futaWages += futa;
    workerAnnual.set(
      payment.employee_id,
      (workerAnnual.get(payment.employee_id) ?? 0) + paymentCents,
    );
    const quarters = workerQuarters.get(payment.employee_id) ?? [0, 0, 0, 0];
    quarters[Math.ceil(Number(payment.paid_date.slice(5, 7)) / 3) - 1] +=
      paymentCents;
    workerQuarters.set(payment.employee_id, quarters);
  }
  if (
    new Set(
      (review.child_no_ordinary_frequency_reviews ?? []).map((item) =>
        item.employee_id
      ),
    ).size !== (review.child_no_ordinary_frequency_reviews ?? []).length ||
    (review.child_no_ordinary_frequency_reviews ?? []).some((item) =>
      !input.employee_wages.some((employee) =>
        employee.employee_id === item.employee_id
      )
    )
  ) {
    throw new Error(
      "Schedule H child no-ordinary payroll review must join one retained worker",
    );
  }
  for (const employee of input.employee_wages) {
    if (
      workerAnnual.get(employee.employee_id) !==
        cents(employee.annual_cash_wages) ||
      JSON.stringify(workerQuarters.get(employee.employee_id)) !==
        JSON.stringify(employee.quarterly_cash_wages.map(cents))
    ) {
      throw new Error(
        "Schedule H state payment ledger must reconcile every worker's annual and quarterly payroll",
      );
    }
    if (
      employee.relationship === "child" && employee.age_21_transition_review
    ) {
      const linked = childServiceLinks.get(employee.employee_id) ?? [];
      const actual = employee.age_21_transition_review.wage_payments.map((
        row,
      ) => row.payment_reference);
      if (
        linked.length !== actual.length ||
        new Set(linked).size !== linked.length ||
        linked.some((reference) => !actual.includes(reference))
      ) {
        throw new Error(
          "Schedule H state cash must join every turning-21 child service payment exactly once",
        );
      }
    }
    const periods = childStateServicePeriods.get(employee.employee_id);
    const noOrdinary = review.child_no_ordinary_frequency_reviews?.find((item) =>
      item.employee_id === employee.employee_id
    );
    if (
      employee.relationship === "child" &&
      employee.birth_date >= "2007-01-01" &&
      employee.birth_date <= "2007-12-31"
    ) {
      const age18Payments = payments.filter((payment) =>
        payment.employee_id === employee.employee_id
      );
      validateNoOrdinaryPayPractice(
        age18Payments as BirthdayPeriod[],
        noOrdinary,
      );
    } else if (noOrdinary) {
      throw new Error(
        "Schedule H state no-ordinary payroll review requires a turning-18 child",
      );
    }
    if (periods) {
      periods.sort((a, b) => a.from.localeCompare(b.from));
      if (
        periods.some((row, index) =>
          index > 0 && periods[index - 1].to >= row.from
        )
      ) {
        throw new Error(
          "Schedule H turning-18 child state service periods cannot overlap",
        );
      }
    }
  }
  const quarterOf = (date: string) => Math.ceil(Number(date.slice(5, 7)) / 3);
  const quarterEnds = ["2025-03-31", "2025-06-30", "2025-09-30", "2025-12-31"];
  const assessedByNotice = notices.map(() =>
    [] as NonNullable<
      typeof review.quarterly_assessments
    >
  );
  for (const assessment of review.quarterly_assessments ?? []) {
    const index = notices.findIndex((notice) =>
      notice.source_reference === assessment.rate_notice_source_reference
    );
    const quarterHasCash = index >= 0 &&
      accruedWages[index].some((wage) =>
        quarterOf(wage.date) === assessment.quarter
      );
    const quarterWages = index < 0 ? 0 : accruedWages[index].reduce(
      (sum, wage) =>
        sum + (quarterOf(wage.date) === assessment.quarter ? wage.cents : 0),
      0,
    );
    if (
      index < 0 || !quarterHasCash ||
      assessedByNotice[index].some((row) =>
        row.quarter === assessment.quarter
      ) ||
      cents(assessment.taxable_state_wages) !== quarterWages ||
      cents(assessment.assessed_contribution) !==
        Math.round(quarterWages * notices[index].experience_rate)
    ) {
      throw new Error(
        "Schedule H quarterly state assessment must match one notice and dated taxable wages",
      );
    }
    assessedByNotice[index].push(assessment);
  }
  for (const [index, assessments] of assessedByNotice.entries()) {
    if (
      assessments.length > 0 &&
      new Set(accruedWages[index].map((wage) => quarterOf(wage.date))).size !==
        assessments.length
    ) {
      throw new Error(
        "Schedule H assessed notice needs every wage quarter's state assessment",
      );
    }
  }
  let lateCents = 0;
  let unpaidCents = 0;
  const paidByNotice = notices.map(() => 0);
  const paidByAssessment = new Map<string, number>();
  const contributionPayments = [...review.contribution_payments].sort((a, b) =>
    a.paid_date.localeCompare(b.paid_date) ||
    a.payment_reference.localeCompare(b.payment_reference)
  );
  for (const payment of contributionPayments) {
    const index = notices.findIndex((notice) =>
      notice.source_reference === payment.rate_notice_source_reference
    );
    if (index < 0 || payment.paid_date > "2026-12-31") {
      throw new Error(
        "Schedule H state contribution needs a matching rate notice and actual payment date",
      );
    }
    if (
      review.unpaid_contribution_review &&
      payment.paid_date >
        review.unpaid_contribution_review.filing_review_date
    ) {
      throw new Error(
        "Schedule H state account balance must include only payments through filing review",
      );
    }
    const amountCents = cents(payment.amount);
    const assessments = assessedByNotice[index];
    if (assessments.length > 0) {
      const assessment = assessments.find((row) =>
        row.quarter === payment.assessment_quarter
      );
      if (
        !assessment ||
        payment.paid_date < quarterEnds[assessment.quarter - 1]
      ) {
        throw new Error(
          "Schedule H quarterly contribution needs a completed sourced assessment",
        );
      }
      const key = `${index}:${assessment.quarter}`;
      const paid = (paidByAssessment.get(key) ?? 0) + amountCents;
      if (paid > cents(assessment.assessed_contribution)) {
        throw new Error(
          "Schedule H quarterly contribution exceeds its assessed liability",
        );
      }
      paidByAssessment.set(key, paid);
    } else {
      if (payment.assessment_quarter !== undefined) {
        throw new Error(
          "Schedule H quarterly contribution needs a retained assessment",
        );
      }
      const wagesByPaymentDate = accruedWages[index].reduce(
        (sum, wage) => sum + (wage.date <= payment.paid_date ? wage.cents : 0),
        0,
      );
      if (
        paidByNotice[index] + amountCents >
          Math.round(wagesByPaymentDate * notices[index].experience_rate)
      ) {
        throw new Error(
          "Schedule H state contribution cannot exceed tax accrued on dated state wages",
        );
      }
    }
    paidByNotice[index] += amountCents;
    if (payment.paid_date <= "2026-04-15") {
      rowContributionCents[index] += cents(payment.amount);
    } else lateCents += cents(payment.amount);
  }
  const balanceReview = review.unpaid_contribution_review;
  if (balanceReview) {
    if (
      balanceReview.filing_review_date < "2026-04-15" ||
      balanceReview.notice_balances.length !== notices.length
    ) {
      throw new Error(
        "Schedule H unpaid state balance needs a complete account review at filing",
      );
    }
  }
  for (const [index, notice] of notices.entries()) {
    const required = assessedByNotice[index].length > 0
      ? assessedByNotice[index].reduce(
        (total, assessment) => total + cents(assessment.assessed_contribution),
        0,
      )
      : Math.round(rowWages[index] * notice.experience_rate);
    const balance = balanceReview?.notice_balances.filter((entry) =>
      entry.rate_notice_source_reference === notice.source_reference
    );
    if (
      (balanceReview && balance?.length !== 1) ||
      (balance &&
        (balance[0].state !== notice.state ||
          balance[0].statement_as_of_date !==
            balanceReview?.filing_review_date))
    ) {
      throw new Error(
        "Schedule H state account balance needs one dated record per rate notice",
      );
    }
    const outstanding = balance ? cents(balance[0].outstanding_balance) : 0;
    if (paidByNotice[index] + outstanding !== required) {
      throw new Error(
        "Schedule H assessed state liability must equal paid receipts plus reviewed unpaid balance",
      );
    }
    unpaidCents += outstanding;
  }
  if (
    rowWages.some((wages) => wages === 0) ||
    input.state_rows.length !== notices.length ||
    input.state_rows.some((row, index) =>
      row.state !== notices[index].state ||
      row.rate_period_from !== notices[index].period_from ||
      row.rate_period_to !== notices[index].period_to ||
      row.experience_rate !== notices[index].experience_rate ||
      cents(row.taxable_state_wages) !== rowWages[index] ||
      cents(row.contributions_paid_by_due_date) !==
        rowContributionCents[index]
    ) || cents(input.taxable_futa_wages) !== futaWages ||
    input.paid_only_one_state !==
      (new Set(review.wage_payments.map((payment) => payment.state)).size ===
        1) ||
    input.all_futa_wages_state_taxable !==
      (stateCoveredFutaWages === futaWages) ||
    input.all_contributions_paid_on_time !==
      (lateCents === 0 && unpaidCents === 0) ||
    cents(input.late_contributions ?? 0) !== lateCents
  ) {
    throw new Error(
      "Schedule H Section B filed state rows and answers must reconcile dated wages, rates and contribution receipts",
    );
  }
  for (const state of ["CA", "VI"] as const) {
    const actual = reductionWages.get(state) ?? 0;
    const filed = input.credit_reduction_wages?.find((entry) =>
      entry.state === state
    )
      ?.taxable_futa_wages ?? 0;
    if (actual !== cents(filed)) {
      throw new Error(
        "Schedule H credit reduction wages must derive from FUTA and state-taxable payments",
      );
    }
  }
  return unpaidCents;
}

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
      quarterlyCashCents(employee.quarterly_cash_wages) !==
        cashCents(employee.annual_cash_wages) ||
      employee.w2.employee_ssn !== employee.employee_ssn ||
      cashCents(employee.w2.box1_wages) !==
        cashCents(employee.annual_cash_wages) ||
      cashCents(employee.w2.box2_federal_income_tax_withheld) >
        cashCents(employee.annual_cash_wages) ||
      input.cash_wages_over_2025_limit !== false ||
      input.cash_wages_over_quarter_limit !== false ||
      (input.ss_wages ?? 0) !== 0 ||
      (input.medicare_wages ?? 0) !== 0 ||
      (input.additional_medicare_wages ?? 0) !== 0 ||
      cashCents(input.federal_income_tax_withheld ?? 0) !==
        cashCents(employee.w2.box2_federal_income_tax_withheld)
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
      ficaOnly.prior_year_quarter_cash_wages.some((wages) =>
        cashCents(wages) >= 100_000
      )
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
            cashCents(w) >= 100_000
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
          sourcedSocialSecurityWages += cashCents(expectedSS);
          sourcedMedicareWages += cashCents(parentWages);
          sourcedAdditionalMedicareWages += cashCents(
            Math.max(0, parentWages - 200_000),
          );
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
          sourcedSocialSecurityWages += cashCents(expectedSS);
          sourcedMedicareWages += cashCents(ficaWages);
          sourcedAdditionalMedicareWages += cashCents(
            Math.max(0, ficaWages - 200_000),
          );
          sourcedFicaThresholdMet ||= ficaWages > 0;
          childTransition.paidQuarters.forEach((wages, index) => {
            quarterlyWages[index] += cashCents(wages);
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
          quarterlyCashCents(employee.quarterly_cash_wages) !==
            cashCents(employee.annual_cash_wages) ||
          (employee.w2 && (employee.w2.employee_ssn !== employee.employee_ssn ||
            cashCents(employee.w2.box1_wages) !==
              cashCents(employee.annual_cash_wages))) ||
          cashCents(withholding) > cashCents(employee.annual_cash_wages) ||
          (withholding > 0 && !employee.federal_withholding_agreement)
        ) {
          throw new Error(
            "Schedule H mixed family payroll must reconcile relationship, employer, dates, payroll, W-2 and agreed withholding",
          );
        }
        sourcedFederalWithholding += cashCents(withholding);
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
        quarterlyCashCents(employee.quarterly_cash_wages) !==
          cashCents(employee.annual_cash_wages)
      ) {
        throw new Error(
          "Schedule H employee quarterly cash wages differ from annual payroll",
        );
      }
      employee.quarterly_cash_wages.forEach((wages, index) => {
        quarterlyWages[index] += cashCents(wages);
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
      sourcedSocialSecurityWages += cashCents(expectedSS);
      sourcedMedicareWages += cashCents(ficaWages);
      sourcedAdditionalMedicareWages += cashCents(
        Math.max(0, ficaWages - 200_000),
      );
      sourcedFederalWithholding += cashCents(
        employee.w2?.box2_federal_income_tax_withheld ?? 0,
      );
    }
    if (
      unemployment && !unemployment.prior_year_quarter_threshold_met &&
      quarterlyWages.every((wages) => wages < 100_000)
    ) {
      throw new Error(
        "Schedule H FUTA needs a $1,000 current- or prior-year quarter",
      );
    }
    if (ficaOnly && quarterlyWages.some((wages) => wages >= 100_000)) {
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
      cashCents(input.ss_wages ?? 0) !== sourcedSocialSecurityWages ||
      cashCents(input.medicare_wages ?? 0) !== sourcedMedicareWages ||
      cashCents(input.additional_medicare_wages ?? 0) !==
        sourcedAdditionalMedicareWages ||
      cashCents(input.federal_income_tax_withheld ?? 0) !==
        sourcedFederalWithholding
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
            ? cashCents(Math.min(employee.annual_cash_wages, 7_000))
            : employee.relationship === "child" &&
                employee.age_21_transition_review
            ? cashCents(Math.min(childPost21Wages(employee).wages, 7_000))
            : 0),
        0,
      );
      const filedFutaWages = "taxable_wages" in unemployment
        ? unemployment.taxable_wages
        : unemployment.taxable_futa_wages;
      if (sourcedFutaWages !== cashCents(filedFutaWages)) {
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
    if (
      (unemployment.state_review_rows === undefined) !==
        (unemployment.state_payroll_review === undefined)
    ) {
      throw new Error(
        "Schedule H Section A state source needs both filed row reconciliation and complete payroll review",
      );
    }
    if (unemployment.state_review_rows && unemployment.state_payroll_review) {
      const rows = unemployment.state_review_rows;
      if (
        rows.length !== 1 || rows[0].state !== unemployment.state ||
        cashCents(rows[0].contributions_paid_by_due_date) !==
          cashCents(unemployment.contributions_paid ?? 0) ||
        (unemployment.zero_experience_rate === true) !==
          (rows[0].experience_rate === 0)
      ) {
        throw new Error(
          "Schedule H Section A state, paid contribution and rate must reconcile its reviewed state row",
        );
      }
      // Reuse the complete dated worker, rate, assessment, payment, and
      // family-coverage validator. The adapter is validation-only: the filed
      // return remains Section A because all three answers are Yes.
      const reviewed = {
        ...unemployment,
        state_rows: rows,
        taxable_futa_wages: unemployment.taxable_wages,
      } as SectionBSource;
      if (validateStatePayrollReview(reviewed) !== 0) {
        throw new Error(
          "Schedule H Section A requires no unpaid state contribution",
        );
      }
    }
  }
  if (unemployment && "state_rows" in unemployment) {
    const unpaidCents = validateStatePayrollReview(unemployment);
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
        (unemployment.late_contributions !== undefined || unpaidCents > 0)
    ) {
      throw new Error(
        "Schedule H late contributions must match the line 11 answer",
      );
    }
    for (const row of unemployment.state_rows) {
      if (
        (row.experience_rate === undefined &&
          row.rate_period_from !== undefined) ||
        (row.experience_rate !== undefined &&
          !schemaRepresentableStateRate(row.experience_rate)) ||
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
    // Schedule H is filed in whole dollars. Preserve source receipts in the
    // review, then round each line 17(h) row before line 18 and Worksheet 1.
    const filedWages = Math.round(row.taxable_state_wages);
    const filedContributions = Math.round(
      row.contributions_paid_by_due_date,
    );
    const creditAt54 = row.experience_rate !== undefined &&
        row.experience_rate < 0.054
      ? Math.round(filedWages * 0.054)
      : undefined;
    const creditAtStateRate = creditAt54 === undefined
      ? undefined
      : Math.round(filedWages * row.experience_rate!);
    return {
      ...row,
      taxable_state_wages: filedWages,
      contributions_paid_by_due_date: filedContributions,
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
  const filedFutaWages = Math.round(input.taxable_futa_wages);
  const grossTax = Math.round(filedFutaWages * 0.06);
  const maximumCredit = Math.round(filedFutaWages * 0.054);
  const lateCredit = input.late_contributions === undefined ? 0 : Math.round(
    Math.min(
      Math.max(0, maximumCredit - tentativeCredit),
      Math.round(input.late_contributions),
    ) * 0.9,
  );
  const reduction = (input.credit_reduction_wages ?? []).reduce(
    (total, entry) =>
      total + Math.round(
        Math.round(entry.taxable_futa_wages) *
          (entry.state === "CA" ? 0.012 : 0.045),
      ),
    0,
  );
  const allowedCredit = Math.max(
    0,
    Math.min(maximumCredit, tentativeCredit + lateCredit) - reduction,
  );
  return {
    rows,
    filedFutaWages,
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
