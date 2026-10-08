import { z } from "zod";

const reference = z.string().trim().min(1);
const ssn = z.string().regex(/^\d{9}$/);
const amount = z.number().int().nonnegative().max(1_000_000_000);
const signed = z.number().int().min(-1_000_000_000).max(1_000_000_000);
const filingStatus = z.enum([
  "single",
  "married_filing_jointly",
  "married_filing_separately",
  "head_of_household",
  "qualifying_surviving_spouse",
]);
const source = z.object({
  item_id: reference,
  reference,
  owner_ssn: ssn,
  business: z.boolean(),
  amount,
}).strict();

/** Reviewed allowed regular-tax items, after loss limitations. References
 * identify review records; they do not authenticate an issuer or acceptance. */
export const reviewedLossYearSchema = z.object({
  tax_year: z.number().int().min(2018).max(2025),
  taxpayer_ssn: ssn,
  spouse_ssn: ssn.optional(),
  reference,
  filing_status: filingStatus,
  reviewed_form1040: z.object({
    reference,
    tax_year: z.number().int().min(2018).max(2025),
    taxpayer_ssn: ssn,
    spouse_ssn: ssn.optional(),
    filing_status: filingStatus,
    line11_agi: signed,
    line12_standard_or_itemized_deduction: amount,
  }).strict(),
  reviewed_form172: z.object({
    reference,
    tax_year: z.number().int().min(2018).max(2025),
    taxpayer_ssn: ssn,
    lines: z.record(z.string().regex(/^(?:[1-9]|1[0-9]|2[0-4])$/), signed),
  }).strict().optional(),
  limitations_review: z.object({
    reference,
    at_risk_and_passive_limits_applied: z.literal(true),
    excess_business_loss_limit_applied: z.literal(true),
  }).strict(),
  noncapital_income: z.array(source),
  noncapital_deductions: z.array(
    source.extend({
      location: z.enum(["agi", "line12"]),
    }).strict(),
  ),
  capital_gains: z.array(
    source.extend({
      // Full gain before this exclusion, as required on Part I lines 3/12.
      section1202_excluded: amount,
    }).strict(),
  ),
  capital_losses: z.array(source),
  prior_nol_deductions: z.array(
    z.object({
      item_id: reference,
      reference,
      owner_ssn: ssn,
      amount,
    }).strict(),
  ),
}).strict().superRefine((v, c) => {
  if (
    v.reviewed_form1040.tax_year !== v.tax_year ||
    v.reviewed_form1040.taxpayer_ssn !== v.taxpayer_ssn ||
    v.reviewed_form1040.spouse_ssn !== v.spouse_ssn ||
    v.reviewed_form1040.filing_status !== v.filing_status
  ) {
    c.addIssue({
      code: "custom",
      message: "Reviewed Form 1040 header conflicts with loss-year identity",
    });
  }
  const joint = v.filing_status === "married_filing_jointly";
  if (
    joint !== (v.spouse_ssn !== undefined) || v.spouse_ssn === v.taxpayer_ssn
  ) {
    c.addIssue({
      code: "custom",
      message: "Loss-year joint identity needs distinct spouses",
    });
  }
  if (v.reference === v.reviewed_form1040.reference) {
    c.addIssue({
      code: "custom",
      message: "Loss-year workpaper and return references must differ",
    });
  }
  if (
    v.reviewed_form172 && (
      v.reviewed_form172.tax_year !== v.tax_year ||
      v.reviewed_form172.taxpayer_ssn !== v.taxpayer_ssn ||
      new Set([
          v.reference,
          v.reviewed_form1040.reference,
          v.reviewed_form172.reference,
        ]).size !== 3
    )
  ) {
    c.addIssue({
      code: "custom",
      message:
        "Reviewed Form 172 needs matching year/owner and distinct reference",
    });
  }
  const ids = new Set<string>();
  for (
    const row of [
      ...v.noncapital_income,
      ...v.noncapital_deductions,
      ...v.capital_gains,
      ...v.capital_losses,
      ...v.prior_nol_deductions,
    ]
  ) {
    if (ids.has(row.item_id)) {
      c.addIssue({
        code: "custom",
        message: "Duplicate loss-year source item",
      });
    }
    ids.add(row.item_id);
    if (row.owner_ssn !== v.taxpayer_ssn && row.owner_ssn !== v.spouse_ssn) {
      c.addIssue({
        code: "custom",
        message: "Loss-year source owner does not match return",
      });
    }
  }
  for (const row of v.capital_gains) {
    if (row.section1202_excluded > row.amount) {
      c.addIssue({
        code: "custom",
        message: "Section 1202 exclusion exceeds its gain",
      });
    }
  }
});

