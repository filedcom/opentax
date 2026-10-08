import { z } from "zod";
import {
  form172AmtAnnualReviewSchema,
  form172AmtLegacyTentativeLines,
} from "./form172_amt_annual_limit.ts";
import { calculateForm172HistoricalAmtCap } from "./form172_amt_historical_cap.ts";

const ref = z.string().trim().min(1);
const dollars = z.number().int().nonnegative().max(1_000_000_000);
const signed = z.number().int().min(-1_000_000_000).max(1_000_000_000);
const reviewSchema = z.object({
  reference: ref,
  annual_reference: ref,
  tax_year: z.number().int().min(2010).max(2017),
  taxpayer_ssn: z.string().regex(/^\d{9}$/),
  spouse_ssn: z.string().regex(/^\d{9}$/).optional(),
  filing_status: z.enum([
    "single",
    "married_filing_jointly",
    "married_filing_separately",
    "head_of_household",
    "qualifying_surviving_spouse",
  ]),
  before_all_atnold: z.literal(true),
  // Paired, signed Form6251 operands retain AGI-dependent refigures. The
  // modified-income amount itself is calculated, never accepted as an input.
  components: z.array(
    z.object({
      line: z.enum(form172AmtLegacyTentativeLines),
      original_reference: ref,
      original_amount: signed,
      refigured_reference: ref,
      refigured_amount: signed,
    }).strict(),
  ),
  section199: z.object({
    original_reference: ref,
    original_amount: dollars,
    refigured_reference: ref,
    refigured_amount: dollars,
  }).strict(),
  amt_capital_items: z.array(
    z.object({
      item_id: ref,
      reference: ref,
      owner_ssn: z.string().regex(/^\d{9}$/),
      kind: z.enum(["gain", "loss"]),
      // AMT-basis ScheduleD amount, after section1202 exclusions but before
      // the separately identified Form6251 preference.
      amount: dollars,
    }).strict(),
  ),
  amt_capital_loss_deduction: z.object({ reference: ref, amount: dollars })
    .strict(),
  section1202_items: z.array(
    z.object({
      item_id: ref,
      reference: ref,
      owner_ssn: z.string().regex(/^\d{9}$/),
      excluded_gain: dollars,
      amt_preference: dollars,
    }).strict(),
  ),
}).strict();

function exactSum(values: readonly number[]): number {
  const result = values.reduce((a, b) => a + b, 0);
  if (!Number.isSafeInteger(result)) {
    throw new Error("AMT modified-income arithmetic exceeds exact dollars");
  }
  return result;
}

/** Historical section172(b)(2) modified-AMTI workpaper BEFORE earlier ATNOLD.
 * Complete annual components are reconciled to the independent cap/origins;
 * capital and section1202 modifications use separate AMT-basis inventories.
 * Refigured operands remain reviewed facts, not independently authenticated
 * deduction eligibility. This result is neither absorption nor a carry ledger.
 */
