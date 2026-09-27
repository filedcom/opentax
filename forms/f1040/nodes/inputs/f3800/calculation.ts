/**
 * TY2025 Form 3800 Part II for individual, non-passive credits only.
 *
 * Source: https://www.irs.gov/pub/irs-pdf/f3800.pdf (2025, Part II lines 7-38)
 * The caller must separately classify Part III credits and exclude passive,
 * empowerment-zone, EPE, and other special-limit cases from this calculation.
 */
import { FilingStatus } from "../../types.ts";

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
  line27: number;
  line28: number;
  line29: number;
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
  const line6 = input.standardCredit;
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
  const line27 = Math.max(0, line11 - line13);
  const line28 = line17;
  const line29 = Math.max(0, line27 - line28);
  const line36 = input.specifiedCredit;
  const line37 = Math.min(line29, line36);
  return {
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
    line27,
    line28,
    line29,
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
