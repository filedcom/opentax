/** TY2025 Form 3800 Part I and II for individual credits. */
import { z } from "zod";
import { FilingStatus } from "../../types.ts";
import { PassiveCreditReportingRoute } from "../../intermediate/forms/form8582cr/credit-route.ts";
import type { calculateForm8582CR } from "../../intermediate/forms/form8582cr/index.ts";
import {
  form3800SpecifiedCreditLineSchema,
  form3800StandardCreditLineSchema,
} from "../../intermediate/forms/form8582cr/credit-route.ts";

type Form8582CRSourceAllocation = ReturnType<
  typeof calculateForm8582CR
>["sourceAllocations"][number];

export type Form3800PassiveCreditVintage = {
  readonly activityReference: string;
  readonly sourceForm: string;
  readonly sourceDocumentReference: string;
  readonly sourceOrigin: Form8582CRSourceAllocation["source_origin"];
  readonly form3800CreditLine: NonNullable<
    Form8582CRSourceAllocation["form3800_credit_line"]
  >;
  readonly reportingRoute: PassiveCreditReportingRoute;
  readonly originatingTaxYear: number;
  readonly beforePassiveLimit: number;
  readonly afterPassiveLimit: number;
};

export type Form3800PassiveCreditRow<
  T extends Form3800PassiveCreditVintage = Form3800PassiveCreditVintage,
> = {
  readonly form3800CreditLine:
    Form3800PassiveCreditVintage["form3800CreditLine"];
  readonly originatingTaxYear: number;
  readonly beforePassiveLimit: number;
  readonly afterPassiveLimit: number;
  readonly sources: readonly T[];
};

export type Form3800CreditUseRow = {
  readonly sourceKey: string;
  readonly form3800CreditLine:
    Form3800PassiveCreditVintage["form3800CreditLine"];
  readonly originatingTaxYear: number;
  readonly availableAfterPassiveLimit: number;
};

export type Form3800CreditUseAllocation = Form3800CreditUseRow & {
  readonly appliedAgainstTax: number;
  readonly unusedAfterTaxLimit: number;
};

export type Form3800NonpassiveCreditSources = {
  readonly form8826Credit?: number;
  readonly form8820Credit?: number;
  readonly form8874Credit?: number;
  readonly form5884Credit?: number;
  readonly form8936NewVehicleCredit?: number;
  readonly form8936CommercialVehicleCredit?: number;
  readonly facilities: readonly Form8835CreditEntry[];
};

/** Keep source-form identity and IRS credit line before the tax-use pass. */
export function form3800NonpassiveCreditUseRows(
  sources: Form3800NonpassiveCreditSources,
): Form3800CreditUseRow[] {
  const sourceRows = [
    {
      sourceKey: "nonpassive:8826",
      form3800CreditLine: "1e" as const,
      amount: sources.form8826Credit ?? 0,
    },
    {
      sourceKey: "nonpassive:8820",
      form3800CreditLine: "1h" as const,
      amount: sources.form8820Credit ?? 0,
    },
    {
      sourceKey: "nonpassive:8874",
      form3800CreditLine: "1i" as const,
      amount: sources.form8874Credit ?? 0,
    },
    {
      sourceKey: "nonpassive:8936-new",
      form3800CreditLine: "1y" as const,
      amount: sources.form8936NewVehicleCredit ?? 0,
    },
    {
      sourceKey: "nonpassive:8936-commercial",
      form3800CreditLine: "1aa" as const,
      amount: sources.form8936CommercialVehicleCredit ?? 0,
    },
    {
      sourceKey: "nonpassive:5884",
      form3800CreditLine: "4b" as const,
      amount: sources.form5884Credit ?? 0,
    },
    ...classifyForm8835Credits(sources.facilities).rows.map((row) => ({
      sourceKey: `nonpassive:8835:${row.line}`,
      form3800CreditLine: row.line,
      amount: row.availableCredit,
    })),
  ];
  for (const row of sourceRows) {
    const cents = Math.round(row.amount * 100);
    if (
      !Number.isFinite(row.amount) || row.amount < 0 ||
      !Number.isSafeInteger(cents) ||
      Math.abs(row.amount * 100 - cents) > 0.000001
    ) {
      throw new Error(
        "Form 3800 nonpassive source credit needs cent precision",
      );
    }
  }
  return sourceRows.filter((row) => row.amount > 0).map((row) => ({
    sourceKey: row.sourceKey,
    form3800CreditLine: row.form3800CreditLine,
    originatingTaxYear: 2025,
    availableAfterPassiveLimit: row.amount,
  }));
}

