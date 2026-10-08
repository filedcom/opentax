import { z } from "zod";
import { calculateReviewedNolOrigin } from "./form172_nol_origin.ts";

const ref = z.string().trim().min(1);
const ssn = z.string().regex(/^\d{9}$/);
const amount = z.number().int().nonnegative().max(1_000_000_000);
const signed = z.number().int().min(-1_000_000_000).max(1_000_000_000);
const year = z.number().int().min(2003).max(2025);
const reviewedAmount = z.object({ reference: ref, amount }).strict();

/** Annual return is refigured before the current or later NOL vintage. Items
 * affected by modified AGI remain reviewed workpapers, not source eligibility
 * proof. The calculation records this boundary instead of assuming them zero. */
export const form172CarryAbsorptionSchema = z.object({
  reference: ref,
  tax_year: year,
  taxpayer_ssn: ssn,
  spouse_ssn: ssn.optional(),
  filing_status: z.enum([
    "single",
    "married_filing_jointly",
    "married_filing_separately",
    "head_of_household",
    "qualifying_surviving_spouse",
  ]),
  return_reference: ref,
  before_current_and_later_nol: z.literal(true),
  agi: signed,
  deduction_method: z.enum(["standard", "itemized"]),
  standard_or_itemized_deduction: amount,
  qbi_deduction: amount,
  section250_deduction: amount,
  section199_deduction: reviewedAmount.optional(),
  personal_exemptions: amount,
  reported_taxable_income: amount,
  return_nol_deduction: reviewedAmount,
  earlier_nols: z.array(
    z.object({
      item_id: ref,
      reference: ref,
      origin_year: z.number().int().min(1900).max(2024),
      carry_available: amount,
      deduction_on_return: amount,
    }).strict(),
  ),
  capital_loss_deduction: reviewedAmount,
  section1202_exclusion: reviewedAmount,
  // Paired before/after records retain the actual sign of an AGI refigure.
  agi_refigures: z.array(
    z.object({
      item_id: ref,
      reference: ref,
      kind: z.enum(["income", "deduction"]),
      before: amount,
      after: amount,
    }).strict(),
  ),
  refigured_itemized_deduction: reviewedAmount.optional(),
  prior_absorption_records: z.array(
    z.object({
      item_id: ref,
      reference: ref,
      tax_year: year,
      absorbed: amount,
    }).strict(),
  ),
}).strict().superRefine((v, c) => {
  const ids = new Set<string>();
  for (
    const row of [
      ...v.earlier_nols,
      ...v.agi_refigures,
      ...v.prior_absorption_records,
    ]
  ) {
    if (ids.has(row.item_id)) {
      c.addIssue({
        code: "custom",
        message: "Duplicate NOL absorption source item",
      });
    }
    ids.add(row.item_id);
  }
  if (v.reference === v.return_reference) {
    c.addIssue({
      code: "custom",
      message: "Absorption and return references must differ",
    });
  }
  if (
    (v.tax_year < 2018 && !v.section199_deduction) ||
    (v.tax_year >= 2018 || v.tax_year < 2005) &&
      (v.section199_deduction?.amount ?? 0) !== 0
  ) {
    c.addIssue({
      code: "custom",
      message: "Historical absorption needs year-consistent section199 review",
    });
  }
  const joint = v.filing_status === "married_filing_jointly";
  if (
    joint !== (v.spouse_ssn !== undefined) || v.spouse_ssn === v.taxpayer_ssn
  ) {
    c.addIssue({
      code: "custom",
      message: "Absorption review needs distinct matching joint identity",
    });
  }
  if (
    v.tax_year < 2018 &&
      (v.qbi_deduction !== 0 || v.section250_deduction !== 0) ||
    v.tax_year >= 2018 && v.personal_exemptions !== 0
  ) {
    c.addIssue({
      code: "custom",
      message: "Absorption deductions conflict with calendar-year rules",
    });
  }
  if (
    (v.deduction_method === "itemized") !==
      (v.refigured_itemized_deduction !== undefined)
  ) {
    c.addIssue({
      code: "custom",
      message: "Itemized absorption needs a refigured deduction workpaper",
    });
  }
  if (
    v.capital_loss_deduction.amount >
      (v.filing_status === "married_filing_separately" ? 1500 : 3000)
  ) {
    c.addIssue({
      code: "custom",
      message: "Absorption capital deduction exceeds individual annual limit",
    });
  }
});

function sum(values: readonly number[]): number {
  const n = values.reduce((a, b) => a + b, 0);
  if (!Number.isSafeInteger(n)) {
    throw new Error("NOL absorption arithmetic exceeds exact dollars");
  }
  return n;
}
const positive = (n: number) => Math.max(0, n);
function percent(value: number, pct: number): number {
  return Number((BigInt(value) * BigInt(pct) + 50n) / 100n);
}

/** A regular-tax per-year workpaper, not an accepted carry ledger. Origin is
 * recomputed, so no standalone NOL balance or taxable-capacity assertion can
 * establish this result. Missing years, carryback elections, marital changes,
 * farming splits, source authentication and AMT remain separate requirements. */
