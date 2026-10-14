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
/** 2010–2017 printed lines1–27, excluding ATNOLD line11. In 2017 line2
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
/** Physical historical line vocabulary.2003–07 exclude ATNOLD27 and AMTI28;
 * 2008 excludes ATNOLD28;2009 excludes
 * ATNOLD12. Later layouts exclude11 instead. Never align them by array index. */
export const form172AmtHistoricalPhysicalLines = [
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
  "11",
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
  "28",
] as const;

export function form172HistoricalAmtLayout(year: number) {
  if (year >= 2003 && year <= 2007) {
    return {
      tentativeLines: form172AmtHistoricalPhysicalLines.filter((line) =>
        line !== "27" && line !== "28"
      ),
      regularNolLine: "10" as const,
      subtractionLines: ["6", "7", "24"] as const,
      section1202Line: "12" as const,
    };
  }
  if (year === 2008) {
    return {
      tentativeLines: form172AmtHistoricalPhysicalLines.filter((line) =>
        line !== "28"
      ),
      regularNolLine: "11" as const,
      subtractionLines: ["6", "7", "8", "25"] as const,
      section1202Line: "13" as const,
    };
  }
  if (year === 2009) {
    return {
      tentativeLines: form172AmtHistoricalPhysicalLines.filter((line) =>
        line !== "12"
      ),
      regularNolLine: "11" as const,
      subtractionLines: ["6", "7", "8", "26"] as const,
      section1202Line: "14" as const,
    };
  }
  if (year >= 2010 && year <= 2017) {
    return {
      tentativeLines: form172AmtLegacyTentativeLines,
      regularNolLine: "10" as const,
      subtractionLines: ["6", "7", "25"] as const,
      section1202Line: "13" as const,
    };
  }
  throw new Error("Unsupported historical Form6251 application layout");
}
/** In 2025 line1a is an intermediate deduction subtotal, not another AMTI
 * contribution. Only line1b replaces the earlier line1 in the total. */
