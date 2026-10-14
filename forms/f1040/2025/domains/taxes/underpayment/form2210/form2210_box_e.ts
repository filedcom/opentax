import { z } from "zod";

const amount = z.number().int().nonnegative();
const sourceReference = z.string().trim().min(1);
const sha256 = z.string().regex(/^[a-f0-9]{64}$/);

const priorSeparateReturnSchema = z.object({
  owner: z.enum(["taxpayer", "spouse"]),
  tax_year: z.literal(2024),
  filing_status: z.literal("married_filing_separately"),
  full_twelve_months: z.literal(true),
  filed_return_reference: sourceReference,
  filed_return_sha256: sha256,
  adjusted_gross_income: amount,
  line22_tax_after_credits: amount,
  // The first staged branch excludes the 2024 additional-tax and refundable-
  // credit components that must otherwise be reconstructed for line 8.
  included_other_taxes: z.literal(0),
  included_refundable_credits: z.literal(0),
}).strict();

export const form2210BoxEInputSchema = z.object({
  current_filing_status: z.literal("married_filing_jointly"),
  current_return_reference: sourceReference,
  current_line22_tax_after_credits: amount,
  current_withholding_taxes: amount,
  current_included_other_taxes: z.literal(0),
  current_included_refundable_credits: z.literal(0),
  current_schedule3_line11_withholding: z.literal(0),
  current_section965_exclusion: z.literal(0),
  prior_separate_returns: z.tuple([
    priorSeparateReturnSchema,
    priorSeparateReturnSchema,
  ]),
}).strict();

export type Form2210BoxEInput = z.infer<typeof form2210BoxEInputSchema>;

export const form2210BoxEPage1LinesSchema = z.object({
  box_e: z.literal(true),
  line1: amount,
  line2: z.literal(0),
  line3: z.literal(0),
  line4: amount,
  line5: amount,
  line6: amount,
  line7: amount,
  line8: amount,
  line9: amount,
}).strict();

export type Form2210BoxEPage1Lines = z.infer<
  typeof form2210BoxEPage1LinesSchema
>;

/** Calculates only the 2025 Form 2210 page-1 box-E branch. This is not a
 * filing authorization: prior-year return bytes and the finalized 2025 return
 * must be independently bound and reconciled before export. */
export function calculateForm2210BoxEPage1(
  raw: unknown,
): Form2210BoxEPage1Lines {
  const source = form2210BoxEInputSchema.parse(raw);
  const [taxpayer, spouse] = source.prior_separate_returns;
  if (
    taxpayer.owner !== "taxpayer" || spouse.owner !== "spouse" ||
    taxpayer.filed_return_reference === spouse.filed_return_reference ||
    taxpayer.filed_return_sha256 === spouse.filed_return_sha256
  ) {
    throw new Error(
      "Form 2210 box E needs distinct 2024 taxpayer and spouse filed returns",
    );
  }
  if (
    taxpayer.adjusted_gross_income > 75_000 ||
    spouse.adjusted_gross_income > 75_000
  ) {
    throw new Error(
      "Form 2210 box E staged branch excludes the 110% prior-year tax rule",
    );
  }
  const line1 = source.current_line22_tax_after_credits;
  const line4 = line1;
  const line5 = Math.round(line4 * 0.9);
  const line6 = source.current_withholding_taxes;
  const line7 = line4 - line6;
  const line8 = taxpayer.line22_tax_after_credits +
    spouse.line22_tax_after_credits;
  if (
    line4 < 1_000 || line7 < 1_000 || line8 === 0 || line8 >= line5
  ) {
    throw new Error("Form 2210 box E page-1 filing conditions are not met");
  }
  return form2210BoxEPage1LinesSchema.parse({
    box_e: true,
    line1,
    line2: 0,
    line3: 0,
    line4,
    line5,
    line6,
    line7,
    line8,
    line9: Math.min(line5, line8),
  });
}
