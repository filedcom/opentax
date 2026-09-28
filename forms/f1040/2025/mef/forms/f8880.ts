import { element, elements } from "../../../mef/xml.ts";
import type { MefBuildContext, MefFormDescriptor } from "../form-descriptor.ts";
import {
  assertEligibleContributor,
  eligibleW2DeferralAmount,
  inputSchema as calculatorInputSchema,
  ownedDeferrals,
} from "../../../nodes/intermediate/forms/form8880/index.ts";
import {
  assertForm8880EligibleTotals,
  assertForm8880FiledCalculation,
  assertForm8880TaxLimit,
} from "../../form8880_tax_limit.ts";

// The calculator self-emits these line values for both PDF and MeF. The
// v5.4 XSD retains legacy-looking element names for lines 1 and 2; map by
// its LineNumber annotations to the 2025 PDF, not by those names' wording.
export interface Fields {
  print_line1a_ira: number;
  print_line1b_ira?: number;
  print_line2a_deferrals: number;
  print_line2b_deferrals?: number;
  print_line3a_total: number;
  print_line3b_total?: number;
  print_line4a_distributions: number;
  print_line4b_distributions?: number;
  print_line5a: number;
  print_line5b?: number;
  print_line6a_eligible: number;
  print_line6b_eligible?: number;
  print_line7_total_eligible: number;
  print_line8_agi: number;
  print_line9_rate: string;
  print_line10_raw_credit: number;
  print_line11_tax_liability: number;
  print_line12_credit: number;
}

// Executor pending retains calculator source facts alongside the self-emitted
// print lines. They are not an alternate filing shape: only print lines may
// create the native document.
type Input =
  & Partial<Fields>
  & Partial<ReturnType<typeof calculatorInputSchema.parse>>
  & { calculated_zero_credit?: true };

export const FIELD_MAP: ReadonlyArray<readonly [keyof Fields, string]> = [
  ["print_line1a_ira", "PrimaryRothIRAForCurrentYrAmt"],
  ["print_line1b_ira", "SpouseRothIRAForCurrentYrAmt"],
  ["print_line2a_deferrals", "PrimaryContributionsAmt"],
  ["print_line2b_deferrals", "SpouseContributionsAmt"],
  ["print_line3a_total", "AddPrimRothIRAToCYContriAmt"],
  ["print_line3b_total", "AddSpRothIRAToCYContriAmt"],
  ["print_line4a_distributions", "PrimTaxableDistributionsAmt"],
  ["print_line4b_distributions", "SpsTaxableDistributionsAmt"],
  ["print_line5a", "CalculatePrimDistribFromTotAmt"],
  ["print_line5b", "CalculateSpsDistribFromTotAmt"],
  ["print_line6a_eligible", "PrimSmallerOfCalculationAmt"],
  ["print_line6b_eligible", "SpsSmallerOfCalculationAmt"],
  ["print_line7_total_eligible", "TotalCalculatedAmt"],
  ["print_line8_agi", "TaxReturnAGIAmt"],
  ["print_line9_rate", "QlfyRetirementSavDecimalAmt"],
  ["print_line10_raw_credit", "CalculatedAmtByDecimalAmt"],
  ["print_line11_tax_liability", "CalculatedCreditsFromTaxAmt"],
  ["print_line12_credit", "CrQualifiedRetirementSavAmt"],
];

const printKeys = new Set<string>(FIELD_MAP.map(([key]) => key));
const allowedKeys = new Set<string>([
  ...printKeys,
  ...Object.keys(calculatorInputSchema.shape),
  "calculated_zero_credit",
]);
const requiredKeys: readonly (keyof Fields)[] = [
  "print_line1a_ira",
  "print_line2a_deferrals",
  "print_line3a_total",
  "print_line4a_distributions",
  "print_line5a",
  "print_line6a_eligible",
  "print_line7_total_eligible",
  "print_line8_agi",
  "print_line9_rate",
  "print_line10_raw_credit",
  "print_line11_tax_liability",
  "print_line12_credit",
];
const spouseKeys: readonly (keyof Fields)[] = [
  "print_line1b_ira",
  "print_line2b_deferrals",
  "print_line3b_total",
  "print_line4b_distributions",
  "print_line5b",
  "print_line6b_eligible",
];

