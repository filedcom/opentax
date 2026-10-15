import { z } from "zod";
import { roundWholeDollars } from "../../whole-dollars.ts";

const ref = z.string().trim().min(1);
const money = z.number().finite().nonnegative();
const tin = z.string().regex(/^\d{3}-?\d{2}-?\d{4}$/);
const ein = z.string().regex(/^\d{2}-?\d{7}$/);
const norm = (s: string) => s.replaceAll("-", "");
const paymentSchema = z.object({
  record_reference: ref,
  payment_date: z.string().date(),
  academic_period_reference: ref,
  payer: z.enum(["filer", "student", "third_party", "financial_aid"]),
  category: z.enum([
    "tuition_required_fees",
    "institution_required_materials",
    "outside_required_course_materials",
    "nonqualified",
  ]),
  category_record_reference: ref,
  amount: money.positive(),
  included_in_form1098t_box1: z.boolean(),
}).strict();
const statementSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("issued"),
    tax_year: z.literal(2026),
    document_reference: ref,
    student_tin: tin,
    institution_ein: ein,
    corrected: z.boolean(),
    superseded_document_references: z.array(ref),
    box1_payments: money,
    box4_prior_adjustments: z.literal(0),
    box5_scholarships: money,
    box6_prior_scholarship_adjustments: z.literal(0),
    box7_early_2027: z.boolean(),
    box8_half_time: z.boolean(),
    box9_graduate: z.boolean(),
    box10_insurance_reimbursements: money,
  }).strict(),
  z.object({
    kind: z.literal("required_not_received"),
    request_record_reference: ref,
    requested_date: z.string().date(),
    fully_cooperated: z.literal(true),
    cooperation_record_reference: ref,
  }).strict(),
  z.object({
    kind: z.literal("noncredit_courses_only"),
    institution_not_required_to_furnish: z.literal(true),
    furnishing_rule_record_reference: ref,
  }).strict(),
]);
const schoolSchema = z.object({
  school_reference: ref,
  name: ref,
  ein: ein.optional(),
  address: z.object({
    line1: ref,
    line2: ref.optional(),
    city: ref,
    state: z.string().length(2),
    zip: z.string().regex(/^\d{5}(?:-?\d{4})?$/),
  }).strict(),
  eligible_institution_record_reference: ref,
  copies_and_account_reconciled: z.literal(true),
  statement: statementSchema,
  prior_1098t: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("none") }).strict(),
    z.object({
      kind: z.literal("received"),
      tax_year: z.literal(2025),
      document_reference: ref,
      student_tin: tin,
      institution_ein: ein,
      box7_early_2026: z.boolean(),
    }).strict(),
  ]),
  academic_periods: z.array(
    z.object({
      reference: ref,
      start_date: z.string().date(),
      enrollment_record_reference: ref,
      degree_or_credential_program: z.boolean(),
      at_least_half_time: z.boolean(),
      academic_credit: z.boolean(),
      postsecondary_or_job_skills: z.literal(true),
    }).strict(),
  ).min(1).max(20),
  payments: z.array(paymentSchema).max(200),
  refunds: z.array(
    z.object({
      record_reference: ref,
      payment_reference: ref,
      received_date: z.string().date(),
      amount: money.positive(),
      kind: z.enum(["institution", "insurance"]),
    }).strict(),
  ).max(100),
  assistance: z.array(
    z.object({
      document_reference: ref,
      kind: z.enum([
        "scholarship",
        "employer_assistance",
        "veterans",
        "other_tax_free",
      ]),
      tax_free_status_record_reference: ref,
      amount: money.positive(),
      included_in_form1098t_box5: z.boolean(),
      allocations: z.array(
        z.object({ payment_reference: ref, amount: money.positive() }).strict(),
      ).min(1),
    }).strict(),
  ).max(100),
  other_benefit_uses: z.array(
    z.object({
      record_reference: ref,
      payment_reference: ref,
      amount: money.positive(),
      benefit: z.enum(["529", "coverdell", "other_deduction_or_credit"]),
    }).strict(),
  ).max(100),
  complete_expense_refund_and_assistance_inventory: z.literal(true),
}).strict();
const history = z.object({
  record_reference: ref,
  prior_aotc_claim_years: z.array(z.number().int().min(2009).max(2025)),
  completed_first_four_years_before_2026: z.boolean(),
  felony_drug_conviction_by_end_2026: z.boolean(),
}).strict();
export const educationClaim2026Schema = z.object({
  claim: z.object({
    tax_year: z.literal(2026),
    review_reference: ref,
    return_filing_date: z.string().date(),
    business_inventory_reference: ref.optional(),
    neither_filer_claimed_on_another_return: z.literal(true),
    no_foreign_or_territory_income_exclusions: z.literal(true),
    no_foreign_tax_form8978_or_prior_amt_credit: z.literal(true),
    no_taxable_scholarships_or_prior_year_recapture: z.literal(true),
    prior_aotc_disallowance: z.enum(["none", "math_or_clerical_only"]),
    refundable_review: z.discriminatedUnion("kind", [
      z.object({ kind: z.literal("not_under24_nonjoint") }).strict(),
      z.object({
        kind: z.literal("under24_nonjoint"),
        record_reference: ref,
        at_least_one_parent_alive: z.boolean(),
        full_time_student_months: z.array(z.number().int().min(1).max(12)).max(
          12,
        ),
        enrollment_record_reference: ref,
        complete_support_inventory: z.literal(true),
        support_records: z.array(
          z.object({
            record_reference: ref,
            amount: money,
            payer: z.enum(["taxpayer", "parent", "other", "scholarship"]),
            category: z.enum([
              "housing",
              "food",
              "education",
              "medical",
              "transportation",
              "clothing",
              "recreation",
              "other",
            ]),
          }).strict(),
        ).min(1),
      }).strict(),
    ]),
    students: z.array(
      z.object({
        student_tin: tin,
        eligibility_record_reference: ref,
        credit_type: z.enum(["aotc", "llc"]),
        aotc_history: history.optional(),
        schools: z.array(schoolSchema).min(1).max(20),
      }).strict(),
    ).min(1).max(25),
  }).strict(),
}).strict();
export type EducationClaim2026 = z.input<
  typeof educationClaim2026Schema