export type Form3800PassiveTaxUseVintage =
  & Form3800PassiveCreditVintage
  & Form3800CreditUseAllocation;

/** Order of named 2025 credit types within a tax year, from Form 3800 instructions. */
const CREDIT_TYPE_ORDER = [
  "1a",
  "1d",
  "1o",
  "1v",
  "4a",
  "4k", // Investment credits.
  "4b", // Work opportunity.
  "4c",
  "1c",
  "4i", // Biofuel and research.
  "4d",
  "1t",
  "1e",
  "1f",
  "4e",
  "3", // Housing through empowerment.
  "4f",
  "1h",
  "1i",
  "1j",
  "1k",
  "4g",
  "1l",
  "1m",
  "1bb",
  "1n",
  "1cc",
  "1p",
  "1s",
  "1w",
  "1x",
  "1y",
  "4h",
  "4j",
  "1dd",
  "1u",
  "1ff",
  "1g",
  "1aa",
  "1b",
  "1gg",
  "1q",
  "1ee",
] as const;

function creditUseCents(amount: number): number {
  const cents = Math.round(amount * 100);
  if (
    !Number.isFinite(amount) || !Number.isSafeInteger(cents) ||
    Math.abs(amount * 100 - cents) > 0.000001
  ) {
    throw new Error("Form 3800 tax-use amount must have cent precision");
  }
  return cents;
}