function buildIRS8880(fields: Input, context?: MefBuildContext): string {
  const unknown = Object.keys(fields).find((key) => !allowedKeys.has(key));
  if (unknown) throw new Error(`Form 8880 has unsupported field ${unknown}`);
  const hasPrintLine = Object.keys(fields).some((key) => printKeys.has(key));
  const source = calculatorInputSchema.partial().parse(fields);
  const hasContribution = [
    source.ira_contributions_taxpayer,
    source.ira_contributions_spouse,
    source.elective_deferrals_taxpayer,
    source.elective_deferrals_spouse,
    ...(source.w2_deferral_entries ?? []).map(eligibleW2DeferralAmount),
  ].some((amount) => (amount ?? 0) > 0);
  if (fields.calculated_zero_credit !== undefined) {
    if (
      fields.calculated_zero_credit !== true || hasPrintLine ||
      !hasContribution
    ) {
      throw new Error(
        "Form 8880 zero-credit outcome conflicts with native lines",
      );
    }
    return "";
  }
  if (!hasPrintLine) {
    if (hasContribution) {
      throw new Error("Form 8880 contribution has no calculated native lines");
    }
    return "";
  }
  const credit = fields.print_line12_credit;
  if (credit === undefined || credit <= 0) {
    throw new Error("Form 8880 source is missing a positive calculated credit");
  }
  for (const key of requiredKeys) {
    if (fields[key] === undefined) {
      throw new Error(`Form 8880 calculated source is missing ${key}`);
    }
  }
  const spouseSsn = fields.spouse_ssn?.replaceAll("-", "");
  const hasSpouseW2Source = (fields.w2_deferral_entries ?? []).some((entry) =>
    spouseSsn !== undefined &&
    entry.employee_ssn.replaceAll("-", "") === spouseSsn
  );
  const hasSpouseSource = (fields.ira_contributions_spouse ?? 0) > 0 ||
    (fields.elective_deferrals_spouse ?? 0) > 0 || hasSpouseW2Source ||
    spouseKeys.some((key) => fields[key] !== undefined);
  if (hasSpouseSource) {
    for (const key of spouseKeys) {
      if (fields[key] === undefined) {
        throw new Error(`Form 8880 calculated source is missing ${key}`);
      }
    }
  }
  if (
    fields.print_line11_tax_liability === undefined ||
    credit > fields.print_line11_tax_liability ||
    credit > (fields.print_line10_raw_credit ?? 0)
  ) {
    throw new Error("Form 8880 credit exceeds its calculated limit");
  }
  if (
    fields.print_line9_rate !== "0.1" &&
    fields.print_line9_rate !== "0.2" &&
    fields.print_line9_rate !== "0.5"
  ) {
    throw new Error("Form 8880 credit rate is not a TY2025 XSD value");
  }
  if (!hasContribution) {
    throw new Error("Form 8880 positive claim needs contribution source facts");
  }
  const owned = ownedDeferrals(source);
  if (
    fields.print_line1a_ira !== (source.ira_contributions_taxpayer ?? 0) ||
    (fields.print_line1b_ira ?? 0) !==
      (source.ira_contributions_spouse ?? 0) ||
    fields.print_line2a_deferrals !== owned.taxpayer ||
    (fields.print_line2b_deferrals ?? 0) !== owned.spouse
  ) {
    throw new Error(
      "Form 8880 native contribution lines differ from owner source facts",
    );
  }
  if (!context?.pending) {
    throw new Error("Form 8880 positive credit needs finalized return context");
  }
  assertForm8880EligibleTotals(
    fields.print_line6a_eligible,
    fields.print_line6b_eligible,
    fields.print_line7_total_eligible,
  );
  if ((fields.print_line6a_eligible ?? 0) > 0) {
    assertEligibleContributor(
      "taxpayer",
      source.taxpayer_dob,
      source.taxpayer_student_five_months,
      source.taxpayer_claimed_as_dependent,
    );
  }
  if ((fields.print_line6b_eligible ?? 0) > 0) {
    assertEligibleContributor(
      "spouse",
      source.spouse_dob,
      source.spouse_student_five_months,
      source.spouse_claimed_as_dependent,
    );
  }
  assertForm8880TaxLimit(
    fields.print_line11_tax_liability!,
    credit,
    context.pending,
  );
  assertForm8880FiledCalculation(fields, context.pending);
  const children = FIELD_MAP.map(([key, tag]) => {
    const value = fields[key];
    return value === undefined ? "" : element(tag, value);
  });
  return elements("IRS8880", children);
}

export const form8880: MefFormDescriptor<"form8880", Input> = {
  pendingKey: "form8880",
  FIELD_MAP,
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8880.pdf",
  build(fields, context) {
    return buildIRS8880(fields, context);
  },
};
