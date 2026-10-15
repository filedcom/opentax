import { z } from "zod";
import { FilingStatus } from "../../nodes/types.ts";
import { educator2026 } from "../../nodes/config/2026-educator.ts";
import { educatorExpenseDeduction } from "../../nodes/inputs/adjustments/education/educator_expenses/amounts.ts";

const ref = z.string().trim().min(1);
const ssn = z.string().regex(/^\d{3}-?\d{2}-?\d{4}$/);
const money = z.number().finite().nonnegative().max(
  Number.MAX_SAFE_INTEGER / 100,
);
const normalize = (v: string) => v.replaceAll("-", "");
const role = z.enum([
  "teacher",
  "instructor",
  "counselor",
  "principal",
  "aide",
  "interscholastic_coach",
  "interscholastic_sports_administrator",
  "other",
]);
const school = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("k12"),
    provides_elementary_or_secondary_education_under_state_law: z.boolean(),
    state_law_qualification_record: ref,
  }).strict(),
  z.object({
    type: z.literal("early_childhood"),
    nonresident_children_under_six_served: z.number().int().nonnegative(),
    publicly_funded_or_receives_fee_payment_or_grant: z.boolean(),
    enrollment_and_funding_record: ref,
  }).strict(),
]);
const assignment = z.object({
  assignment_id: ref,
  school_name: ref,
  school,
  role,
  service_starts_on: z.string().date(),
  service_ends_on: z.string().date(),
  hours_worked: z.number().finite().nonnegative().max(8784),
  employment_and_hours_record: ref,
  employee_not_self_employed: z.literal(true),
}).strict();
const schoolYear = z.object({
  school_year_id: ref,
  starts_on: z.string().date(),
  ends_on: z.string().date(),
  hours_do_not_overlap_between_assignments: z.literal(true),
  assignments: z.array(assignment).min(1),
}).strict();
const educator = z.object({
  educator_ssn: ssn,
  school_years: z.array(schoolYear).min(1),
  benefit_inventory_record: ref,
  // §62(d)(2) is an annual exclusion test, not just same-receipt funding.
  // Positive exclusions need the 8815/529/530 allocation owners before use.
  no_section135_529_530_exclusions: z.literal(true),
}).strict();
export const educatorExpense2026Schema = z.object({
  expense_id: ref,
  educator_ssn: ssn,
  assignment_id: ref,
  source_document_reference: ref,
  receipt_line_reference: ref,
  payment_record: ref,
  paid_by_educator_from_own_or_joint_funds: z.literal(true),
  paid_on: z.string().date().refine(
    (v) => v.startsWith("2026-"),
    "Educator payment must be in 2026",
  ),
  payee: ref,
  category: z.enum([
    "books",
    "supplies",
    "computer_equipment",
    "other_equipment",
    "supplementary_materials",
    "professional_development",
    "covid_protection",
  ]),
  use: z.enum([
    "classroom",
    "other_instructional_activity",
    "noninstructional",
  ]),
  health_or_physical_education: z.boolean(),
  athletic_supply: z.boolean(),
  ordinary_and_necessary: z.boolean(),
  purpose_and_qualification_record: ref,
  not_capitalized_or_depreciated: z.literal(true),
  professional_development_review: z.object({
    course_and_curriculum_record: ref,
    related_to_curriculum_or_students: z.boolean(),
    does_not_meet_minimum_qualifications_or_qualify_for_new_trade: z.literal(
      true,
    ),
  }).strict().optional(),
  amount_paid: money,
  current_payment_refund: money,
  personal_use_amount: money,
  // Disjoint allocations; a taxable reimbursement included in wages is not
  // an exclusion here. Keep the wage/reimbursement reconciliation as evidence.
  benefits_review_record: ref,
  benefit_allocations: z.array(
    z.object({
      kind: z.enum([
        "tax_free_reimbursement",
        "tax_free_assistance",
        "education_credit",
        "other_deduction",
        "available_reimbursement_not_claimed",
      ]),
      amount: money,
      source_reference: ref,
    }).strict(),
  ),
  all_other_uses_of_this_expense_disclosed: z.literal(true),
}).strict();
export const educatorClaim2026Schema = z.object({
  tax_year: z.literal(2026),
  inventory_record_reference: ref,
  cash_method_of_accounting: z.literal(true),
  all_educator_expenses_and_benefits_included: z.literal(true),
  mfs_payment_review: z.object({
    record_reference: ref,
    noncommunity_property: z.literal(true),
    expenses_paid_solely_by_filer: z.literal(true),
  }).strict().optional(),
  educators: z.array(educator).min(1).max(2),
  expenses: z.array(educatorExpense2026Schema),
}).strict();
export const educatorSource2026Schema = educatorClaim2026Schema.extend({
  filing_status: z.nativeEnum(FilingStatus),
  taxpayer_ssn: ssn,
  spouse_ssn: ssn.optional(),
}).strict();
export type EducatorSource2026 = z.input<typeof educatorSource2026Schema>;

