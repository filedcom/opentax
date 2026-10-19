import { z } from "zod";
import { itemSchema } from "./sources.ts";

// Schema-only module: Form 8863's claimant review needs these shapes without
// importing the dependent kiddie-tax return checks, whose imports reach the
// AGI aggregator.
const reference = z.string().trim().min(1);
const ssn = z.string().regex(/^\d{3}-?\d{2}-?\d{4}$/);
const record = z.record(z.string(), z.unknown());
export const settledParentTaxReturnSchema = z.object({
  source_document_reference: reference,
  filer: record,
  pending: record,
}).strict();
const parentSelectionSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("divorced_custodial_remarried_mfs_greater_taxable_income"),
    source_document_reference: reference,
    divorce_decree_record_reference: reference,
    remarriage_certificate_record_reference: reference,
    remarriage_date: z.string().date(),
    residence_calendar_record_reference: reference,
    separate_filing_record_reference: reference,
    competing_dependency_claim_record_reference: reference,
    student_ssn: ssn,
    custodial_parent_ssn: ssn,
    stepparent_ssn: ssn,
    noncustodial_parent_ssn: ssn,
    custodial_parent_nights: z.number().int().min(0).max(365),
    noncustodial_parent_nights: z.number().int().min(0).max(365),
    custodial_parent_remarried: z.literal(true),
    spouses_lived_together_all_year: z.literal(true),
    noncommunity_property_residence_review: z.object({
      source_document_reference: reference,
      state: z.literal("NY"),
      full_year_domicile_days: z.literal(365),
      separate_owned_income_reviewed: z.literal(true),
    }).strict(),
    separate_return_deduction_reviews: z.array(
      z.object({
        source_document_reference: reference,
        taxpayer_ssn: ssn,
        spouse_ssn: ssn,
        itemized_payment_inventory_complete: z.literal(true),
        real_estate_tax_payments: z.array(
          z.object({
            source_document_reference: reference,
            assessor_bill_reference: reference,
            payment_date: z.string().date(),
            payer_ssn: ssn,
            property_owner_ssn: ssn,
            property_address: reference,
            deductible_real_estate_tax_confirmed: z.literal(true),
            amount: z.number().int().positive(),
          }).strict(),
        ),
      }).strict(),
    ).length(2),
    eligible_parent_returns: z.array(settledParentTaxReturnSchema).length(2),
  }).strict(),
  z.object({
    kind: z.literal("divorced_custodial_remarried_mfj"),
    source_document_reference: reference,
    divorce_decree_record_reference: reference,
    remarriage_certificate_record_reference: reference,
    remarriage_date: z.string().date(),
    residence_calendar_record_reference: reference,
    joint_filing_record_reference: reference,
    competing_dependency_claim_record_reference: reference,
    student_ssn: ssn,
    custodial_parent_ssn: ssn,
    stepparent_ssn: ssn,
    noncustodial_parent_ssn: ssn,
    custodial_parent_nights: z.number().int().min(0).max(365),
    noncustodial_parent_nights: z.number().int().min(0).max(365),
    custodial_parent_remarried: z.literal(true),
    custodial_parent_and_stepparent_filed_joint: z.literal(true),
  }).strict(),
  z.object({
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
  z.object({
    kind: z.literal("never_married_cohabiting_greater_taxable_income"),
    source_document_reference: reference,
    parentage_record_reference: reference,
    joint_residence_record_reference: reference,
    competing_dependency_claim_record_reference: reference,
    student_ssn: ssn,
    parents_never_married: z.literal(true),
    parents_lived_together_all_year: z.literal(true),
    joint_residence_days: z.literal(365),
    eligible_parent_returns: z.array(settledParentTaxReturnSchema).length(2),
  }).strict(),
]);
export const dependentKiddieTaxReviewSchema = z.object({
  source_document_reference: reference,
  tax_year: z.number().int(),
  parent_alive_record_reference: reference,
  parent_alive_at_year_end: z.boolean(),
  parent_selection: parentSelectionSchema,
  family_children_record_reference: reference,
  other_children_requiring_form8615: z.array(ssn),
  other_child_returns: z.array(
    z.object({
      source_document_reference: reference,
      student_claim_review: record,
      pending: record,
    }).strict(),
  ).optional(),
  settled_parent_return: settledParentTaxReturnSchema,
}).strict();
export const dependentScholarshipReviewSchema = z.object({
  tax_year: z.number().int(),
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
export const dependentKiddieTaxFamilyReviewSchema = z.object({
  tax_year: z.number().int(),
  source_document_reference: reference,
  parent_returns: z.array(settledParentTaxReturnSchema).min(1),
  child_returns: z.array(
    z.object({
      source_document_reference: reference,
      student_claim_review: dependentScholarshipReviewSchema,
      pending: record,
    }).strict(),
  ).min(1),
}).strict();
export type DependentScholarshipReview = z.infer<
  typeof dependentScholarshipReviewSchema
>;
