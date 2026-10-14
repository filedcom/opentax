import { z } from "zod";
import {
  form172AmtModernOrdinaryCapSchema,
} from "./form172_amt_annual_limit.ts";
import { calculateForm172ModernAmtOrdinaryAbsorptionWorkpaper } from "./form172_amt_historical_absorption.ts";
import { calculateReviewedAmtLossYear } from "./form172_amt_loss_year.ts";
import { form172ModernAmtVintageReviewSchema } from "./form172_amt_vintage_modified_income.ts";

const ref = z.string().trim().min(1);
const year = z.number().int().min(2018).max(2025);
const schema = z.object({
  reference: ref,
  start_year: year,
  end_year: year,
  taxpayer_ssn: z.string().regex(/^\d{9}$/),
  spouse_ssn: z.string().regex(/^\d{9}$/).optional(),
  entry_reviews: z.array(
    z.object({
      reference: ref,
      origin_year: z.number().int().min(2005).max(2024),
      loss_reference: ref,
      application_year: year,
      reviewed_opening: z.number().int().nonnegative().max(1_000_000_000),
    }).strict(),
  ).min(1).max(21),
  annual_applications: z.array(
    z.object({
      application_year: year,
      cap_workpaper: form172AmtModernOrdinaryCapSchema,
      vintage_reviews: form172ModernAmtVintageReviewSchema,
    }).strict(),
  ).min(1).max(8),
}).strict();

/** Consecutive MODEL applications only. Entry carry declarations and the
 * section172/section56 coordination model remain legally unverified. Arithmetic
 * continuity cannot establish accepted history or authorize a carry import. */