/** Allocate the three Part II caps with carryforwards before 2025 credits. */
export function allocateForm3800CreditUse(
  sources: readonly Form3800CreditUseRow[],
  lines: Pick<
    Form3800NonpassiveLines,
    "line6" | "line17" | "line25" | "line26" | "line36" | "line37"
  >,
): Form3800CreditUseAllocation[] {
  const validLines = [
    ...form3800StandardCreditLineSchema.options,
    "3",
    ...form3800SpecifiedCreditLineSchema.options,
  ];
  if (
    new Set(sources.map((source) => source.sourceKey)).size !== sources.length
  ) {
    throw new Error("Form 3800 tax-use source keys must be unique");
  }
  for (const source of sources) {
    if (
      !source.sourceKey || !validLines.includes(source.form3800CreditLine) ||
      !Number.isInteger(source.originatingTaxYear) ||
      source.originatingTaxYear < 1900 || source.originatingTaxYear > 2026 ||
      source.availableAfterPassiveLimit < 0 ||
      !Number.isFinite(source.availableAfterPassiveLimit) ||
      !Number.isSafeInteger(
        Math.round(source.availableAfterPassiveLimit * 100),
      ) ||
      Math.abs(
          source.availableAfterPassiveLimit * 100 -
            Math.round(source.availableAfterPassiveLimit * 100),
        ) > 0.000001
    ) {
      throw new Error(
        "Form 3800 tax-use source has invalid line, year, or amount",
      );
    }
  }
  const bucket = (line: Form3800CreditUseRow["form3800CreditLine"]) =>
    line === "3"
      ? "empowerment"
      : line.startsWith("4")
      ? "specified"
      : "standard";
  const allocateBucket = (
    name: "standard" | "empowerment" | "specified",
    available: number,
    limit: number,
  ): Form3800CreditUseAllocation[] => {
    const rows = sources.filter((source) =>
      bucket(source.form3800CreditLine) === name
    );
    const availableCents = creditUseCents(available);
    const limitCents = creditUseCents(limit);
    const rowTotalCents = rows.reduce(
      (sum, row) => sum + creditUseCents(row.availableAfterPassiveLimit),
      0,
    );
    if (
      availableCents < 0 || limitCents < 0 ||
      limitCents > availableCents ||
      !Number.isSafeInteger(rowTotalCents) ||
      rowTotalCents !== availableCents
    ) {
      throw new Error(
        `Form 3800 ${name} source total does not reconcile to Part II`,
      );
    }
    const ordered = [...rows].sort((a, b) =>
      a.originatingTaxYear - b.originatingTaxYear ||
      CREDIT_TYPE_ORDER.indexOf(
          a.form3800CreditLine as typeof CREDIT_TYPE_ORDER[number],
        ) - CREDIT_TYPE_ORDER.indexOf(
          b.form3800CreditLine as typeof CREDIT_TYPE_ORDER[number],
        )
    );
    const years = [...new Set(ordered.map((row) => row.originatingTaxYear))];
    for (const year of years) {
      const older = ordered.filter((row) => row.originatingTaxYear < year)
        .reduce(
          (sum, row) => sum + creditUseCents(row.availableAfterPassiveLimit),
          0,
        );
      const sameYear = ordered.filter((row) =>
        row.originatingTaxYear === year &&
        row.availableAfterPassiveLimit > 0
      );
      const yearAmount = sameYear.reduce(
        (sum, row) => sum + creditUseCents(row.availableAfterPassiveLimit),
        0,
      );
      const orderRanks = sameYear.map((row) =>
        CREDIT_TYPE_ORDER.indexOf(
          row.form3800CreditLine as typeof CREDIT_TYPE_ORDER[number],
        )
      );
      if (
        sameYear.length > 1 && limitCents > older &&
        limitCents < older + yearAmount &&
        (orderRanks.some((rank) => rank < 0) ||
          new Set(orderRanks).size !== orderRanks.length)
      ) {
        throw new Error(
          `Form 3800 ${name} partial same-year credits need the IRS credit-type order`,
        );
      }
    }
    return ordered.reduce<Form3800CreditUseAllocation[]>((allocated, row) => {
      const usedCents = allocated.reduce(
        (sum, prior) => sum + creditUseCents(prior.appliedAgainstTax),
        0,
      );
      const rowCents = creditUseCents(row.availableAfterPassiveLimit);
      const appliedCents = Math.min(
        rowCents,
        Math.max(0, limitCents - usedCents),
      );
      return [...allocated, {
        ...row,
        appliedAgainstTax: appliedCents / 100,
        unusedAfterTaxLimit: (rowCents - appliedCents) / 100,
      }];
    }, []);
  };
  const allocated = [
    ...allocateBucket("standard", lines.line6, lines.line17),
    ...allocateBucket("empowerment", lines.line25, lines.line26),
    ...allocateBucket("specified", lines.line36, lines.line37),
  ];
  return sources.map((source) => {
    const match = allocated.find((row) => row.sourceKey === source.sourceKey);
    if (!match) throw new Error("Form 3800 tax-use source was not allocated");
    return match;
  });
}

/** Keep one aggregate per XML line and year while retaining its source detail. */
export function groupForm3800PassiveCreditVintages<
  T extends Form3800PassiveCreditVintage,
>(vintages: readonly T[]): Form3800PassiveCreditRow<T>[] {
  const lineOrder = [
    ...form3800StandardCreditLineSchema.options,
    "3",
    ...form3800SpecifiedCreditLineSchema.options,
  ];
  const ordered = [...vintages].sort((a, b) =>
    lineOrder.indexOf(a.form3800CreditLine) -
      lineOrder.indexOf(b.form3800CreditLine) ||
    a.originatingTaxYear - b.originatingTaxYear
  );
  return ordered.reduce<Form3800PassiveCreditRow<T>[]>((rows, vintage) => {
    if (
      !Number.isSafeInteger(vintage.beforePassiveLimit) ||
      !Number.isSafeInteger(vintage.afterPassiveLimit) ||
      vintage.beforePassiveLimit < 0 || vintage.afterPassiveLimit < 0 ||
      vintage.afterPassiveLimit > vintage.beforePassiveLimit ||
      !Number.isInteger(vintage.originatingTaxYear) ||
      vintage.originatingTaxYear < 1900 ||
      vintage.originatingTaxYear > 2025 ||
      !lineOrder.includes(vintage.form3800CreditLine)
    ) {
      throw new Error(
        "Form 3800 passive row has invalid source amounts or year",
      );
    }
    const prior = rows.at(-1);
    if (
      prior?.form3800CreditLine === vintage.form3800CreditLine &&
      prior.originatingTaxYear === vintage.originatingTaxYear
    ) {
      const beforePassiveLimit = prior.beforePassiveLimit +
        vintage.beforePassiveLimit;
      const afterPassiveLimit = prior.afterPassiveLimit +
        vintage.afterPassiveLimit;
      if (
        !Number.isSafeInteger(beforePassiveLimit) ||
        !Number.isSafeInteger(afterPassiveLimit)
      ) {
        throw new Error(
          "Form 3800 passive row total exceeds whole-dollar range",
        );
      }
      return [...rows.slice(0, -1), {
        ...prior,
        beforePassiveLimit,
        afterPassiveLimit,
        sources: [...prior.sources, vintage],
      }];
    }
    return [...rows, {
      form3800CreditLine: vintage.form3800CreditLine,
      originatingTaxYear: vintage.originatingTaxYear,
      beforePassiveLimit: vintage.beforePassiveLimit,
      afterPassiveLimit: vintage.afterPassiveLimit,
      sources: [vintage],
    }];
  }, []);
}

