import { z } from "zod";

const reference = z.string().trim().min(1);
const signed = z.number().int().min(-1_000_000_000).max(1_000_000_000);
const amount = signed.nonnegative();
const reviewedAmount = z.object({ reference, amount }).strict();
const reviewedSigned = z.object({ reference, amount: signed }).strict();
const column = z.object({
  item_id: reference,
  reference,
  country: z.string().regex(/^[A-Z]{2}$/),
  // Already refigured for exclusion items and applicable foreign capital
  // adjustments. These records do not independently authenticate that work.
  line1a_refigured_exclusion_income: amount,
  line2_definitely_related_expenses: amount,
  line3a_deductions: amount,
  line3b_other_deductions: amount,
  line3d_foreign_gross_income: amount,
  line3e_worldwide_gross_income: amount,
  line4a_mortgage_interest: amount,
  line4b_other_interest: amount,
  line5_foreign_losses: amount,
}).strict();
const category = z.object({
  category: z.enum([
    "section_951a",
    "branch",
    "passive",
    "general",
    "section_901j",
    "treaty",
    "lump_sum",
  ]),
  reference,
  treaty_country: z.string().regex(/^[A-Z]{2}$/).optional(),
  part_i: z.array(column).min(1).optional(),
  line9_regular_foreign_taxes: reviewedAmount,
  // Independently resolved MTFTCE carryovers/carrybacks, not regular FTC.
  line10_mtftce_carry: z.array(
    z.object({ item_id: reference, reference, amount }).strict(),
  ),
  line12_tax_reduction: reviewedAmount,
  line13_high_tax_reclassification: reviewedSigned,
  line16_income_adjustments: reviewedSigned.optional(),
  line17_simplified_prior_amt: reviewedSigned.optional(),
  line22_limitation_increase: reviewedAmount,
}).strict();

export const form8801MtftceSchema = z.object({
  tax_year: z.literal(2024),
  taxpayer_ssn: z.string().regex(/^\d{9}$/),
  reference,
  simplified_limitation_election: z.boolean(),
  regular_tax_adjustment_exception: z.object({
    reference,
    qualified: z.literal(true),
  }).strict().optional(),
  categories: z.array(category).min(1),
  line34_boycott_credit_reduction: reviewedAmount,
}).strict().superRefine((v, c) => {
  if (
    v.categories.reduce(
      (s, row) => s + row.line13_high_tax_reclassification.amount,
      0,
    ) !== 0
  ) {
    c.addIssue({
      code: "custom",
      message:
        "MTFTCE high-tax reclassifications must reconcile across categories",
    });
  }
  const categoryKeys = new Set<string>();
  const items = new Set<string>();
  for (const row of v.categories) {
    const key = `${row.category}:${row.treaty_country ?? ""}`;
    if (categoryKeys.has(key)) {
      c.addIssue({ code: "custom", message: "Duplicate MTFTCE category" });
    }
    categoryKeys.add(key);
    if ((row.category === "treaty") !== (row.treaty_country !== undefined)) {
      c.addIssue({
        code: "custom",
        message: "Treaty MTFTCE needs a distinct country",
      });
    }
    if (v.simplified_limitation_election) {
      if (
        row.part_i !== undefined ||
        row.line16_income_adjustments !== undefined ||
        !row.line17_simplified_prior_amt
      ) {
        c.addIssue({
          code: "custom",
          message: "Simplified MTFTCE needs prior AMT line 17 and skips Part I",
        });
      }
    } else if (
      !row.part_i || !row.line16_income_adjustments ||
      row.line17_simplified_prior_amt !== undefined
    ) {
      c.addIssue({
        code: "custom",
        message: "MTFTCE needs exclusion-only Part I and line 16",
      });
    }
    if (
      row.category === "section_951a" &&
      row.line10_mtftce_carry.some((n) => n.amount !== 0)
    ) {
      c.addIssue({
        code: "custom",
        message: "Section 951A MTFTCE cannot use tax carryovers",
      });
    }
    for (const item of [...(row.part_i ?? []), ...row.line10_mtftce_carry]) {
      if (items.has(item.item_id)) {
        c.addIssue({ code: "custom", message: "Duplicate MTFTCE source item" });
      }
      items.add(item.item_id);
    }
    for (const col of row.part_i ?? []) {
      if (col.line3d_foreign_gross_income > col.line3e_worldwide_gross_income) {
        c.addIssue({
          code: "custom",
          message: "MTFTCE foreign gross exceeds worldwide gross",
        });
      }
    }
  }
});