export function calculateForm172CarryAbsorption(
  rawOrigin: unknown,
  rawAnnualReview: unknown,
) {
  const origin = calculateReviewedNolOrigin(rawOrigin);
  const v = form172CarryAbsorptionSchema.parse(rawAnnualReview);
  if (
    v.tax_year === origin.taxYear || v.taxpayer_ssn !== origin.taxpayerSsn ||
    v.spouse_ssn !== origin.spouseSsn
  ) {
    throw new Error(
      "NOL absorption needs matching origin owner and a different application year",
    );
  }
  const trueTaxable = sum([
    v.agi,
    -v.standard_or_itemized_deduction,
    -v.qbi_deduction,
    -v.section250_deduction,
    -v.personal_exemptions,
  ]);
  if (v.reported_taxable_income !== positive(trueTaxable)) {
    throw new Error("NOL absorption return taxable income does not reconcile");
  }
  for (const row of v.earlier_nols) {
    if (
      row.origin_year >= origin.taxYear ||
      row.deduction_on_return > row.carry_available
    ) {
      throw new Error(
        "Earlier NOL vintages must precede the current origin and reconcile available amounts",
      );
    }
  }
  const previousYears = new Set<number>();
  let lastYear = 0;
  for (const row of v.prior_absorption_records) {
    if (
      row.tax_year === origin.taxYear || row.tax_year >= v.tax_year ||
      previousYears.has(row.tax_year) || row.tax_year <= lastYear
    ) {
      throw new Error(
        "Prior absorption reviews need distinct chronological application years",
      );
    }
    previousYears.add(row.tax_year);
    lastYear = row.tax_year;
  }
  const previousAbsorption = sum(
    v.prior_absorption_records.map((r) => r.absorbed),
  );
  if (previousAbsorption > origin.regularNol) {
    throw new Error("Prior absorption exceeds recomputed origin loss");
  }
  const openingLoss = origin.regularNol - previousAbsorption;
  const earlierDeduction = sum(
    v.earlier_nols.map((r) => r.deduction_on_return),
  );
  if (v.return_nol_deduction.amount !== earlierDeduction) {
    throw new Error(
      "Earlier NOL inventory differs from the reviewed return deduction",
    );
  }
  const earlierPre2018Available = sum(
    v.earlier_nols.filter((r) => r.origin_year < 2018).map((r) =>
      r.carry_available
    ),
  );
  const pre2018Available = earlierPre2018Available +
    (origin.taxYear < 2018 ? openingLoss : 0);
  const earlierPost2017Deduction = sum(
    v.earlier_nols.filter((r) => r.origin_year >= 2018).map((r) =>
      r.deduction_on_return
    ),
  );
  // Section172(a)(2)(B): no NOL, QBI or section250 deductions in the base.
  const taxableWithoutNolQbi250 = positive(
    sum([
      v.agi,
      earlierDeduction,
      -v.standard_or_itemized_deduction,
      -v.personal_exemptions,
    ]),
  );
  const excessAfterPre2018 = positive(
    taxableWithoutNolQbi250 - pre2018Available,
  );
  const post2017Limit = v.tax_year >= 2021
    ? percent(excessAfterPre2018, 80)
    : taxableWithoutNolQbi250;
  if (v.tax_year >= 2021 && earlierPost2017Deduction > post2017Limit) {
    throw new Error(
      "Earlier post-2017 deduction exceeds annual aggregate limitation",
    );
  }
  const deductionCapacity = origin.taxYear < 2018
    ? positive(taxableWithoutNolQbi250 - earlierDeduction)
    : positive(
      post2017Limit -
        (v.tax_year >= 2021 ? earlierPost2017Deduction : earlierDeduction),
    );
  const currentDeduction = Math.min(openingLoss, deductionCapacity);
  const agiAdjustment = sum(
    v.agi_refigures.map((r) =>
      r.kind === "income" ? r.after - r.before : r.before - r.after
    ),
  );
  const capitalAdjustment = v.capital_loss_deduction.amount +
    v.section1202_exclusion.amount;
  const modifiedAgi = sum([
    v.agi,
    capitalAdjustment,
    agiAdjustment,
    v.section199_deduction?.amount ?? 0,
  ]);
  const refiguredDeduction = v.refigured_itemized_deduction?.amount ??
    v.standard_or_itemized_deduction;
  const modifiedTaxableIncome = positive(
    sum([modifiedAgi, -refiguredDeduction]),
  );
  // Section172(b)(2)(C) reduces the modified base by 20% of the statutory
  // excess. It does not simply multiply modified taxable income by 80%.
  const absorptionReduction = v.tax_year >= 2021
    ? percent(excessAfterPre2018, 20)
    : 0;
  const absorptionCapacity = positive(
    modifiedTaxableIncome - absorptionReduction,
  );
  const absorbed = Math.min(openingLoss, absorptionCapacity);
  const remainingLoss = openingLoss - absorbed;
  return {
    originYear: origin.taxYear,
    applicationYear: v.tax_year,
    openingLoss,
    trueTaxableIncome: trueTaxable,
    taxableWithoutNolQbi250,
    pre2018Available,
    excessAfterPre2018,
    post2017Limit,
    earlierPost2017Deduction,
    currentDeduction,
    agiAdjustment,
    modifiedAgi,
    refiguredDeduction,
    modifiedTaxableIncome,
    absorptionReduction,
    absorptionCapacity,
    absorbed,
    remainingLoss,
    originLossWorkpaperArithmeticReconciled: true as const,
    annualReturnAmountsReconciled: true as const,
    absorptionWorkpaperArithmeticReconciled: true as const,
    completeCarryHistoryVerified: false as const,
    agiRefigureEligibilityVerified: false as const,
    itemizedRefigureEligibilityVerified: false as const,
    carrybackEligibilityVerified: false as const,
    maritalAllocationVerified: false as const,
    priorAcceptanceVerified: false as const,
    sourceAuthenticityVerified: false as const,
    amtNolReconciled: false as const,
    filingReady: false as const,
  };
}