/**
 * Keep current-year Part III credit separate from each prior-year Part IV row.
 * Apply oldest credit first under the 2025 Form 3800 credit ordering rule.
 * Source: https://www.irs.gov/instructions/i3800 (Credit Ordering Rule)
 */
export function splitForm3800PassiveCreditVintages(
  source: Form8582CRSourceAllocation,
): Form3800PassiveCreditVintage[] {
  if (source.reporting_route === PassiveCreditReportingRoute.Form8834) {
    throw new Error("Form 8834 credit does not belong on Form 3800");
  }
  if (!source.form3800_credit_line) {
    throw new Error("Form 3800 passive source needs its exact credit line");
  }
  const creditLine = source.form3800_credit_line;
  const vintages = [
    ...source.prior_unallowed_credits.map((credit) => ({
      originatingTaxYear: credit.originating_tax_year,
      beforePassiveLimit: credit.credit_amount,
      sourceDocumentReference: credit.source_document_reference,
    })).sort((a, b) => a.originatingTaxYear - b.originatingTaxYear),
    {
      originatingTaxYear: 2025,
      beforePassiveLimit: source.current_year_credit,
      sourceDocumentReference: source.source_document_reference,
    },
  ];
  const beforePassiveLimit = vintages.reduce(
    (sum, vintage) => sum + vintage.beforePassiveLimit,
    0,
  );
  if (
    !Number.isSafeInteger(source.allowed_credit) ||
    source.allowed_credit < 0 || source.allowed_credit > beforePassiveLimit ||
    source.total_credit !== beforePassiveLimit
  ) {
    throw new Error("Form 3800 passive source vintage totals do not reconcile");
  }
  return vintages.filter((vintage) => vintage.beforePassiveLimit > 0).reduce<
    Form3800PassiveCreditVintage[]
  >(
    (allocated, vintage) => {
      const usedBefore = allocated.reduce(
        (sum, row) => sum + row.afterPassiveLimit,
        0,
      );
      return [...allocated, {
        activityReference: source.activity_reference,
        sourceForm: source.source_form,
        sourceDocumentReference: vintage.sourceDocumentReference,
        sourceOrigin: source.source_origin,
        form3800CreditLine: creditLine,
        reportingRoute: source.reporting_route,
        originatingTaxYear: vintage.originatingTaxYear,
        beforePassiveLimit: vintage.beforePassiveLimit,
        afterPassiveLimit: Math.min(
          vintage.beforePassiveLimit,
          source.allowed_credit - usedBefore,
        ),
      }];
    },
    [],
  );
}

export type Form3800SourceTaxUse = {
  readonly passiveVintages: readonly Form3800PassiveTaxUseVintage[];
  readonly nonpassiveSources: readonly Form3800CreditUseAllocation[];
};

