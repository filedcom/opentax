import { z } from "zod";
import { FMVMethod } from "./fmv-method.ts";

const amount = z.number().int().nonnegative();
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const fileName = z.string().trim().min(1).regex(/\.pdf$/i);
const sha256 = z.string().regex(/^[a-f0-9]{64}$/);

function validIsoDate(value: string): boolean {
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) &&
    date.toISOString().slice(0, 10) === value;
}

function purchasedStockHeldMoreThanOneYear(
  acquired: string,
  donated: string,
): boolean {
  if (!validIsoDate(acquired) || !validIsoDate(donated)) return false;
  const year = Number(acquired.slice(0, 4));
  const month = Number(acquired.slice(5, 7));
  const day = Number(acquired.slice(8, 10));
  const anniversary = Date.UTC(year + 1, month - 1, day);
  return Date.parse(`${donated}T00:00:00.000Z`) > anniversary;
}

const priorFormReviewSchema = z.object({
  source_tax_year: z.literal(2024),
  completed_section: z.literal("A"),
  attachment_file_name: fileName,
  pdf_sha256: sha256,
  reviewed_by: z.string().trim().min(1),
  reviewed_on: isoDate,
  filed_return_reference: z.string().trim().min(1),
  filed_taxpayer_ssn: z.string().regex(/^\d{9}$/),
  original_donation_date: isoDate,
  donor_acquired_date: isoDate,
  donor_acquisition_description: z.literal("Purchase"),
  donee_name: z.string().trim().min(1).max(75)
    .regex(/^([A-Za-z0-9#\-()&'] ?)*[A-Za-z0-9#\-()&']$/),
  donee_us_address: z.object({
    line1: z.string().trim().min(1).max(35)
      .regex(/^[A-Za-z0-9]( ?[A-Za-z0-9\-/])*$/),
    line2: z.string().trim().min(1).max(35)
      .regex(/^[A-Za-z0-9]( ?[A-Za-z0-9\-/])*$/).optional(),
    city: z.string().trim().min(1).max(22)
      .regex(/^([A-Za-z] ?)*[A-Za-z]$/),
    state: z.string().regex(/^[A-Z]{2}$/),
    zip: z.string().regex(/^\d{5}(?:-?\d{4})?$/),
  }).strict(),
  property_description: z.string().trim().min(1).max(1000),
  original_fmv: amount,
  adjusted_basis: amount,
  fmv_method: z.nativeEnum(FMVMethod),
  fmv_method_description: z.string().trim().min(1).max(25).optional(),
}).strict().superRefine((review, context) => {
  if (
    !purchasedStockHeldMoreThanOneYear(
      review.donor_acquired_date,
      review.original_donation_date,
    ) ||
    (review.fmv_method === FMVMethod.Other &&
      !review.fmv_method_description)
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        "Form 8283 reviewed purchased stock must be held more than one year and have a complete valuation method",
    });
  }
});

export const form8283CarryoverEvidenceSchema = z.object({
  contribution_id: z.string().trim().min(1),
  contribution_year: z.number().int().min(2000).max(2024),
  property_kind: z.literal("publicly_traded_securities"),
  original_section_a_similar_items_total: amount.max(5_000),
  prior_form_8283: priorFormReviewSchema,
  prior_deduction_workpaper: z.object({
    reviewed_source_reference: z.string().trim().min(1),
    total_previously_deducted_through_2024: amount,
  }).strict(),
  appraisal_required_with_2024_return: z.literal(false),
}).strict().superRefine((evidence, context) => {
  if (
    Number(evidence.prior_form_8283.original_donation_date.slice(0, 4)) !==
      evidence.contribution_year ||
    !validIsoDate(evidence.prior_form_8283.original_donation_date) ||
    !validIsoDate(evidence.prior_form_8283.reviewed_on) ||
    evidence.prior_form_8283.original_fmv > 5_000 ||
    evidence.original_section_a_similar_items_total <
      evidence.prior_form_8283.original_fmv ||
    evidence.prior_form_8283.adjusted_basis >
      evidence.prior_form_8283.original_fmv ||
    evidence.prior_deduction_workpaper.total_previously_deducted_through_2024 >
      evidence.prior_form_8283.original_fmv
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        "Form 8283 carryover source year, Section A value, basis, or prior deductions do not reconcile",
    });
  }
});

export type Form8283CarryoverEvidence = z.infer<
  typeof form8283CarryoverEvidenceSchema
>;
