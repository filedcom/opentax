import { z } from "zod";
import {
  form3800SpecifiedCreditLineSchema,
  form3800StandardCreditLineSchema,
} from "../../intermediate/forms/form8582cr/credit-route.ts";

const dollars = z.number().finite().nonnegative().refine((amount) =>
  Number.isSafeInteger(Math.round(amount * 100)) &&
  Math.abs(amount * 100 - Math.round(amount * 100)) < 0.000001
);
const reference = z.string().trim().min(1);
const taxYearEndDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(
  (value) =>
    !Number.isNaN(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value,
  "Form 3800 tax year end must be a calendar date",
);
const cents = (amount: number): number => Math.round(amount * 100);
const creditLine = z.union([
  form3800StandardCreditLineSchema,
  form3800SpecifiedCreditLineSchema,
  z.literal("3"),
]);

/** One origin-year credit, retained separately from every other source. */
export const form3800CarryoverVintageSchema = z.object({
  source_key: reference,
  credit_type: reference,
  form3800_credit_line: creditLine,
  originating_tax_year: z.number().int().min(2005).max(2024),
  originating_tax_year_end_date: taxYearEndDate,
  source_document_reference: reference,
  originating_return_reference: reference,
  permitted_carryback_years: z.union([
    z.literal(1),
    z.literal(3),
    z.literal(5),
  ]),
  extended_carryback_eligibility_reference: reference.optional(),
  credit_generated_as_filed: dollars.refine((amount) => amount > 0),
  credit_allowed_origin_year: dollars,
  // Credit used in another tax year, supported by the return for that year.
  historical_uses: z.array(
    z.object({
      tax_year: z.number().int().min(2000).max(2024),
      tax_year_end_date: taxYearEndDate,
      credit_allowed: dollars.refine((amount) => amount > 0),
      return_reference: reference,
      kind: z.enum(["carryback", "carryforward"]),
    }).strict(),
  ),
  // Recapture, audit, or other downward changes already reflected before 2025.
  prior_adjustments: z.array(
    z.object({
      tax_year: z.number().int().min(2005).max(2024),
      amount: dollars.refine((value) => value > 0),
      reason: reference,
      source_document_reference: reference,
    }).strict(),
  ),
  balance_carried_to_2025: dollars.refine((amount) => amount > 0),
  original_reported_balance_carried_to_2025: dollars,
  // The 2025 change remains separate from the balance entering the year.
  adjustment_2025: z.object({
    amount: dollars.refine((value) => value > 0),
    reason: reference,
    source_document_reference: reference,
  }).strict().optional(),
}).strict().superRefine((vintage, ctx) => {
  if (
    Number(vintage.originating_tax_year_end_date.slice(0, 4)) !==
      vintage.originating_tax_year
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["originating_tax_year_end_date"],
      message: "Form 3800 origin year and year-end date do not reconcile",
    });
  }
  if (
    (vintage.permitted_carryback_years > 1) !==
      Boolean(vintage.extended_carryback_eligibility_reference)
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["extended_carryback_eligibility_reference"],
      message: "Form 3800 extended carryback needs its eligibility evidence",
    });
  }
  const seenUseYears = new Set<number>();
  let historicalUse = cents(vintage.credit_allowed_origin_year);
  for (const [index, use] of vintage.historical_uses.entries()) {
    if (Number(use.tax_year_end_date.slice(0, 4)) !== use.tax_year) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["historical_uses", index, "tax_year_end_date"],
        message: "Form 3800 use year and year-end date do not reconcile",
      });
    }
    if (seenUseYears.has(use.tax_year)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["historical_uses", index, "tax_year"],
        message: "Form 3800 vintage has duplicate use in a tax year",
      });
    }
    seenUseYears.add(use.tax_year);
    if (
      use.kind === "carryback"
        ? use.tax_year >= vintage.originating_tax_year ||
          use.tax_year < vintage.originating_tax_year -
              vintage.permitted_carryback_years
        : use.tax_year <= vintage.originating_tax_year
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["historical_uses", index, "tax_year"],
        message: "Form 3800 vintage use is outside its origin-year direction",
      });
    }
    historicalUse += cents(use.credit_allowed);
  }
  const priorAdjustments = vintage.prior_adjustments.reduce(
    (sum, adjustment, index) => {
      if (adjustment.tax_year < vintage.originating_tax_year) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["prior_adjustments", index, "tax_year"],
          message: "Form 3800 adjustment precedes its originating credit",
        });
      }
      return sum + cents(adjustment.amount);
    },
    0,
  );
  if (
    !Number.isSafeInteger(historicalUse + priorAdjustments) ||
    historicalUse + priorAdjustments +
          cents(vintage.balance_carried_to_2025) !==
      cents(vintage.credit_generated_as_filed)
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["balance_carried_to_2025"],
      message:
        "Form 3800 origin credit, prior uses, changes, and 2025 balance do not reconcile",
    });
  }
  if (
    cents(vintage.adjustment_2025?.amount ?? 0) >
      cents(vintage.balance_carried_to_2025)
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["adjustment_2025", "amount"],
      message: "Form 3800 2025 adjustment exceeds its incoming balance",
    });
  }
});

export const form3800CarryoverLedgerSchema = z.array(
  form3800CarryoverVintageSchema,
).superRefine((vintages, ctx) => {
  const keys = new Set<string>();
  for (const [index, vintage] of vintages.entries()) {
    const key = vintage.source_key;
    if (keys.has(key)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [index, "source_key"],
        message: "Form 3800 carryover source key is duplicated",
      });
    }
    keys.add(key);
  }
});

export type Form3800CarryoverVintage = z.infer<
  typeof form3800CarryoverVintageSchema
>;

/** Checked arithmetic only; filing allocation and evidence binding are later gates. */
export function reconcileForm3800CarryoverLedger(
  raw: readonly Form3800CarryoverVintage[],
) {
  const vintages = form3800CarryoverLedgerSchema.parse(raw);
  return vintages.map((vintage) => ({
    sourceKey: vintage.source_key,
    creditType: vintage.credit_type,
    form3800CreditLine: vintage.form3800_credit_line,
    originatingTaxYear: vintage.originating_tax_year,
    originatingTaxYearEndDate: vintage.originating_tax_year_end_date,
    statementFacts: {
      sourceDocumentReference: vintage.source_document_reference,
      originatingReturnReference: vintage.originating_return_reference,
      creditGeneratedAsFiled: vintage.credit_generated_as_filed,
      creditAllowedOriginYear: vintage.credit_allowed_origin_year,
      historicalUses: vintage.historical_uses,
      priorAdjustments: vintage.prior_adjustments,
      originallyReported2025Balance:
        vintage.original_reported_balance_carried_to_2025,
      adjustment2025: vintage.adjustment_2025,
    },
    balanceEntering2025: vintage.balance_carried_to_2025,
    adjustment2025: vintage.adjustment_2025?.amount ?? 0,
    availableAfterAdjustment: (cents(vintage.balance_carried_to_2025) -
      cents(vintage.adjustment_2025?.amount ?? 0)) / 100,
    revisedFromOriginal: cents(vintage.balance_carried_to_2025) !==
      cents(vintage.original_reported_balance_carried_to_2025),
  }));
}
