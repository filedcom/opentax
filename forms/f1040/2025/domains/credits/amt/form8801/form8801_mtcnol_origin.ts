import { z } from "zod";
const reference = z.string().trim().min(1);
const amount = z.number().int().nonnegative().max(1_000_000_000);
const item = z.object({
  item_id: reference,
  reference,
  business: z.boolean(),
  amount,
}).strict();
export const form8801MtcnolOriginSchema = z.object({
  tax_year: z.number().int().min(2018).max(2025),
  owner_ssn: z.string().regex(/^\d{9}$/),
  reference,
  filing_status: z.enum([
    "single",
    "head_of_household",
    "married_filing_jointly",
    "qualifying_surviving_spouse",
    "married_filing_separately",
  ]),
  basis: z.literal("amt_exclusion_items_only"),
  // Reviewed basis adjustments, not independent eligibility/authentication.
  personal_exemptions_already_removed: z.literal(true),
  section1202_exclusion_already_restored: z.literal(true),
  nol_and_qbi_deductions_excluded: z.literal(true),
  noncapital_income: z.array(item),
  noncapital_deductions: z.array(item),
  capital_gains: z.array(item),
  capital_losses: z.array(item),
}).strict().superRefine((v, c) => {
  const ids = new Set<string>();
  for (
    const row of [
      ...v.noncapital_income,
      ...v.noncapital_deductions,
      ...v.capital_gains,
      ...v.capital_losses,
    ]
  ) {
    if (ids.has(row.item_id)) {
      c.addIssue({
        code: "custom",
        message: "Duplicate MTCNOL origin source item",
      });
    }
    ids.add(row.item_id);
  }
});
const positive = (n: number) => Math.max(0, n);
function sum(rows: readonly { amount: number }[]) {
  const n = rows.reduce((s, r) => s + r.amount, 0);
  if (!Number.isSafeInteger(n)) {
    throw new Error("MTCNOL origin sum exceeds exact dollars");
  }
  return n;
}
/** Adapted section172(d) workpaper for individual 2018–2025 origins. Source
 * items must already use exclusion-only AMT income/deductions and full1202
 * gains. They are reviewed facts, not authenticated return/issuer records.
 * This is neither a regular Form172 filing document nor a carry-eligibility
 * or section172(b)(2) absorption computation. */
export function calculateForm8801MtcnolOrigin(raw: unknown) {
  const v = form8801MtcnolOriginSchema.parse(raw),
    lines: Partial<Record<number, number>> = {};
  const losses = sum(v.capital_losses), gains = sum(v.capital_gains);
  const capital_loss_before_limit = positive(losses - gains);
  const capital_loss_deduction = Math.min(
    capital_loss_before_limit,
    v.filing_status === "married_filing_separately" ? 1500 : 3000,
  );
  const income = sum(v.noncapital_income) + positive(gains - losses);
  const deductions = sum(v.noncapital_deductions) + capital_loss_deduction;
  lines[1] = income - deductions;
  lines[2] = sum(v.capital_losses.filter((r) => !r.business));
  lines[3] = sum(v.capital_gains.filter((r) => !r.business));
  lines[4] = positive(lines[2] - lines[3]);
  lines[5] = positive(lines[3] - lines[2]);
  lines[6] = sum(v.noncapital_deductions.filter((r) => !r.business));
  lines[7] = sum(v.noncapital_income.filter((r) => !r.business));
  lines[8] = lines[5] + lines[7];
  lines[9] = positive(lines[6] - lines[8]);
  lines[10] = Math.min(positive(lines[8] - lines[6]), lines[5]);
  lines[11] = sum(v.capital_losses.filter((r) => r.business));
  lines[12] = sum(v.capital_gains.filter((r) => r.business));
  lines[13] = lines[10] + lines[12];
  lines[14] = positive(lines[11] - lines[13]);
  lines[15] = lines[4] + lines[14];
  if (capital_loss_before_limit > 0) {
    lines[16] = capital_loss_before_limit;
    // Section1202 preference already restores the gain in exclusion-only AMTI.
    lines[17] = 0;
    lines[18] = lines[16];
    lines[19] = capital_loss_deduction;
    lines[20] = positive(lines[18] - lines[19]);
    lines[21] = positive(lines[19] - lines[18]);
  }
  lines[22] = positive(lines[15] - (lines[20] ?? 0));
  // Base excludes prior NOL deductions and AMT personal exemptions already.
  lines[23] = 0;
  lines[24] = Math.min(
    0,
    lines[1] + lines[9] + (lines[17] ?? 0) + (lines[21] ?? 0) + lines[22] +
      lines[23],
  );
  if (Object.values(lines).some((n) => !Number.isSafeInteger(n))) {
    throw new Error("MTCNOL origin arithmetic exceeds exact dollars");
  }
  return {
    lines,
    origin_nol: positive(-lines[24]),
    capital_loss_deduction,
    originLossWorkpaperArithmeticReconciled: true as const,
    sourceBasisVerified: false as const,
    workpaperAuthenticityVerified: false as const,
    filingReady: false as const,
  };
}
