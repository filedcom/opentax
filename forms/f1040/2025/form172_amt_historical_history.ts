import { calculateReviewedAmtLossYear } from "./form172_amt_loss_year.ts";
import { z } from "zod";
import { calculateForm172HistoricalAmtAbsorption } from "./form172_amt_historical_absorption.ts";
import { form172AmtAnnualReviewSchema } from "./form172_amt_annual_limit.ts";

const ref = z.string().trim().min(1);
const year = z.number().int().min(2010).max(2017);
const originYear = z.number().int().min(2005).max(2016);
const schema = z.object({
  reference: ref,
  start_year: year,
  end_year: year,
  taxpayer_ssn: z.string().regex(/^\d{9}$/),
  spouse_ssn: z.string().regex(/^\d{9}$/).optional(),
  entry_reviews: z.array(
    z.object({
      reference: ref,
      origin_year: originYear,
      loss_reference: ref,
      application_year: year,
      reviewed_opening: z.number().int().nonnegative().max(1_000_000_000),
    }).strict(),
  ).min(1).max(13),
  annual_applications: z.array(
    z.object({
      application_year: year,
      cap_workpaper: z.unknown(),
      vintage_reviews: z.unknown(),
    }).strict(),
  ).min(1).max(8),
}).strict();

/** Consecutive historical annual applications, including explicit zero years.
 * Entry balances are reviewed declarations, NOT proved loss-year carryback
 * dispositions. Subsequent openings must exactly equal computed remainders;
 * origin inventories/election identity cannot silently change between years.
 * This span does not establish years outside2010–2017 or accepted carry.
 */
export function calculateForm172HistoricalAmtHistory(raw: unknown) {
  const v = schema.parse(raw);
  if (
    v.end_year < v.start_year ||
    v.annual_applications.length !== v.end_year - v.start_year + 1
  ) {
    throw new Error(
      "Historical AMT history needs every declared application year",
    );
  }
  const entries = new Map(v.entry_reviews.map((row) => [row.origin_year, row]));
  const references = new Set<string>([v.reference]);
  for (const entry of v.entry_reviews) {
    if (references.has(entry.reference)) {
      throw new Error("AMT history entry references must differ");
    }
    references.add(entry.reference);
  }
  if (entries.size !== v.entry_reviews.length) {
    throw new Error("AMT history needs one entry review per origin");
  }
  const usedEntries = new Set<number>();
  const identities = new Map<number, string>();
  let balances = new Map<number, number>();
  const annualBases = new Map<number, { amti: number; section199: number }>();
  const years = v.annual_applications.map((row, index) => {
    const expectedYear = v.start_year + index;
    if (row.application_year !== expectedYear) {
      throw new Error(
        "Historical AMT years must be consecutive and chronological",
      );
    }
    const rawCap = z.object({
      reference: ref,
      annual_review: z.unknown(),
      losses: z.array(
        z.object({
          reference: ref,
          regular_origin: z.unknown(),
          amt_origin: z.unknown(),
          category: z.string(),
          whbaa_election_reference: ref.optional(),
        }).passthrough(),
      ),
    }).passthrough().parse(row.cap_workpaper);
    const annual = form172AmtAnnualReviewSchema.parse(rawCap.annual_review);
    if (
      annual.tax_year !== expectedYear ||
      annual.taxpayer_ssn !== v.taxpayer_ssn ||
      annual.spouse_ssn !== v.spouse_ssn
    ) throw new Error("AMT history annual year and owners differ from span");
    for (
      const reference of [
        rawCap.reference,
        annual.reference,
        annual.form6251_reference,
      ]
    ) {
      if (references.has(reference)) {
        throw new Error("AMT history annual review references must differ");
      }
      references.add(reference);
    }
    const calculation = calculateForm172HistoricalAmtAbsorption(
      row.cap_workpaper,
      row.vintage_reviews,
    );
    const current = new Map(
      calculation.chronologicalReviewedApplications.map((
        loss,
      ) => [loss.originYear, loss]),
    );
    for (const origin of balances.keys()) {
      if (!current.has(origin)) {
        throw new Error(
          "AMT history cannot omit an earlier vintage, including zero balances",
        );
      }
    }
    for (const loss of calculation.chronologicalReviewedApplications) {
      const source = rawCap.losses.find((source) =>
        source.reference === loss.lossReference
      )!;
      const identity = JSON.stringify({
        reference: source.reference,
        regular_origin: source.regular_origin,
        amt_origin: source.amt_origin,
        category: source.category,
        whbaa_election_reference: source.whbaa_election_reference,
      });
      if (identities.has(loss.originYear)) {
        if (identities.get(loss.originYear) !== identity) {
          throw new Error(
            "AMT history origin inventory or election changed between years",
          );
        }
        if (balances.get(loss.originYear) !== loss.reviewedOpening) {
          throw new Error(
            "AMT history opening differs from prior computed remainder",
          );
        }
      } else {
        const entry = entries.get(loss.originYear);
        if (
          !entry || entry.application_year !== expectedYear ||
          entry.loss_reference !== loss.lossReference ||
          entry.reviewed_opening !== loss.reviewedOpening ||
          (index > 0 && loss.originYear !== expectedYear - 1)
        ) {
          throw new Error(
            "AMT history newly entering vintage needs matching first-year entry review",
          );
        }

        if (index > 0) {
          const origin = calculateReviewedAmtLossYear(
            source.regular_origin,
            source.amt_origin,
          );
          const preceding = annualBases.get(loss.originYear)!;
          if (
            preceding.amti !== origin.reviewedAmtiBeforeAtnold ||
            preceding.section199 !== origin.amtSection199Modification
          ) {
            throw new Error(
              "AMT history entering loss differs from the preceding loss-year annual return",
            );
          }
        }
        usedEntries.add(loss.originYear);
        identities.set(loss.originYear, identity);
      }
    }

    annualBases.set(expectedYear, {
      amti: annual.components.reduce((sum, c) => sum + c.amount, 0),
      section199: annual.section199_deduction!.amount,
    });
    balances = new Map(
      calculation.chronologicalReviewedApplications.map((
        loss,
      ) => [loss.originYear, loss.reviewedRemaining]),
    );
    return calculation;
  });
  if (usedEntries.size !== entries.size) {
    throw new Error("AMT history contains an unused entry review");
  }
  return {
    startYear: v.start_year,
    endYear: v.end_year,
    taxpayerSsn: v.taxpayer_ssn,
    spouseSsn: v.spouse_ssn,
    reviewedAnnualApplications: years,
    reviewedEndingBalances: [...balances].map(([originYear, amount]) => ({
      originYear,
      amount,
    })),
    historicalSpanContinuityArithmeticReconciled: true as const,
    entryCarryAvailabilityVerified: false as const,
    carrybackDispositionVerified: false as const,
    completeCarryHistoryVerified: false as const,
    whbaaElectionEligibilityVerified: false as const,
    refiguredOperandEligibilityVerified: false as const,
    sourceAuthenticityVerified: false as const,
    priorAcceptanceVerified: false as const,
    filingReady: false as const,
  };
}
