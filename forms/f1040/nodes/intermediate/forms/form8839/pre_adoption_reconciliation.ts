import { z } from "zod";
import { f1040 } from "../../../outputs/f1040/index.ts";
import { FilingStatus } from "../../../types.ts";
import {
  type Form8839Input,
  prepareForm8839Credit,
  settleForm8839Credit,
} from "./index.ts";
import { assertReviewedDomestic8839Source } from "./reviewed_source.ts";

const amount = z.number().finite().nonnegative();
const sourceReference = z.string().trim().min(1);
const reviewDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value;
});

// These are explicit reviewed *nonapplicability* findings for this narrow
// no-territory/no-foreign-earned-income route. They are not substitutes for
// Form 2555/4563 or a §933 income ledger when those routes are active.
export const form8839MagiNonapplicabilitySchema = z.object({
  reviewed_by: sourceReference,
  reviewed_on: reviewDate,
  section933: z.object({
    no_puerto_rico_excluded_income_confirmed: z.literal(true),
    return_wide_review_reference: sourceReference,
  }).strict(),
  form2555: z.object({
    no_form2555_filing_or_exclusion_confirmed: z.literal(true),
    return_wide_review_reference: sourceReference,
  }).strict(),
  form4563: z.object({
    no_form4563_filing_or_exclusion_confirmed: z.literal(true),
    return_wide_review_reference: sourceReference,
  }).strict(),
}).strict();

const preAdoptionOutputSchema = z.object({
  line9_total_income: z.number().finite(),
  line10_adjustments: amount,
  line11_agi: z.number().finite(),
  line18_total_tax_before_credits: amount,
  line21_credits_total: amount,
}).passthrough();

type F1040SinkInput = z.infer<typeof f1040.inputSchema>;

/**
 * Pure staged reconciliation. Re-runs the existing Form 1040 sink on its
 * pre-adoption input; no caller may supply line 11b, line 18, or the Form 8839
 * credit-limit worksheet amount separately. This is not executor integration.
 */
export function reconcilePreAdoptionForm8839Credit(
  rawForm8839Input: Form8839Input,
  rawChildReview: unknown,
  rawSinkInput: F1040SinkInput,
  rawMagiReview: unknown,
) {
  assertReviewedDomestic8839Source(rawForm8839Input, rawChildReview);
  const prepared = prepareForm8839Credit(rawForm8839Input);
  const input = f1040.inputSchema.parse(rawSinkInput);
  form8839MagiNonapplicabilitySchema.parse(rawMagiReview);
  const schedule3 = input.credit_limit_schedule3_lines;
  if (
    input.filing_status !== FilingStatus.Single ||
    prepared.perChild.length !== 1 || prepared.adoptionBenefits !== 0 ||
    input.line11_agi === undefined ||
    !Number.isFinite(input.line11_agi) ||
    input.line19_child_tax_credit === undefined ||
    !Number.isFinite(input.line19_child_tax_credit) ||
    input.form8859_worksheet_b_applies !== false ||
    input.form8859_worksheet_b_line14 !== undefined ||
    input.form8839_form2555_line45 !== undefined ||
    input.form8839_form2555_line50 !== undefined ||
    (input.line1f_taxable_adoption_benefits ?? 0) !== 0 ||
    (input.line30_refundable_adoption ?? 0) !== 0 ||
    schedule3 === undefined || (schedule3.line6cAdoption ?? 0) !== 0
  ) {
    throw new Error(
      "Form 8839 pre-adoption reconciliation needs single-filer sourced 1040, no active exclusions, and no prefilled adoption credit",
    );
  }

  const expectedLine7 = schedule3.line6aGbc +
    schedule3.line6bPriorMinimumTax +
    (schedule3.line6dElderlyDisabled ?? 0) +
    (schedule3.line6fCleanVehicle ?? 0) +
    (schedule3.line6gMortgage ?? 0) +
    (schedule3.line6hHomebuyer ?? 0) +
    (schedule3.line6iElectricVehicle ?? 0) +
    (schedule3.line6jRefueling ?? 0) +
    schedule3.line6kBondCredit +
    (schedule3.line6lForm8978 ?? 0) +
    (schedule3.line6mUsedCleanVehicle ?? 0);
  const expectedLine20 = schedule3.line1 + schedule3.line2 +
    schedule3.line3 + schedule3.line4 + schedule3.line5a +
    schedule3.line5b + schedule3.line7;
  if (
    schedule3.line7 !== expectedLine7 ||
    (input.line20_nonrefundable_credits ?? 0) !== expectedLine20
  ) {
    throw new Error(
      "Form 8839 pre-adoption Schedule 3 lines do not reconcile to Form 1040 line 20",
    );
  }

  const preAdoption = f1040.compute(
    { taxYear: 2025, formType: "f1040" },
    input,
  );
  if (
    preAdoption.finalizations?.some((item) => item.nodeType === "schedule3")
  ) {
    throw new Error(
      "Form 8839 pre-adoption credit priority needs settled late Schedule 3 credits",
    );
  }
  const output = preAdoptionOutputSchema.parse(
    preAdoption.outputs.find((item) => item.nodeType === "f1040")?.fields,
  );
  if (
    output.line11_agi !== input.line11_agi ||
    output.line11_agi !==
      output.line9_total_income - output.line10_adjustments ||
    output.line21_credits_total !==
      input.line19_child_tax_credit + expectedLine20
  ) {
    throw new Error(
      "Form 8839 pre-adoption AGI or preceding credits differ from the computed Form 1040",
    );
  }

  const context = {
    form1040_line11b_agi: output.line11_agi,
    form1040_line18_tax_before_credits: output.line18_total_tax_before_credits,
    magi_additions: {
      puerto_rico_excluded_income: 0,
      form2555_line45: 0,
      form2555_line50: 0,
      form4563_line15: 0,
    },
    child_credit_priority: {
      basis: "form1040_line19" as const,
      amount: input.line19_child_tax_credit,
    },
    schedule3_priority: {
      line1: schedule3.line1,
      line2: schedule3.line2,
      line3: schedule3.line3,
      line4: schedule3.line4,
      line5b: schedule3.line5b,
      line6d: schedule3.line6dElderlyDisabled ?? 0,
      line6f: schedule3.line6fCleanVehicle ?? 0,
      line6g: schedule3.line6gMortgage ?? 0,
      line6l: schedule3.line6lForm8978 ?? 0,
      line6m: schedule3.line6mUsedCleanVehicle ?? 0,
    },
  };
  return {
    context,
    preAdoptionForm1040: output,
    credit: settleForm8839Credit(prepared, context),
  };
}