export const form172Amt2025TentativeLines = [
  "1b",
  ...form172AmtTentativeLines.slice(1),
] as const;
const ref = z.string().trim().min(1);
const signedDollars = z.number().int().min(-1_000_000_000).max(1_000_000_000);
const positiveDollars = z.number().int().min(0).max(1_000_000_000);
export const form172AmtAnnualReviewSchema = z.object({
  reference: ref,
  tax_year: z.number().int().min(2003).max(2025),
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
        ...form172AmtHistoricalPhysicalLines,
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
  const v = form172AmtAnnualReviewSchema.parse(rawAnnual);
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
    ? form172HistoricalAmtLayout(v.tax_year).tentativeLines
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
      ? form172HistoricalAmtLayout(v.tax_year).subtractionLines.some((line) =>
        lines.get(line)! > 0
      ) ||
        lines.get(form172HistoricalAmtLayout(v.tax_year).regularNolLine)! < 0
      : lines.get("2b")! > 0 || lines.get("2e")! < 0 || lines.get("2s")! > 0
  ) {
    throw new Error(
      "AMT refund subtraction and regular NOL addback signs conflict",
    );
  }
  if ([2011, 2012].includes(v.tax_year) && lines.get("6") !== 0) {
    throw new Error("2011–2012 Form6251 reserved line6 must be zero");
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
  if (v.tax_year < 2005 && v.section199_deduction!.amount !== 0) {
    throw new Error(
      "Pre2005 AMT annual section199 review must be explicit zero",
    );
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

export const form172AmtModernOrdinaryCapSchema = z.object({
  reference: ref,
  annual_review: form172AmtAnnualReviewSchema,
  deductions_review: z.object({
    reference: ref,
    tax_year: z.number().int().min(2018).max(2025),
    taxpayer_ssn: z.string().regex(/^\d{9}$/),
    spouse_ssn: z.string().regex(/^\d{9}$/).optional(),
    section199a_deduction_in_tentative_amti: positiveDollars,
    section250_deduction_in_tentative_amti: positiveDollars,
  }).strict(),
  losses: z.array(
    z.object({
      reference: ref,
      regular_origin: z.unknown(),
      amt_origin: z.unknown(),
      opening_amt_nol: positiveDollars,
      ordinary_section56_category_reviewed: z.literal(true),
    }).strict(),
  ).min(1).max(21),
}).strict();

/** Calendar-year ordinary carryforward deduction ceiling: section172(a)'s
 * application-year/vintage limit, then section56(d)'s 90% limit. Reviewed
 * openings are bounded by independently recomputed AMT origins; their legal
 * availability is NOT established. Special-category losses, carrybacks,
 * chronological allocation and section172(b)(2) absorption are separate. */
export function calculateForm172AmtModernOrdinaryCap(raw: unknown) {
  const v = form172AmtModernOrdinaryCapSchema.parse(raw);
  const a = v.annual_review;
  const d = v.deductions_review;
  if (
    a.tax_year < 2018 || d.tax_year !== a.tax_year ||
    d.taxpayer_ssn !== a.taxpayer_ssn || d.spouse_ssn !== a.spouse_ssn
  ) {
    throw new Error(
      "Modern AMT deduction review needs matching year and owners",
    );
  }
  const references = [
    v.reference,
    a.reference,
    a.form6251_reference,
    d.reference,
    ...v.losses.map((l) => l.reference),
  ];
  if (new Set(references).size !== references.length) {
    throw new Error(
      "Modern AMT cap and opening reviews need distinct references",
    );
  }
  const years = new Set<number>();
  const losses = v.losses.map((l) => {
    const r = calculateForm172AmtAnnualLimit(l.regular_origin, l.amt_origin, a);
    if (
      r.originYear >= a.tax_year ||
      (r.originYear < 2018 && a.tax_year > r.originYear + 20) ||
      years.has(r.originYear) || l.opening_amt_nol > r.originAmtNol
    ) {
      throw new Error(
        "Modern AMT opening has duplicate, expired or inconsistent origin",
      );
    }
    years.add(r.originYear);
    return {
      reference: l.reference,
      originYear: r.originYear,
      originAmtNol: r.originAmtNol,
      openingAmtNol: l.opening_amt_nol,
      annual: r,
    };
  });
  const annual = losses[0].annual;
  const sum = (before2018: boolean) =>
    losses.filter((l) => (l.originYear < 2018) === before2018).reduce(
      (n, l) => n + l.openingAmtNol,
      0,
    );
  const pre2018Opening = sum(true);
  const post2017Opening = sum(false);
  const section172IncomeBase = Math.max(
    0,
    annual.tentativeAmtiBeforeAtnold +
      d.section199a_deduction_in_tentative_amti +
      d.section250_deduction_in_tentative_amti,
  );
  const post2017IncomeExcess = Math.max(
    0,
    section172IncomeBase - pre2018Opening,
  );
  const post2017EightyPercentLimit = a.tax_year > 2020
    ? Number((BigInt(post2017IncomeExcess) * 80n + 50n) / 100n)
    : undefined;
  const section172DeductionCap = pre2018Opening +
    (a.tax_year > 2020
      ? Math.min(post2017Opening, post2017EightyPercentLimit!)
      : post2017Opening);
  return {
    applicationYear: a.tax_year,
    pre2018Opening,
    post2017Opening,
    section172IncomeBase,
    post2017IncomeExcess,
    ...(post2017EightyPercentLimit === undefined
      ? {}
      : { post2017EightyPercentLimit }),
    section172DeductionCap,
    ordinary90PercentLimit: annual.ordinary90PercentLimit,
    ordinaryDeductionCap: Math.min(
      section172DeductionCap,
      annual.ordinary90PercentLimit,
    ),
    losses: losses.map(({ annual: _, ...l }) => l),
    modernOrdinaryCapWorkpaperArithmeticReconciled: true as const,
    openingCarryAvailabilityVerified: false as const,
    earlierVintageOrderingReconciled: false as const,
    special100PercentLossesReconciled: false as const,
    amtCarryAbsorptionReconciled: false as const,
    sourceAuthenticityVerified: false as const,
    priorAcceptanceVerified: false as const,
    filingReady: false as const,
  };
}

/** Allocate the independently recomputed ordinary deduction ceiling in origin
 * chronology. Opening minus deduction is not an absorbed carry balance. */
export function calculateForm172AmtModernOrdinaryDeductionAllocation(
  raw: unknown,
) {
  const cap = calculateForm172AmtModernOrdinaryCap(raw);
  let remainingCap = cap.ordinaryDeductionCap;
  const allocations = [...cap.losses].sort((a, b) =>
    a.originYear - b.originYear
  )
    .map((loss) => {
      const earlierActualDeduction = cap.ordinaryDeductionCap - remainingCap;
      const actualDeduction = Math.min(loss.openingAmtNol, remainingCap);
      remainingCap -= actualDeduction;
      return {
        ...loss,
        earlierActualDeduction,
        actualDeduction,
        openingNotDeducted: loss.openingAmtNol - actualDeduction,
      };
    });
  if (remainingCap !== 0) {
    throw new Error("Ordinary AMT allocation did not reconcile to cap");
  }
  return {
    ...cap,
    allocations,
    totalActualDeduction: allocations.reduce(
      (n, l) => n + l.actualDeduction,
      0,
    ),
    modernOrdinaryDeductionAllocationWorkpaperArithmeticReconciled:
      true as const,
  };
}