const ordinaryRole = (v: z.infer<typeof role>) =>
  !["interscholastic_coach", "interscholastic_sports_administrator", "other"]
    .includes(v);
function qualifiedSchool(s: z.infer<typeof school>): boolean {
  return s.type === "k12"
    ? s.provides_elementary_or_secondary_education_under_state_law
    : s.nonresident_children_under_six_served >=
        educator2026.minimumEarlyChildhoodNonresidentChildrenUnderSix &&
      s.publicly_funded_or_receives_fee_payment_or_grant;
}

/** One receipt ledger supplies the Schedule 1 adjustment and Schedule A remainder. */
export function calculateEducatorSources2026(raw: EducatorSource2026) {
  const input = educatorSource2026Schema.parse(raw);
  if (
    (input.filing_status === FilingStatus.MFS) !== !!input.mfs_payment_review
  ) {
    throw new Error("MFS educator sources need their separate payment review");
  }
  const owners = new Set([normalize(input.taxpayer_ssn)]);
  if (input.filing_status === FilingStatus.MFJ) {
    if (!input.spouse_ssn || owners.has(normalize(input.spouse_ssn))) {
      throw new Error("Joint educator sources need distinct filer identities");
    }
    owners.add(normalize(input.spouse_ssn));
  }
  const educatorIds = new Set<string>(),
    yearIds = new Set<string>(),
    assignmentIds = new Set<string>(),
    expenseIds = new Set<string>(),
    receipts = new Set<string>();
  const unique = (set: Set<string>, value: string, label: string) => {
    if (set.has(value)) throw new Error(`Duplicate educator ${label}`);
    set.add(value);
  };
  const assignments = new Map<string, {
    owner: string;
    adjustmentEligible: boolean;
    itemizedEligible: boolean;
  }>();
  for (const e of input.educators) {
    const owner = normalize(e.educator_ssn);
    if (!owners.has(owner)) throw new Error("Educator is not a return filer");
    unique(educatorIds, owner, "owner");
    const years = [...e.school_years].sort((a, b) =>
      a.starts_on.localeCompare(b.starts_on)
    );
    for (let i = 0; i < years.length; i++) {
      const y = years[i];
      unique(yearIds, `${owner}:${y.school_year_id}`, "school year");
      const duration = (Date.parse(y.ends_on) - Date.parse(y.starts_on)) /
        86400000;
      if (
        duration < 0 || duration > 366 || y.starts_on > "2026-12-31" ||
        y.ends_on < "2026-01-01" ||
        i > 0 && y.starts_on <= years[i - 1].ends_on
      ) {
        throw new Error(
          "Educator school years must be distinct, nonoverlapping and include 2026 service",
        );
      }
      const ordinaryHours = y.assignments.filter((a) =>
        qualifiedSchool(a.school) && ordinaryRole(a.role)
      ).reduce((n, a) => n + a.hours_worked, 0);
      const itemizedHours = y.assignments.filter((a) =>
        qualifiedSchool(a.school) && a.role !== "other"
      ).reduce((n, a) => n + a.hours_worked, 0);
      const currentService = (a: z.infer<typeof assignment>) =>
        a.service_ends_on >= "2026-01-01" &&
        a.service_starts_on <= "2026-12-31" && a.hours_worked > 0;
      const currentOrdinaryService = y.assignments.some((a) =>
        qualifiedSchool(a.school) && ordinaryRole(a.role) && currentService(a)
      );
      const currentItemizedService = y.assignments.some((a) =>
        qualifiedSchool(a.school) && a.role !== "other" && currentService(a)
      );
      if (
        y.assignments.reduce((n, a) => n + a.hours_worked, 0) >
          (duration + 1) * 24
      ) throw new Error("Educator hours exceed the school-year period");
      for (const a of y.assignments) {
        unique(assignmentIds, a.assignment_id, "assignment");
        if (
          a.service_starts_on < y.starts_on || a.service_ends_on > y.ends_on ||
          a.service_ends_on < a.service_starts_on ||
          a.hours_worked >
            ((Date.parse(a.service_ends_on) - Date.parse(a.service_starts_on)) /
                  86400000 + 1) * 24
        ) {
          throw new Error(
            "Educator service dates and hours must reconcile to the school year",
          );
        }
        assignments.set(a.assignment_id, {
          owner,
          adjustmentEligible: qualifiedSchool(a.school) &&
            ordinaryRole(a.role) && currentOrdinaryService &&
            ordinaryHours >= educator2026.minimumSchoolYearHours,
          itemizedEligible: qualifiedSchool(a.school) && a.role !== "other" &&
            currentItemizedService &&
            itemizedHours >= educator2026.minimumSchoolYearHours,
        });
      }
    }
  }
  const reviewed = [...input.expenses].sort((a, b) =>
    a.paid_on.localeCompare(b.paid_on) ||
    a.expense_id.localeCompare(b.expense_id)
  ).map((e) => {
    unique(expenseIds, e.expense_id, "expense ID");
    unique(
      receipts,
      `${e.source_document_reference}:${e.receipt_line_reference}`,
      "receipt line",
    );
    const owner = normalize(e.educator_ssn),
      a = assignments.get(e.assignment_id);
    if (!a || a.owner !== owner) {
      throw new Error("Educator expense must match its owner's assignment");
    }
    const course = e.category === "professional_development";
    if (course !== !!e.professional_development_review) {
      throw new Error("Professional development needs its course review only");
    }
    const excluded = e.current_payment_refund + e.personal_use_amount +
      e.benefit_allocations.reduce((n, b) => n + b.amount, 0);
    if (excluded > e.amount_paid + .000001) {
      throw new Error(
        "Educator refunds and benefit allocations exceed the receipt",
      );
    }
    const net = Math.max(0, e.amount_paid - excluded);
    const instruction = course
      ? e.professional_development_review!.related_to_curriculum_or_students
      : e.use !== "noninstructional";
    const aboveLineUse = course ? instruction : e.use === "classroom" &&
      !(e.category === "supplies" && e.health_or_physical_education &&
        !e.athletic_supply);
    return {
      expense_id: e.expense_id,
      educator_ssn: owner,
      eligible_adjustment_expense:
        a.adjustmentEligible && e.ordinary_and_necessary && aboveLineUse
          ? net
          : 0,
      eligible_itemized_expense:
        a.itemizedEligible && e.ordinary_and_necessary && instruction ? net : 0,
      excluded_amount: excluded,
      schedule1_allocation: 0,
      schedule_a_allocation: 0,
    };
  });
  const educators = [...educatorIds].map((owner) => {
    const rows = reviewed.filter((r) => r.educator_ssn === owner);
    const adjustment = educatorExpenseDeduction(
      rows.reduce((n, r) => n + r.eligible_adjustment_expense, 0),
      true,
      educator2026.adjustmentCap,
    );
    let remaining = adjustment;
    for (const r of rows) {
      r.schedule1_allocation = Math.min(
        remaining,
        r.eligible_adjustment_expense,
      );
      remaining -= r.schedule1_allocation;
      r.schedule_a_allocation = Math.max(
        0,
        r.eligible_itemized_expense - r.schedule1_allocation,
      );
    }
    return {
      educator_ssn: owner,
      adjustment,
      itemized: rows.reduce((n, r) => n + r.schedule_a_allocation, 0),
    };
  });
  const schedule1Line11 = Math.round(
    educators.reduce((n, e) => n + e.adjustment, 0),
  );
  const scheduleALine17k = Math.round(
    educators.reduce((n, e) => n + e.itemized, 0),
  );
  if (![schedule1Line11, scheduleALine17k].every(Number.isSafeInteger)) {
    throw new Error("Educator deductions exceed whole-dollar range");
  }
  return {
    source_input: input,
    educators,
    expenses: reviewed,
    schedule1Line11,
    scheduleALine17k,
  };
}
