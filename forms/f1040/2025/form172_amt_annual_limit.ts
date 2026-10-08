import { z } from "zod";
import { calculateReviewedAmtLossYear } from "./form172_amt_loss_year.ts";

/** 2018–2024 tentative Form6251 lines1–3, excluding line2f. Values are signed
 * contributions: the printed parenthetical line2b is entered negatively. */
export const form172AmtTentativeLines = [
  "1",
  "2a",
  "2b",
  "2c",
  "2d",
  "2e",
  "2g",
  "2h",
  "2i",
  "2j",
  "2k",
  "2l",
  "2m",
  "2n",
  "2o",
  "2p",
  "2q",
  "2r",
  "2s",
  "2t",
  "3",
] as const;
/** 2013–2017 printed lines1–27, excluding ATNOLD line11. In 2017 line2
 * is reserved and must be explicit zero. */
export const form172AmtLegacyTentativeLines = [
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "12",
  "13",
  "14",
  "15",
  "16",
  "17",
  "18",
  "19",
  "20",
  "21",
  "22",
  "23",
  "24",
  "25",
  "26",
  "27",
] as const;
/** In 2025 line1a is an intermediate deduction subtotal, not another AMTI
 * contribution. Only line1b replaces the earlier line1 in the total. */
export const form172Amt2025TentativeLines = [
  "1b",
  ...form172AmtTentativeLines.slice(1),
] as const;
const ref = z.string().trim().min(1);
const signedDollars = z.number().int().min(-1_000_000_000).max(1_000_000_000);
const positiveDollars = z.number().int().min(0).max(1_000_000_000);
const schema = z.object({
  reference: ref,
  tax_year: z.number().int().min(2013).max(2025),
  taxpayer_ssn: z.string().regex(/^\d{9}$/),
  spouse_ssn: z.string().regex(/^\d{9}$/).optional(),
  form6251_reference: ref,
  before_all_atnold: z.literal(true),
  tentative_depletion_refigured_with_zero_atnold: z.literal(true),
  section199_deduction: z.object({ reference: ref, amount: positiveDollars })
    .strict().optional(),
  reviewed_form1040: z.object({
    reference: ref,
    tax_year: z.literal(2025),
    taxpayer_ssn: z.string().regex(/^\d{9}$/),
    spouse_ssn: z.string().regex(/^\d{9}$/).optional(),
    line11b_agi: signedDollars,
    line14_deductions: positiveDollars,
    schedule1a_line37_senior_deduction: positiveDollars,
  }).strict().optional(),
  components: z.array(
    z.object({
      line: z.enum([
        ...form172AmtTentativeLines,
        "1b",
        ...form172AmtLegacyTentativeLines,
      ]),
      reference: ref,
      amount: z.number().int().min(-1_000_000_000).max(1_000_000_000),
    }).strict(),
  ),
}).strict();

/** Section56(d) ordinary 90% limit workpaper, NOT the final ATNOLD or carry
 * absorption. Every tentative component (including explicit zeros) is required.
 * Section172 limitations/order, earlier vintages, special 100% losses and
 * modified-income carry absorption remain separate, unproved requirements. */