/** Apply one filed Part II tax-use pass to passive vintages and other credits. */
export function allocateForm3800SourceTaxUse(
  sources: readonly Form8582CRSourceAllocation[],
  otherSources: readonly Form3800CreditUseRow[],
  lines: Form3800NonpassiveLines,
): Form3800SourceTaxUse {
  const passiveLines = classifyForm3800PassiveCredits(sources);
  if (
    passiveLines.line2 !== lines.line2 ||
    passiveLines.line3 !== lines.line3 ||
    passiveLines.line23 !== lines.line23 ||
    passiveLines.line24 !== lines.line24 ||
    passiveLines.line32 !== lines.line32 ||
    passiveLines.line33 !== lines.line33
  ) {
    throw new Error(
      "Form 3800 passive source totals do not reconcile to Part I and II",
    );
  }
  const vintages = sources.flatMap((source, sourceIndex) =>
    splitForm3800PassiveCreditVintages(source).map((vintage, vintageIndex) => ({
      ...vintage,
      sourceKey: `passive:${sourceIndex}:${vintageIndex}`,
    }))
  );
  const allocated = allocateForm3800CreditUse([
    ...vintages.map((vintage) => ({
      sourceKey: vintage.sourceKey,
      form3800CreditLine: vintage.form3800CreditLine,
      originatingTaxYear: vintage.originatingTaxYear,
      availableAfterPassiveLimit: vintage.afterPassiveLimit,
    })),
    ...otherSources,
  ], lines);
  const passiveUse = new Map(
    allocated.map((row) => [row.sourceKey, row] as const),
  );
  const passiveVintages = vintages.map((vintage) => {
    const use = passiveUse.get(vintage.sourceKey);
    if (!use) throw new Error("Form 3800 passive source was not allocated");
    return { ...vintage, ...use };
  });
  const nonpassiveSources = otherSources.map((source) => {
    const use = passiveUse.get(source.sourceKey);
    if (!use) throw new Error("Form 3800 nonpassive source was not allocated");
    return use;
  });
  return { passiveVintages, nonpassiveSources };
}

export const form3800PassiveActivityLinesSchema = z.object({
  line2: z.number().int().nonnegative(),
  line3: z.number().int().nonnegative(),
  line23: z.number().int().nonnegative(),
  line24: z.number().int().nonnegative(),
  line32: z.number().int().nonnegative(),
  line33: z.number().int().nonnegative(),
}).superRefine((lines, ctx) => {
  if (
    lines.line3 > lines.line2 || lines.line24 > lines.line23 ||
    lines.line33 > lines.line32
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        "Form 3800 passive allowed credit exceeds credit before limitation",
    });
  }
});

export type Form3800PassiveActivityLines = z.infer<
  typeof form3800PassiveActivityLinesSchema
>;

/** Pass explicitly when a source has no passive activity credits. */
export const ZERO_FORM3800_PASSIVE_ACTIVITY: Form3800PassiveActivityLines = {
  line2: 0,
  line3: 0,
  line23: 0,
  line24: 0,
  line32: 0,
  line33: 0,
};

/** Classify Form 8582-CR worksheet 9 source amounts into Form 3800's passive lines. */
export function classifyForm3800PassiveCredits(
  sources: readonly {
    readonly reporting_route: PassiveCreditReportingRoute;
    readonly total_credit: number;
    readonly allowed_credit: number;
  }[],
): Form3800PassiveActivityLines {
  const lines = {
    line2: 0,
    line3: 0,
    line23: 0,
    line24: 0,
    line32: 0,
    line33: 0,
  };
  for (const source of sources) {
    if (
      !Number.isSafeInteger(source.total_credit) ||
      !Number.isSafeInteger(source.allowed_credit) ||
      source.total_credit < 0 || source.allowed_credit < 0 ||
      source.allowed_credit > source.total_credit
    ) {
      throw new Error(
        "Form 3800 passive source needs whole-dollar available and allowed credits",
      );
    }
    switch (source.reporting_route) {
      case PassiveCreditReportingRoute.Form3800Line3:
        lines.line2 += source.total_credit;
        lines.line3 += source.allowed_credit;
        break;
      case PassiveCreditReportingRoute.Form3800Line24:
        lines.line23 += source.total_credit;
        lines.line24 += source.allowed_credit;
        break;
      case PassiveCreditReportingRoute.Form3800Line33:
        lines.line32 += source.total_credit;
        lines.line33 += source.allowed_credit;
        break;
      case PassiveCreditReportingRoute.Form8834:
        throw new Error("Form 8834 credit does not belong on Form 3800");
      default:
        throw new Error("Form 3800 passive source has no filed line");
    }
  }
  if (Object.values(lines).some((amount) => !Number.isSafeInteger(amount))) {
    throw new Error("Form 3800 passive line total exceeds whole-dollar range");
  }
  return lines;
}

