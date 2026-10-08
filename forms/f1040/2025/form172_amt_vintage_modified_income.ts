import { z } from "zod";
import { form172AmtAnnualReviewSchema } from "./form172_amt_annual_limit.ts";
import { calculateForm172HistoricalAmtDeductionAllocation } from "./form172_amt_historical_cap.ts";
import { calculateForm172HistoricalAmtModifiedIncome } from "./form172_amt_modified_income.ts";

const ref = z.string().trim().min(1);
const schema = z.object({
  reference: ref,
  application_tax_year: z.number().int().min(2008).max(2017),
  taxpayer_ssn: z.string().regex(/^\d{9}$/),
  spouse_ssn: z.string().regex(/^\d{9}$/).optional(),
  vintages: z.array(
    z.object({
      origin_year: z.number().int().min(2005).max(2017),
      loss_reference: ref,
      // The paired workpaper excludes direct ATNOLD in its component sum;
      // affected deductions are separately refigured for this earlier inventory.
      refigured_deductions_include_earlier_nol_effects: z.literal(true),
      earlier_nol_deductions: z.array(
        z.object({
          origin_year: z.number().int().min(2005).max(2017),
          loss_reference: ref,
          amount: z.number().int().nonnegative().max(1_000_000_000),
        }).strict(),
      ),
      modified_review: z.unknown(),
    }).strict(),
  ).min(1).max(13),
}).strict();

/** Each loss has its own section172(b)(2) refigure context. Earlier actual
 * deductions are independently allocated from the annual cap, NOT inferred
 * from earlier absorption or asserted surviving balances. This joins reviewed
 * operands; it does not authenticate refigure eligibility or apply section56's
 * absorption coordination. No fixed shared modified base is assumed.
 */
export function calculateForm172HistoricalAmtVintageModifiedIncome(
  rawCap: unknown,
  rawReviews: unknown,
) {
  const allocation = calculateForm172HistoricalAmtDeductionAllocation(rawCap);
  const annual = form172AmtAnnualReviewSchema.parse(
    z.object({ annual_review: z.unknown() }).passthrough().parse(rawCap)
      .annual_review,
  );
  const v = schema.parse(rawReviews);
  if (
    v.application_tax_year !== annual.tax_year ||
    v.taxpayer_ssn !== annual.taxpayer_ssn ||
    v.spouse_ssn !== annual.spouse_ssn ||
    [annual.reference, annual.form6251_reference].includes(v.reference)
  ) throw new Error("AMT vintage refigures must match annual year and owners");
  const rows = new Map(v.vintages.map((row) => [row.origin_year, row]));
  const origins = allocation.chronologicalDeductionAllocations;
  if (
    v.vintages.length !== origins.length || rows.size !== origins.length ||
    origins.some((loss) => !rows.has(loss.originYear))
  ) throw new Error("AMT vintage refigures need each origin exactly once");
  const references = new Set([
    v.reference,
    annual.reference,
    annual.form6251_reference,
  ]);
  const workpapers = origins.map((loss, index) => {
    const row = rows.get(loss.originYear)!;
    if (row.loss_reference !== loss.reference) {
      throw new Error(
        "AMT vintage refigure loss reference does not match origin",
      );
    }
    const earlier = origins.slice(0, index);
    const deductions = new Map(
      row.earlier_nol_deductions.map((d) => [d.origin_year, d]),
    );
    if (
      row.earlier_nol_deductions.length !== earlier.length ||
      deductions.size !== earlier.length || earlier.some((d) => {
        const actual = deductions.get(d.originYear);
        return !actual || actual.loss_reference !== d.reference ||
          actual.amount !== d.allocatedDeduction;
      })
    ) {
      throw new Error(
        "AMT vintage earlier deductions differ from chronological annual allocation",
      );
    }
    const modified = calculateForm172HistoricalAmtModifiedIncome(
      rawCap,
      row.modified_review,
    );
    const reviewReference =
      z.object({ reference: ref }).passthrough().parse(row.modified_review)
        .reference;
    if (references.has(reviewReference)) {
      throw new Error(
        "AMT vintage modified-income workpapers must be distinct",
      );
    }
    references.add(reviewReference);
    const componentRefs = z.object({
      components: z.array(z.object({ refigured_reference: ref }).passthrough()),
      section199: z.object({ refigured_reference: ref }).passthrough(),
    }).passthrough().parse(row.modified_review);
    for (
      const reference of [
        ...componentRefs.components.map((c) => c.refigured_reference),
        componentRefs.section199.refigured_reference,
      ]
    ) {
      if (references.has(reference)) {
        throw new Error(
          "AMT vintage refigured operand references must be distinct across contexts",
        );
      }
      references.add(reference);
    }

    const earlierDeduction = earlier.reduce(
      (total, d) => total + d.allocatedDeduction,
      0,
    );
    if (!Number.isSafeInteger(earlierDeduction)) {
      throw new Error("AMT vintage earlier deductions exceed exact dollars");
    }
    return {
      originYear: loss.originYear,
      lossReference: loss.reference,
      modifiedReviewReference: reviewReference,
      category: loss.category,
      reviewedOpening: loss.reviewedOpening,
      actualAllocatedDeduction: loss.allocatedDeduction,
      earlierActualDeduction: earlierDeduction,
      signedModifiedAmtiBeforeDirectEarlierAtnold: modified.signedModifiedAmti,
      modifiedAmtiAfterEarlierAtnold: Math.max(
        0,
        modified.signedModifiedAmti - earlierDeduction,
      ),
      modified,
    };
  });
  return {
    applicationYear: allocation.applicationYear,
    chronologicalVintageModifiedIncome: workpapers,
    vintageRefigureContextArithmeticReconciled: true as const,
    refiguredOperandEligibilityVerified: false as const,
    section56AbsorptionLimitReconciled: false as const,
    chronologicalAbsorptionReconciled: false as const,
    survivingCarryVerified: false as const,
    sourceAuthenticityVerified: false as const,
    priorAcceptanceVerified: false as const,
    filingReady: false as const,
  };
}
