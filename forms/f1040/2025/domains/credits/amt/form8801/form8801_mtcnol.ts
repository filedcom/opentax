import { z } from "zod";
import {
  calculateForm8801MtcnolOrigin,
  form8801MtcnolOriginSchema,
} from "./form8801_mtcnol_origin.ts";
const reference = z.string().trim().min(1);
const amount = z.number().int().nonnegative().max(1_000_000_000);
const ssn = z.string().regex(/^\d{9}$/);
const reviewedAmount = z.object({ reference, amount }).strict();
export const form8801MtcnolSchema = z.object({
  tax_year: z.literal(2024),
  taxpayer_ssn: ssn,
  reference,
  vintages: z.array(
    z.object({
      item_id: reference,
      owner_ssn: ssn,
      origin_year: z.number().int().min(1900).max(2025),
      direction: z.enum(["carryforward", "carryback"]),
      // Independent exclusion-only section172(d) refigure, not regular/AMT NOL.
      origin_exclusion_only_nol: reviewedAmount.extend({
        refiguring: form8801MtcnolOriginSchema.optional(),
      }).strict(),
      eligibility_workpaper: z.object({
        reference,
        eligible_for_2024: z.literal(true),
      }).strict(),
      uses_before_2024: z.array(
        z.object({
          tax_year: z.number().int().min(1900).max(2023),
          reference,
          amount,
        }).strict(),
      ),
    }).strict(),
  ),
}).strict().superRefine((v, c) => {
  const items = new Set<string>(), origins = new Set<string>();
  for (const row of v.vintages) {
    const origin = `${row.owner_ssn}:${row.origin_year}`;
    if (items.has(row.item_id) || origins.has(origin)) {
      c.addIssue({
        code: "custom",
        message: "Duplicate MTCNOL origin or item",
      });
    }
    items.add(row.item_id);
    origins.add(origin);
    if (
      row.direction === "carryforward"
        ? row.origin_year >= 2024
        : row.origin_year <= 2024
    ) {
      c.addIssue({
        code: "custom",
        message: "MTCNOL direction does not carry its origin to 2024",
      });
    }
    let previous = 0;
    for (const used of row.uses_before_2024) {
      if (
        used.tax_year <= previous ||
        (row.direction === "carryforward"
          ? used.tax_year <= row.origin_year
          : used.tax_year >= row.origin_year)
      ) {
        c.addIssue({
          code: "custom",
          message:
            "MTCNOL usage history needs distinct chronological eligible years",
        });
      }
      previous = used.tax_year;
    }
  }
});
/** Reviewed vintage depletion/aggregation only. Origin losses, section172(d)
 * modifications, legal carry eligibility/expiry, amendments and owner
 * allocations are reviewed source facts, not derived/authenticated here. */
export function calculateForm8801Mtcnol(
  raw: unknown,
  context: {
    taxpayer_ssn: string;
    prior_filing_status: string;
    prior_spouse_ssn?: string;
  },
) {
  const v = form8801MtcnolSchema.parse(raw);
  if (v.taxpayer_ssn !== context.taxpayer_ssn) {
    throw new Error("MTCNOL workpaper taxpayer differs");
  }
  const owners = new Set([context.taxpayer_ssn]);
  if (
    context.prior_filing_status === "married_filing_jointly" &&
    context.prior_spouse_ssn
  ) owners.add(context.prior_spouse_ssn);
  const vintages = v.vintages.map((row) => {
    if (!owners.has(row.owner_ssn)) {
      throw new Error(
        "MTCNOL vintage owner is outside the reviewed 2024 filer",
      );
    }
    const origin = row.origin_exclusion_only_nol.refiguring;
    const origin_refiguring = origin
      ? calculateForm8801MtcnolOrigin(origin)
      : undefined;
    if (
      origin &&
      (origin.tax_year !== row.origin_year ||
        origin.owner_ssn !== row.owner_ssn)
    ) {
      throw new Error(
        "MTCNOL origin refigure owner/year differs from its vintage",
      );
    }
    if (
      origin_refiguring &&
      origin_refiguring.origin_nol !== row.origin_exclusion_only_nol.amount
    ) {
      throw new Error(
        "MTCNOL entered origin loss differs from exclusion-only calculation",
      );
    }
    const prior_used = row.uses_before_2024.reduce((s, r) => s + r.amount, 0);
    if (
      !Number.isSafeInteger(prior_used) ||
      prior_used > row.origin_exclusion_only_nol.amount
    ) {
      throw new Error(
        "MTCNOL prior uses exceed the exclusion-only origin loss",
      );
    }
    return {
      ...row,
      origin_refiguring,
      originLossWorkpaperArithmeticReconciled: origin_refiguring !== undefined,
      prior_used,
      available_to_2024: row.origin_exclusion_only_nol.amount - prior_used,
    };
  });
  const form8801_line3 = vintages.reduce((s, r) => s + r.available_to_2024, 0);
  if (!Number.isSafeInteger(form8801_line3)) {
    throw new Error("MTCNOL total exceeds exact dollars");
  }
  return {
    vintages,
    form8801_line3,
    originLossWorkpaperArithmeticReconciled: vintages.length > 0 &&
      vintages.every((row) => row.originLossWorkpaperArithmeticReconciled),
    originLossCalculationVerified: false as const,
    carryEligibilityVerified: false as const,
    workpaperAuthenticityVerified: false as const,
    filingReady: false as const,
  };
}