>["claim"];

/** Current-year payment/aid source ledger. No caller-calculated adjusted
 * expense or credit is accepted; every reduction belongs to a payment. */
export function resolveEducationExpenses2026(claim: EducationClaim2026) {
  const used = new Set<string>();
  const unique = (value: string) => {
    if (used.has(value)) {
      throw new Error("Duplicate education payment, aid or document reference");
    }
    used.add(value);
  };
  const people = new Set<string>();
  if (claim.return_filing_date < "2027-01-01") {
    throw new Error("Education return filing date must follow tax year 2026");
  }
  return claim.students.map((student) => {
    const studentTin = norm(student.student_tin);
    if (people.has(studentTin)) {
      throw new Error("One education credit per student on the return");
    }
    people.add(studentTin);
    const institutions = new Set<string>();
    let adjusted = 0, halfTimeDegree = false;
    const schools = student.schools.map((school) => {
      const schoolKey = school.ein
        ? norm(school.ein)
        : school.name.toUpperCase();
      if (institutions.has(schoolKey)) {
        throw new Error(
          "School copies must be reconciled into one student institution record",
        );
      }
      institutions.add(schoolKey);
      unique(school.school_reference);
      if (student.credit_type === "aotc" && !school.ein) {
        throw new Error("AOTC requires the institution EIN");
      }
      const periods = new Map(
        school.academic_periods.map((p) => [p.reference, p]),
      );
      if (periods.size !== school.academic_periods.length) {
        throw new Error("Duplicate academic period reference");
      }
      for (const p of periods.values()) {
        if (p.start_date < "2026-01-01" || p.start_date > "2027-03-31") {
          throw new Error(
            "Education expenses need a 2026 or January-March 2027 academic period",
          );
        }
        if (
          p.at_least_half_time && p.degree_or_credential_program &&
          (p.start_date.startsWith("2026-") ||
            school.payments.some((payment) =>
              payment.academic_period_reference === p.reference &&
              payment.payment_date.startsWith("2026-") &&
              payment.category !== "nonqualified"
            ))
        ) {
          halfTimeDegree = true;
        }
      }
      const payments = new Map(
        school.payments.map((p) => [p.record_reference, p]),
      );
      const reductions = new Map<string, number>();
      const reduce = (id: string, amount: number, taxFree = false) => {
        const p = payments.get(id);
        if (!p || (taxFree && p.category === "nonqualified")) {
          throw new Error("Education reduction needs a known eligible payment");
        }
        const total = (reductions.get(id) ?? 0) + amount;
        if (total > p.amount + .000001) {
          throw new Error(
            "Education refunds, aid and other benefits exceed the payment",
          );
        }
        reductions.set(id, total);
      };
      for (const p of school.payments) {
        unique(p.record_reference);
        if (
          !periods.has(p.academic_period_reference) ||
          !p.payment_date.startsWith("2026-")
        ) {
          throw new Error(
            "Education payment needs a known term and 2026 payment date",
          );
        }
      }
      let netBox1 = school.payments.filter((p) => p.included_in_form1098t_box1)
        .reduce((n, p) => n + p.amount, 0);
      let insurance = 0, box5 = 0;
      for (const refund of school.refunds) {
        unique(refund.record_reference);
        const p = payments.get(refund.payment_reference);
        if (
          !p || refund.received_date < p.payment_date ||
          refund.received_date > claim.return_filing_date
        ) {
          throw new Error(
            "Education refund needs current-payment and pre-filing reconciliation",
          );
        }
        reduce(refund.payment_reference, refund.amount);
        if (refund.received_date.startsWith("2026-")) {
          if (refund.kind === "insurance") insurance += refund.amount;
          else if (p.included_in_form1098t_box1) netBox1 -= refund.amount;
        }
      }
      for (const aid of school.assistance) {
        unique(aid.document_reference);
        if (aid.included_in_form1098t_box5 && aid.kind !== "scholarship") {
          throw new Error("Only scholarship/grant sources reconcile to box 5");
        }
        if (
          Math.abs(
            aid.allocations.reduce((n, a) => n + a.amount, 0) - aid.amount,
          ) > .000001
        ) {
          throw new Error(
            "Full tax-free assistance must be allocated to reviewed current expenses",
          );
        }
        for (const allocation of aid.allocations) {
          reduce(allocation.payment_reference, allocation.amount, true);
        }
        if (aid.included_in_form1098t_box5) box5 += aid.amount;
      }
      for (const other of school.other_benefit_uses) {
        unique(other.record_reference);
        reduce(other.payment_reference, other.amount);
      }
      const statement = school.statement;
      if (statement.kind === "issued") {
        unique(statement.document_reference);
        for (const superseded of statement.superseded_document_references) {
          unique(superseded);
        }
        if (
          statement.corrected !==
            (statement.superseded_document_references.length > 0)
        ) {
          throw new Error(
            "Corrected tuition statement needs its superseded copies",
          );
        }
        if (
          norm(statement.student_tin) !== studentTin || !school.ein ||
          norm(statement.institution_ein) !== norm(school.ein)
        ) {
          throw new Error(
            "Tuition statement student or institution identity does not match",
          );
        }
        const early = school.payments.some((p) =>
          p.included_in_form1098t_box1 &&
          periods.get(p.academic_period_reference)!.start_date.startsWith(
            "2027-",
          )
        );
        if (
          Math.abs(netBox1 - statement.box1_payments) > .000001 ||
          Math.abs(box5 - statement.box5_scholarships) > .000001 ||
          Math.abs(insurance - statement.box10_insurance_reimbursements) >
            .000001 ||
          statement.box7_early_2027 !== early
        ) {
          throw new Error(
            "1098-T payments, assistance, insurance or early-period box does not reconcile to source records",
          );
        }
      } else if (statement.kind === "required_not_received") {
        unique(statement.request_record_reference);
        if (
          statement.requested_date <= "2027-02-01" ||
          statement.requested_date >= claim.return_filing_date
        ) {
          throw new Error(
            "Missing 2026 Form 1098-T must be requested after February 1, 2027 and before filing",
          );
        }
      } else if (
        student.credit_type !== "llc" ||
        school.academic_periods.some((p) => p.academic_credit)
      ) {
        throw new Error(
          "Noncredit-course 1098-T exception requires only noncredit LLC courses",
        );
      }
      const prior = school.prior_1098t;
      if (prior.kind === "received") {
        unique(prior.document_reference);
        if (
          norm(prior.student_tin) !== studentTin || !school.ein ||
          norm(prior.institution_ein) !== norm(school.ein)
        ) throw new Error("Prior 1098-T must match the student and school");
      }
      const amount = school.payments.reduce(
        (n, p) =>
          n +
          (p.category === "nonqualified" ||
              (student.credit_type === "llc" &&
                p.category === "outside_required_course_materials")
            ? 0
            : p.amount - (reductions.get(p.record_reference) ?? 0)),
        0,
      );
      adjusted += amount;
      return {
        ...school,
        adjusted_expenses: amount,
        current_1098t_received: statement.kind === "issued",
        prior_1098t_box7: prior.kind === "received" && prior.box7_early_2026,
      };
    });
    if (student.credit_type === "aotc") {
      const h = student.aotc_history;
      if (
        !h ||
        new Set(h.prior_aotc_claim_years).size !==
          h.prior_aotc_claim_years.length ||
        h.prior_aotc_claim_years.length >= 4 ||
        h.completed_first_four_years_before_2026 ||
        h.felony_drug_conviction_by_end_2026 || !halfTimeDegree
      ) {
        throw new Error(
          "AOTC requires reviewed prior years, first-four-years, half-time degree enrollment and felony eligibility",
        );
      }
    }
    return {
      ...student,
      student_tin: studentTin,
      schools,
      adjusted_expenses: roundWholeDollars(adjusted),
    };
  });
}
