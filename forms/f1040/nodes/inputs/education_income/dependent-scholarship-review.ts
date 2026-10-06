import { assertDependentKiddieTaxReturn } from "../f8615/dependent-source-review.ts";
import { z } from "zod";
import {
  type EducationIncome,
  educationIncomeSources,
  itemSchema,
} from "./sources.ts";
const reference = z.string().trim().min(1);
const ssn = z.string().regex(/^\d{3}-?\d{2}-?\d{4}$/);
const record = z.record(z.string(), z.unknown());
export const dependentKiddieTaxReviewSchema = z.object({
  source_document_reference: reference,
  tax_year: z.literal(2025),
  parent_alive_record_reference: reference,
  parent_alive_on_2025_12_31: z.boolean(),
  parent_selection: z.object({
    kind: z.literal("divorced_custodial_unremarried"),
    divorce_decree_record_reference: reference,
    residence_calendar_record_reference: reference,
    marital_status_record_reference: reference,
    student_ssn: ssn,
    custodial_parent_ssn: ssn,
    other_parent_ssn: ssn,
    custodial_parent_nights: z.number().int().min(0).max(365),
    other_parent_nights: z.number().int().min(0).max(365),
    custodial_parent_remarried: z.literal(false),
  }).strict(),
  family_children_record_reference: reference,
  other_children_requiring_form8615: z.array(ssn),
  settled_parent_return: z.object({
    source_document_reference: reference,
    filer: record,
    pending: record,
  }).strict(),
}).strict();
export const dependentScholarshipReviewSchema = z.object({
  tax_year: z.literal(2025),
  source_document_reference: reference,
  student_ssn: ssn,
  student_dob: z.string().date(),
  education_claimant_ssn: ssn,
  dependency_record_reference: reference,
  actual_parent_claim_record_reference: reference,
  no_student_education_credit: z.literal(true),
  full_time_enrollment_record_reference: reference,
  full_time_student_months: z.array(z.number().int().min(1).max(12)).min(5).max(
    12,
  ),
  kiddie_tax_review: dependentKiddieTaxReviewSchema.optional(),
  student_income_sources: z.array(itemSchema).min(1),
  student_w2_sources: z.array(
    z.object({
      source_document_reference: reference,
      employee_ssn: ssn,
      employer_ein: z.string().regex(/^\d{2}-?\d{7}$/),
      box1_wages: z.number().int().nonnegative(),
    }).strict(),
  ),
  school_sources: z.array(
    z.object({ institution: record, workpaper: record }).strict(),
  ).min(1),
  support_sources: z.array(
    z.object({
      source_document_reference: reference,
      student_ssn: ssn,
      payer_ssn: ssn,
      kind: z.enum(["ordinary_support", "scholarship_support"]),
      amount: z.number().int().positive(),
    }).strict(),
  ).min(1),
}).strict();
export type DependentScholarshipReview = z.infer<
  typeof dependentScholarshipReviewSchema