export function calculateForm172HistoricalAmtModifiedIncome(
  rawCap: unknown,
  rawReview: unknown,
) {
  const cap = calculateForm172HistoricalAmtCap(rawCap);
  const annual = form172AmtAnnualReviewSchema.parse(
    z.object({ annual_review: z.unknown() }).passthrough().parse(rawCap)
      .annual_review,
  );
  const v = reviewSchema.parse(rawReview);
  if (
    v.annual_reference !== annual.reference ||
    v.reference === annual.reference ||
    v.reference === annual.form6251_reference ||
    v.tax_year !== annual.tax_year ||
    v.taxpayer_ssn !== annual.taxpayer_ssn ||
    v.spouse_ssn !== annual.spouse_ssn ||
    (v.filing_status === "married_filing_jointly") !==
      (v.spouse_ssn !== undefined) ||
    v.spouse_ssn === v.taxpayer_ssn
  ) {
    throw new Error(
      "AMT modified-income review must match annual year and owners",
    );
  }
  const original = new Map(annual.components.map((row) => [row.line, row]));
  const lines = new Map(v.components.map((row) => [row.line, row]));
  if (
    v.components.length !== form172AmtLegacyTentativeLines.length ||
    lines.size !== form172AmtLegacyTentativeLines.length ||
    form172AmtLegacyTentativeLines.some((line) => !lines.has(line))
  ) {
    throw new Error(
      "AMT modified income needs each tentative component exactly once",
    );
  }
  const refs = new Set([
    v.reference,
    annual.reference,
    annual.form6251_reference,
  ]);
  const addRef = (reference: string) => {
    if (refs.has(reference)) {
      throw new Error("AMT modified-income references must be distinct");
    }
    refs.add(reference);
  };
  for (const row of v.components) {
    const source = original.get(row.line)!;
    if (
      row.original_reference !== source.reference ||
      row.original_amount !== source.amount
    ) {
      throw new Error(
        "AMT modified-income original operand differs from annual review",
      );
    }
    addRef(row.original_reference);
    addRef(row.refigured_reference);
  }
  for (const line of ["6", "7", "25"] as const) {
    if (lines.get(line)!.refigured_amount > 0) {
      throw new Error("AMT modified-income subtraction has an invalid sign");
    }
  }
  if (
    lines.get("10")!.refigured_amount !== original.get("10")!.amount ||
    (v.tax_year === 2017 && lines.get("2")!.refigured_amount !== 0) ||
    ([2011, 2012].includes(v.tax_year) &&
      lines.get("6")!.refigured_amount !== 0)
  ) {
    throw new Error(
      "AMT modified income must retain regular NOL addback and reserved lines",
    );
  }
  if (
    v.section199.original_reference !==
      annual.section199_deduction!.reference ||
    v.section199.original_amount !== annual.section199_deduction!.amount
  ) {
    throw new Error(
      "AMT modified-income section199 original does not reconcile",
    );
  }
  addRef(v.section199.original_reference);
  addRef(v.section199.refigured_reference);
  addRef(v.amt_capital_loss_deduction.reference);
  const itemIds = new Set<string>();
  for (const row of [...v.amt_capital_items, ...v.section1202_items]) {
    if (
      itemIds.has(row.item_id) ||
      ![v.taxpayer_ssn, v.spouse_ssn].includes(row.owner_ssn)
    ) {
      throw new Error(
        "AMT modified-income inventory has duplicate items or wrong owners",
      );
    }
    itemIds.add(row.item_id);
    addRef(row.reference);
  }
  const netCapital = exactSum(
    v.amt_capital_items.map((row) =>
      row.kind === "gain" ? row.amount : -row.amount
    ),
  );
  const capitalLossAddback = Math.min(
    Math.max(0, -netCapital),
    v.filing_status === "married_filing_separately" ? 1500 : 3000,
  );
  if (v.amt_capital_loss_deduction.amount !== capitalLossAddback) {
    throw new Error("AMT capital deduction differs from AMT-basis inventory");
  }
  if (
    v.section1202_items.some((row) => row.amt_preference > row.excluded_gain)
  ) {
    throw new Error("AMT section1202 preference exceeds its excluded gain");
  }
  const section1202Preference = exactSum(
    v.section1202_items.map((row) => row.amt_preference),
  );
  if (
    lines.get("13")!.original_amount !== section1202Preference ||
    lines.get("13")!.refigured_amount !== section1202Preference
  ) {
    throw new Error(
      "AMT section1202 preference differs from annual components",
    );
  }
  const section1202Addback = exactSum(
    v.section1202_items.map((row) => row.excluded_gain - row.amt_preference),
  );
  const refiguredTentativeAmti = exactSum(
    v.components.map((row) => row.refigured_amount),
  );
  const signedModifiedAmti = exactSum([
    refiguredTentativeAmti,
    v.section199.refigured_amount,
    capitalLossAddback,
    section1202Addback,
  ]);
  return {
    applicationYear: cap.applicationYear,
    originalTentativeAmti: cap.tentativeAmtiBeforeAtnold,
    originalDeductionCap: cap.aggregateHistoricalCap,
    refiguredTentativeAmti,
    section199Addback: v.section199.refigured_amount,
    netAmtCapital: netCapital,
    capitalLossAddback,
    section1202Preference,
    section1202Addback,
    signedModifiedAmti,
    modifiedAmtiBeforeEarlierAtnold: Math.max(0, signedModifiedAmti),
    historicalModifiedIncomeWorkpaperArithmeticReconciled: true as const,
    refiguredOperandEligibilityVerified: false as const,
    earlierVintageConsumptionVerified: false as const,
    section56AbsorptionLimitReconciled: false as const,
    chronologicalAbsorptionReconciled: false as const,
    survivingCarryVerified: false as const,
    sourceAuthenticityVerified: false as const,
    priorAcceptanceVerified: false as const,
    filingReady: false as const,
  };
}