export function calculateForm172ModernAmtModelHistory(raw: unknown) {
  const v = schema.parse(raw);
  if (
    v.end_year < v.start_year ||
    v.annual_applications.length !== v.end_year - v.start_year + 1
  ) {
    throw new Error("Modern AMT model history requires every declared year");
  }
  const entries = new Map(v.entry_reviews.map((e) => [e.origin_year, e]));
  if (entries.size !== v.entry_reviews.length) {
    throw new Error("Modern AMT model history needs unique origin entries");
  }
  const references = new Set<string>([v.reference]);
  const addReference = (reference: string) => {
    if (references.has(reference)) {
      throw new Error("Modern AMT model history needs distinct annual reviews");
    }
    references.add(reference);
  };
  v.entry_reviews.forEach((entry) => addReference(entry.reference));
  const usedEntries = new Set<number>();
  const identities = new Map<number, string>();
  let balances = new Map<number, number>();
  const annualBases = new Map<number, {
    amti: number;
    section199a: number;
    section250: number;
  }>();
  const years = v.annual_applications.map((row, index) => {
    const expected = v.start_year + index;
    const cap = row.cap_workpaper;
    const annual = cap.annual_review;
    if (
      row.application_year !== expected || annual.tax_year !== expected ||
      annual.taxpayer_ssn !== v.taxpayer_ssn ||
      annual.spouse_ssn !== v.spouse_ssn
    ) {
      throw new Error(
        "Modern AMT model history needs consecutive years and owners",
      );
    }
    for (
      const reference of [
        cap.reference,
        annual.reference,
        annual.form6251_reference,
        cap.deductions_review.reference,
        row.vintage_reviews.reference,
        ...annual.components.map((c) => c.reference),
        ...(annual.reviewed_form1040
          ? [annual.reviewed_form1040.reference]
          : []),
        ...row.vintage_reviews.vintages.flatMap((r) => {
          const m = z.object({
            reference: ref,
            components: z.array(
              z.object({ refigured_reference: ref }).passthrough(),
            ),
            deductions: z.object({ refigured_reference: ref }).passthrough(),
            refigured_form1040: z.object({ reference: ref }).passthrough()
              .optional(),
          }).passthrough().parse(r.modified_review);
          return [
            m.reference,
            m.deductions.refigured_reference,
            ...m.components.map((c) => c.refigured_reference),
            ...(m.refigured_form1040 ? [m.refigured_form1040.reference] : []),
          ];
        }),
      ]
    ) addReference(reference);
    const calculation = calculateForm172ModernAmtOrdinaryAbsorptionWorkpaper(
      cap,
      row.vintage_reviews,
    );
    const current = new Map(calculation.chronologicalModelApplications.map(
      (loss) => [loss.originYear, loss],
    ));
    for (const origin of balances.keys()) {
      if (!current.has(origin)) {
        throw new Error(
          "Modern AMT model history cannot omit an exhausted vintage",
        );
      }
    }
    for (const loss of calculation.chronologicalModelApplications) {
      const source = cap.losses.find((s) =>
        s.reference === loss.lossReference
      )!;
      const identity = JSON.stringify({
        reference: source.reference,
        regular_origin: source.regular_origin,
        amt_origin: source.amt_origin,
        ordinary_section56_category_reviewed:
          source.ordinary_section56_category_reviewed,
      });
      if (identities.has(loss.originYear)) {
        if (
          identities.get(loss.originYear) !== identity ||
          balances.get(loss.originYear) !== loss.reviewedOpening
        ) {
          throw new Error(
            "Modern AMT model history changed an origin or prior model remainder",
          );
        }
      } else {
        const entry = entries.get(loss.originYear);
        if (
          !entry || entry.application_year !== expected ||
          entry.loss_reference !== loss.lossReference ||
          entry.reviewed_opening !== loss.reviewedOpening ||
          (index > 0 && loss.originYear !== expected - 1)
        ) {
          throw new Error(
            "Modern AMT model history needs a matching first-year entry",
          );
        }
        if (index > 0) {
          const origin = calculateReviewedAmtLossYear(
            source.regular_origin,
            source.amt_origin,
          );
          const reviewed = z.object({
            reviewed_amt: z.object({
              qbi_deduction: z.number(),
              section250_deduction: z.number(),
            }).passthrough(),
          }).passthrough().parse(source.amt_origin).reviewed_amt;
          const preceding = annualBases.get(loss.originYear)!;
          if (
            preceding.amti !== origin.reviewedAmtiBeforeAtnold ||
            preceding.section199a !== reviewed.qbi_deduction ||
            preceding.section250 !== reviewed.section250_deduction
          ) {
            throw new Error(
              "Modern AMT entering loss differs from preceding annual return",
            );
          }
        }
        usedEntries.add(loss.originYear);
        identities.set(loss.originYear, identity);
      }
    }
    // The annual calculator has already validated all physical components and
    // the special TY2025 Form1040/Schedule1A join before this sum is retained.
    annualBases.set(expected, {
      amti: annual.components.reduce((sum, c) => sum + c.amount, 0),
      section199a:
        cap.deductions_review.section199a_deduction_in_tentative_amti,
      section250: cap.deductions_review.section250_deduction_in_tentative_amti,
    });
    balances = new Map(calculation.chronologicalModelApplications.map(
      (loss) => [loss.originYear, loss.modelRemaining],
    ));
    return calculation;
  });
  if (usedEntries.size !== entries.size) {
    throw new Error("Modern AMT model history has unused entry reviews");
  }
  return {
    startYear: v.start_year,
    endYear: v.end_year,
    taxpayerSsn: v.taxpayer_ssn,
    spouseSsn: v.spouse_ssn,
    modelAnnualApplications: years,
    modelEndingBalances: [...balances].map(([originYear, amount]) => ({
      originYear,
      amount,
    })),
    modelSpanContinuityArithmeticReconciled: true as const,
    legalSection172Section56CoordinationVerified: false as const,
    entryCarryAvailabilityVerified: false as const,
    completeCarryHistoryVerified: false as const,
    survivingAcceptedCarryVerified: false as const,
    refiguredOperandEligibilityVerified: false as const,
    sourceAuthenticityVerified: false as const,
    priorAcceptanceVerified: false as const,
    filingReady: false as const,
  };
}
