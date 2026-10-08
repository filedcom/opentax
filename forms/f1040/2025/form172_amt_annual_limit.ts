import { z } from "zod";
import { calculateReviewedAmtLossYear } from "./form172_amt_loss_year.ts";

/** Tentative Form6251 lines1–3, excluding line2f. Values are signed arithmetic
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
const ref = z.string().trim().min(1);
const schema = z.object({
  reference: ref,
  tax_year: z.number().int().min(2013).max(2025),
  taxpayer_ssn: z.string().regex(/^\d{9}$/),
  spouse_ssn: z.string().regex(/^\d{9}$/).optional(),
  form6251_reference: ref,
  before_all_atnold: z.literal(true),
  tentative_depletion_refigured_with_zero_atnold: z.literal(true),
  components: z.array(
    z.object({
      line: z.enum(form172AmtTentativeLines),
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
  const lines = new Map(v.components.map((c) => [c.line, c.amount]));
  if (
    v.components.length !== form172AmtTentativeLines.length ||
    lines.size !== form172AmtTentativeLines.length
  ) {
    throw new Error(
      "AMT limit needs each tentative Form6251 component exactly once",
    );
  }
  if (lines.get("2b")! > 0 || lines.get("2e")! < 0) {
    throw new Error(
      "AMT refund subtraction and regular NOL addback signs conflict",
    );
  }
  const tentativeAmtiBeforeAtnold = v.components.reduce(
    (n, c) => n + c.amount,
    0,
  );
  if (!Number.isSafeInteger(tentativeAmtiBeforeAtnold)) {
    throw new Error("AMT tentative total exceeds exact dollars");
  }
  const ordinary90PercentLimit = Number(
    (BigInt(Math.max(0, tentativeAmtiBeforeAtnold)) * 90n + 50n) / 100n,
  );
  return {
    originYear: origin.taxYear,
    applicationYear: v.tax_year,
    originAmtNol: origin.amtNol,
    tentativeAmtiBeforeAtnold,
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