type Form3800TaxContext = {
  /** Form 1040 line 16 plus Schedule 2 line 1z. */
  regularTax: number;
  /** Form 6251 line 11. */
  alternativeMinimumTax: number;
  /** Form 3800 line 10a. */
  foreignTaxCredit: number;
  /** Form 1040 line 19 and eligible Schedule 3 credits for line 10b. */
  priorAllowableCredits: number;
  /** Form 6251 line 9. */
  tentativeMinimumTax: number;
  /** Part I line 6: non-passive credits not allowed against TMT. */
  standardCredit: number;
  /** Part II line 36: non-passive specified credits. */
  specifiedCredit: number;
};

export type Form3800NonpassiveInput =
  & Form3800TaxContext
  & (
    | { filingStatus: FilingStatus.MFS; spouseHasBusinessCredit: boolean }
    | { filingStatus: Exclude<FilingStatus, FilingStatus.MFS> }
  );

export type Form3800NonpassiveLines = {
  line1: number;
  line2: number;
  line3: number;
  line4: number;
  line5: number;
  line6: number;
  line7: number;
  line8: number;
  line9: number;
  line10a: number;
  line10b: number;
  line10c: number;
  line11: number;
  line12: number;
  line13: number;
  line14: number;
  line15: number;
  line16: number;
  line17: number;
  line18: number;
  line19: number;
  line20: number;
  line21: number;
  line22: number;
  line23: number;
  line24: number;
  line25: number;
  line26: number;
  line27: number;
  line28: number;
  line29: number;
  line30: number;
  line32: number;
  line33: number;
  line34: number;
  line35: number;
  line36: number;
  line37: number;
  line38: number;
  unusedStandardCredit: number;
  unusedSpecifiedCredit: number;
};

/** Printed, finalized return lines needed for an individual's Form 3800 Part II. */
export type Form3800IndividualReturnContext = {
  readonly filingStatus: FilingStatus;
  readonly spouseHasBusinessCredit?: boolean;
  readonly form1040Line16: number;
  readonly schedule2Line1z: number;
  readonly educationCreditRecaptureTaxIncludedInLine7Sources: number;
  readonly form8621TaxIncludedInLine7Sources: number;
  readonly deferred965TaxIncludedInLine7Sources: number;
  readonly triggering965TaxIncludedInLine7Sources: number;
  readonly form6251Line11: number;
  readonly form6251Line9: number;
  readonly form1040Line19: number;
  readonly schedule3Line1: number;
  readonly schedule3Line2: number;
  readonly schedule3Line3: number;
  readonly schedule3Line4: number;
  readonly schedule3Line5a: number;
  readonly schedule3Line5b: number;
  readonly schedule3Line7: number;
  readonly schedule3Line6aGbc: number;
  readonly schedule3Line6bPriorMinimumTax: number;
  readonly form8912CreditInSchedule3Line7: number;
};

/**
 * Derive Form 3800 lines 7, 8, 10a, 10b, and 14 from the finalized return.
 * Source: 2025 Instructions for Form 3800, Part II lines 7 and 10b.
 */
