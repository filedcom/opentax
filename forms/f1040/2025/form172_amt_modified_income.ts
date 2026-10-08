import { z } from "zod";
import {
  calculateForm172AmtModernOrdinaryCap,
  form172Amt2025TentativeLines,
  form172AmtAnnualReviewSchema,
  form172AmtHistoricalPhysicalLines,
  form172AmtModernOrdinaryCapSchema,
  form172AmtTentativeLines,
  form172HistoricalAmtLayout,
} from "./form172_amt_annual_limit.ts";
import { calculateForm172HistoricalAmtCap } from "./form172_amt_historical_cap.ts";

const ref = z.string().trim().min(1);
const dollars = z.number().int().nonnegative().max(1_000_000_000);
const signed = z.number().int().min(-1_000_000_000).max(1_000_000_000);
const reviewSchema = z.object({
  reference: ref,
  annual_reference: ref,
  tax_year: z.number().int().min(2003).max(2017),
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
      line: z.enum(form172AmtHistoricalPhysicalLines),
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
  const layout = form172HistoricalAmtLayout(v.tax_year);
  const original = new Map(annual.components.map((row) => [row.line, row]));
  const lines = new Map(v.components.map((row) => [row.line, row]));
  if (
    v.components.length !== layout.tentativeLines.length ||
    lines.size !== layout.tentativeLines.length ||
    layout.tentativeLines.some((line) => !lines.has(line))
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
  for (const line of layout.subtractionLines) {
    if (lines.get(line)!.refigured_amount > 0) {
      throw new Error("AMT modified-income subtraction has an invalid sign");
    }
  }
  if (
    lines.get(layout.regularNolLine)!.refigured_amount !==
      original.get(layout.regularNolLine)!.amount ||
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
  if (v.tax_year < 2005 && v.section199.refigured_amount !== 0) {
    throw new Error(
      "Pre2005 AMT modified section199 review must be explicit zero",
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
    lines.get(layout.section1202Line)!.original_amount !==
      section1202Preference ||
    lines.get(layout.section1202Line)!.refigured_amount !==
      section1202Preference
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

const modernReviewSchema = reviewSchema.omit({
  section199: true,
  components: true,
})
  .extend({
    tax_year: z.number().int().min(2018).max(2025),
    components: z.array(
      z.object({
        line: z.enum([...form172AmtTentativeLines, "1b"]),
        original_reference: ref,
        original_amount: signed,
        refigured_reference: ref,
        refigured_amount: signed,
      }).strict(),
    ),
    deductions: z.object({
      original_reference: ref,
      original_section199a: dollars,
      original_section250: dollars,
      refigured_reference: ref,
      refigured_section199a: dollars,
      refigured_section250: dollars,
    }).strict(),
    refigured_form1040: form172AmtAnnualReviewSchema.shape.reviewed_form1040
      .unwrap().optional(),
  }).strict();

/** Modern section172(b)(2) modified-AMTI operands, BEFORE direct earlier NOLs
 * and the post2020 20% absorption adjustment. Paired refigures are reviewed
 * facts, not independently established eligibility or authenticated returns. */
export function calculateForm172ModernAmtModifiedIncome(
  rawCap: unknown,
  rawReview: unknown,
) {
  const cap = calculateForm172AmtModernOrdinaryCap(rawCap);
  const c = form172AmtModernOrdinaryCapSchema.parse(rawCap);
  const annual = c.annual_review;
  const v = modernReviewSchema.parse(rawReview);
  if (
    v.annual_reference !== annual.reference || v.tax_year !== annual.tax_year ||
    v.taxpayer_ssn !== annual.taxpayer_ssn ||
    v.spouse_ssn !== annual.spouse_ssn ||
    (v.filing_status === "married_filing_jointly") !==
      (v.spouse_ssn !== undefined) ||
    v.spouse_ssn === v.taxpayer_ssn
  ) {
    throw new Error(
      "Modern modified AMTI must match annual year, status and owners",
    );
  }
  const required = v.tax_year === 2025
    ? form172Amt2025TentativeLines
    : form172AmtTentativeLines;
  const original = new Map(annual.components.map((row) => [row.line, row]));
  const lines = new Map(v.components.map((row) => [row.line, row]));
  if (
    v.components.length !== required.length || lines.size !== required.length ||
    required.some((line) => !lines.has(line))
  ) {
    throw new Error(
      "Modern modified AMTI needs every tentative component once",
    );
  }
  const refs = new Set<string>();
  const addRef = (reference: string) => {
    if (refs.has(reference)) {
      throw new Error("Modern modified AMTI references must be distinct");
    }
    refs.add(reference);
  };
  for (
    const reference of [
      c.reference,
      annual.reference,
      annual.form6251_reference,
      v.reference,
      ...c.losses.map((l) => l.reference),
    ]
  ) addRef(reference);
  if (annual.reviewed_form1040) addRef(annual.reviewed_form1040.reference);
  for (const row of v.components) {
    const source = original.get(row.line)!;
    if (
      row.original_reference !== source.reference ||
      row.original_amount !== source.amount
    ) {
      throw new Error(
        "Modern modified AMTI original operand differs from annual review",
      );
    }
    addRef(row.original_reference);
    addRef(row.refigured_reference);
  }
  if (
    lines.get("2e")!.refigured_amount !== original.get("2e")!.amount ||
    lines.get("2b")!.refigured_amount > 0 ||
    lines.get("2s")!.refigured_amount > 0
  ) {
    throw new Error(
      "Modern modified AMTI NOL addback or subtraction signs conflict",
    );
  }
  const d = v.deductions;
  if (
    d.original_reference !== c.deductions_review.reference ||
    d.original_section199a !==
      c.deductions_review.section199a_deduction_in_tentative_amti ||
    d.original_section250 !==
      c.deductions_review.section250_deduction_in_tentative_amti
  ) {
    throw new Error(
      "Modern modified AMTI original deductions differ from cap review",
    );
  }
  addRef(d.original_reference);
  addRef(d.refigured_reference);
  if (v.tax_year === 2025) {
    const f = v.refigured_form1040;
    if (
      !f || f.taxpayer_ssn !== v.taxpayer_ssn ||
      f.spouse_ssn !== v.spouse_ssn ||
      f.schedule1a_line37_senior_deduction > f.line14_deductions ||
      lines.get("1b")!.refigured_amount !== f.line11b_agi -
          (f.line14_deductions - f.schedule1a_line37_senior_deduction)
    ) {
      throw new Error(
        "Modern modified AMTI TY2025 line1b needs matching refigured operands",
      );
    }
    addRef(f.reference);
  } else if (v.refigured_form1040) {
    throw new Error(
      "TY2025 modified Form1040 operands cannot establish an earlier year",
    );
  }
  addRef(v.amt_capital_loss_deduction.reference);
  const itemIds = new Set<string>();
  for (const row of [...v.amt_capital_items, ...v.section1202_items]) {
    if (
      itemIds.has(row.item_id) ||
      ![v.taxpayer_ssn, v.spouse_ssn].includes(row.owner_ssn)
    ) {
      throw new Error(
        "Modern modified AMTI inventory has duplicate items or wrong owners",
      );
    }
    itemIds.add(row.item_id);
    addRef(row.reference);
  }
  const netAmtCapital = exactSum(
    v.amt_capital_items.map((row) =>
      row.kind === "gain" ? row.amount : -row.amount
    ),
  );
  const capitalLossAddback = Math.min(
    Math.max(0, -netAmtCapital),
    v.filing_status === "married_filing_separately" ? 1500 : 3000,
  );
  if (v.amt_capital_loss_deduction.amount !== capitalLossAddback) {
    throw new Error(
      "Modern modified AMTI capital deduction differs from AMT inventory",
    );
  }
  if (
    v.section1202_items.some((row) => row.amt_preference > row.excluded_gain)
  ) {
    throw new Error(
      "Modern modified AMTI QSBS preference exceeds excluded gain",
    );
  }
  const section1202Preference = exactSum(
    v.section1202_items.map((row) => row.amt_preference),
  );
  if (
    lines.get("2h")!.original_amount !== section1202Preference ||
    lines.get("2h")!.refigured_amount !== section1202Preference
  ) {
    throw new Error("Modern modified AMTI QSBS preference differs from line2h");
  }
  const section1202Addback = exactSum(
    v.section1202_items.map((row) => row.excluded_gain - row.amt_preference),
  );
  const refiguredTentativeAmti = exactSum(
    v.components.map((row) => row.refigured_amount),
  );
  const signedModifiedAmtiBeforeEarlierNol = exactSum([
    refiguredTentativeAmti,
    d.refigured_section199a,
    d.refigured_section250,
    capitalLossAddback,
    section1202Addback,
  ]);
  return {
    applicationYear: cap.applicationYear,
    originalDeductionCap: cap.ordinaryDeductionCap,
    refiguredTentativeAmti,
    section199aAddback: d.refigured_section199a,
    section250Addback: d.refigured_section250,
    netAmtCapital,
    capitalLossAddback,
    section1202Preference,
    section1202Addback,
    signedModifiedAmtiBeforeEarlierNol,
    nonnegativeModifiedAmtiBeforeEarlierNol: Math.max(
      0,
      signedModifiedAmtiBeforeEarlierNol,
    ),
    modernModifiedAmtiOperandWorkpaperArithmeticReconciled: true as const,
    refiguredOperandEligibilityVerified: false as const,
    earlierVintageOrderingReconciled: false as const,
    section172Post2020AbsorptionAdjustmentReconciled: false as const,
    amtCarryAbsorptionReconciled: false as const,
    openingCarryAvailabilityVerified: false as const,
    sourceAuthenticityVerified: false as const,
    priorAcceptanceVerified: false as const,
    filingReady: false as const,
  };
}