const scale = 1_000_000_000n;
function fraction(numerator: number, denominator: number): bigint {
  if (numerator <= 0) return 0n;
  if (numerator >= denominator) return scale;
  return (BigInt(numerator) * scale + BigInt(denominator) / 2n) /
    BigInt(denominator);
}
function roundedProduct(
  value: number,
  numerator: bigint,
  denominator: bigint,
): number {
  return Number((BigInt(value) * numerator + denominator / 2n) / denominator);
}
function total(values: number[]): number {
  const result = values.reduce((a, b) => a + b, 0);
  if (!Number.isSafeInteger(result)) {
    throw new Error("MTFTCE total exceeds exact dollars");
  }
  return result;
}
export type Form8801MtftceContext = Readonly<{
  taxpayer_ssn: string;
  prior_filing_status: string;
  lines: Partial<Record<number, number>>;
}>;

/** Reviewed refigure line arithmetic only. Part I exclusions, capital/loss
 * modifications, high-tax classification, carry history and elections are
 * entered workpapers; their provenance/eligibility is not authenticated here.
 * MTFTCE Forms 1116 are kept as workpapers, not transmitted attachments. */
export function calculateForm8801Mtftce(
  rawWorkpaper: unknown,
  context: Form8801MtftceContext,
) {
  const v = form8801MtftceSchema.parse(rawWorkpaper);
  const source = context.lines;
  const base = source[4], tax = source[11];
  if (
    v.taxpayer_ssn !== context.taxpayer_ssn || base === undefined ||
    tax === undefined || !Number.isSafeInteger(base) ||
    !Number.isSafeInteger(tax) || base < 0 || tax < 0
  ) {
    throw new Error(
      "MTFTCE needs matching owner and calculated Form 8801 lines 4/11",
    );
  }
  const preferential = source[53] !== undefined && source[54] !== undefined &&
    source[32] !== undefined && source[53] < source[54] && source[32] > 0;
  const threshold = context.prior_filing_status === "married_filing_separately"
    ? 116_300
    : 232_600;
  if (
    v.regular_tax_adjustment_exception && preferential &&
    source[32]! > threshold
  ) {
    throw new Error(
      "MTFTCE adjustment exception exceeds its AMT income threshold",
    );
  }
  let worldwide = base;
  let worldwide_worksheet: Record<number, number> | undefined;
  if (preferential && !v.regular_tax_adjustment_exception) {
    if (source[38] === undefined || source[45] === undefined) {
      throw new Error(
        "MTFTCE needs calculated preferential worksheet components",
      );
    }
    const w: Record<number, number> = {
      1: base,
      4: source[51] ?? 0,
      6: source[48] ?? 0,
      8: source[45] ?? 0,
      10: source[38] ?? 0,
    };
    w[5] = roundedProduct(w[4], 1071n, 10000n);
    w[7] = roundedProduct(w[6], 2857n, 10000n);
    w[9] = roundedProduct(w[8], 4643n, 10000n);
    w[11] = total([w[5], w[7], w[9], w[10]]);
    w[12] = w[1] - w[11];
    if (w[12] < 0) {
      throw new Error(
        "MTFTCE worldwide adjustment needs resolved nonnegative income",
      );
    }
    worldwide = w[12];
    worldwide_worksheet = w;
  }
  const categories = v.categories.map((row) => {
    const lines: Partial<Record<number, number>> = {};
    const part_i = row.part_i?.map((col) => {
      const ratio = fraction(
        col.line3d_foreign_gross_income,
        col.line3e_worldwide_gross_income,
      );
      const line3c = total([
        col.line3a_deductions,
        col.line3b_other_deductions,
      ]);
      const line3g = roundedProduct(line3c, ratio, scale);
      const line6 = total([
        col.line2_definitely_related_expenses,
        line3g,
        col.line4a_mortgage_interest,
        col.line4b_other_interest,
        col.line5_foreign_losses,
      ]);
      return {
        ...col,
        line3c,
        line3f_ratio: Number(ratio) / Number(scale),
        line3g,
        line6,
        line7: col.line1a_refigured_exclusion_income - line6,
      };
    });
    lines[9] = row.line9_regular_foreign_taxes.amount;
    if (row.category !== "section_951a") {
      lines[10] = total(row.line10_mtftce_carry.map((n) => n.amount));
    }
    lines[11] = lines[9] + (lines[10] ?? 0);
    lines[12] = row.line12_tax_reduction.amount;
    lines[13] = row.line13_high_tax_reclassification.amount;
    lines[14] = lines[11] - lines[12] + lines[13];
    if (lines[14] < 0) {
      throw new Error(
        "MTFTCE tax reductions/reclassification exceed available tax",
      );
    }
    if (v.simplified_limitation_election) {
      lines[17] = row.line17_simplified_prior_amt!.amount;
    } else {
      lines[15] = total(part_i!.map((col) => col.line7));
      lines[16] = row.line16_income_adjustments!.amount;
      lines[17] = lines[15] + lines[16];
    }
    // Section 901(j) income has no credit; other categories use the refigured
    // exclusion tax per the MTFTCE instructions rather than regular line 20.
    if (row.category !== "section_901j") lines[20] = tax;
    let allowed = 0;
    if (lines[17] > 0 && row.category !== "section_901j") {
      lines[18] = worldwide;
      const ratio = fraction(lines[17], worldwide);
      lines[19] = Number(ratio) / Number(scale);
      lines[21] = roundedProduct(tax, ratio, scale);
      lines[22] = row.line22_limitation_increase.amount;
      lines[23] = lines[21] + lines[22];
      lines[24] = Math.min(lines[14], lines[23]);
      allowed = lines[24];
    }
    return {
      category: row.category,
      treaty_country: row.treaty_country,
      reference: row.reference,
      part_i,
      lines,
      allowed_credit: allowed,
      // Instruction-level record, not an accepted carry/import ledger.
      line14_minus_line21_record: row.category === "section_901j"
        ? 0
        : Math.max(0, lines[14] - (lines[21] ?? 0)),
    };
  });
  const summary: Record<number, number> = {};
  const categoryLines = {
    section_951a: 25,
    branch: 26,
    passive: 27,
    general: 28,
    section_901j: 29,
    treaty: 30,
    lump_sum: 31,
  };
  for (const [category, line] of Object.entries(categoryLines)) {
    summary[line] = total(
      categories.filter((n) => n.category === category).map((n) =>
        n.allowed_credit
      ),
    );
  }
  summary[32] = total(Object.values(summary));
  summary[33] = categories.length === 1
    ? categories[0].allowed_credit
    : Math.min(tax, summary[32]);
  summary[34] = v.line34_boycott_credit_reduction.amount;
  if (summary[34] > summary[33]) {
    throw new Error("MTFTCE boycott reduction exceeds summary credit");
  }
  summary[35] = summary[33] - summary[34];
  return {
    categories,
    worldwide_worksheet,
    worldwide_income: worldwide,
    summary,
    form8801_line12: summary[35],
    workpaperAuthenticityVerified: false as const,
    filingReady: false as const,
  };
}