export function deriveForm3800NonpassiveInput(
  returnLines: Form3800IndividualReturnContext,
  credits: Pick<
    Form3800CreditClassification,
    "standardCredit" | "specifiedCredit"
  >,
): Form3800NonpassiveInput {
  for (const [name, amount] of Object.entries(returnLines)) {
    if (
      typeof amount === "number" && (!Number.isFinite(amount) || amount < 0)
    ) {
      throw new Error(
        `Form 3800 return source ${name} must be a nonnegative finite amount`,
      );
    }
  }
  const regularTax = returnLines.form1040Line16 + returnLines.schedule2Line1z -
    returnLines.educationCreditRecaptureTaxIncludedInLine7Sources -
    returnLines.form8621TaxIncludedInLine7Sources -
    returnLines.deferred965TaxIncludedInLine7Sources -
    returnLines.triggering965TaxIncludedInLine7Sources;
  const schedule3OtherLine7 = returnLines.schedule3Line7 -
    returnLines.schedule3Line6aGbc -
    returnLines.schedule3Line6bPriorMinimumTax -
    returnLines.form8912CreditInSchedule3Line7;
  if (regularTax < 0 || schedule3OtherLine7 < 0) {
    throw new Error(
      "Form 3800 return lines do not reconcile after required exclusions",
    );
  }
  if (
    returnLines.filingStatus === FilingStatus.MFS &&
    returnLines.spouseHasBusinessCredit === undefined
  ) {
    throw new Error(
      "Form 3800 MFS limit needs the spouse business-credit answer",
    );
  }
  const priorAllowableCredits = returnLines.form1040Line19 +
    returnLines.schedule3Line2 + returnLines.schedule3Line3 +
    returnLines.schedule3Line4 + returnLines.schedule3Line5a +
    returnLines.schedule3Line5b + schedule3OtherLine7;
  const common = {
    regularTax,
    alternativeMinimumTax: returnLines.form6251Line11,
    foreignTaxCredit: returnLines.schedule3Line1,
    priorAllowableCredits,
    tentativeMinimumTax: returnLines.form6251Line9,
    standardCredit: credits.standardCredit,
    specifiedCredit: credits.specifiedCredit,
  };
  return returnLines.filingStatus === FilingStatus.MFS
    ? {
      ...common,
      filingStatus: FilingStatus.MFS,
      spouseHasBusinessCredit: returnLines.spouseHasBusinessCredit === true,
    }
    : { ...common, filingStatus: returnLines.filingStatus };
}

export function calculateForm3800Nonpassive(
  input: Form3800NonpassiveInput,
  passive: Form3800PassiveActivityLines,
): Form3800NonpassiveLines {
  for (
    const [name, amount] of Object.entries({
      regularTax: input.regularTax,
      alternativeMinimumTax: input.alternativeMinimumTax,
      foreignTaxCredit: input.foreignTaxCredit,
      priorAllowableCredits: input.priorAllowableCredits,
      tentativeMinimumTax: input.tentativeMinimumTax,
      standardCredit: input.standardCredit,
      specifiedCredit: input.specifiedCredit,
    })
  ) {
    if (!Number.isFinite(amount) || amount < 0) {
      throw new Error(`Form 3800 ${name} must be a nonnegative finite amount`);
    }
  }
  for (const [name, amount] of Object.entries(passive)) {
    if (!Number.isSafeInteger(amount) || amount < 0) {
      throw new Error(
        `Form 3800 passive ${name} must be a nonnegative whole-dollar amount`,
      );
    }
  }
  if (
    passive.line3 > passive.line2 || passive.line24 > passive.line23 ||
    passive.line33 > passive.line32
  ) {
    throw new Error(
      "Form 3800 passive allowed credit exceeds credit before limitation",
    );
  }
  const line1 = input.standardCredit;
  const line2 = passive.line2;
  const line3 = passive.line3;
  const line4 = 0;
  const line5 = 0;
  const line6 = line1 + line3 + line4 + line5;
  const line7 = input.regularTax;
  const line8 = input.alternativeMinimumTax;
  const line9 = line7 + line8;
  const line10a = input.foreignTaxCredit;
  const line10b = input.priorAllowableCredits;
  const line10c = line10a + line10b;
  const line11 = Math.max(0, line9 - line10c);
  const line12 = Math.max(0, line7 - line10c);
  const threshold = input.filingStatus === FilingStatus.MFS &&
      input.spouseHasBusinessCredit
    ? 12_500
    : 25_000;
  const line13 = 0.25 * Math.max(0, line12 - threshold);
  const line14 = input.tentativeMinimumTax;
  const line15 = Math.max(line13, line14);
  const line16 = Math.max(0, line11 - line15);
  const line17 = Math.min(line6, line16);
  const line18 = 0.75 * line14;
  const line19 = Math.max(line13, line18);
  const line20 = Math.max(0, line11 - line19);
  const line21 = Math.max(0, line20 - line17);
  const line22 = 0;
  const line23 = passive.line23;
  const line24 = passive.line24;
  const line25 = line22 + line24;
  const line26 = Math.min(line21, line25);
  const line27 = Math.max(0, line11 - line13);
  const line28 = line17 + line26;
  const line29 = Math.max(0, line27 - line28);
  const line30 = input.specifiedCredit;
  const line32 = passive.line32;
  const line33 = passive.line33;
  const line34 = 0;
  const line35 = 0;
  const line36 = line30 + line33 + line34 + line35;
  const line37 = Math.min(line29, line36);
  return {
    line1,
    line2,
    line3,
    line4,
    line5,
    line6,
    line7,
    line8,
    line9,
    line10a,
    line10b,
    line10c,
    line11,
    line12,
    line13,
    line14,
    line15,
    line16,
    line17,
    line18,
    line19,
    line20,
    line21,
    line22,
    line23,
    line24,
    line25,
    line26,
    line27,
    line28,
    line29,
    line30,
    line32,
    line33,
    line34,
    line35,
    line36,
    line37,
    line38: line28 + line37,
    unusedStandardCredit: line6 - line17,
    unusedSpecifiedCredit: line36 - line37,
  };
}