>;
const tin = (value: unknown) => String(value ?? "").replaceAll("-", "");
export const canonicalSource = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(canonicalSource).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${
      Object.entries(value).filter(([, v]) => v !== undefined).sort((
        [a],
        [b],
      ) => a.localeCompare(b)).map(([k, v]) =>
        JSON.stringify(k) + ":" + canonicalSource(v)
      ).join(",")
    }}`;
  }
  return JSON.stringify(value);
};
export function dependentScholarshipEarned(
  review: DependentScholarshipReview,
): number {
  const owner = tin(review.student_ssn);
  if (
    owner === tin(review.education_claimant_ssn) ||
    new Set(review.full_time_student_months).size !==
      review.full_time_student_months.length ||
    new Set(review.student_w2_sources.map((r) => r.source_document_reference))
        .size !== review.student_w2_sources.length ||
    review.student_w2_sources.some((r) => tin(r.employee_ssn) !== owner)
  ) {
    throw new Error(
      "Dependent scholarship review needs a distinct parent claimant and complete student-owned wage and enrollment sources",
    );
  }
  const incomes = educationIncomeSources({
    education_incomes: review.student_income_sources,
  });
  if (incomes.some((r) => tin(r.student_ssn) !== owner)) {
    throw new Error(
      "Dependent scholarship income must belong to the student, not the parent",
    );
  }
  let earned = review.student_w2_sources.reduce((s, r) => s + r.box1_wages, 0);
  for (const row of incomes) {
    if (
      row.kind === "scholarship_not_on_w2" ||
      (row.kind === "scholarship_for_required_services" &&
        row.reporting.kind === "schedule1_line8r")
    ) earned += row.taxable_amount;
  }
  const support = review.support_sources;
  if (
    new Set(support.map((r) => r.source_document_reference)).size !==
      support.length || support.some((r) => tin(r.student_ssn) !== owner)
  ) throw new Error("Dependent support needs distinct owned payment records");
  const ordinary = support.filter((r) => r.kind === "ordinary_support");
  const own = ordinary.filter((r) => tin(r.payer_ssn) === owner).reduce(
    (s, r) => s + r.amount,
    0,
  );
  if (own * 2 > ordinary.reduce((s, r) => s + r.amount, 0)) {
    throw new Error(
      "Student source payments conflict with parent claiming a qualifying-child dependent",
    );
  }
  const matchedIncome = new Set<string>();
  const qualifiedPayments = new Set<string>();
  const schools = new Set<string>();
  const aidRefs = new Set<string>();
  for (const { institution: school, workpaper: w } of review.school_sources) {
    if (schools.has(tin(school.ein))) {
      throw new Error("Dependent school sources require distinct institutions");
    }
    schools.add(tin(school.ein));
    const issued = w.issued_form1098t_source as
      | Record<string, unknown>
      | undefined;
    const aid = (w.assistance_sources ?? []) as Record<string, unknown>[];
    const payments = (w.payment_sources ?? []) as Record<string, unknown>[];
    if (
      !school.current_year_1098t_received || !issued ||
      tin(issued.student_ssn) !== owner ||
      issued.institution_name !== school.name ||
      tin(issued.institution_ein) !== tin(school.ein) ||
      issued.tax_year !== 2025 ||
      issued.document_id !== w.form1098t_document_id ||
      issued.box1_payments !== w.form1098t_box1_payments ||
      issued.box5_scholarships !== w.form1098t_box5_scholarships ||
      aid.some((a) => a.included_in_form1098t_box5 !== true) ||
      aid.reduce((s, a) => s + Number(a.amount), 0) !== issued.box5_scholarships
    ) {
      throw new Error(
        "Dependent scholarship packet needs the exact owned issued 1098-T and complete Box 5 aid ledger",
      );
    }
    let free = 0, paid = 0;
    for (const p of payments) {
      if (
        tin(p.student_ssn) !== owner || p.institution_name !== school.name ||
        p.tax_year !== 2025 || p.category !== "tuition_required_fees" ||
        !ssn.safeParse(p.payer_ssn).success ||
        !review.support_sources.some((s) =>
          s.source_document_reference === p.payment_record_id &&
          tin(s.payer_ssn) === tin(p.payer_ssn) &&
          s.kind === "ordinary_support" && s.amount === p.amount
        ) ||
        typeof p.payment_date !== "string" ||
        !p.payment_date.startsWith("2025-") ||
        !p.payment_account_record_reference ||
        qualifiedPayments.has(String(p.payment_record_id))
      ) {
        throw new Error(
          "Dependent tuition payments must join the actual payer, student, school, support ledger and 2025 payment account record",
        );
      }
      qualifiedPayments.add(String(p.payment_record_id));
      paid += Number(p.amount);
    }
    if (
      paid !== w.paid_tuition_required_fees || paid !== issued.box1_payments ||
      canonicalSource(payments.map((p) => p.payment_record_id)) !==
        canonicalSource(w.payment_record_ids)
    ) {
      throw new Error(
        "Dependent tuition payment ledger must reconcile the same issued Box 1 and parent qualified expenses",
      );
    }
    for (const a of aid) {
      if (aidRefs.has(String(a.source_document_reference))) {
        throw new Error(
          "Dependent school aid needs distinct actual source records",
        );
      }
      aidRefs.add(String(a.source_document_reference));
      if (
        tin(a.student_ssn) !== owner || a.institution_name !== school.name ||
        a.tax_year !== 2025
      ) {
        throw new Error(
          "Dependent school aid recipient and institution must match the issued source",
        );
      }
      if (a.tax_treatment === "tax_free") {
        if (
          a.required_service_compensation || a.taxable_nonservice_scholarship
        ) {
          throw new Error(
            "Taxable award cannot be used as tax-free tuition assistance",
          );
        }
        free += Number(a.amount);
        continue;
      }
      const row = incomes.find((r) =>
        r.source_document_reference === a.student_income_source_reference
      );
      if (
        !row || matchedIncome.has(row.source_document_reference) ||
        row.taxable_amount !== a.amount ||
        row.kind === "w2_education_payment" || row.payer_name !== school.name
      ) {
        throw new Error(
          "Parent taxable aid must join a distinct child's actual scholarship income source",
        );
      }
      if (row.kind === "scholarship_for_required_services") {
        if (
          a.required_service_compensation !== true ||
          tin(row.payer_ein) !== tin(school.ein) ||
          row.scholarship_terms_record_reference !==
            a.required_service_terms_record_reference
        ) {
          throw new Error(
            "Dependent service aid must join its actual award terms and school payer",
          );
        }
      } else {
        if (
          a.taxable_nonservice_scholarship !== true ||
          !row.scholarship_disbursement_sources ||
          !row.nonqualified_expense_payment_sources ||
          row.scholarship_terms_record_id !==
            a.scholarship_terms_record_reference ||
          row.taxable_allocation_record_id !==
            a.taxable_allocation_record_reference ||
          row.nonqualified_expense_payment_record_ids.some((r) =>
            qualifiedPayments.has(r)
          )
        ) {
          throw new Error(
            "Dependent nonservice aid must join actual nonqualified payments, award terms and taxable allocation",
          );
        }
      }
      matchedIncome.add(row.source_document_reference);
    }
    if (
      free !== w.tax_free_assistance_applied_to_expenses || paid - free < 0 ||
      Number(w.qualified_expense_refunds ?? 0) !== 0 ||
      Number(w.expenses_used_for_other_tax_benefits ?? 0) !== 0
    ) {
      throw new Error(
        "Dependent scholarship packet must reconcile its qualified-expense allocation without duplicate uses",
      );
    }
  }
  if (matchedIncome.size !== incomes.length) {
    throw new Error(
      "Dependent school allocation must inventory every child's retained scholarship income source",
    );
  }
  return earned;
}
export function assertDependentScholarshipReturn(
  pending: Readonly<Record<string, unknown>> | undefined,
  rows: readonly EducationIncome[],
): void {
  const general = pending?.general as Record<string, unknown> | undefined;
  if (general?.dependent_education_income_review === undefined) return;
  const review = dependentScholarshipReviewSchema.parse(
    general.dependent_education_income_review,
  );
  const earned = dependentScholarshipEarned(review);
  assertDependentKiddieTaxReturn(pending!, review, earned);
  const final = pending?.f1040 as Record<string, unknown> | undefined;
  const wages =
    ((pending?.w2 as { w2s?: Record<string, unknown>[] } | undefined)?.w2s ??
      []).map((r) => ({
        source_document_reference: r.source_document_reference,
        employee_ssn: r.employee_ssn,
        employer_ein: r.employer_ein,
        box1_wages: r.box1_wages,
      }));
  const deduction = pending?.standard_deduction as
    | Record<string, unknown>
    | undefined;
  const sourceWages = review.student_w2_sources.reduce(
    (s, r) => s + r.box1_wages,
    0,
  );
  const sourceScholarship = earned - sourceWages;
  if (
    tin(general.taxpayer_ssn) !== tin(review.student_ssn) ||
    general.taxpayer_dob !== review.student_dob ||
    general.filing_status !== "single" ||
    deduction?.agi !== earned ||
    deduction?.dependent_earned_income !== earned ||
    deduction?.taxpayer_can_be_claimed_as_dependent !== true ||
    general.taxpayer_can_be_claimed_as_dependent !== true ||
    general.taxpayer_claimed_as_dependent !== true ||
    final?.taxpayer_can_be_claimed_as_dependent !== true ||
    (general.dependent_earned_income !== undefined &&
      general.dependent_earned_income !== earned) ||
    canonicalSource(wages) !== canonicalSource(review.student_w2_sources) ||
    canonicalSource(rows) !== canonicalSource(review.student_income_sources) ||
    final.line1a_wages !== sourceWages ||
    Number(final.line8_additional_income ?? 0) !== sourceScholarship ||
    final.line9_total_income !== earned || final.line11_agi !== earned ||
    final.line12a_standard_deduction !==
      Math.min(15750, Math.max(1350, earned + 450)) ||
    final.line12c_deduction_total !==
      Math.min(15750, Math.max(1350, earned + 450)) ||
    final.line14_deductions_qbi_total !==
      Math.min(15750, Math.max(1350, earned + 450)) ||
    final.line15_taxable_income !==
      Math.max(0, earned - Math.min(15750, Math.max(1350, earned + 450))) ||
    (final.line15_taxable_income === 0 &&
      Number(final.line16_income_tax ?? 0) !== 0) ||
    (pending?.f8863 !== undefined) ||
    Number(final.line29_refundable_aoc ?? 0) !== 0 ||
    Number(
        (pending?.schedule3 as Record<string, unknown> | undefined)
          ?.line3_education_credit ?? 0,
      ) !== 0
  ) {
    throw new Error(
      "Dependent scholarship return must reconcile actual student income, dependent standard deduction and parent-only education credit",
    );
  }
}