export function calculateForm172AmtAnnualLimit(
  rawRegularOrigin: unknown,
  rawAmtOrigin: unknown,
  rawAnnual: unknown,
) {
  const origin = calculateReviewedAmtLossYear(rawRegularOrigin, rawAmtOrigin);
  const v = schema.parse(rawAnnual);
  if (
    v.tax_year === origin.taxYear ||
    v.taxpayer_ssn !== origin.taxpayerSsn || v.spouse_ssn !== origin.spouseSsn
  ) {
    throw new Error(
      "AMT annual limit needs matching owners and a different year",
    );
  }
  if (v.reference === v.form6251_reference) {
    throw new Error("AMT limit workpaper and return references must differ");
  }
  const requiredLines = v.tax_year === 2025
    ? form172Amt2025TentativeLines
    : v.tax_year < 2018
    ? form172AmtLegacyTentativeLines
    : form172AmtTentativeLines;
  const lines = new Map(v.components.map((c) => [c.line, c.amount]));
  if (
    v.components.length !== requiredLines.length ||
    lines.size !== requiredLines.length ||
    requiredLines.some((line) => !lines.has(line))
  ) {
    throw new Error(
      "AMT limit needs each tentative Form6251 component exactly once",
    );
  }
  let form6251Line1a: number | undefined;
  if (v.tax_year === 2025) {
    const f = v.reviewed_form1040;
    if (!f) throw new Error("2025 AMT line1b needs reviewed Form1040 operands");
    if (
      f.taxpayer_ssn !== v.taxpayer_ssn || f.spouse_ssn !== v.spouse_ssn ||
      [v.reference, v.form6251_reference].includes(f.reference) ||
      f.schedule1a_line37_senior_deduction > f.line14_deductions
    ) {
      throw new Error(
        "2025 AMT Form1040 identity, references or deductions conflict",
      );
    }
    form6251Line1a = f.line14_deductions - f.schedule1a_line37_senior_deduction;
    if (lines.get("1b") !== f.line11b_agi - form6251Line1a) {
      throw new Error(
        "2025 AMT line1b does not reconcile to Form1040 and Schedule1A",
      );
    }
  } else if (v.reviewed_form1040) {
    throw new Error("2025 AMT line1 review cannot establish an earlier return");
  }
  const historical = v.tax_year < 2018;
  if (
    historical ? !v.section199_deduction : v.section199_deduction !== undefined
  ) {
    throw new Error("AMT annual cap needs a year-consistent section199 review");
  }
  if (
    v.section199_deduction && (
      [v.reference, v.form6251_reference].includes(
        v.section199_deduction.reference,
      ) ||
      v.components.some((c) =>
        c.reference === v.section199_deduction!.reference
      )
    )
  ) throw new Error("Annual section199 addback must be separately identified");
  if (
    historical
      ? lines.get("6")! > 0 || lines.get("7")! > 0 || lines.get("10")! < 0 ||
        lines.get("25")! > 0
      : lines.get("2b")! > 0 || lines.get("2e")! < 0 || lines.get("2s")! > 0
  ) {
    throw new Error(
      "AMT refund subtraction and regular NOL addback signs conflict",
    );
  }
  if (v.tax_year === 2017 && lines.get("2") !== 0) {
    throw new Error("2017 Form6251 reserved line2 must be zero");
  }
  const tentativeAmtiBeforeAtnold = v.components.reduce(
    (n, c) => n + c.amount,
    0,
  );
  if (!Number.isSafeInteger(tentativeAmtiBeforeAtnold)) {
    throw new Error("AMT tentative total exceeds exact dollars");
  }
  const section199Addback = v.section199_deduction?.amount ?? 0;
  const ordinaryLimitBase = tentativeAmtiBeforeAtnold + section199Addback;
  if (!Number.isSafeInteger(ordinaryLimitBase)) {
    throw new Error("AMT annual limit base exceeds exact dollars");
  }
  const ordinary90PercentLimit = Number(
    (BigInt(Math.max(0, ordinaryLimitBase)) * 90n + 50n) / 100n,
  );
  return {
    originYear: origin.taxYear,
    applicationYear: v.tax_year,
    originAmtNol: origin.amtNol,
    ...(form6251Line1a === undefined ? {} : { form6251Line1a }),
    tentativeAmtiBeforeAtnold,
    section199Addback,
    ordinaryLimitBase,
    ordinary90PercentLimit,
    amtAnnualLimitWorkpaperArithmeticReconciled: true as const,
    section172AnnualLimitReconciled: false as const,
    earlierVintageOrderingReconciled: false as const,
    special100PercentLossesReconciled: false as const,
    amtCarryAbsorptionReconciled: false as const,
    tentativeDepletionEligibilityVerified: false as const,
    sourceAuthenticityVerified: false as const,
    priorAcceptanceVerified: false as const,
    filingReady: false as const,
  };
}