export type Form8835CreditEntry = {
  readonly form3800_line: "1f" | "4e";
  readonly credit_amount: number;
  readonly transfer_out_amount: number;
  readonly registration_number?: string;
  readonly subject_to_passive_activity_limit: boolean;
  readonly transfer_election_statement_file_name?: string;
};

export type Form3800CreditRow = {
  readonly line: "1f" | "4e";
  readonly facilityCount: number;
  readonly selfEarnedCredit: number;
  readonly transferOutAmount: number;
  readonly availableCredit: number;
  readonly facilities: readonly Form8835CreditEntry[];
};

export type Form3800CreditClassification = {
  readonly standardCredit: number;
  readonly specifiedCredit: number;
  readonly rows: readonly Form3800CreditRow[];
  readonly transferStatementFileNames: readonly string[];
};

export function classifyForm8835Credits(
  entries: readonly Form8835CreditEntry[],
): Form3800CreditClassification {
  const statementFiles = new Set<string>();
  for (const entry of entries) {
    if (entry.subject_to_passive_activity_limit) {
      throw new Error(
        "Form 8835 passive credit needs Form 8582-CR before Form 3800",
      );
    }
    if (
      !Number.isFinite(entry.credit_amount) || entry.credit_amount < 0 ||
      !Number.isFinite(entry.transfer_out_amount) ||
      entry.transfer_out_amount < 0 ||
      entry.transfer_out_amount > entry.credit_amount
    ) {
      throw new Error(
        "Form 3800 needs valid Form 8835 credit and transfer amounts",
      );
    }
    if (entry.transfer_out_amount > 0) {
      if (
        !entry.registration_number ||
        !entry.transfer_election_statement_file_name
      ) {
        throw new Error(
          "Form 3800 transferred Form 8835 credit needs registration and transfer election statement",
        );
      }
      statementFiles.add(entry.transfer_election_statement_file_name);
    }
  }
  const rows: Form3800CreditRow[] = (["1f", "4e"] as const).flatMap((line) => {
    const facilities = entries.filter((entry) => entry.form3800_line === line);
    if (facilities.length === 0) return [];
    const selfEarnedCredit = facilities.reduce(
      (sum, entry) => sum + entry.credit_amount,
      0,
    );
    const transferOutAmount = facilities.reduce(
      (sum, entry) => sum + entry.transfer_out_amount,
      0,
    );
    return [{
      line,
      facilityCount: facilities.length,
      selfEarnedCredit,
      transferOutAmount,
      availableCredit: selfEarnedCredit - transferOutAmount,
      facilities,
    }];
  });
  return {
    standardCredit: rows.find((row) => row.line === "1f")?.availableCredit ?? 0,
    specifiedCredit: rows.find((row) => row.line === "4e")?.availableCredit ??
      0,
    rows,
    transferStatementFileNames: [...statementFiles],
  };
}