function sum(rows: readonly { amount: number }[]): number {
  const result = rows.reduce((n, row) => n + row.amount, 0);
  if (!Number.isSafeInteger(result)) {
    throw new Error("Loss-year sum exceeds exact dollars");
  }
  return result;
}
const positive = (n: number) => Math.max(0, n);

/** Reconciles source inventory to reviewed AGI/deduction and computes the
 * individual Part I workpaper. It does not establish carry availability,
 * section172(b)(2) absorption, ATNOL, EBL carry or prior filing acceptance. */
export function calculateReviewedLossYear(raw: unknown) {
  const v = reviewedLossYearSchema.parse(raw);
  const gains = sum(v.capital_gains), losses = sum(v.capital_losses);
  const exclusion = sum(
    v.capital_gains.map((row) => ({ amount: row.section1202_excluded })),
  );
  const netCapital = gains - exclusion - losses;
  const capitalLoss = positive(-netCapital);
  const capitalLossDeduction = Math.min(
    capitalLoss,
    v.filing_status === "married_filing_separately" ? 1500 : 3000,
  );
  const priorNol = sum(v.prior_nol_deductions);
  const agi = sum(v.noncapital_income) + positive(netCapital) -
    capitalLossDeduction -
    sum(v.noncapital_deductions.filter((row) => row.location === "agi")) -
    priorNol;
  const deduction = sum(
    v.noncapital_deductions.filter((row) => row.location === "line12"),
  );
  if (
    agi !== v.reviewed_form1040.line11_agi ||
    deduction !== v.reviewed_form1040.line12_standard_or_itemized_deduction
  ) {
    throw new Error(
      "Loss-year items must reconcile to reviewed Form 1040 AGI and deduction",
    );
  }
  const lines: Partial<Record<number, number>> = {};
  lines[1] = agi - deduction;
  lines[2] = sum(v.capital_losses.filter((row) => !row.business));
  lines[3] = sum(v.capital_gains.filter((row) => !row.business));
  lines[4] = positive(lines[2] - lines[3]);
  lines[5] = positive(lines[3] - lines[2]);
  lines[6] = sum(v.noncapital_deductions.filter((row) => !row.business));
  lines[7] = sum(v.noncapital_income.filter((row) => !row.business));
  lines[8] = lines[5] + lines[7];
  lines[9] = positive(lines[6] - lines[8]);
  lines[10] = Math.min(positive(lines[8] - lines[6]), lines[5]);
  lines[11] = sum(v.capital_losses.filter((row) => row.business));
  lines[12] = sum(v.capital_gains.filter((row) => row.business));
  lines[13] = lines[10] + lines[12];
  lines[14] = positive(lines[11] - lines[13]);
  lines[15] = lines[4] + lines[14];
  if (capitalLoss > 0 || exclusion > 0) {
    lines[16] = capitalLoss;
    lines[17] = exclusion;
    lines[18] = positive(lines[16] - lines[17]);
    lines[19] = capitalLossDeduction;
    lines[20] = positive(lines[18] - lines[19]);
    lines[21] = positive(lines[19] - lines[18]);
  }
  lines[22] = positive(lines[15] - (lines[20] ?? 0));
  lines[23] = priorNol;
  const combined = lines[1] + lines[9] + (lines[17] ?? 0) + (lines[21] ?? 0) +
    lines[22] + lines[23];
  lines[24] = Math.min(0, combined);
  if (
    [agi, deduction, combined, ...Object.values(lines)].some((n) =>
      !Number.isSafeInteger(n)
    )
  ) {
    throw new Error("Loss-year arithmetic exceeds exact dollars");
  }
  if (v.reviewed_form172) {
    for (let line = 1; line <= 24; line++) {
      const entered = v.reviewed_form172.lines[String(line)],
        computed = lines[line];
      // Skipped printed cells can be blank or explicit zero in a review.
      if (
        computed === undefined
          ? entered !== undefined && entered !== 0
          : entered !== computed
      ) {
        throw new Error(
          `Reviewed Form 172 Part I line ${line} conflicts with source calculation`,
        );
      }
    }
  }
  return {
    taxYear: v.tax_year,
    taxpayerSsn: v.taxpayer_ssn,
    spouseSsn: v.spouse_ssn,
    lines,
    regularNol: positive(-combined),
    capitalLossDeduction,
    reviewedReturnAmountsReconciled: true as const,
    lossYearWorkpaperArithmeticReconciled: true as const,
    reviewedForm172AmountsReconciled: v.reviewed_form172 !== undefined,
    sourceClassificationVerified: false as const,
    limitationsVerified: false as const,
    priorAcceptanceVerified: false as const,
    carryAvailabilityVerified: false as const,
    amtNolReconciled: false as const,
    filingReady: false as const,
  };
}
